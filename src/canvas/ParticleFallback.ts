// src/canvas/ParticleFallback.ts

function sampleTextTargets(count: number): Float32Array {
  const el = document.getElementById('intro-text');
  const offscreen = document.createElement('canvas');
  offscreen.width = window.innerWidth;
  offscreen.height = window.innerHeight;
  const ctx = offscreen.getContext('2d')!;

  if (el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    ctx.fillStyle = '#fff';
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if (style.letterSpacing && style.letterSpacing !== 'normal') {
      ctx.letterSpacing = style.letterSpacing;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sankalp Krish', rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  const data = ctx.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const lit: [number, number][] = [];
  for (let y = 0; y < offscreen.height; y++) {
    for (let x = 0; x < offscreen.width; x++) {
      if (data[(y * offscreen.width + x) * 4 + 3] > 128) {
        lit.push([x / offscreen.width, y / offscreen.height]);
      }
    }
  }
  if (lit.length === 0) lit.push([0.5, 0.5]);

  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const [x, y] = lit[i % lit.length];
    out[i * 2] = x;
    out[i * 2 + 1] = y;
  }
  return out;
}

async function sampleSansTargets(count: number): Promise<{ tx: Float32Array; colors: Uint8Array }> {
  const img = new Image();
  img.src = '/sans.png';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load sans.png'));
  });

  const w = img.width || 80;
  const h = img.height || 80;
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  const lit: { vx: number; vy: number; r: number; g: number; b: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 128) {
        // Center the image at (0.5, 0.5) in viewport space
        lit.push({
          vx: 0.5 + (x - w / 2) / window.innerWidth,
          vy: 0.5 + (y - h / 2) / window.innerHeight,
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
        });
      }
    }
  }
  if (lit.length === 0) lit.push({ vx: 0.5, vy: 0.5, r: 255, g: 255, b: 255 });

  const tx = new Float32Array(count * 2);
  const colors = new Uint8Array(count * 3);
  for (let i = 0; i < count; i++) {
    const item = lit[i % lit.length];
    tx[i * 2] = item.vx;
    tx[i * 2 + 1] = item.vy;
    colors[i * 3] = item.r;
    colors[i * 3 + 1] = item.g;
    colors[i * 3 + 2] = item.b;
  }
  return { tx, colors };
}

export class ParticleFallback {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private N = 50_000;
  private raf = 0;

  // Per-particle arrays
  private x!: Float32Array;
  private y!: Float32Array;
  private vx!: Float32Array;
  private vy!: Float32Array;
  private tx!: Float32Array;  // current targets (text or sans)
  private ty!: Float32Array;
  private r!: Uint8Array;
  private g!: Uint8Array;
  private b!: Uint8Array;

  // Sans logo targets (pre-loaded, swapped in on phase 2)
  private sansTx!: Float32Array;
  private sansTy!: Float32Array;
  private sansR!: Uint8Array;
  private sansG!: Uint8Array;
  private sansB!: Uint8Array;

  private phase = 1.0;
  private attract = 1.0;
  private attractInterval = 0;
  private attractTimeout = 0;
  private resizeHandler!: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  async init() {
    await document.fonts.ready;
    this.resize();

    const textTargets = sampleTextTargets(this.N);
    const { tx: sansTx, colors: sansColors } = await sampleSansTargets(this.N);

    // Allocate per-particle arrays
    this.x  = new Float32Array(this.N);
    this.y  = new Float32Array(this.N);
    this.vx = new Float32Array(this.N);
    this.vy = new Float32Array(this.N);
    this.tx = new Float32Array(this.N);
    this.ty = new Float32Array(this.N);
    this.r  = new Uint8Array(this.N);
    this.g  = new Uint8Array(this.N);
    this.b  = new Uint8Array(this.N);

    // Store sans targets for phase 2
    this.sansTx = new Float32Array(this.N);
    this.sansTy = new Float32Array(this.N);
    this.sansR  = new Uint8Array(this.N);
    this.sansG  = new Uint8Array(this.N);
    this.sansB  = new Uint8Array(this.N);
    for (let i = 0; i < this.N; i++) {
      this.sansTx[i] = sansTx[i * 2];
      this.sansTy[i] = sansTx[i * 2 + 1];
      this.sansR[i]  = sansColors[i * 3];
      this.sansG[i]  = sansColors[i * 3 + 1];
      this.sansB[i]  = sansColors[i * 3 + 2];
    }

    // Init particles on text targets, white color
    for (let i = 0; i < this.N; i++) {
      this.x[i]  = textTargets[i * 2];
      this.y[i]  = textTargets[i * 2 + 1];
      this.vx[i] = 0;
      this.vy[i] = 0;
      this.tx[i] = textTargets[i * 2];
      this.ty[i] = textTargets[i * 2 + 1];
      this.r[i]  = 255;
      this.g[i]  = 255;
      this.b[i]  = 255;
    }

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler, { passive: true });

    // After 2s, fade attract 1→0 over 1s (particles settle then drift)
    this.attractTimeout = window.setTimeout(() => {
      let elapsed = 0;
      this.attractInterval = window.setInterval(() => {
        elapsed += 50;
        this.attract = Math.max(0, 1 - elapsed / 1000);
        if (elapsed >= 1000) clearInterval(this.attractInterval);
      }, 50);
    }, 2000);

    this.frame();
    return this;
  }

  setPhase(phase: number) {
    this.phase = phase;

    if (phase === 2.0) {
      // Migrate to Sans logo targets, swap colors
      clearInterval(this.attractInterval);
      clearTimeout(this.attractTimeout);
      this.attract = 1.0;
      for (let i = 0; i < this.N; i++) {
        this.tx[i] = this.sansTx[i];
        this.ty[i] = this.sansTy[i];
        this.r[i]  = this.sansR[i];
        this.g[i]  = this.sansG[i];
        this.b[i]  = this.sansB[i];
      }
    }

    if (phase === 3.0) {
      clearInterval(this.attractInterval);
      clearTimeout(this.attractTimeout);
      this.attract = 0.0;
    }
  }

  private resize() {
    this.canvas.width  = window.innerWidth  * devicePixelRatio;
    this.canvas.height = window.innerHeight * devicePixelRatio;
    this.canvas.style.width  = window.innerWidth  + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
  }

  private frame() {
    this.raf = requestAnimationFrame(() => this.frame());

    const W = this.canvas.width;
    const H = this.canvas.height;
    const stiffness = 0.08;
    const damping   = 0.85;

    this.ctx.clearRect(0, 0, W, H);
    this.ctx.globalAlpha = 0.75;

    for (let i = 0; i < this.N; i++) {
      let fx: number, fy: number;

      if (this.phase === 3.0) {
        fx = (Math.random() - 0.5) * 0.05;
        fy = (Math.random() - 0.5) * 0.05;
      } else {
        fx = (this.tx[i] - this.x[i]) * this.attract * stiffness;
        fy = (this.ty[i] - this.y[i]) * this.attract * stiffness;
      }

      this.vx[i] = (this.vx[i] + fx) * damping;
      this.vy[i] = (this.vy[i] + fy) * damping;
      this.x[i] += this.vx[i];
      this.y[i] += this.vy[i];

      this.ctx.fillStyle = `rgb(${this.r[i]},${this.g[i]},${this.b[i]})`;
      this.ctx.fillRect(this.x[i] * W - 0.75, this.y[i] * H - 0.75, 1.5, 1.5);
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.attractTimeout);
    clearInterval(this.attractInterval);
    window.removeEventListener('resize', this.resizeHandler);
  }
}
