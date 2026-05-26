# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a glassmorphic Windows Terminal-style portfolio site with a WebGPU particle hero, Claude Code CLI-style interaction, and five content sections, using Astro + Bun + Three.js + native WebGPU.

**Architecture:** Astro 4 produces zero-JS static HTML by default; interactive canvas modules are plain TypeScript classes injected via Astro `<script>` tags. The WebGPU particle system runs in a full-screen background canvas that persists across all sections. Each of the five terminal window sections is a distinct Astro component that owns its content and mounts its own Three.js preview or GSAP animation.

**Tech Stack:** Astro 4, Bun, TypeScript, Three.js, WebGPU (native), GSAP + ScrollTrigger, JetBrains Mono (Google Fonts)

**Security note:** `innerHTML` is used in `TerminalEngine` and `typewriter` for CC-style formatted output. All HTML is authored — not from external sources. The only user-controlled string (the typed command) must be escaped before insertion: use `el.textContent = raw` for the echoed user turn, never `innerHTML`.

---

## File Map

```
src/
  canvas/
    ParticleSystem.ts        # WebGPU compute shader particle system + SDF text targeting
    ParticleFallback.ts      # Three.js Points fallback (50k particles) for non-WebGPU browsers
    ScrollState.ts           # Singleton: scroll progress shared between particle system and sections
    previews/
      ProjectPreview.ts      # Abstract base class for Three.js project preview scenes
      WaveformPreview.ts     # MIDI.ai — audio waveform bars (sine-animated)
      NodeGraphPreview.ts    # OpenComputer — floating node graph with pulsing edges
      ClockPreview.ts        # Procrastination Engine — recursive clock faces
  terminal/
    TerminalEngine.ts        # Command parser, typewriter output, history, command registry
    commands.ts              # All /command handlers returning CommandResult
    typewriter.ts            # Progressive character-by-character DOM renderer
  components/
    TerminalWindow.astro     # Reusable glassmorphic window chrome (titlebar + statusbar)
    sections/
      Hero.astro             # SK:// — whoami output, mounts ParticleSystem
      About.astro            # SK://about — /about output
      Projects.astro         # SK://projects — cinematic project list
      Skills.astro           # SK://skills — animated tree
      Contact.astro          # SK://contact — form + links
  layouts/
    Base.astro               # HTML shell, font link, global CSS vars, cursor dot
  styles/
    tokens.css               # Catppuccin Mocha CSS custom properties
    global.css               # Reset, body, scrollbar, reduced-motion
    terminal.css             # Terminal window chrome, prompt, output block styles
    animations.css           # GSAP-driven animation classes
pages/
  index.astro                # Assembles all 5 sections in order
public/
  shaders/
    particle.compute.wgsl    # WebGPU compute shader: drift + attraction + SDF convergence
    particle.render.wgsl     # WebGPU vertex+fragment: render particles as points
api/
  contact.ts                 # Vercel serverless function: receives POST, sends email via Resend
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via bun)
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Scaffold Astro project with Bun**

```bash
cd "C:\Users\sanka\Documents\GitHub\Portfolio Site"
bun create astro@latest . --template minimal --typescript strict --no-git --no-install
```

- [ ] **Step 2: Install dependencies**

```bash
bun add three gsap
bun add -d @types/three
```

- [ ] **Step 3: Replace astro.config.mjs contents**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  compressHTML: true,
});
```

- [ ] **Step 4: Verify tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.astro/
.env
.env.*
!.env.example
.superpowers/
```

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p src/canvas/previews src/terminal src/components/sections src/styles src/layouts public/shaders api
```

- [ ] **Step 7: Verify dev server starts**

```bash
bun run dev
```

Expected: `http://localhost:4321` serves a blank page with no console errors.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Astro + Bun project"
```

---

## Task 2: Design Tokens & Global Styles

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/terminal.css`
- Create: `src/styles/animations.css`

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
:root {
  --base:     #1e1e2e;
  --mantle:   #181825;
  --crust:    #11111b;
  --surface0: #313244;
  --surface1: #45475a;
  --surface2: #585b70;
  --overlay0: #6c7086;
  --overlay1: #7f849c;
  --overlay2: #9399b2;
  --subtext0: #a6adc8;
  --subtext1: #bac2de;
  --text:     #cdd6f4;
  --lavender: #b4befe;
  --blue:     #89b4fa;
  --sapphire: #74c7ec;
  --sky:      #89dceb;
  --teal:     #94e2d5;
  --green:    #a6e3a1;
  --yellow:   #f9e2af;
  --peach:    #fab387;
  --maroon:   #eba0ac;
  --red:      #f38ba8;
  --mauve:    #cba6f7;
  --pink:     #f5c2e7;

  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  --ease-out:  cubic-bezier(0.22, 1, 0.36, 1);
}
```

- [ ] **Step 2: Create `src/styles/global.css`**

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--surface1) var(--crust);
}

body {
  background: var(--crust);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  overflow-x: hidden;
  min-height: 100vh;
}

#particle-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

#page-content {
  position: relative;
  z-index: 1;
}

#cursor-dot {
  position: fixed;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lavender);
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  #particle-canvas { display: none; }
  #cursor-dot { display: none; }
}
```

- [ ] **Step 3: Create `src/styles/terminal.css`**

```css
.terminal-window {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(24, 24, 37, 0.70);
  backdrop-filter: blur(28px) saturate(1.8);
  -webkit-backdrop-filter: blur(28px) saturate(1.8);
  border: 1px solid rgba(180, 190, 254, 0.10);
  box-shadow: 0 32px 96px rgba(0, 0, 0, 0.75),
              inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.titlebar {
  display: flex;
  align-items: center;
  height: 40px;
  background: rgba(17, 17, 27, 0.75);
  border-bottom: 1px solid rgba(180, 190, 254, 0.07);
  padding: 0 0 0 10px;
  gap: 4px;
  user-select: none;
  flex-shrink: 0;
}
.titlebar-icon { display: flex; align-items: center; padding: 0 4px; flex-shrink: 0; }
.titlebar-icon svg { width: 14px; height: 14px; }
.tab {
  display: flex; align-items: center; gap: 7px;
  height: 100%; padding: 0 14px;
  font-size: 12px; color: var(--subtext1);
  background: rgba(180, 190, 254, 0.05);
  border-right: 1px solid rgba(180, 190, 254, 0.06);
}
.tab-close { color: var(--overlay0); font-size: 10px; padding: 2px; border-radius: 3px; }
.tab-close:hover { background: rgba(243, 139, 168, 0.2); color: var(--red); cursor: pointer; }
.tab-new { height: 100%; padding: 0 10px; display: flex; align-items: center; color: var(--overlay0); font-size: 16px; }
.titlebar-chevron { padding: 0 8px; color: var(--overlay0); font-size: 11px; }
.titlebar-gap { flex: 1; }
.window-controls { display: flex; height: 100%; }
.wc-btn {
  width: 44px; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--overlay0); font-size: 12px; cursor: pointer;
}
.wc-btn:hover { background: rgba(255, 255, 255, 0.07); color: var(--text); }
.wc-btn.close:hover { background: rgba(243, 139, 168, 0.9); color: #fff; }

.terminal-body {
  padding: 16px 20px 20px;
  min-height: 400px;
}

.cc-hr { border: none; border-top: 1px solid rgba(180, 190, 254, 0.08); margin: 12px 0; }
.cc-user-turn { display: flex; gap: 8px; align-items: baseline; margin-top: 14px; margin-bottom: 2px; }
.cc-prompt-sym { color: var(--yellow); font-weight: 700; flex-shrink: 0; }
.cc-tool-use { display: flex; align-items: baseline; gap: 6px; color: var(--overlay1); font-size: 12.5px; margin: 3px 0; }
.cc-tool-dot { color: var(--mauve); font-size: 10px; flex-shrink: 0; }
.cc-tool-name { color: var(--blue); font-weight: 500; }
.cc-tool-args { color: var(--overlay1); }
.cc-tool-result { display: flex; align-items: baseline; gap: 6px; font-size: 12px; margin: 1px 0 1px 14px; }
.cc-tool-result-sym { color: var(--overlay2); flex-shrink: 0; font-size: 11px; }
.cc-tool-result-text { color: var(--subtext0); }
.cc-output-block { border-left: 2px solid rgba(180, 190, 254, 0.18); padding: 6px 0 6px 12px; margin: 6px 0; }
.cc-prose { color: var(--text); margin: 4px 0; line-height: 1.7; }
.cc-prose-dim { color: var(--subtext0); margin: 2px 0; }

.prompt-row {
  display: flex; align-items: center; gap: 8px;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid rgba(180, 190, 254, 0.07);
}
.prompt-input {
  background: transparent; border: none; outline: none;
  color: var(--text); font-family: var(--font-mono); font-size: 13px;
  flex: 1; caret-color: var(--lavender);
}

.statusbar {
  display: flex; align-items: center; gap: 16px;
  padding: 7px 16px;
  border-top: 1px solid rgba(180, 190, 254, 0.07);
  background: rgba(17, 17, 27, 0.5);
  font-size: 11px; color: var(--overlay0);
}
.statusbar-right { margin-left: auto; }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

@media (max-width: 1024px) {
  .terminal-window { max-width: 100%; border-radius: 0; }
}
@media (max-width: 768px) {
  .titlebar { height: 36px; }
  .tab-new, .titlebar-chevron { display: none; }
  .terminal-body { padding: 12px 14px 16px; font-size: 12px; }
}
```

- [ ] **Step 4: Create `src/styles/animations.css`**

```css
.section-enter {
  opacity: 0;
  transform: translateY(60px);
}
.skill-bar-bg {
  display: inline-block;
  height: 10px;
  width: 100px;
  background: var(--surface0);
  border-radius: 2px;
  vertical-align: middle;
  position: relative;
  overflow: hidden;
}
.skill-bar {
  display: block;
  height: 100%;
  border-radius: 2px;
  width: 0%;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/
git commit -m "feat: design tokens and global styles"
```

---

## Task 3: Base Layout

**Files:**
- Create: `src/layouts/Base.astro`

- [ ] **Step 1: Create `src/layouts/Base.astro`**

```astro
---
interface Props { title?: string; }
const { title = 'Sankalp Krish' } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Sankalp Krishna — Full-Stack Engineer & Creative Developer" />
  <title>{title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/global.css" />
  <link rel="stylesheet" href="/src/styles/terminal.css" />
  <link rel="stylesheet" href="/src/styles/animations.css" />
</head>
<body>
  <canvas id="particle-canvas" aria-hidden="true"></canvas>
  <div id="cursor-dot" aria-hidden="true"></div>
  <div id="page-content">
    <slot />
  </div>
  <script>
    // Trailing cursor dot with 80ms lag
    const dot = document.getElementById('cursor-dot')!;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    (function animateDot() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      dot.style.left = cx + 'px';
      dot.style.top  = cy + 'px';
      requestAnimationFrame(animateDot);
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: Create temporary `src/pages/index.astro` to verify**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base>
  <p style="color: white; padding: 40px;">Scaffold OK</p>
</Base>
```

- [ ] **Step 3: Run dev and confirm**

```bash
bun run dev
```

Expected: white "Scaffold OK" text on `#11111b` background, JetBrains Mono loaded, no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/ src/pages/
git commit -m "feat: base layout with font, canvas, cursor dot"
```

---

## Task 4: Terminal Window Component

**Files:**
- Create: `src/components/TerminalWindow.astro`

- [ ] **Step 1: Create `src/components/TerminalWindow.astro`**

```astro
---
interface Props {
  tab: string;
  sectionId: string;
}
const { tab, sectionId } = Astro.props;
---
<section id={sectionId} class="terminal-section section-enter">
  <div class="terminal-window">

    <div class="titlebar">
      <div class="titlebar-icon">
        <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="13" height="13" rx="2"
                stroke="#b4befe" stroke-opacity="0.5"/>
          <path d="M3 4.5l3 2.5-3 2.5" stroke="#a6e3a1" stroke-width="1.3"
                stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 9.5h3" stroke="#89b4fa" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="tab">
        <span class="tab-label">{tab}</span>
        <span class="tab-close">&#x2715;</span>
      </div>
      <div class="tab-new">+</div>
      <div class="titlebar-chevron">&#x2304;</div>
      <div class="titlebar-gap"></div>
      <div class="window-controls">
        <div class="wc-btn">&#x2014;</div>
        <div class="wc-btn">&#x2610;</div>
        <div class="wc-btn close">&#x2715;</div>
      </div>
    </div>

    <div class="terminal-body">
      <slot />
    </div>

    <div class="statusbar">
      <span>&#x2394; {tab}</span>
      <span class="statusbar-right" data-ist-clock></span>
    </div>

  </div>
</section>

<style>
.terminal-section {
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  align-items: center;
}
</style>

<script>
  function updateClocks() {
    document.querySelectorAll<HTMLElement>('[data-ist-clock]').forEach(el => {
      el.textContent = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Kolkata',
      }) + ' IST';
    });
  }
  updateClocks();
  setInterval(updateClocks, 1000);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TerminalWindow.astro
git commit -m "feat: glassmorphic terminal window component"
```

---

## Task 5: Terminal Engine

**Files:**
- Create: `src/terminal/typewriter.ts`
- Create: `src/terminal/commands.ts`
- Create: `src/terminal/TerminalEngine.ts`

- [ ] **Step 1: Create `src/terminal/typewriter.ts`**

```typescript
export function typewriter(
  container: HTMLElement,
  html: string,
  speed = 4,
): Promise<void> {
  return new Promise(resolve => {
    const text = html;
    let i = 0;
    container.innerHTML = '';
    function tick() {
      if (i >= text.length) { resolve(); return; }
      if (text[i] === '<') {
        const end = text.indexOf('>', i);
        i = end + 1;
      } else {
        i++;
      }
      container.innerHTML = text.slice(0, i);
      setTimeout(tick, speed);
    }
    tick();
  });
}
```

- [ ] **Step 2: Create `src/terminal/commands.ts`**

```typescript
export interface CommandResult {
  html: string;
  navigate?: string;
}
export type CommandHandler = (args: string[]) => CommandResult;

// Safe HTML escape for user-typed strings
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const COMMANDS: Record<string, CommandHandler> = {
  '/help': () => ({ html: `
    <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Read</span><span class="cc-tool-args">(commands.json)</span></div>
    <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 7 commands</span></div>
    <div class="cc-output-block">
      <div class="cc-prose-dim"><span style="color:var(--blue)">/help</span>        &mdash; show this message</div>
      <div class="cc-prose-dim"><span style="color:var(--blue)">/about</span>       &mdash; who I am</div>
      <div class="cc-prose-dim"><span style="color:var(--blue)">/projects</span>    &mdash; things I&apos;ve built</div>
      <div class="cc-prose-dim"><span style="color:var(--blue)">/skills</span>      &mdash; what I know</div>
      <div class="cc-prose-dim"><span style="color:var(--blue)">/contact</span>     &mdash; get in touch</div>
      <div class="cc-prose-dim"><span style="color:var(--blue)">/open [name]</span> &mdash; open a project on GitHub</div>
      <div class="cc-prose-dim"><span style="color:var(--blue)">/clear</span>       &mdash; clear terminal output</div>
    </div>
  ` }),

  '/about': () => ({ html: `
    <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Read</span><span class="cc-tool-args">(about.md)</span></div>
    <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Read 1 file</span></div>
    <div class="cc-output-block">
      <div class="cc-prose">I&apos;m a second-year student studying Digital Transformation (CS)<br>at Atria University, Bangalore (B.Tech, Aug 2024 &ndash; Jun 2028).<br>Currently building personal projects and contributing to collaborative ones.<br>I like making things that sit at the edge of what software is supposed to look like.</div>
      <br>
      <div class="cc-prose-dim">Education:</div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--blue)">&#x23FA;</span><span style="color:var(--overlay1)">Shuqun Primary School, Singapore</span><span class="cc-tool-args"> &mdash; Primary</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--blue)">&#x23FA;</span><span style="color:var(--overlay1)">Hillgrove Secondary School, Singapore</span><span class="cc-tool-args"> &mdash; Secondary</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--blue)">&#x23FA;</span><span style="color:var(--overlay1)">Greenwood High, Bangalore</span><span class="cc-tool-args"> &mdash; IGCSE (Apr 2021 &ndash; Apr 2022)</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--blue)">&#x23FA;</span><span style="color:var(--overlay1)">Greenwood High, Bangalore</span><span class="cc-tool-args"> &mdash; IBDP (Aug 2022 &ndash; May 2024)</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--blue)">&#x23FA;</span><span style="color:var(--overlay1)">Atria University, Bangalore</span><span class="cc-tool-args"> &mdash; B.Tech (Aug 2024 &ndash; Jun 2028)</span></div>
      <br>
      <div class="cc-prose-dim">When I&apos;m not coding:</div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--peach)">&#x23FA;</span><span style="color:var(--overlay1)">Plane spotting</span><span class="cc-tool-args"> &mdash; airports are underrated</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--peach)">&#x23FA;</span><span style="color:var(--overlay1)">Train spotting</span><span class="cc-tool-args"> &mdash; same energy, different iron</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--peach)">&#x23FA;</span><span style="color:var(--overlay1)">Gaming</span><span class="cc-tool-args"> &mdash; yes, seriously</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--peach)">&#x23FA;</span><span style="color:var(--overlay1)">Philosophy</span><span class="cc-tool-args"> &mdash; strong believer, don&apos;t @ me</span></div>
      <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--peach)">&#x23FA;</span><span style="color:var(--overlay1)">Food</span><span class="cc-tool-args"> &mdash; obsessed, no apologies</span></div>
    </div>
  `, navigate: 'about' }),

  '/projects': () => ({ html: `
    <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Glob</span><span class="cc-tool-args">(projects/**)</span></div>
    <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 3 projects</span></div>
  `, navigate: 'projects' }),

  '/skills': () => ({ html: `
    <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Glob</span><span class="cc-tool-args">(skills/**)</span></div>
    <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 34 skills</span></div>
  `, navigate: 'skills' }),

  '/contact': () => ({ html: `
    <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Read</span><span class="cc-tool-args">(contact.json)</span></div>
    <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Read 1 file</span></div>
    <div class="cc-output-block">
      <div class="cc-prose">Want to talk planes, trains, food, or code? I&apos;m in.</div>
    </div>
  `, navigate: 'contact' }),

  '/clear': () => ({ html: '__CLEAR__' }),

  '/open': (args) => {
    const projects: Record<string, string> = {
      'midi.ai':                'https://github.com/SankalpKrish/MIDI.ai',
      'opencomputer':           'https://github.com/sakshamzip2-sys/opencomputer',
      'procrastination-engine': 'https://github.com/SankalpKrish/The-Procrastination-Engine',
    };
    const key = args[0]?.toLowerCase() ?? '';
    const url = projects[key];
    if (url) {
      window.open(url, '_blank', 'noopener');
      return { html: `<div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text" style="color:var(--green)">Opening ${escHtml(key)}...</span></div>` };
    }
    return { html: `<div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span style="color:var(--red)">error: project &quot;${escHtml(key)}&quot; not found. Try: midi.ai, opencomputer, procrastination-engine</span></div>` };
  },
};

export function unknownCommandResult(cmd: string): CommandResult {
  const jokes = [
    `error: &apos;${escHtml(cmd)}&apos; not found. Have you tried /help?`,
    `error: ${escHtml(cmd)}: command not found. (This isn&apos;t bash.)`,
    `error: cannot find module &apos;${escHtml(cmd)}&apos;. npm install won&apos;t help here either.`,
    `error: ${escHtml(cmd)} is not recognized. Unlike your potential &mdash; that&apos;s very recognized.`,
  ];
  const msg = jokes[Math.floor(Math.random() * jokes.length)];
  return { html: `<div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span style="color:var(--red)">${msg}</span></div>` };
}
```

- [ ] **Step 3: Create `src/terminal/TerminalEngine.ts`**

```typescript
import { typewriter } from './typewriter';
import { COMMANDS, unknownCommandResult, type CommandResult } from './commands';

export class TerminalEngine {
  private outputEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private history: string[] = [];
  private historyIndex = -1;

  constructor(outputEl: HTMLElement, inputEl: HTMLInputElement) {
    this.outputEl = outputEl;
    this.inputEl  = inputEl;
    this.inputEl.addEventListener('keydown', this.onKeyDown.bind(this));
    this.inputEl.focus();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const raw = this.inputEl.value.trim();
      if (!raw) return;
      this.history.unshift(raw);
      this.historyIndex = -1;
      this.inputEl.value = '';
      this.run(raw);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
      this.inputEl.value = this.history[this.historyIndex] ?? '';
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.historyIndex = Math.max(this.historyIndex - 1, -1);
      this.inputEl.value = this.historyIndex === -1 ? '' : this.history[this.historyIndex];
    }
  }

  private async run(raw: string) {
    // Echo user turn — use textContent to safely display raw input
    const userDiv = document.createElement('div');
    userDiv.className = 'cc-user-turn';
    const sym  = document.createElement('span');
    sym.className = 'cc-prompt-sym';
    sym.textContent = '>';
    const txt  = document.createElement('span');
    txt.className = 'cc-user-text';
    txt.textContent = raw; // textContent = safe, no XSS
    userDiv.append(sym, txt);
    this.outputEl.appendChild(userDiv);

    const [cmd, ...args] = raw.split(' ');
    const handler = COMMANDS[cmd];
    const result: CommandResult = handler ? handler(args) : unknownCommandResult(cmd);

    if (result.html === '__CLEAR__') {
      this.outputEl.innerHTML = '';
      return;
    }

    const responseDiv = document.createElement('div');
    this.outputEl.appendChild(responseDiv);
    await typewriter(responseDiv, result.html, 4);

    if (result.navigate) {
      document.getElementById(result.navigate)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async autoRun(cmd: string) {
    await this.run(cmd);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/terminal/
git commit -m "feat: terminal engine, command parser, typewriter"
```

---

## Task 6: WebGPU Particle System

**Files:**
- Create: `src/canvas/ScrollState.ts`
- Create: `public/shaders/particle.compute.wgsl`
- Create: `public/shaders/particle.render.wgsl`
- Create: `src/canvas/ParticleSystem.ts`
- Create: `src/canvas/ParticleFallback.ts`

- [ ] **Step 1: Create `src/canvas/ScrollState.ts`**

```typescript
class ScrollStateClass {
  progress = 0;

  init() {
    window.addEventListener('scroll', () => {
      const max = document.body.scrollHeight - window.innerHeight;
      this.progress = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });
  }
}

export const ScrollState = new ScrollStateClass();
```

- [ ] **Step 2: Create `public/shaders/particle.compute.wgsl`**

```wgsl
struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
}

struct Uniforms {
  time:    f32,
  scroll:  f32,
  mouse:   vec2<f32>,
  attract: f32,
  canvas:  vec2<f32>,
  _pad:    vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform>             uniforms:  Uniforms;
@group(0) @binding(2) var<storage, read>       targets:   array<vec2<f32>>;

fn hash(n: u32) -> f32 {
  var x = n;
  x ^= x >> 16u;
  x *= 0x45d9f3bu;
  x ^= x >> 16u;
  return f32(x) / 4294967295.0;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if i >= arrayLength(&particles) { return; }

  var p = particles[i];

  // Noise drift
  let nx = hash(i * 1973u + u32(uniforms.time * 100.0)) * 2.0 - 1.0;
  let ny = hash(i * 9277u + u32(uniforms.time * 100.0)) * 2.0 - 1.0;
  p.vel += vec2(nx, ny) * 0.002;

  // Mouse attraction within radius
  let toMouse = uniforms.mouse - p.pos;
  if dot(toMouse, toMouse) < 0.04 {
    p.vel += normalize(toMouse) * 0.004;
  }

  // SDF target convergence on load
  if uniforms.attract > 0.0 {
    let t = targets[i % arrayLength(&targets)];
    p.vel += (t - p.pos) * uniforms.attract * 0.05;
  }

  p.vel *= 0.96;
  let spd = length(p.vel);
  if spd > 0.008 { p.vel = normalize(p.vel) * 0.008; }
  p.pos += p.vel * 0.016 * 60.0;

  // Wrap
  if p.pos.x < 0.0 { p.pos.x += 1.0; }
  if p.pos.x > 1.0 { p.pos.x -= 1.0; }
  if p.pos.y < 0.0 { p.pos.y += 1.0; }
  if p.pos.y > 1.0 { p.pos.y -= 1.0; }

  particles[i] = p;
}
```

- [ ] **Step 3: Create `public/shaders/particle.render.wgsl`**

```wgsl
struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
}

struct Uniforms {
  time:    f32,
  scroll:  f32,
  mouse:   vec2<f32>,
  attract: f32,
  canvas:  vec2<f32>,
  _pad:    vec2<f32>,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform>       uniforms:  Uniforms;

struct VSOut {
  @builtin(position) pos:   vec4<f32>,
  @location(0)       speed: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  let p = particles[vi];
  let ndc = p.pos * 2.0 - vec2(1.0);
  var out: VSOut;
  out.pos   = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  out.speed = length(p.vel) / 0.008;
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let lavender = vec3(0.706, 0.749, 0.996); // #b4befe
  let teal     = vec3(0.580, 0.886, 0.835); // #94e2d5
  let col = mix(lavender, teal, in.speed);
  return vec4(col, 0.75);
}
```

- [ ] **Step 4: Create `src/canvas/ParticleSystem.ts`**

```typescript
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
```

- [ ] **Step 5: Create `src/canvas/ParticleFallback.ts`**

```typescript
import * as THREE from 'three';

export class ParticleFallback {
  private renderer: THREE.WebGLRenderer;
  private scene    = new THREE.Scene();
  private camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private points!: THREE.Points;
  private raf = 0;
  private N = 50_000;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const pos = new Float32Array(this.N * 3);
    for (let i = 0; i < this.N; i++) {
      pos[i*3]   = (Math.random()-0.5)*2;
      pos[i*3+1] = (Math.random()-0.5)*2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb4befe, size: 0.003, transparent: true, opacity: 0.7 }));
    this.scene.add(this.points);
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.frame();
  }

  private resize() { this.renderer.setSize(window.innerWidth, window.innerHeight); }

  private frame() {
    this.raf = requestAnimationFrame(() => this.frame());
    this.points.rotation.z += 0.00005;
    this.renderer.render(this.scene, this.camera);
  }

  destroy() { cancelAnimationFrame(this.raf); this.renderer.dispose(); }
}
```

- [ ] **Step 6: Commit**

```bash
git add public/shaders/ src/canvas/
git commit -m "feat: WebGPU particle system with SDF text and Three.js fallback"
```

---

## Task 7: Three.js Project Previews

**Files:**
- Create: `src/canvas/previews/ProjectPreview.ts`
- Create: `src/canvas/previews/WaveformPreview.ts`
- Create: `src/canvas/previews/NodeGraphPreview.ts`
- Create: `src/canvas/previews/ClockPreview.ts`

- [ ] **Step 1: Create `src/canvas/previews/ProjectPreview.ts`**

```typescript
import * as THREE from 'three';

export abstract class ProjectPreview {
  protected renderer: THREE.WebGLRenderer;
  protected scene  = new THREE.Scene();
  protected camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  private raf = 0;

  constructor(protected canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth || 220, canvas.clientHeight || 120);
    this.camera.position.z = 3;
    this.build();
    this.frame();
  }

  protected abstract build(): void;
  protected abstract tick(t: number): void;

  private frame() {
    this.raf = requestAnimationFrame(() => this.frame());
    this.tick(performance.now() / 1000);
    this.renderer.render(this.scene, this.camera);
  }

  destroy() { cancelAnimationFrame(this.raf); this.renderer.dispose(); }
}
```

- [ ] **Step 2: Create `src/canvas/previews/WaveformPreview.ts`**

```typescript
import * as THREE from 'three';
import { ProjectPreview } from './ProjectPreview';

export class WaveformPreview extends ProjectPreview {
  private bars: THREE.Mesh[] = [];

  protected build() {
    for (let i = 0; i < 32; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xa6e3a1 }),
      );
      m.position.x = (i - 16) * 0.12;
      this.scene.add(m);
      this.bars.push(m);
    }
  }

  protected tick(t: number) {
    this.bars.forEach((b, i) => {
      b.scale.y = 0.2 + Math.abs(Math.sin(t * 2 + i * 0.4)) * 1.2;
    });
  }
}
```

- [ ] **Step 3: Create `src/canvas/previews/NodeGraphPreview.ts`**

```typescript
import * as THREE from 'three';
import { ProjectPreview } from './ProjectPreview';

export class NodeGraphPreview extends ProjectPreview {
  private nodes: THREE.Mesh[] = [];
  private edges: THREE.Line[] = [];

  protected build() {
    const pos = Array.from({ length: 8 }, () =>
      new THREE.Vector3((Math.random()-0.5)*4, (Math.random()-0.5)*3, 0)
    );
    pos.forEach(p => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xcba6f7 }),
      );
      m.position.copy(p);
      this.scene.add(m);
      this.nodes.push(m);
    });
    pos.forEach((p, i) => {
      const geo = new THREE.BufferGeometry().setFromPoints([p, pos[(i+1)%pos.length]]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x89b4fa, transparent: true, opacity: 0.4 }));
      this.scene.add(line);
      this.edges.push(line);
    });
  }

  protected tick(t: number) {
    this.nodes.forEach((n, i) => { n.position.y += Math.sin(t + i) * 0.002; });
    this.edges.forEach((e, i) => {
      (e.material as THREE.LineBasicMaterial).opacity = 0.2 + Math.abs(Math.sin(t*0.8+i))*0.5;
    });
  }
}
```

- [ ] **Step 4: Create `src/canvas/previews/ClockPreview.ts`**

```typescript
import * as THREE from 'three';
import { ProjectPreview } from './ProjectPreview';

export class ClockPreview extends ProjectPreview {
  private hands: THREE.Mesh[] = [];

  protected build() {
    const positions: [number, number][] = [
      [0,0],[-1.2,0.8],[1.2,0.8],[-1.2,-0.8],[1.2,-0.8],[0,1.4],[0,-1.4],
    ];
    positions.forEach(([x, y]) => {
      this.scene.add(Object.assign(
        new THREE.Mesh(new THREE.CircleGeometry(0.4,32), new THREE.MeshBasicMaterial({ color: 0x313244 })),
        { position: new THREE.Vector3(x, y, 0) }
      ));
      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.28, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xb4befe }),
      );
      hand.position.set(x, y, 0.01);
      this.scene.add(hand);
      this.hands.push(hand);
    });
  }

  protected tick(t: number) {
    this.hands.forEach((h, i) => { h.rotation.z = -t * (0.5 + i * 0.3); });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/canvas/previews/
git commit -m "feat: Three.js project preview scenes"
```

---

## Task 8: Hero Section

**Files:**
- Create: `src/components/sections/Hero.astro`

- [ ] **Step 1: Create `src/components/sections/Hero.astro`**

```astro
---
import TerminalWindow from '../TerminalWindow.astro';
---
<TerminalWindow tab="SK://" sectionId="hero">
  <div id="hero-header" style="color:var(--subtext0)">
    <span style="color:var(--mauve)">&#x273B;</span>
    Welcome to <span style="color:var(--lavender);font-weight:600">SK://portfolio</span>
    &mdash; Interactive Developer Portfolio<br>
    <span style="color:var(--overlay0)">Type </span><span style="color:var(--blue)">/help</span>
    <span style="color:var(--overlay0)"> to see available commands.</span>
  </div>
  <hr class="cc-hr" />
  <div id="hero-output"></div>
  <div class="prompt-row">
    <span class="cc-prompt-sym">&gt;</span>
    <input type="text" class="prompt-input" id="hero-input"
           autocomplete="off" spellcheck="false" aria-label="Terminal input" />
  </div>
</TerminalWindow>

<script>
  import { TerminalEngine } from '../../terminal/TerminalEngine';
  import { ScrollState }    from '../../canvas/ScrollState';
  import { ParticleSystem } from '../../canvas/ParticleSystem';
  import { ParticleFallback } from '../../canvas/ParticleFallback';

  ScrollState.init();

  const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
  if (navigator.gpu) {
    new ParticleSystem(canvas).init().catch(() => new ParticleFallback(canvas));
  } else {
    new ParticleFallback(canvas);
  }

  const engine = new TerminalEngine(
    document.getElementById('hero-output')!,
    document.getElementById('hero-input') as HTMLInputElement,
  );

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { obs.disconnect(); engine.autoRun('/help'); }
  }, { threshold: 0.3 });
  obs.observe(document.getElementById('hero')!);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sections/Hero.astro
git commit -m "feat: hero section"
```

---

## Task 9: About, Projects, Skills, Contact Sections

**Files:**
- Create: `src/components/sections/About.astro`
- Create: `src/components/sections/Projects.astro`
- Create: `src/components/sections/Skills.astro`
- Create: `src/components/sections/Contact.astro`

- [ ] **Step 1: Create `src/components/sections/About.astro`**

```astro
---
import TerminalWindow from '../TerminalWindow.astro';
---
<TerminalWindow tab="SK://about" sectionId="about">
  <div id="about-output"></div>
  <div class="prompt-row">
    <span class="cc-prompt-sym">&gt;</span>
    <input type="text" class="prompt-input" id="about-input"
           autocomplete="off" spellcheck="false" aria-label="Terminal input" />
  </div>
</TerminalWindow>
<script>
  import { TerminalEngine } from '../../terminal/TerminalEngine';
  const engine = new TerminalEngine(
    document.getElementById('about-output')!,
    document.getElementById('about-input') as HTMLInputElement,
  );
  const obs = new IntersectionObserver(e => {
    if (e[0].isIntersecting) { obs.disconnect(); engine.autoRun('/about'); }
  }, { threshold: 0.3 });
  obs.observe(document.getElementById('about')!);
</script>
```

- [ ] **Step 2: Create `src/components/sections/Projects.astro`**

```astro
---
import TerminalWindow from '../TerminalWindow.astro';

const projects = [
  {
    name: 'MIDI.ai',
    meta: 'projects/midi-ai/ · 2024 · Solo',
    desc: 'A truly AI-powered audio track to MIDI file pipeline.',
    tags: [['Python','--blue'],['AI/ML','--mauve']],
    url:  'https://github.com/SankalpKrish/MIDI.ai',
    preview: 'waveform',
  },
  {
    name: 'OpenComputer',
    meta: 'projects/opencomputer/ · 2024 · Collab',
    desc: 'Building the frontend + native AI skill/plugin curiosity and discoverability.',
    tags: [['TypeScript','--blue'],['Bun','--teal'],['AI','--mauve']],
    url:  'https://github.com/sakshamzip2-sys/opencomputer',
    preview: 'nodegraph',
  },
  {
    name: 'The Procrastination Engine',
    meta: 'projects/procrastination-engine/ · 2023 · For fun',
    desc: "A clock made of several tiny clocks. It’s time… within a time… within a time.",
    tags: [['JavaScript','--yellow'],['Canvas','--peach']],
    url:  'https://github.com/SankalpKrish/The-Procrastination-Engine',
    preview: 'clock',
  },
];
---
<TerminalWindow tab="SK://projects" sectionId="projects">
  <div id="projects-output"></div>
  <hr class="cc-hr" />
  <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px;">
    {projects.map(p => (
      <div class="project-row" style="position:relative;display:flex;border:1px solid rgba(180,190,254,0.10);border-radius:6px;overflow:hidden;">
        <div style="flex:1;padding:14px 16px;">
          <a href={p.url} target="_blank" rel="noopener"
             style="color:var(--lavender);font-weight:600;font-size:13px;text-decoration:none;">
            &#x2B21; {p.name}
          </a>
          <div style="color:var(--overlay1);font-size:11px;margin:2px 0;">{p.meta}</div>
          <div style="color:var(--subtext0);font-size:12px;margin:4px 0 8px;">{p.desc}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            {p.tags.map(([tag, color]) => (
              <span style={`font-size:10px;padding:1px 8px;border:1px solid rgba(var(${color}-rgb,137,180,250),0.4);color:var(${color});border-radius:3px;`}>{tag}</span>
            ))}
          </div>
        </div>
        <canvas class="project-preview-canvas" data-preview={p.preview}
                style="width:220px;height:120px;flex-shrink:0;clip-path:inset(0 100% 0 0);transition:clip-path 0.4s cubic-bezier(0.22,1,0.36,1);"
                aria-hidden="true"></canvas>
      </div>
    ))}
  </div>
  <div class="prompt-row" style="margin-top:16px;">
    <span class="cc-prompt-sym">&gt;</span>
    <input type="text" class="prompt-input" id="projects-input"
           autocomplete="off" spellcheck="false" aria-label="Terminal input" />
  </div>
</TerminalWindow>
<script>
  import { TerminalEngine }   from '../../terminal/TerminalEngine';
  import { WaveformPreview }  from '../../canvas/previews/WaveformPreview';
  import { NodeGraphPreview } from '../../canvas/previews/NodeGraphPreview';
  import { ClockPreview }     from '../../canvas/previews/ClockPreview';

  const engine = new TerminalEngine(
    document.getElementById('projects-output')!,
    document.getElementById('projects-input') as HTMLInputElement,
  );
  const obs = new IntersectionObserver(e => {
    if (e[0].isIntersecting) { obs.disconnect(); engine.autoRun('/projects'); }
  }, { threshold: 0.2 });
  obs.observe(document.getElementById('projects')!);

  const previewCtors: Record<string, new (c: HTMLCanvasElement) => { destroy(): void }> = {
    waveform:  WaveformPreview,
    nodegraph: NodeGraphPreview,
    clock:     ClockPreview,
  };
  const instances = new Map<HTMLCanvasElement, { destroy(): void }>();

  document.querySelectorAll<HTMLElement>('.project-row').forEach(row => {
    const canvas = row.querySelector<HTMLCanvasElement>('.project-preview-canvas')!;
    row.addEventListener('mouseenter', () => {
      if (!instances.has(canvas))
        instances.set(canvas, new previewCtors[canvas.dataset.preview!](canvas));
      canvas.style.clipPath = 'inset(0 0% 0 0)';
    });
    row.addEventListener('mouseleave', () => {
      canvas.style.clipPath = 'inset(0 100% 0 0)';
    });
  });

  const cleanObs = new IntersectionObserver(e => {
    if (!e[0].isIntersecting) { instances.forEach(i => i.destroy()); instances.clear(); }
  }, { threshold: 0 });
  cleanObs.observe(document.getElementById('projects')!);
</script>
```

- [ ] **Step 3: Create `src/components/sections/Skills.astro`**

```astro
---
import TerminalWindow from '../TerminalWindow.astro';

const categories = [
  { name:'spoken-languages', color:'var(--teal)', skills:[
    { name:'English',    fill:100, label:'native' },
    { name:'French',     fill:100, label:'native' },
    { name:'Kannada',    fill:70,  label:'conversational' },
    { name:'Hindi',      fill:40,  label:'basic' },
    { name:'Mandarin',   fill:40,  label:'basic' },
    { name:'German',     fill:40,  label:'basic' },
    { name:'Tamil',      fill:20,  label:'understand only' },
  ]},
  { name:'languages', color:'var(--blue)', skills:[
    { name:'JavaScript', fill:80 },
    { name:'TypeScript', fill:80 },
    { name:'Python',     fill:70 },
    { name:'Java',       fill:60 },
    { name:'Rust',       fill:20, label:'learning' },
  ]},
  { name:'frontend', color:'var(--mauve)', skills:[
    { name:'React.js', fill:70 },
  ]},
  { name:'backend', color:'var(--green)', skills:[
    { name:'Node.js', fill:80 },
    { name:'Express', fill:70 },
    { name:'Bun',     fill:80 },
  ]},
  { name:'cloud', color:'var(--peach)', skills:[
    { name:'AWS',             fill:50 },
    { name:'Microsoft Azure', fill:50 },
    { name:'Google Cloud',    fill:50 },
  ]},
  { name:'data', color:'var(--sapphire)', skills:[
    { name:'PostgreSQL',       fill:60 },
    { name:'MongoDB',          fill:70 },
    { name:'SQL',              fill:70 },
    { name:'Machine Learning', fill:40, label:'learning' },
  ]},
  { name:'engineering', color:'var(--lavender)', skills:[
    { name:'Git',              fill:80 },
    { name:'Object-Oriented',  fill:70 },
    { name:'Computer Networks',fill:60 },
  ]},
  { name:'soft-skills', color:'var(--yellow)', skills:[
    { name:'Project Management',fill:40, label:'learning' },
    { name:'Problem Solving',   fill:80 },
    { name:'Team Collaboration',fill:100 },
    { name:'Leadership',        fill:100 },
  ]},
];
---
<TerminalWindow tab="SK://skills" sectionId="skills">
  <div id="skills-output"></div>
  <hr class="cc-hr" />
  <div id="skills-tree" style="font-size:12px;line-height:2;padding:4px 0;">
    {categories.map((cat, ci) => {
      const last = ci === categories.length - 1;
      return (
        <div>
          <div style={`color:${cat.color};margin-bottom:2px;`}>
            {last ? '&#x2514;&#x2500;&#x2500;' : '&#x251C;&#x2500;&#x2500;'} <strong>{cat.name}/</strong>
          </div>
          {cat.skills.map((sk, si) => {
            const lastSk  = si === cat.skills.length - 1;
            const prefix  = last ? '&#xA0;&#xA0;&#xA0;&#xA0;' : '&#x2502;&#xA0;&#xA0;&#xA0;';
            const conn    = lastSk ? '&#x2514;&#x2500;&#x2500;' : '&#x251C;&#x2500;&#x2500;';
            return (
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:var(--overlay0);" set:html={prefix + conn} />
                <span style="color:var(--subtext0);min-width:160px;">{sk.name}</span>
                <div class="skill-bar-bg">
                  <div class="skill-bar" data-fill={sk.fill} style={`background:${cat.color};`}></div>
                </div>
                {sk.label && <span style="color:var(--overlay0);font-size:10px;">{sk.label}</span>}
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
  <div class="prompt-row" style="margin-top:16px;">
    <span class="cc-prompt-sym">&gt;</span>
    <input type="text" class="prompt-input" id="skills-input"
           autocomplete="off" spellcheck="false" aria-label="Terminal input" />
  </div>
</TerminalWindow>
<script>
  import { TerminalEngine } from '../../terminal/TerminalEngine';
  import gsap from 'gsap';
  import ScrollTrigger from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);

  const engine = new TerminalEngine(
    document.getElementById('skills-output')!,
    document.getElementById('skills-input') as HTMLInputElement,
  );
  const sectionEl = document.getElementById('skills')!;

  const obs = new IntersectionObserver(e => {
    if (e[0].isIntersecting) {
      obs.disconnect();
      engine.autoRun('/skills');
      sectionEl.querySelectorAll<HTMLElement>('.skill-bar').forEach((bar, i) => {
        gsap.to(bar, { width: (bar.dataset.fill ?? 0) + '%', duration: 0.6, delay: i * 0.03, ease: 'power3.out' });
      });
    }
  }, { threshold: 0.2 });
  obs.observe(sectionEl);
</script>
```

- [ ] **Step 4: Create `src/components/sections/Contact.astro`**

```astro
---
import TerminalWindow from '../TerminalWindow.astro';
---
<TerminalWindow tab="SK://contact" sectionId="contact">
  <div id="contact-output"></div>
  <hr class="cc-hr" />
  <div style="margin-top:8px;">
    <div class="cc-tool-use">
      <span class="cc-tool-dot" style="color:var(--green)">&#x23FA;</span>
      <span style="color:var(--overlay1)">Email</span>
      <span style="color:var(--overlay0)"> &mdash;&mdash; </span>
      <a href="mailto:sankalpkrish@outlook.com" style="color:var(--blue);text-decoration:none;">sankalpkrish@outlook.com</a>
    </div>
    <div class="cc-tool-use">
      <span class="cc-tool-dot" style="color:var(--green)">&#x23FA;</span>
      <span style="color:var(--overlay1)">LinkedIn</span>
      <span style="color:var(--overlay0)"> &mdash;&mdash; </span>
      <a href="https://www.linkedin.com/in/sankalp-krish" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;">linkedin.com/in/sankalp-krish</a>
    </div>
    <div class="cc-tool-use">
      <span class="cc-tool-dot" style="color:var(--green)">&#x23FA;</span>
      <span style="color:var(--overlay1)">GitHub</span>
      <span style="color:var(--overlay0)"> &mdash;&mdash; </span>
      <a href="https://github.com/SankalpKrish" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;">github.com/SankalpKrish</a>
    </div>
    <div style="margin-top:14px;color:var(--overlay0);font-size:12px;">
      <div>// or just type a message below and hit enter.</div>
      <div>// I read everything. Eventually.</div>
    </div>
  </div>
  <form id="contact-form" novalidate>
    <div class="prompt-row">
      <span class="cc-prompt-sym">&gt;</span>
      <input type="text" name="message" class="prompt-input" id="contact-message"
             autocomplete="off" spellcheck="false" aria-label="Send a message" placeholder="say something..." required />
    </div>
  </form>
  <div id="contact-status" style="margin-top:8px;font-size:12px;min-height:20px;"></div>
</TerminalWindow>
<script>
  import { TerminalEngine } from '../../terminal/TerminalEngine';
  const engine = new TerminalEngine(
    document.getElementById('contact-output')!,
    document.getElementById('contact-message') as HTMLInputElement,
  );
  const obs = new IntersectionObserver(e => {
    if (e[0].isIntersecting) { obs.disconnect(); engine.autoRun('/contact'); }
  }, { threshold: 0.3 });
  obs.observe(document.getElementById('contact')!);

  const form     = document.getElementById('contact-form') as HTMLFormElement;
  const statusEl = document.getElementById('contact-status')!;
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const input = document.getElementById('contact-message') as HTMLInputElement;
    const msg = input.value.trim();
    if (!msg) return;
    statusEl.textContent = '';
    statusEl.innerHTML = '<span style="color:var(--overlay0)">&#x2B0F; sending...</span>';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      statusEl.innerHTML = res.ok
        ? '<span style="color:var(--green)">&#x2B0F; sent. I\'ll get back to you.</span>'
        : '<span style="color:var(--red)">&#x2B0F; error: try sankalpkrish@outlook.com directly.</span>';
      if (res.ok) input.value = '';
    } catch {
      statusEl.innerHTML = '<span style="color:var(--red)">&#x2B0F; network error: try sankalpkrish@outlook.com directly.</span>';
    }
  });
</script>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/
git commit -m "feat: About, Projects, Skills, Contact sections"
```

---

## Task 10: Assemble Full Page + GSAP Scroll Animations

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace `src/pages/index.astro`**

```astro
---
import Base     from '../layouts/Base.astro';
import Hero     from '../components/sections/Hero.astro';
import About    from '../components/sections/About.astro';
import Projects from '../components/sections/Projects.astro';
import Skills   from '../components/sections/Skills.astro';
import Contact  from '../components/sections/Contact.astro';
---
<Base>
  <!-- Full-viewport spacer: particle field plays here, user scrolls down -->
  <div style="height:100vh;"></div>

  <div style="display:flex;flex-direction:column;padding:0 20px 80px;">
    <Hero />
    <About />
    <Projects />
    <Skills />
    <Contact />
  </div>
</Base>

<script>
  import gsap from 'gsap';
  import ScrollTrigger from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll<HTMLElement>('.section-enter').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' } }
    );
  });
</script>
```

- [ ] **Step 2: Full browser smoke test**

```bash
bun run dev
```

Verify each item:
- [ ] Particle field visible on load, "Sankalp Krish" forms at `t=0`
- [ ] Scroll down → Hero terminal slides in, `/help` auto-types
- [ ] `/about` typed manually scrolls to About and types output
- [ ] About auto-runs `/about` on scroll-in
- [ ] Projects auto-runs on scroll-in, hover on project row reveals Three.js canvas
- [ ] Skills auto-runs, bars animate left-to-right
- [ ] Contact auto-runs, links present, form input works
- [ ] IST clock ticks in every status bar
- [ ] Typing unknown command returns witty error
- [ ] Arrow keys cycle command history

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: assemble full page with GSAP scroll animations"
```

---

## Task 11: Contact Serverless Function

**Files:**
- Create: `api/contact.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create `api/contact.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const body = req.body as { message?: unknown };
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) { res.status(400).json({ error: 'empty message' }); return; }
  if (message.length > 2000) { res.status(400).json({ error: 'message too long' }); return; }

  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(500).json({ error: 'not configured' }); return; }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'portfolio@sankalpkrish.dev',
      to:      'sankalpkrish@outlook.com',
      subject: 'Portfolio contact',
      text:    message,
    }),
  });

  r.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'send failed' });
}
```

- [ ] **Step 2: Create `vercel.json`**

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "framework": "astro",
  "functions": {
    "api/*.ts": { "runtime": "@vercel/node" }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/contact.ts vercel.json
git commit -m "feat: contact serverless function via Resend"
```

---

## Task 12: Responsive & Accessibility Verification

- [ ] **Step 1: Test reduced-motion in DevTools**

DevTools → Rendering tab → "Emulate CSS media feature: prefers-reduced-motion" → reduce.

Expected: particle canvas hidden, sections appear without slide-in, skill bars at full width.

- [ ] **Step 2: Test mobile at 375px**

DevTools → set viewport 375px wide.

Expected: terminal fills width, titlebar simplified, font 12px, all content readable.

- [ ] **Step 3: Check aria attributes**

Confirm: `<canvas>` has `aria-hidden="true"`, all `<input>` have `aria-label`, all `<a>` have visible text.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: verify responsive and accessibility"
```

---

## Task 13: Build & Deploy

- [ ] **Step 1: Production build**

```bash
bun run build
```

Expected: `dist/` created, zero TypeScript errors, zero Astro errors.

- [ ] **Step 2: Preview production build**

```bash
bun run preview
```

Expected: full site works at `http://localhost:4321` identically to dev.

- [ ] **Step 3: Push to GitHub**

```bash
git remote add origin https://github.com/SankalpKrish/portfolio-site.git
git push -u origin main
```

- [ ] **Step 4: Deploy to Vercel**

1. Go to vercel.com → New Project → Import `portfolio-site`
2. Add env var: `RESEND_API_KEY` = your key from resend.com (free tier)
3. Deploy

- [ ] **Step 5: Post-deploy checklist**

- [ ] Particles form "Sankalp Krish" on load
- [ ] All 5 sections auto-run on scroll
- [ ] Project hover previews work
- [ ] Skill bars animate
- [ ] Contact form sends and shows confirmation
- [ ] `/open midi.ai` opens GitHub in new tab
- [ ] Unknown commands return witty errors
- [ ] IST clock ticks
- [ ] Mobile layout correct at 375px
- [ ] Reduced-motion mode works

- [ ] **Step 6: Tag release**

```bash
git tag v1.0.0
git push --tags
```

---

## Spec Coverage

| Requirement | Task |
|---|---|
| WebGPU compute shader, 500k particles | 6 |
| SDF text "Sankalp Krish" on load | 6 |
| Three.js fallback | 6 |
| ScrollState singleton | 6 |
| Glassmorphic terminal window + titlebar + statusbar | 4 |
| IST clock in statusbar | 4 |
| `/help /about /projects /skills /contact /clear /open` | 5 |
| Typewriter progressive output | 5 |
| Command history (arrow keys) | 5 |
| Witty unknown command errors | 5 |
| User input XSS-safe (textContent) | 5 |
| Auto-run on scroll-in per section | 8, 9 |
| Navigate via command | 5 |
| Hero section | 8 |
| About: bio + education + hobbies | 5, 9 |
| Projects cinematic list | 9 |
| Three.js previews: waveform, node graph, clocks | 7, 9 |
| Hover clip-path reveal | 9 |
| Lazy init + destroy on scroll-out | 9 |
| Skills animated tree + progress bars | 9 |
| Contact form + links | 9 |
| Serverless contact function | 11 |
| GSAP scroll animations | 10 |
| Trailing cursor dot | 3 |
| Catppuccin Mocha palette + JetBrains Mono | 2, 3 |
| Responsive (mobile/tablet) | 2, 12 |
| prefers-reduced-motion | 2, 12 |
| Vercel deployment | 13 |
