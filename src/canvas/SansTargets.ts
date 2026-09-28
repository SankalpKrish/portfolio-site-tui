// src/canvas/SansTargets.ts

export interface SansSpriteTargets {
  /** Valid entries in tx, ty and rgb. */
  count: number;
  /** Device pixels covered by one sprite pixel, per axis. Always a whole number. */
  scale: number;
  /** Viewport-fraction position of each target. */
  tx: Float32Array;
  ty: Float32Array;
  /** Straight sprite colour per target, three bytes per entry. */
  rgb: Uint8Array;
}

const SPRITE_SRC = '/sans.png';

// Share of the viewport the mascot is allowed to take. Measured against device
// pixels, not CSS pixels: the mascot is pixel art, so it belongs to the device
// grid and must never be resampled onto the CSS grid at a fractional ratio.
const VIEWPORT_SHARE = 0.25;

function loadSprite(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load sans.png'));
    img.src = SPRITE_SRC;
  });
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export async function buildSansSpriteTargets(budget: number): Promise<SansSpriteTargets> {
  const img = await loadSprite();
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Browsers only expose decoded sprite pixels through a canvas. It is sized to
  // the sprite before the read, so the sample is never taken from a 0x0 surface.
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('Sans sprite sampling needs a 2D context');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;

  const litX: number[] = [];
  const litY: number[] = [];
  const litR: number[] = [];
  const litG: number[] = [];
  const litB: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] <= 128) continue;
      litX.push(x);
      litY.push(y);
      litR.push(px[i]);
      litG.push(px[i + 1]);
      litB.push(px[i + 2]);
    }
  }
  if (litX.length === 0) {
    // An unreadable sprite must still give the particle system a target, or the
    // whole field collapses onto the origin.
    litX.push((w - 1) / 2);
    litY.push((h - 1) / 2);
    litR.push(255);
    litG.push(255);
    litB.push(255);
  }
  const spritePixels = litX.length;

  const dpr = window.devicePixelRatio || 1;
  const deviceW = window.innerWidth * dpr;
  const deviceH = window.innerHeight * dpr;

  // One sprite pixel must cover a whole number of device pixels. A fractional
  // cover leaves some sprite rows sitting between device rows: one row wins,
  // its neighbour is dropped, and the mascot renders as horizontal scanline
  // smear. Crispness therefore outranks size, and the particle budget caps the
  // scale because a WebGPU point is exactly one device pixel.
  const wanted = Math.round((deviceW * VIEWPORT_SHARE) / Math.max(w, h));
  const affordable = Math.floor(Math.sqrt(budget / spritePixels));
  const scale = Math.max(1, Math.min(wanted, affordable));

  // A budget too small for the full sprite thins it evenly rather than cutting
  // the tail off, which would slice a hard horizontal seam across the mascot.
  const cells = spritePixels * scale * scale;
  const step = Math.max(1, Math.ceil(cells / budget));
  const count = Math.ceil(cells / step);

  // Fitted on whole device pixels so a sprite block never antialiases across a
  // pixel edge, at the cost of at most half a device pixel of centring error.
  const originX = Math.floor((deviceW - w * scale) / 2);
  const originY = Math.floor((deviceH - h * scale) / 2);
  const half = scale / 2;

  const tx = new Float32Array(count);
  const ty = new Float32Array(count);
  const rgb = new Uint8Array(count * 3);

  for (let n = 0; n < count; n++) {
    const cell = n * step;
    const p = cell % spritePixels;
    const sub = Math.floor(cell / spritePixels);
    // A viewport narrower than the sprite would push targets outside 0..1, and
    // the compute shader wraps out-of-range positions to the opposite edge.
    tx[n] = clamp01((originX + litX[p] * scale + (sub % scale) + half) / deviceW);
    ty[n] = clamp01((originY + litY[p] * scale + Math.floor(sub / scale) + half) / deviceH);
    rgb[n * 3] = litR[p];
    rgb[n * 3 + 1] = litG[p];
    rgb[n * 3 + 2] = litB[p];
  }

  return { count, scale, tx, ty, rgb };
}
