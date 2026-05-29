# sankalpkrish.com

sankalpkrish.com is a personal portfolio site built to explore the boundaries of what a static, client-side web application can do. Rather than a conventional portfolio layout, the site presents itself as an interactive developer terminal — a deliberate aesthetic and UX choice that reflects the kind of work it showcases.

Designed as a demonstration of frontend engineering depth, this repository integrates a custom WebGPU particle system, a fully client-side terminal emulator, and a pixel-art mascot engine — all compiled to a static bundle with no backend.

Live site: [sankalpkrish.com](https://sankalpkrish.com)

## Project Overview

The primary objective was to build a portfolio that functions as a project in its own right. The design solves a specific UX problem: how to present technical depth without overwhelming the visitor. The answer is progressive disclosure via a CLI — the visitor decides what to explore, and the site responds with structured, typewritten output.

The architecture prioritises three constraints:

1. Zero runtime — the entire site is pre-compiled to static HTML, CSS, and JS.
2. Visual fidelity — WebGPU particle physics runs at the GPU level for smooth 60fps animation.
3. Graceful degradation — if WebGPU is unavailable, a Canvas 2D fallback replicates the full particle lifecycle.

## Technical Methodology

The site loads through a sequence of orchestrated systems before handing control to the user.

### 1. Particle Animation (WebGPU)

On load, a **WebGPU compute + render pipeline** spawns thousands of particles and drives them through three sequential phases. A WGSL compute shader handles per-particle physics each frame: attraction forces pull particles toward target positions that spell "Sankalp Krish", then reform into the Sans logo, then disperse. The render shader draws each particle as a coloured point primitive. No JavaScript runs in the physics loop — only GPU-side computation.

### 2. Canvas 2D Fallback (ParticleFallback)

For browsers without WebGPU support (Safari, older Chromium), **ParticleFallback** replicates the full three-phase particle lifecycle using the Canvas 2D API. Target positions for both the text and logo phases are extracted from `OffscreenCanvas` pixel data at runtime. The fallback exposes the same `setPhase()` interface as the WebGPU system, allowing the cinematic sequence orchestrator to drive both implementations identically.

### 3. Terminal Engine

The **TerminalEngine** is a purpose-built CLI emulator. It handles keystroke capture, command history (Arrow Up / Down), partial-match autocomplete, and dispatch to a typed command registry. Output is streamed into the DOM per-character via a typewriter module at 4ms intervals. The engine auto-runs the splash sequence on load without user input.

### 4. Command System

Each command is a pure TypeScript function returning an HTML string. The registry maps command names to handlers. Commands are stateless and composable — `/help` reuses the same output structure as `/splash`. The `/open` command resolves named projects to their GitHub URLs and opens them in a new tab.

### 5. Pixel-Art Mascot (SansLogo)

**Sans from Undertale** appears as the site mascot across three surfaces: the 24×24 titlebar canvas, the 80×80 splash canvas, and the 200×200 OG banner. Each canvas renderer scales the 480×480 source PNG with `image-rendering: pixelated` to preserve the sprite aesthetic. Hovering the titlebar logo triggers a speech bubble with randomised Undertale-style quips, implemented as a DOM overlay driven by mouse events.

### 6. SEO & Structured Data

Open Graph tags target a static 1200×630 banner. A `schema.org/Person` JSON-LD block in `<head>` provides structured data for name, job title, organisation, email, and `sameAs` links to GitHub and LinkedIn.

## Software Architecture

The source is organised into focused modules, each with a single responsibility.

| Module | Responsibility |
|---|---|
| `src/canvas/ParticleSystem.ts` | WebGPU compute + render pipeline, three-phase particle physics |
| `src/canvas/ParticleFallback.ts` | Canvas 2D fallback with parity phase interface |
| `src/canvas/SansLogo.ts` | Pixel-art canvas renderer and hover speech bubble |
| `src/terminal/TerminalEngine.ts` | Input capture, history, dispatch, typewriter output |
| `src/terminal/typewriter.ts` | Per-character DOM streaming |
| `src/terminal/commands.ts` | Command registry and type definitions |
| `src/terminal/commands/*.ts` | Individual command handlers (splash, about, projects, skills, contact) |
| `src/layouts/Base.astro` | HTML shell, meta tags, schema.org, particle canvas |
| `src/components/TerminalWindow.astro` | Terminal chrome, titlebar, phase trigger wiring |
| `src/styles/` | Catppuccin Mocha design tokens, reset, terminal styles, GSAP animations |
| `public/shaders/` | WGSL compute and render shaders |
| `scripts/gen-og-banner.mjs` | Bun script to regenerate the OG banner PNG |

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/SankalpKrish/portfolio-site.git
    cd portfolio-site
    ```
2. Install dependencies:
    ```bash
    bun install
    ```

## Usage

```bash
bun run dev       # development server at http://localhost:4321
bun run build     # static output to dist/
bun run preview   # preview the production build locally
```

Node >= 22.12.0 is required if not using Bun.

**Terminal Commands**

| Command | Output |
|---|---|
| `/about` | Background, education timeline, and interests |
| `/projects` | Project cards with descriptions and tech tags |
| `/skills` | Skill tree with segmented proficiency bars |
| `/contact` | Email, LinkedIn, and GitHub links |
| `/open [name]` | Opens a named project on GitHub |
| `/clear` | Clears terminal output |
| `/help` | Displays the command index |

## Deployment

Deployed to **Cloudflare Pages**. Pushing to `master` triggers a production build. `wrangler.toml` configures the Pages project name and build output directory.

## Design Notes

**Catppuccin Mocha** is the colour system throughout. CSS custom properties are defined in `tokens.css` and consumed globally — no hardcoded hex values appear outside that file.

**OG Banner** is a static 1200×630 PNG committed to the repository. To regenerate it after design changes:

```bash
bun scripts/gen-og-banner.mjs
```

The script downloads JetBrains Mono Bold on first run and caches it at `scripts/.jetbrains-mono-bold.ttf`. It uses `sharp` for compositing.

## Browser Support

Requires a modern browser with ES2020+ support. WebGPU is available in Chrome 113+, Edge 113+, and Chrome on Android. Safari and older browsers receive the Canvas 2D fallback with full visual parity.

## Future Improvements

- Add WebGPU support detection telemetry to measure real-world fallback rate.
- Extend the command system with a `/now` command showing current focus and availability.
- Explore WebGPU compute for audio-reactive particle behaviour tied to ambient sound.
- Add keyboard shortcut hints to the splash screen for discoverability.
