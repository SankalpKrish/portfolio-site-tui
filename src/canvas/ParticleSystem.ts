// src/canvas/ParticleSystem.ts

function generateTextTargets(count: number): Float32Array {
  const el = document.getElementById('intro-text');
  if (!el) {
    return new Float32Array(count * 2);
  }

  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  const offscreen = document.createElement('canvas');
  offscreen.width = window.innerWidth;
  offscreen.height = window.innerHeight;
  const ctx = offscreen.getContext('2d')!;

  ctx.fillStyle = '#fff';
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if (style.letterSpacing && style.letterSpacing !== 'normal') {
    ctx.letterSpacing = style.letterSpacing;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  ctx.fillText("Sankalp Krish", centerX, centerY);

  const data = ctx.getImageData(0, 0, window.innerWidth, window.innerHeight).data;

  const lit: [number, number][] = [];
  for (let y = 0; y < window.innerHeight; y++) {
    for (let x = 0; x < window.innerWidth; x++) {
      if (data[(y * window.innerWidth + x) * 4 + 3] > 128) {
        const px = x / window.innerWidth;
        const py = y / window.innerHeight;
        lit.push([px, py]);
      }
    }
  }

  if (lit.length === 0) {
    lit.push([0.5, 0.5]);
  }

  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const [x, y] = lit[i % lit.length];
    out[i * 2] = x; 
    out[i * 2 + 1] = y;
  }
  return out;
}

async function generateSansTargets(count: number): Promise<Float32Array> {
  const img = new Image();
  img.src = '/sans.png';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load sans.png'));
  });

  const w = img.width || 80;
  const h = img.height || 80;
  const offscreen = document.createElement('canvas');
  offscreen.width = w; offscreen.height = h;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  const lit: { pos: [number, number]; col: [number, number, number] }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 128) {
        const rx = (x - w / 2) / w;
        const ry = (y - h / 2) / h;
        
        const r = data[(y * w + x) * 4] / 255;
        const g = data[(y * w + x) * 4 + 1] / 255;
        const b = data[(y * w + x) * 4 + 2] / 255;
        
        lit.push({ pos: [rx, ry], col: [r, g, b] });
      }
    }
  }

  if (lit.length === 0) {
    lit.push({ pos: [0, 0], col: [1, 1, 1] });
  }

  // Pack into 32-byte layout: pos (vec2), color (vec3), padding
  const out = new Float32Array(count * 8);
  for (let i = 0; i < count; i++) {
    const item = lit[i % lit.length];
    out[i * 8]     = item.pos[0];
    out[i * 8 + 1] = item.pos[1];
    out[i * 8 + 2] = 0.0;
    out[i * 8 + 3] = 0.0;
    out[i * 8 + 4] = item.col[0];
    out[i * 8 + 5] = item.col[1];
    out[i * 8 + 6] = item.col[2];
    out[i * 8 + 7] = 0.0;
  }
  return out;
}

export class ParticleSystem {
  private device!: GPUDevice;
  private canvas: HTMLCanvasElement;
  private context!: GPUCanvasContext;
  private N = 500_000;
  private computePipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;
  private particleBuf!: GPUBuffer;
  private uniformBuf!: GPUBuffer;
  private targetBuf!: GPUBuffer;
  private sansBuf!: GPUBuffer;
  private computeBG!: GPUBindGroup;
  private renderBG!: GPUBindGroup;
  private t0 = performance.now();
  private attract = 1.0;
  private phase = 1.0; // 1.0 = text, 2.0 = Sans logo, 3.0 = disperse
  private mouse = { x: 0.5, y: 0.5 };
  private raf = 0;
  private attractTimeout = 0;
  private attractInterval = 0;
  private textRect = { left: 0.25, top: 0.45, width: 0.5, height: 0.1 };

  private measureTextRect() {
    const introTextEl = document.getElementById('intro-text');
    if (introTextEl) {
      const originalText = introTextEl.textContent || '';
      // Temporarily set the full text to measure its fully-expanded bounding box!
      introTextEl.textContent = "Sankalp Krish";
      
      const rect = introTextEl.getBoundingClientRect();
      this.textRect.left = rect.left / window.innerWidth;
      this.textRect.top = rect.top / window.innerHeight;
      this.textRect.width = rect.width / window.innerWidth;
      this.textRect.height = rect.height / window.innerHeight;
      
      // Restore original typing text so typewriter is unaffected
      introTextEl.textContent = originalText;
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    // 1. Wait for document fonts to load completely
    await document.fonts.ready;

    // Trigger initial resize to populate canvas dimensions
    this.resize();

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter');
    this.device = await adapter.requestDevice();

    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    const fmt = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: fmt, alphaMode: 'premultiplied' });

    const fetchShader = (url: string) => fetch(url).then(r => {
      if (!r.ok) throw new Error(`Failed to fetch shader: ${url}`);
      return r.text();
    });
    const [compWGSL, rendWGSL] = await Promise.all([
      fetchShader('/shaders/particle.compute.wgsl'),
      fetchShader('/shaders/particle.render.wgsl'),
    ]);

    // Uniform buffer — 12 floats = 48 bytes
    this.uniformBuf = this.device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    // Target text buffer
    const targets = generateTextTargets(this.N);
    this.targetBuf = this.device.createBuffer({
      size: targets.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.targetBuf, 0, targets as any);

    // Target Sans logo buffer
    const sansTargets = await generateSansTargets(this.N);
    this.sansBuf = this.device.createBuffer({
      size: sansTargets.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.sansBuf, 0, sansTargets as any);

    // 2. Particle buffer: 32 bytes per particle (pos: vec2, vel: vec2, color: vec3, padding)
    // Particles start exactly on the "Sankalp Krish" letters for a seamless dissolve!
    const init = new Float32Array(this.N * 8);
    for (let i = 0; i < this.N; i++) {
      const tx = targets[(i * 2) % targets.length];
      const ty = targets[(i * 2 + 1) % targets.length];

      init[i*8]   = tx;    // pos.x
      init[i*8+1] = ty;    // pos.y
      init[i*8+2] = 0.0;   // vel.x (perfectly static)
      init[i*8+3] = 0.0;   // vel.y (perfectly static)
      init[i*8+4] = 1.0; // color.r (pure white)
      init[i*8+5] = 1.0; // color.g
      init[i*8+6] = 1.0; // color.b
      init[i*8+7] = 0.0;   // padding
    }
    this.particleBuf = this.device.createBuffer({
      size: init.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.particleBuf, 0, init);

    // Compute pipeline bind group layout
    const compBGL = this.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
    ]});
    this.computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [compBGL] }),
      compute: { module: this.device.createShaderModule({ code: compWGSL }), entryPoint: 'main' },
    });
    this.computeBG = this.device.createBindGroup({ layout: compBGL, entries: [
      { binding: 0, resource: { buffer: this.particleBuf } },
      { binding: 1, resource: { buffer: this.uniformBuf } },
      { binding: 2, resource: { buffer: this.targetBuf } },
      { binding: 3, resource: { buffer: this.sansBuf } },
    ]});

    // Render pipeline bind group layout
    const rendBGL = this.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ]});
    const rendMod = this.device.createShaderModule({ code: rendWGSL });
    this.renderPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [rendBGL] }),
      vertex:    { module: rendMod, entryPoint: 'vs_main' },
      fragment:  { module: rendMod, entryPoint: 'fs_main', targets: [{ format: fmt, blend: {
        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
      }}]},
      primitive: { topology: 'point-list' },
    });
    this.renderBG = this.device.createBindGroup({ layout: rendBGL, entries: [
      { binding: 0, resource: { buffer: this.particleBuf } },
      { binding: 1, resource: { buffer: this.uniformBuf } },
    ]});

    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.frame();

    // Converge for 2s then fade attract to 0 over 1s (Phase 1 text transition)
    this.attractTimeout = window.setTimeout(() => {
      let elapsed = 0;
      this.attractInterval = window.setInterval(() => {
        elapsed += 50;
        this.attract = Math.max(0, 1 - elapsed / 1000);
        if (elapsed >= 1000) clearInterval(this.attractInterval);
      }, 50);
    }, 2000);

    return this;
  }

  setPhase(phase: number) {
    this.phase = phase;
    // When forming the Sans logo (Phase 2), reactivate attraction to pull particles onto targets
    if (phase === 2.0) {
      clearInterval(this.attractInterval);
      clearTimeout(this.attractTimeout);
      this.attract = 1.0;
    }
    // When dispersing (Phase 3), fade attraction out immediately
    if (phase === 3.0) {
      this.attract = 0.0;
    }
  }

  private resize() {
    this.canvas.width  = window.innerWidth  * devicePixelRatio;
    this.canvas.height = window.innerHeight * devicePixelRatio;
    this.canvas.style.width  = window.innerWidth  + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.measureTextRect();
  }

  private frame() {
    this.raf = requestAnimationFrame(() => this.frame());
    const t = (performance.now() - this.t0) / 1000;

    const aspect = window.innerWidth / window.innerHeight;
    const u = new Float32Array([
      t,                 // uniforms.time
      this.phase,        // uniforms.phase
      this.mouse.x,      // uniforms.mouse.x
      this.mouse.y,      // uniforms.mouse.y
      this.attract,      // uniforms.attract
      aspect,            // uniforms.aspect
      0.0, 0.0,          // Float 6 & 7 dummy padding (8 bytes to align textRect to 32 bytes/offset 32)
      this.textRect.left,  // uniforms.textRect.x
      this.textRect.top,   // uniforms.textRect.y
      this.textRect.width, // uniforms.textRect.z
      this.textRect.height // uniforms.textRect.w
    ]);
    this.device.queue.writeBuffer(this.uniformBuf, 0, u);

    const enc = this.device.createCommandEncoder();
    const comp = enc.beginComputePass();
    comp.setPipeline(this.computePipeline);
    comp.setBindGroup(0, this.computeBG);
    comp.dispatchWorkgroups(Math.ceil(this.N / 64));
    comp.end();

    const view = this.context.getCurrentTexture().createView();
    const rp = enc.beginRenderPass({
      colorAttachments: [{ view, loadOp: 'clear', clearValue: { r:0.067, g:0.067, b:0.106, a:1 }, storeOp: 'store' }],
    });
    rp.setPipeline(this.renderPipeline);
    rp.setBindGroup(0, this.renderBG);
    rp.draw(this.N);
    rp.end();

    this.device.queue.submit([enc.finish()]);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.attractTimeout);
    clearInterval(this.attractInterval);
    this.particleBuf.destroy();
    this.uniformBuf.destroy();
    this.targetBuf.destroy();
    this.sansBuf.destroy();
  }
}
