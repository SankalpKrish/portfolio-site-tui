# Particle Fallback Parity Design

**Date:** 2026-05-28
**Status:** Approved

## Problem

When WebGPU is unavailable, `ParticleFallback` renders 50k randomly scattered particles with a slow rotation and no phase awareness. The cinematic sequence in `TerminalWindow.astro` calls `setPhase()` at 3s and 6s — the fallback ignores these calls entirely. Result: particles appear as a static random field, then vanish abruptly when the canvas fades out. The WebGPU path has a rich 3-phase dissolve; the fallback has none.

## Goal

Make `ParticleFallback` match the WebGPU cinematic sequence in behavior and timing. The `TerminalWindow.astro` orchestration script must require zero changes.

## Cinematic Sequence (unchanged)

| Time | Event |
|------|-------|
| 0ms  | Particles init, pre-positioned on text targets (invisible, canvas opacity 0) |
| 1500ms | Canvas fades in (`opacity: 0.85`) — particles already formed behind DOM text |
| 2500ms | DOM intro text fades out — seamless dissolve illusion |
| 3000ms | `setPhase(2.0)` — attract reactivated, particles migrate to Sans logo targets |
| 6000ms | `setPhase(3.0)` — attract → 0, particles disperse; canvas fades out |
| 7000ms | Terminal window appears |
| 8500ms | `destroy()` called — animation loop stopped |

## Architecture

### `ParticleFallback` refactor

Replace the current Three.js implementation with a plain Canvas 2D particle system. Three.js is removed as a dependency for this class.

**State:**
```
phase: number       // 1.0 = text, 2.0 = sans logo, 3.0 = disperse
attract: number     // 0–1 scalar, lerped per phase
N: 50_000           // particle count (Canvas 2D budget)
```

**Particle layout (per particle, JS arrays):**
```
x, y         — current position (normalized 0–1)
vx, vy       — velocity
tx, ty       — current target position (normalized 0–1)
r, g, b      — color (0–255)
```

**Public API** (matches what `TerminalWindow.astro` already calls):
```ts
setPhase(phase: number): void
destroy(): void
```

### Target extraction (Canvas 2D, same approach as `ParticleSystem.ts`)

**Text targets** (`generateTextTargets`):
- Render "Sankalp Krish" to an offscreen canvas at full viewport size
- Match font/size/weight/letterSpacing from `#intro-text` computed style
- Sample pixels with alpha > 128, return normalized `[x, y]` pairs

**Sans targets** (`generateSansTargets`):
- Load `sans.png`, draw to offscreen canvas at native resolution
- Sample pixels with alpha > 128
- Return viewport-normalized `[tx, ty]` (image centered at 0.5, 0.5 of viewport; pixel offsets divided by viewport dimensions) plus `[r, g, b]` color
- Unlike the WebGPU version which uses image-center-relative coordinates (for GPU shader math), the fallback converts directly to viewport-space `[0–1, 0–1]` so all target arrays share the same coordinate space

Both functions are async, called during `init()`. Particles start pre-positioned on text targets identical to the WebGPU init path.

### Physics (per frame)

Applied each animation frame for all N particles:

```
if phase !== 3.0:
  fx = (tx - x) * attract * stiffness   // spring toward target
  fy = (ty - y) * attract * stiffness
else:
  fx = random_nudge * 0.001             // random drift when dispersing
  fy = random_nudge * 0.001

vx = (vx + fx) * damping               // damping = 0.85
vy = (vy + fy) * damping

x += vx
y += vy
```

Constants: `stiffness = 0.08`, `damping = 0.85`.

When `phase === 3.0`, attraction is 0 and particles receive small random impulses each frame to drift apart naturally.

### Phase transitions

**Phase 1 → idle (attract fade):**
- After 2s, `attract` lerps from 1.0 → 0 over 1s via `setInterval` (same timing as WebGPU path)
- Particles settle loosely around text positions then drift gently

**Phase 2 (`setPhase(2.0)`):**
- Set `tx/ty` for all particles to Sans logo targets (pre-loaded)
- Set `attract = 1.0` immediately
- Particles migrate from wherever they are toward the Sans logo shape

**Phase 3 (`setPhase(3.0)`):**
- Set `attract = 0.0` immediately
- Clear any attract-fade interval

### Render loop

```ts
ctx.clearRect(0, 0, canvas.width, canvas.height)

for each particle:
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
  ctx.globalAlpha = 0.75
  ctx.fillRect(x * W - 0.75, y * H - 0.75, 1.5, 1.5)
```

Background clear is transparent (`clearRect`) — the CSS `background: var(--crust)` on `body` provides the dark background, same visual result as the WebGPU clear color.

Pixel size: 1.5×1.5px per particle at 1.5px rendered size.

Canvas is sized via `devicePixelRatio` (same as `ParticleSystem`).

## Files Modified

| File | Change |
|------|--------|
| `src/canvas/ParticleFallback.ts` | Full rewrite — replace Three.js impl with Canvas 2D phase-aware system |

## Files Unchanged

| File | Reason |
|------|--------|
| `src/layouts/Base.astro` | Fallback instantiation unchanged |
| `src/components/TerminalWindow.astro` | All `setPhase()` and timing unchanged |
| `src/canvas/ParticleSystem.ts` | WebGPU path unchanged |

## Dependencies

Three.js (`three`) was only used by `ParticleFallback`. After this change it is unused. Remove it from `package.json` unless used elsewhere.

## Performance Notes

- 50k particles × Canvas 2D `fillRect` per frame: ~4–6ms on mid-range hardware, well within 16ms frame budget
- `fillStyle` assignment is the main cost — batching by color would help but adds complexity; skip for now, profile if needed
- `devicePixelRatio` capped at 2 for retina screens (same as current impl)
