# Portfolio Site Terminal Redesign — Design Spec
**Date:** 2026-05-26  
**Status:** Approved

---

## Overview

Collapse the current 5-section scrolling portfolio into a single glassmorphic terminal window centered over a full-viewport WebGPU particle background. All content loads inside the terminal via typed commands, exactly like a CLI. On page load, a splash screen auto-plays showing a Sans (Undertale) pixel-art logo and the available commands — no user input required to see the startup experience.

---

## Architecture

### Files Deleted
- `src/components/sections/Hero.astro`
- `src/components/sections/About.astro`
- `src/components/sections/Projects.astro`
- `src/components/sections/Skills.astro`
- `src/components/sections/Contact.astro`
- `src/canvas/ScrollState.ts`
- `src/canvas/previews/ProjectPreview.ts`
- `src/canvas/previews/WaveformPreview.ts`
- `src/canvas/previews/NodeGraphPreview.ts`
- `src/canvas/previews/ClockPreview.ts`

### Files Modified
| File | Change |
|------|--------|
| `src/pages/index.astro` | Stripped to single `<TerminalWindow>` filling viewport; GSAP ScrollTrigger removed |
| `src/components/TerminalWindow.astro` | Repurposed as single full-viewport terminal; `sectionId`/`tab` props removed; Sans canvas logo slot added to titlebar |
| `src/terminal/TerminalEngine.ts` | Add `autoRun('splash')` on init; remove `result.navigate` scroll block |
| `src/terminal/commands.ts` | Thin registry importing from per-command modules; `navigate` field removed from `CommandResult` |
| `src/styles/terminal.css` | Updated for single-window centered island layout; input row pinned to bottom |
| `src/styles/animations.css` | Simplified — scroll-triggered animations removed |
| `src/canvas/ParticleSystem.ts` | Remove `ScrollState` import; SDF text convergence on load unchanged |

### Files Added
| File | Purpose |
|------|---------|
| `src/canvas/SansLogo.ts` | Loads `public/sans.png`, renders to `<canvas>` at nearest-neighbor scaling |
| `src/terminal/commands/splash.ts` | Auto-run startup output: logo + version + command list |
| `src/terminal/commands/about.ts` | `/about` command output |
| `src/terminal/commands/projects.ts` | `/projects` command output (full project list) |
| `src/terminal/commands/skills.ts` | `/skills` command output (full skill list) |
| `src/terminal/commands/contact.ts` | `/contact` command output |
| `src/terminal/commands/help.ts` | `/help` command output |
| `src/terminal/commands/open.ts` | `/open [name]` command — open project on GitHub |
| `public/sans.png` | Copy of `C:\Users\sanka\Pictures\Sans_pfp_nobg.png` |

---

## Terminal Layout & Styling

**Position:** `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 10`  
**Size:** `width: min(900px, 88vw); height: 85vh`  
**Body background:** `rgba(30, 30, 46, 0.65)` with `backdrop-filter: blur(16px)` — glassmorphic, particles shimmer through  
**Border:** `1px solid rgba(180, 190, 254, 0.18)`  
**Font:** JetBrains Mono 13px / line-height 1.7  
**Padding:** `20px 24px`

**Titlebar:**
- Existing traffic-light buttons + tab chrome retained
- Sans pixel-art canvas rendered as `<canvas id="sans-logo-titlebar" class="sans-logo-canvas" width="32" height="32">` directly in the component markup (not a slot) — `SansLogo.render('#sans-logo-titlebar')` called on DOMContentLoaded
- Tab label: `sankalpkrish.com`
- IST clock in statusbar: unchanged

**Terminal body layout:**
- Output area: `overflow-y: auto`, custom scrollbar in Catppuccin Mocha overlay colors, grows upward as commands accumulate
- Input row: pinned to the bottom of the terminal body (not the statusbar). Prompt symbol `❯` (green), input field fills remaining width, blinking block cursor. Always visible.

**Particle canvas:** `position: fixed; inset: 0; z-index: 0` — behind everything. SDF "Sankalp Krish" text convergence on load unchanged.  
**Cursor dot:** `z-index: 20` — above everything.

---

## Splash Screen

Auto-runs on page load via `TerminalEngine` calling `autoRun('splash')` after construction. Types in via the existing `typewriter()` function.

**Layout (logo-left, text-right):**
```
[32×32 Sans canvas]    Sankalp Krish  v1.0.0
                       Digital Transformation · Atria University
                       ──────────────────────────────────────
                       /about    → who I am
                       /projects → things I've built
                       /skills   → what I know
                       /contact  → get in touch
                       /open [n] → open a project
                       /clear    → clear terminal
                       /help     → show this again
```

The two columns sit in a `display: flex; gap: 24px` wrapper inside `.cc-output-block`.

**Canvas injection:** The `<canvas id="sans-logo" class="sans-logo-canvas">` element is embedded in the splash HTML string. After `typewriter()` completes, `SansLogo.render('#sans-logo')` is called — it loads `public/sans.png` via `new Image()`, draws it to the canvas with `imageSmoothingEnabled: false` (nearest-neighbor pixel fidelity, cyan eyes intact).

---

## Sans Logo Hover Speech Bubble

Both the titlebar canvas (`#sans-logo-titlebar`) and the splash canvas (`#sans-logo`) show a speech bubble on hover.

**Content:** One of several rotating quips, randomly selected on each hover:
- "your mouse is no good here."
- "try using your keyboard."
- "heh. you really thought clicking me would do something?"
- "* sans is judging your mouse usage."
- "wrong input device, pal."

**Appearance:** Pixel-art / Undertale-style speech bubble — white background, 2px solid black border, no border-radius (hard pixel edges), black monospace text, small downward-left triangle tail pointing at the canvas. Positioned above the canvas, centered horizontally.

**Implementation:** A single `<div id="sans-speech-bubble">` appended to `<body>`, absolutely positioned via JS on each mouseenter. `SansLogo.ts` exports an `initHover()` function that wires mouseenter/mouseleave on all `.sans-logo-canvas` elements. Called once on DOMContentLoaded. CSS transition: `opacity 0.15s` fade in/out. No animation on the bubble itself — instant pop-up matches Undertale's dialog style.

---

## Command System

### Registry (`src/terminal/commands.ts`)
```ts
import { splash }   from './commands/splash';
import { help }     from './commands/help';
import { about }    from './commands/about';
import { projects } from './commands/projects';
import { skills }   from './commands/skills';
import { contact }  from './commands/contact';
import { open }     from './commands/open';

export const COMMANDS: Record<string, CommandHandler> = {
  'splash':    splash,   // internal only — no slash, not user-typeable
  '/help':     help,
  '/about':    about,
  '/projects': projects,
  '/skills':   skills,
  '/contact':  contact,
  '/open':     open,
  '/clear':    () => ({ html: '__CLEAR__' }),
};
```

### `CommandResult` interface
```ts
export interface CommandResult {
  html: string;
  // navigate field removed — no scroll targets
}
```

### Per-command module shape
```ts
// src/terminal/commands/about.ts
import type { CommandHandler } from '../commands';
export const about: CommandHandler = () => ({ html: `...` });
```

### Behavior
- All output **appends** to terminal history — no replace/clear on command run
- `/clear` clears output as before
- `unknownCommandResult` joke errors unchanged
- Arrow-key history, XSS-safe echo, typewriter speed — all unchanged
- `splash` is not accessible by typing it — `unknownCommandResult` handles any unrecognized input

### Content
- `/about` — existing content from `About.astro` (education timeline, hobbies) as `.cc-*` HTML
- `/projects` — full project list with descriptions and `/open` hints (currently stubbed)
- `/skills` — full skill list (currently stubbed)
- `/contact` — existing content from `Contact.astro`
- `/help` — updated command list matching new registry

---

## What Does Not Change

- `src/terminal/typewriter.ts` — untouched
- `src/canvas/ParticleSystem.ts` — only `ScrollState` import removed; all GPU logic untouched
- `src/canvas/ParticleFallback.ts` — untouched
- `src/styles/tokens.css` — untouched (Catppuccin Mocha tokens)
- `src/styles/global.css` — untouched
- `src/layouts/Base.astro` — untouched
- `.cc-*` CSS classes in `terminal.css` — all preserved, command output HTML uses them
- Trailing cursor dot animation — untouched
- Deployment config (`wrangler.toml`, `astro.config.mjs`) — untouched

---

## Out of Scope

- Contact form / `/api/contact` serverless handler — kept as-is, wired in `/contact` command output
- Any new commands beyond the existing 7
- Mobile layout (not addressed in this redesign)
- Accessibility beyond existing patterns
