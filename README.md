# sankalpkrish.com

Personal portfolio site built as an interactive developer terminal. WebGPU particle system, client-side terminal emulator, pixel-art mascot.

The site itself is fully static — no server, no adapter, no backend of its own. The one exception is `/ask`, which calls a separate Cloudflare Worker. See [ask-sankalp](ask-sankalp/).

Live site: [tui.sankalpkrish.com](https://tui.sankalpkrish.com)

Note: `sankalpkrish.com` is a **different project** (the React "Portfolio Site Main" repo), not
this one. This repo is the Astro terminal and deploys to the `tui.` subdomain via the
`portfolio-site-tui` Pages project.

## Stack

- **Framework:** Astro (static output)
- **Particles:** WebGPU compute shaders (WGSL) with Canvas 2D fallback
- **Terminal:** Custom CLI emulator with typewriter output
- **Mascot:** Sans from Undertale with hover speech bubble
- **Design:** Catppuccin Mocha via CSS custom properties
- **`/ask`:** Cloudflare Worker (Free plan) — hybrid BM25 + Vectorize retrieval over a hand-written corpus, chat via a free-tier provider, answers streamed and cited
- **Deployment:** Cloudflare Pages (auto-deploy on push to `master`)

## Commands

| Command | Output |
|---|---|
| `/about` | Background, education, interests |
| `/projects` | Project cards with tech tags |
| `/skills` | Skill tree with proficiency bars |
| `/contact` | Email, LinkedIn, GitHub |
| `/open [name]` | Opens a project on GitHub |
| `/ask [question]` | Asks a question; answered from a curated corpus, with citations |
| `/clear` | Clears terminal |
| `/help` | Command index |

## Development

```bash
bun install
bun run dev       # local server at :4321
bun run build     # static output to dist/
bun run preview   # preview production build
```

Node >= 22.18.0 required if not using Bun.

### ask-sankalp

The `/ask` Worker has its own loop. These need Cloudflare credentials (`.dev.vars` locally, or
`wrangler secret` on the deployed Worker) and are the only parts of this repo that touch the network.

```bash
npm run ingest            # content/*.md -> Vectorize + bundled BM25 index
npm run verify-index      # drift between content, manifest, bundle and the live index
npm run calibrate         # measure the vector threshold against known-good questions
npm run ask "..."         # hit the deployed Worker end to end
npm run test:retrieval    # hybrid retrieval, offline
npm run test:guardrails   # PII blocklist + trivial-question routing, offline
npm run typecheck:worker  # tsc against @cloudflare/workers-types
```

`npm run verify-index` is the one that catches what the tests cannot. The offline tests read the
bundled `corpus.json`, so they keep passing while the live index serves stale vectors. It checks
four things: that every `content/*.md` still hashes to what the manifest recorded, that
`corpus.json` matches the manifest, that the index's vector ids and the manifest agree in both
directions, and that the geometry is still 1024d cosine. The first two need no credentials; the
rest use the same token as the other scripts. `--deep` additionally re-embeds every chunk and
queries for it, which is the only way to catch an edit that was ingested but never upserted. It
costs one whole-index query per chunk, so its price tracks the square of the corpus size — about 2%
of the monthly Vectorize allocation at 25 chunks, and about 49% at the planned 120 — which is why it
is opt-in. Exit code is 1 on any drift, so it works as a pre-commit gate.

`npm run probe:models` and `npm run bench:models` re-measure the free-tier chat models. The free tier
rotates its model list, so re-run them rather than trusting the recorded choice. See
[ask-sankalp/PLAN.md](ask-sankalp/PLAN.md) for the design and
[ask-sankalp/probe/RESULTS.md](ask-sankalp/probe/RESULTS.md) for what was actually measured.

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
| `ask-sankalp/content/` | Hand-written corpus, one topic per file |
| `ask-sankalp/worker/` | Cloudflare Worker: retrieval, guardrails, streaming |
| `ask-sankalp/scripts/` | Ingest, calibration, model probes, offline tests |
