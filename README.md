# sankalpkrish.com

Personal portfolio site for Sankalp Krishnamurthy. Built as a single-page terminal interface styled after a developer tool, running entirely in the browser with no backend.

Live site: [sankalpkrish.com](https://sankalpkrish.com)

---

## Getting Started

View the site live at [sankalpkrish.com](https://sankalpkrish.com). Type `/help` in the terminal to see available commands.

For development:

```bash
bun install
bun run dev       # http://localhost:4321
```

---

## Features

- **WebGPU Particle System** - Animated particle effects that form text and logo from thousands of particles with compute shader physics
- **Terminal Interface** - CLI-style navigation with command history, autocomplete, and typewriter output
- **Static Deployment** - No server or database; runs entirely in the browser and deploys to Cloudflare Pages
- **Responsive Design** - Glassmorphic terminal window adapts to all screen sizes
- **SEO Optimized** - Open Graph tags, Twitter Cards, and schema.org Person structured data
- **Browser Fallback** - Three.js fallback rendering for browsers without WebGPU support

---

## Overview

The site presents itself as an interactive terminal. On load, a WebGPU particle system forms the name "Sankalp Krish" from thousands of animated particles, then a splash screen renders inside a glassmorphic terminal window. The user navigates the portfolio by typing commands.

Everything is static. There is no server, no database, and no runtime.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6 (static output) |
| Language | TypeScript |
| Styling | Plain CSS with Catppuccin Mocha design tokens |
| Particles | WebGPU (compute + render pipeline), Three.js WebGL fallback |
| Animation | GSAP |
| Fonts | JetBrains Mono (Google Fonts) |
| Hosting | Cloudflare Pages |
| Package manager | Bun |

---

## Commands

The terminal accepts the following commands:

| Command | Description |
|---|---|
| `/about` | Background, education, and interests |
| `/projects` | Projects with descriptions and tech tags |
| `/skills` | Skill tree with proficiency levels |
| `/contact` | Email, LinkedIn, and GitHub links |
| `/open [name]` | Open a named project on GitHub |
| `/clear` | Clear the terminal output |
| `/help` | Show the command list |

Arrow Up / Arrow Down navigates command history. The splash screen runs automatically on load and is not user-typeable. Unknown commands return a randomised error message.

---

## Project Structure

```
src/
  canvas/
    ParticleSystem.ts       WebGPU particle system with three phases:
                              1 - particles form "Sankalp Krish" text
                              2 - particles form the Sans logo
                              3 - particles disperse
    ParticleFallback.ts     Three.js fallback for non-WebGPU browsers
    SansLogo.ts             Canvas renderer for the pixel-art Sans icon
                            with hover speech bubble (Undertale-styled quips)
  terminal/
    TerminalEngine.ts       Input, history, command dispatch,
                            typewriter output, and auto-run on load
    typewriter.ts           Per-character DOM streaming with variable delay
    commands.ts             Command registry
    commands/
      splash.ts             Splash screen with Sans canvas and command index
      about.ts              Bio, education timeline, interests
      projects.ts           Project cards (MIDI.ai, OpenComputer,
                            The Procrastination Engine)
      skills.ts             Skill tree: languages, frameworks, cloud, data
      contact.ts            Contact links
      help.ts               Help output (mirrors splash)
      open.ts               Opens a named project URL in a new tab
  layouts/
    Base.astro              HTML shell, Open Graph tags, schema.org Person,
                            particle canvas, trailing cursor dot
  components/
    TerminalWindow.astro    Terminal chrome (titlebar, output, input),
                            Sans logo in titlebar, particle phase triggers
  styles/
    tokens.css              Catppuccin Mocha CSS custom properties
    global.css              Reset, body, particle canvas, cursor dot
    terminal.css            Terminal window and output block styles
    animations.css          GSAP-driven entrance animations
  pages/
    index.astro             Entry point, composes Base + TerminalWindow

public/
  sans.png                  Source pixel-art Sans sprite (480x480)
  og-banner.png             Generated OG banner (1200x630)
  favicon.svg / favicon.ico
  shaders/
    particle.compute.wgsl   WebGPU compute shader (particle physics)
    particle.render.wgsl    WebGPU render shader (point rendering)

scripts/
  gen-og-banner.mjs         Bun script to regenerate og-banner.png
                            Uses sharp + embedded JetBrains Mono Bold
```

---

## SEO

- Open Graph tags target a 1200x630 banner image
- Twitter Card type is `summary_large_image`
- `schema.org/Person` structured data in `<head>` with name, jobTitle, worksFor, email, and `sameAs` links to GitHub and LinkedIn
- Canonical URL: `https://sankalpkrish.com/`

---

## OG Banner

`public/og-banner.png` is a static 1200x630 PNG committed to the repository. To regenerate it:

```bash
bun scripts/gen-og-banner.mjs
```

The script downloads JetBrains Mono Bold on first run and caches it at `scripts/.jetbrains-mono-bold.ttf`. It uses `sharp` (devDependency) for compositing.

---

## Development

```bash
bun install
bun run dev       # http://localhost:4321
bun run build     # static output to dist/
bun run preview   # preview the build locally
```

Node >= 22.12.0 required if not using Bun.

---

## Deployment

Deployed to Cloudflare Pages. Push to `master` triggers a production build. `wrangler.toml` in the root configures the Pages project.

`dev` is the active development branch. Pull requests merge `dev` into `master`.

---

## Design Notes

**Catppuccin Mocha** is the colour system throughout. CSS custom properties are defined in `tokens.css` and referenced everywhere else.

**WebGPU particles** run two compute phases before settling. If WebGPU is unavailable (Safari, older Chromium), `ParticleFallback` renders an equivalent Three.js scene.

**Sans (Undertale)** appears as the site mascot in three places: the titlebar logo (24x24 canvas), the splash screen (80x80 canvas), and the OG banner (200x200 scaled from the 480x480 source PNG). Image rendering is set to `pixelated` everywhere to preserve the pixel-art look at all sizes. Hovering the titlebar logo shows a speech bubble with randomised Undertale-style quips.

**Typewriter output** streams per-character into the DOM at 4ms intervals after each command runs.

---

## Resources

- Repository: [github.com/SankalpKrish/Portfolio-Site](https://github.com/SankalpKrish/Portfolio-Site)
- Live Site: [sankalpkrish.com](https://sankalpkrish.com)
- Hosted on: [Cloudflare Pages](https://pages.cloudflare.com)
- Design System: [Catppuccin](https://catppuccin.com) (Mocha variant)
- Fonts: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)

---

## Browser Support

Requires a modern browser with ES2020+ support. WebGPU is supported in Chrome 113+, Edge 113+, and Chrome on Android. Older browsers and Safari fall back to Three.js WebGL rendering with equivalent particle effects.
