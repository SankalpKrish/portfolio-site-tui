# sankalpkrish.com

Personal portfolio site built as an interactive developer terminal. WebGPU particle system, client-side terminal emulator, pixel-art mascot — all static, no backend.

Live site: [sankalpkrish.com](https://sankalpkrish.com)

## Stack

- **Framework:** Astro (static output)
- **Particles:** WebGPU compute shaders (WGSL) with Canvas 2D fallback
- **Terminal:** Custom CLI emulator with typewriter output
- **Mascot:** Sans from Undertale with hover speech bubble
- **Design:** Catppuccin Mocha via CSS custom properties
- **Deployment:** Cloudflare Pages (auto-deploy on push to `master`)

## Commands

| Command | Output |
|---|---|
| `/about` | Background, education, interests |
| `/projects` | Project cards with tech tags |
| `/skills` | Skill tree with proficiency bars |
| `/contact` | Email, LinkedIn, GitHub |
| `/open [name]` | Opens a project on GitHub |
| `/clear` | Clears terminal |
| `/help` | Command index |

## Development

```bash
bun install
bun run dev       # local server at :4321
bun run build     # static output to dist/
bun run preview   # preview production build
```

Node >= 22.12.0 required if not using Bun.

## Structure

| Module | What it does |
|---|---|
| `src/canvas/ParticleSystem.ts` | WebGPU compute + render pipeline |
| `src/canvas/ParticleFallback.ts` | Canvas 2D fallback |
| `src/canvas/SansLogo.ts` | Pixel-art mascot + speech bubble |
| `src/terminal/TerminalEngine.ts` | Input, history, dispatch, typewriter |
| `src/terminal/commands/*.ts` | Individual command handlers |
| `src/layouts/Base.astro` | HTML shell, meta tags, particle canvas |
| `public/shaders/` | WGSL shaders |
