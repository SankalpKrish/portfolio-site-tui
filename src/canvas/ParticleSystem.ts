import { ScrollState } from './ScrollState';

function generateTextTargets(text: string, count: number): Float32Array {
  const offscreen = document.createElement('canvas');
  offscreen.width = 512; offscreen.height = 128;
  const ctx = offscreen.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 72px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const data = ctx.getImageData(0, 0, 512, 128).data;

  const lit: [number, number][] = [];
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 512; x++)
      if (data[(y * 512 + x) * 4 + 3] > 128)
        lit.push([x / 512, y / 128]);

  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const [x, y] = lit[i % lit.length];
    out[i * 2] = x; out[i * 2 + 1] = y;
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
  private computeBG!: GPUBindGroup;
  private renderBG!: GPUBindGroup;
  private t0 = performance.now();
  private attract = 1.0;
  private mouse = { x: 0.5, y: 0.5 };
  private raf = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX / window.innerWidth;
      this.mouse.y = e.clientY / window.innerHeight;
    }, { passive: true });
  }

  async init() {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter');
    this.device = await adapter.requestDevice();

    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    const fmt = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: fmt, alphaMode: 'premultiplied' });

    const [compWGSL, rendWGSL] = await Promise.all([
      fetch('/shaders/particle.compute.wgsl').then(r => r.text()),
      fetch('/shaders/particle.render.wgsl').then(r => r.text()),
    ]);

    // Particle buffer
    const init = new Float32Array(this.N * 4);
    for (let i = 0; i < this.N; i++) {
      init[i*4]   = Math.random();
      init[i*4+1] = Math.random();
      init[i*4+2] = (Math.random()-0.5)*0.002;
      init[i*4+3] = (Math.random()-0.5)*0.002;
    }
    this.particleBuf = this.device.createBuffer({
      size: init.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.particleBuf, 0, init);

    // Uniform buffer — 8 floats = 32 bytes
    this.uniformBuf = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    // Target buffer
    const targets = generateTextTargets('Sankalp Krish', this.N);
    this.targetBuf = this.device.createBuffer({
      size: targets.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.targetBuf, 0, targets);

    // Compute pipeline
    const compBGL = this.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
    ]});
    this.computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [compBGL] }),
      compute: { module: this.device.createShaderModule({ code: compWGSL }), entryPoint: 'main' },
    });
    this.computeBG = this.device.createBindGroup({ layout: compBGL, entries: [
      { binding: 0, resource: { buffer: this.particleBuf } },
      { binding: 1, resource: { buffer: this.uniformBuf } },
      { binding: 2, resource: { buffer: this.targetBuf } },
    ]});

    // Render pipeline
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

    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.frame();

    // Converge for 3s then fade attract to 0 over 1s
    setTimeout(() => {
      let elapsed = 0;
      const iv = setInterval(() => {
        elapsed += 50;
        this.attract = Math.max(0, 1 - elapsed / 1000);
        if (elapsed >= 1000) clearInterval(iv);
      }, 50);
    }, 3000);
  }

  private resize() {
    this.canvas.width  = window.innerWidth  * devicePixelRatio;
    this.canvas.height = window.innerHeight * devicePixelRatio;
    this.canvas.style.width  = window.innerWidth  + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
  }

  private frame() {
    this.raf = requestAnimationFrame(() => this.frame());
    const t = (performance.now() - this.t0) / 1000;
    const u = new Float32Array([t, ScrollState.progress, this.mouse.x, this.mouse.y, this.attract, this.canvas.width, this.canvas.height, 0]);
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
    this.particleBuf.destroy();
    this.uniformBuf.destroy();
    this.targetBuf.destroy();
  }
}
