# Particle Fallback Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `ParticleFallback` to match the WebGPU cinematic sequence — 3-phase particle animation (text formation → Sans logo → disperse) using Canvas 2D, so the fallback path has identical behavior to the WebGPU path.

**Architecture:** Replace the Three.js rotation loop with a Canvas 2D spring-physics system. Particles are pre-positioned on text targets at init, then migrate to Sans logo targets on `setPhase(2.0)`, then disperse on `setPhase(3.0)`. The `TerminalWindow.astro` orchestration is unchanged.

**Tech Stack:** TypeScript, Canvas 2D API, `sans.png` pixel sampling, `getComputedStyle` for font matching

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/canvas/ParticleFallback.ts` | **Rewrite** | Canvas 2D 3-phase particle system |
| `package.json` | **Modify** | Remove `three` and `@types/three` if unused elsewhere |

No other files change. `TerminalWindow.astro`, `Base.astro`, and `ParticleSystem.ts` are untouched.

---

### Task 1: Verify Three.js is only used by ParticleFallback

**Files:**
- Read: `src/canvas/ParticleFallback.ts`
- Search: entire `src/` for any other `three` imports

- [ ] **Step 1: Search for other Three.js usage**

Run in terminal:
```
grep -r "from 'three'" src/
```
Expected output: only `src/canvas/ParticleFallback.ts:1` — no other files.

- [ ] **Step 2: Confirm Three.js is safe to remove after rewrite**

If no other results, note: `three` and `@types/three` will be removed from `package.json` in Task 4.
If other files import `three`, do NOT remove it from `package.json` — skip the removal step in Task 4.

---

### Task 2: Rewrite ParticleFallback.ts

**Files:**
- Modify: `src/canvas/ParticleFallback.ts` (full rewrite)

- [ ] **Step 1: Replace the file contents entirely**

```typescript
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

    window.addEventListener('resize', () => this.resize(), { passive: true });

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

    for (let i = 0; i < this.N; i++) {
      let fx: number, fy: number;

      if (this.phase === 3.0) {
        fx = (Math.random() - 0.5) * 0.001;
        fy = (Math.random() - 0.5) * 0.001;
      } else {
        fx = (this.tx[i] - this.x[i]) * this.attract * stiffness;
        fy = (this.ty[i] - this.y[i]) * this.attract * stiffness;
      }

      this.vx[i] = (this.vx[i] + fx) * damping;
      this.vy[i] = (this.vy[i] + fy) * damping;
      this.x[i] += this.vx[i];
      this.y[i] += this.vy[i];

      this.ctx.globalAlpha = 0.75;
      this.ctx.fillStyle = `rgb(${this.r[i]},${this.g[i]},${this.b[i]})`;
      this.ctx.fillRect(this.x[i] * W - 0.75, this.y[i] * H - 0.75, 1.5, 1.5);
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.attractTimeout);
    clearInterval(this.attractInterval);
  }
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

Run:
```
npx astro check
```
Expected: no type errors in `src/canvas/ParticleFallback.ts`. If errors appear, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/canvas/ParticleFallback.ts
git commit -m "feat: rewrite ParticleFallback with Canvas 2D 3-phase cinematic sequence"
```

---

### Task 3: Remove Three.js dependency (if unused)

**Files:**
- Modify: `package.json`

Only do this task if Task 1 confirmed `three` is not imported anywhere outside `ParticleFallback.ts`.

- [ ] **Step 1: Remove three and @types/three from package.json**

```bash
npm uninstall three @types/three
```

Expected: `package.json` no longer lists `three` in `dependencies` or `@types/three` in `devDependencies`. `package-lock.json` updates.

- [ ] **Step 2: Confirm build still works**

```bash
npx astro build
```
Expected: build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove three.js dependency (replaced by Canvas 2D fallback)"
```

---

### Task 4: Manual browser verification

**Files:** none

- [ ] **Step 1: Force the fallback path**

In `src/layouts/Base.astro`, temporarily change the particle init to always use the fallback:

```typescript
// Change this block (lines ~72-77):
const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
if (canvas) {
  new ParticleSystem(canvas).init().then((ps) => {
    (window as any).particleSystem = ps;
  }).catch(() => {
    (window as any).particleSystem = new ParticleFallback(canvas);
  });
}
```

To force fallback by making `ParticleSystem.init()` always reject:

```typescript
const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
if (canvas) {
  // TEMP: force fallback for testing
  Promise.reject().catch(() => {
    new ParticleFallback(canvas).init().then((fb) => {
      (window as any).particleSystem = fb;
    });
  });
}
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

Open `http://localhost:4321` in a browser that supports Canvas 2D (any browser).

- [ ] **Step 3: Verify the cinematic sequence**

Watch the full sequence and confirm each phase:

| Time | Expected |
|------|----------|
| 0–1.5s | DOM text "Sankalp Krish" types out; no particles visible |
| 1.5s | Canvas fades in; particles already formed in text shape behind DOM text |
| 2.5s | DOM text fades out; particles remain as the text (dissolve effect) |
| 3s | Particles migrate toward center and form Sans pixel-art face with colors |
| 6s | Particles disperse (drift away randomly); canvas fades out |
| 7s | Terminal window appears |

- [ ] **Step 4: Revert the forced fallback**

Restore `Base.astro` to the original try/catch pattern:

```typescript
const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
if (canvas) {
  new ParticleSystem(canvas).init().then((ps) => {
    (window as any).particleSystem = ps;
  }).catch(() => {
    new ParticleFallback(canvas).init().then((fb) => {
      (window as any).particleSystem = fb;
    });
  });
}
```

Note the `.then((fb) => ...)` wrapper — `init()` is now async on the fallback too, so we await it before storing on `window`.

- [ ] **Step 5: Confirm WebGPU path still works**

Reload in a WebGPU-capable browser (Chrome 113+). Verify the original WebGPU cinematic sequence is unaffected.

- [ ] **Step 6: Commit Base.astro fix**

```bash
git add src/layouts/Base.astro
git commit -m "fix: await ParticleFallback.init() before storing on window"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| Same 3-phase timing as WebGPU | Task 2 — `attract` fade at 2s, `setPhase(2/3)` from TerminalWindow unchanged |
| `setPhase()` public API | Task 2 — method implemented |
| Particles pre-positioned on text targets | Task 2 — init loop sets `x/y` to text target positions |
| Text target extraction via Canvas 2D | Task 2 — `sampleTextTargets()` |
| Sans target extraction from sans.png | Task 2 — `sampleSansTargets()` |
| Sans targets in viewport-space [0-1] | Task 2 — `0.5 + (x - w/2) / window.innerWidth` |
| Pixel-accurate tight formation (option A) | Task 2 — spring stiffness 0.08, damping 0.85 |
| Spring physics with damping | Task 2 — `fx = (tx - x) * attract * stiffness; vx = (vx + fx) * damping` |
| Phase 3: random drift | Task 2 — `fx = (Math.random() - 0.5) * 0.001` |
| `destroy()` cleans up | Task 2 — cancels RAF and intervals |
| Three.js removal | Task 3 |
| `devicePixelRatio` canvas sizing | Task 2 — `resize()` method |

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency check:**
- `sampleTextTargets` returns `Float32Array` — consumed as `textTargets[i * 2]` ✓
- `sampleSansTargets` returns `{ tx: Float32Array, colors: Uint8Array }` — destructured correctly ✓
- `setPhase(phase: number)` matches what `TerminalWindow.astro` calls ✓
- `init()` returns `Promise<this>` — Base.astro updated in Task 4 to `.then((fb) => ...)` ✓

**One edge case noted:** `Base.astro` currently stores the fallback as `(window as any).particleSystem = new ParticleFallback(canvas)` synchronously — but with the rewrite, `init()` is async. Task 4 Step 4 fixes this by awaiting `.init()` before the window assignment.
