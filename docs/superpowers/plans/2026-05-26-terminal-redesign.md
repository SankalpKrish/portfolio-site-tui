# Terminal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 5-section scrolling portfolio into a single glassmorphic terminal window over a full-viewport particle background, with a Sans pixel-art splash screen and command-driven content loading.

**Architecture:** Approach B — per-command modules. `commands.ts` becomes a thin registry; each command's HTML output lives in `src/terminal/commands/<name>.ts`. `SansLogo.ts` handles pixel-art canvas rendering and the hover speech bubble. The single `TerminalWindow.astro` replaces all 5 section components.

**Tech Stack:** Astro 4, TypeScript, JetBrains Mono, Catppuccin Mocha tokens, WebGPU (ParticleSystem), Three.js fallback (ParticleFallback), GSAP removed from index.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Delete | `src/components/sections/Hero.astro` | Gone |
| Delete | `src/components/sections/About.astro` | Gone |
| Delete | `src/components/sections/Projects.astro` | Gone |
| Delete | `src/components/sections/Skills.astro` | Gone |
| Delete | `src/components/sections/Contact.astro` | Gone |
| Delete | `src/canvas/ScrollState.ts` | Gone |
| Delete | `src/canvas/previews/ProjectPreview.ts` | Gone |
| Delete | `src/canvas/previews/WaveformPreview.ts` | Gone |
| Delete | `src/canvas/previews/NodeGraphPreview.ts` | Gone |
| Delete | `src/canvas/previews/ClockPreview.ts` | Gone |
| Create | `src/canvas/SansLogo.ts` | Load PNG → canvas, nearest-neighbor; hover speech bubble |
| Create | `src/terminal/commands/splash.ts` | Auto-run startup output |
| Create | `src/terminal/commands/help.ts` | `/help` output |
| Create | `src/terminal/commands/about.ts` | `/about` output |
| Create | `src/terminal/commands/projects.ts` | `/projects` output |
| Create | `src/terminal/commands/skills.ts` | `/skills` output |
| Create | `src/terminal/commands/contact.ts` | `/contact` output |
| Create | `src/terminal/commands/open.ts` | `/open [name]` output |
| Modify | `src/terminal/commands.ts` | Thin registry; remove `navigate` from `CommandResult` |
| Modify | `src/terminal/TerminalEngine.ts` | Call `autoRun('splash')` on init; remove navigate scroll block |
| Modify | `src/components/TerminalWindow.astro` | Single full-viewport terminal; Sans canvas in titlebar; pinned input |
| Modify | `src/pages/index.astro` | Single TerminalWindow; remove section imports and GSAP |
| Modify | `src/styles/terminal.css` | Fixed centered island layout; pinned input row; scrollable output; speech bubble styles |
| Modify | `src/styles/animations.css` | Remove scroll-triggered animation rules |
| Modify | `src/canvas/ParticleSystem.ts` | Remove ScrollState import |
| Already done | `public/sans.png` | Static asset copied from Pictures |

---

## Task 1: Delete dead files

**Files:**
- Delete: `src/components/sections/` (all 5)
- Delete: `src/canvas/ScrollState.ts`
- Delete: `src/canvas/previews/` (all 4)

- [ ] **Step 1: Delete section components and canvas files**

```bash
cd "C:/Users/sanka/Documents/GitHub/Portfolio Site"
rm src/components/sections/Hero.astro
rm src/components/sections/About.astro
rm src/components/sections/Projects.astro
rm src/components/sections/Skills.astro
rm src/components/sections/Contact.astro
rm src/canvas/ScrollState.ts
rm src/canvas/previews/ProjectPreview.ts
rm src/canvas/previews/WaveformPreview.ts
rm src/canvas/previews/NodeGraphPreview.ts
rm src/canvas/previews/ClockPreview.ts
rmdir src/canvas/previews
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: delete section components, ScrollState, canvas previews"
```

---

## Task 2: Rewrite `commands.ts` — thin registry + updated interface

**Files:**
- Modify: `src/terminal/commands.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
// src/terminal/commands.ts
export interface CommandResult {
  html: string;
}
export type CommandHandler = (args: string[]) => CommandResult;

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

// Imports filled in as command modules are created (Tasks 3-9)
export const COMMANDS: Record<string, CommandHandler> = {
  '/clear': () => ({ html: '__CLEAR__' }),
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:/Users/sanka/Documents/GitHub/Portfolio Site"
bunx tsc --noEmit
```

Expected: no errors (COMMANDS is sparse for now — modules added in later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/terminal/commands.ts
git commit -m "refactor: commands.ts — thin registry, remove navigate from CommandResult"
```

---

## Task 3: Update `TerminalEngine.ts`

**Files:**
- Modify: `src/terminal/TerminalEngine.ts`

- [ ] **Step 1: Replace the file**

```typescript
// src/terminal/TerminalEngine.ts
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
    this.autoRun('splash');
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

  private clearOutput() {
    while (this.outputEl.firstChild) {
      this.outputEl.removeChild(this.outputEl.firstChild);
    }
  }

  private async run(raw: string) {
    // splash is internal — not echoed, not user-typeable
    if (raw !== 'splash') {
      const userDiv = document.createElement('div');
      userDiv.className = 'cc-user-turn';
      const sym = document.createElement('span');
      sym.className = 'cc-prompt-sym';
      sym.textContent = '❯';
      const txt = document.createElement('span');
      txt.className = 'cc-user-text';
      txt.textContent = raw;
      userDiv.append(sym, txt);
      this.outputEl.appendChild(userDiv);
    }

    const [cmd, ...args] = raw.split(' ');
    const handler = COMMANDS[cmd];
    const result: CommandResult = handler ? handler(args) : unknownCommandResult(cmd);

    if (result.html === '__CLEAR__') {
      this.clearOutput();
      return;
    }

    const responseDiv = document.createElement('div');
    this.outputEl.appendChild(responseDiv);
    await typewriter(responseDiv, result.html, 4);

    // After splash types in, render the Sans logo canvas
    if (raw === 'splash') {
      const { SansLogo } = await import('../canvas/SansLogo');
      await SansLogo.render('#sans-logo');
    }

    // Scroll output area to bottom
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  async autoRun(cmd: string) {
    await this.run(cmd);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/terminal/TerminalEngine.ts
git commit -m "refactor: TerminalEngine — autoRun splash on init, remove navigate scroll"
```

---

## Task 4: Create `SansLogo.ts`

**Files:**
- Create: `src/canvas/SansLogo.ts`

`public/sans.png` is already in place. This module exposes two functions: `render(selector)` draws the PNG to a canvas element; `initHover()` wires the speech bubble to all `.sans-logo-canvas` elements.

- [ ] **Step 1: Create the file**

```typescript
// src/canvas/SansLogo.ts

const QUIPS = [
  'your mouse is no good here.',
  'try using your keyboard.',
  'heh. you really thought clicking me would do something?',
  '* sans is judging your mouse usage.',
  'wrong input device, pal.',
];

let bubble: HTMLDivElement | null = null;

function getBubble(): HTMLDivElement {
  if (bubble) return bubble;
  bubble = document.createElement('div');
  bubble.id = 'sans-speech-bubble';
  bubble.style.cssText = `
    position: fixed;
    background: #fff;
    border: 2px solid #000;
    border-radius: 0;
    padding: 6px 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #000;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 100;
  `;
  // Triangle tail (downward-left)
  const tail = document.createElement('div');
  tail.style.cssText = `
    position: absolute;
    bottom: -8px;
    left: 10px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid #000;
  `;
  const tailInner = document.createElement('div');
  tailInner.style.cssText = `
    position: absolute;
    bottom: 2px;
    left: -4px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #fff;
  `;
  tail.appendChild(tailInner);
  bubble.appendChild(tail);
  document.body.appendChild(bubble);
  return bubble;
}

export const SansLogo = {
  async render(selector: string): Promise<void> {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    if (!canvas) return;
    const img = new Image();
    img.src = '/sans.png';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load sans.png'));
    });
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  },

  initHover(): void {
    document.querySelectorAll<HTMLElement>('.sans-logo-canvas').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const b = getBubble();
        b.childNodes[0].textContent = QUIPS[Math.floor(Math.random() * QUIPS.length)];
        const rect = el.getBoundingClientRect();
        b.style.left = rect.left + 'px';
        b.style.top  = (rect.top - 40) + 'px';
        b.style.opacity = '1';
      });
      el.addEventListener('mouseleave', () => {
        getBubble().style.opacity = '0';
      });
    });
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/canvas/SansLogo.ts public/sans.png
git commit -m "feat: SansLogo — pixel-art canvas render + Undertale hover speech bubble"
```

---

## Task 5: Create command modules — `splash`, `help`, `open`

**Files:**
- Create: `src/terminal/commands/splash.ts`
- Create: `src/terminal/commands/help.ts`
- Create: `src/terminal/commands/open.ts`

- [ ] **Step 1: Create `src/terminal/commands/splash.ts`**

```typescript
// src/terminal/commands/splash.ts
import type { CommandHandler } from '../commands';

export const splash: CommandHandler = () => ({ html: `
  <div class="cc-output-block" style="display:flex;gap:24px;align-items:flex-start;">
    <canvas id="sans-logo" class="sans-logo-canvas" width="80" height="80"
            style="flex-shrink:0;image-rendering:pixelated;cursor:default;"
            aria-label="Sans from Undertale pixel art"></canvas>
    <div style="line-height:1.8;">
      <div style="color:var(--blue);font-size:15px;font-weight:600;letter-spacing:0.04em;">Sankalp Krish <span style="color:var(--overlay0);font-size:12px;font-weight:400;">v1.0.0</span></div>
      <div style="color:var(--subtext0);font-size:12px;margin-bottom:10px;">Digital Transformation &middot; Atria University</div>
      <div style="color:var(--overlay0);font-size:11px;margin-bottom:8px;">&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;</div>
      <div style="font-size:12px;line-height:2;">
        <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/about</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">who I am</span></div>
        <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/projects</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">things I&apos;ve built</span></div>
        <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/skills</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">what I know</span></div>
        <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/contact</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">get in touch</span></div>
        <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/open [n]</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">open a project on GitHub</span></div>
        <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/clear</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">clear terminal</span></div>
        <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/help</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">show this again</span></div>
      </div>
    </div>
  </div>
` });
```

- [ ] **Step 2: Create `src/terminal/commands/help.ts`**

```typescript
// src/terminal/commands/help.ts
import type { CommandHandler } from '../commands';

export const help: CommandHandler = () => ({ html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Read</span><span class="cc-tool-args">(commands.json)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 7 commands</span></div>
  <div class="cc-output-block" style="font-size:12px;line-height:2;">
    <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/about</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">who I am</span></div>
    <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/projects</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">things I&apos;ve built</span></div>
    <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/skills</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">what I know</span></div>
    <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/contact</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">get in touch</span></div>
    <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/open [n]</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">open a project on GitHub</span></div>
    <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/clear</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">clear terminal</span></div>
    <div><span style="color:var(--blue);min-width:110px;display:inline-block;">/help</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">show this message</span></div>
  </div>
` });
```

- [ ] **Step 3: Create `src/terminal/commands/open.ts`**

```typescript
// src/terminal/commands/open.ts
import type { CommandHandler } from '../commands';

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PROJECTS: Record<string, string> = {
  'midi.ai':                'https://github.com/SankalpKrish/MIDI.ai',
  'opencomputer':           'https://github.com/sakshamzip2-sys/opencomputer',
  'procrastination-engine': 'https://github.com/SankalpKrish/The-Procrastination-Engine',
};

export const open: CommandHandler = (args) => {
  const key = args[0]?.toLowerCase() ?? '';
  const url = PROJECTS[key];
  if (url) {
    window.open(url, '_blank', 'noopener');
    return { html: `<div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text" style="color:var(--green)">Opening ${escHtml(key)}...</span></div>` };
  }
  return { html: `<div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span style="color:var(--red)">error: project &quot;${escHtml(key)}&quot; not found. Try: midi.ai, opencomputer, procrastination-engine</span></div>` };
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/terminal/commands/
git commit -m "feat: add splash, help, open command modules"
```

---

## Task 6: Create command modules — `about`, `contact`

**Files:**
- Create: `src/terminal/commands/about.ts`
- Create: `src/terminal/commands/contact.ts`

- [ ] **Step 1: Create `src/terminal/commands/about.ts`**

```typescript
// src/terminal/commands/about.ts
import type { CommandHandler } from '../commands';

export const about: CommandHandler = () => ({ html: `
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
` });
```

- [ ] **Step 2: Create `src/terminal/commands/contact.ts`**

```typescript
// src/terminal/commands/contact.ts
import type { CommandHandler } from '../commands';

export const contact: CommandHandler = () => ({ html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Read</span><span class="cc-tool-args">(contact.json)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Read 1 file</span></div>
  <div class="cc-output-block">
    <div class="cc-prose">Want to talk planes, trains, food, or code? I&apos;m in.</div>
    <br>
    <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--green)">&#x23FA;</span><span style="color:var(--overlay1)">Email</span><span style="color:var(--overlay0)"> &mdash;&mdash; </span><a href="mailto:sankalpkrish@outlook.com" style="color:var(--blue);text-decoration:none;">sankalpkrish@outlook.com</a></div>
    <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--green)">&#x23FA;</span><span style="color:var(--overlay1)">LinkedIn</span><span style="color:var(--overlay0)"> &mdash;&mdash; </span><a href="https://www.linkedin.com/in/sankalp-krish" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;">linkedin.com/in/sankalp-krish</a></div>
    <div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--green)">&#x23FA;</span><span style="color:var(--overlay1)">GitHub</span><span style="color:var(--overlay0)"> &mdash;&mdash; </span><a href="https://github.com/SankalpKrish" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;">github.com/SankalpKrish</a></div>
    <br>
    <div style="color:var(--overlay0);font-size:12px;">
      <div>// or use the form on this page &mdash; type a message and hit enter.</div>
      <div>// I read everything. Eventually.</div>
    </div>
  </div>
` });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/terminal/commands/about.ts src/terminal/commands/contact.ts
git commit -m "feat: add about and contact command modules"
```

---

## Task 7: Create command modules — `projects`, `skills`

**Files:**
- Create: `src/terminal/commands/projects.ts`
- Create: `src/terminal/commands/skills.ts`

- [ ] **Step 1: Create `src/terminal/commands/projects.ts`**

```typescript
// src/terminal/commands/projects.ts
import type { CommandHandler } from '../commands';

export const projects: CommandHandler = () => ({ html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Glob</span><span class="cc-tool-args">(projects/**)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 3 projects</span></div>
  <div class="cc-output-block" style="display:flex;flex-direction:column;gap:10px;">

    <div style="border:1px solid rgba(180,190,254,0.10);border-radius:4px;padding:12px 14px;">
      <div style="color:var(--lavender);font-weight:600;font-size:13px;">&#x2B21; MIDI.ai</div>
      <div style="color:var(--overlay1);font-size:11px;margin:2px 0;">projects/midi-ai/ &middot; 2024 &middot; Solo</div>
      <div style="color:var(--subtext0);font-size:12px;margin:4px 0 8px;">A truly AI-powered audio track to MIDI file pipeline.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(137,180,250,0.4);color:var(--blue);border-radius:3px;">Python</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(203,166,247,0.4);color:var(--mauve);border-radius:3px;">AI/ML</span>
      </div>
      <div style="font-size:11px;color:var(--overlay0);">&#x2B0F; /open midi.ai &mdash; open on GitHub</div>
    </div>

    <div style="border:1px solid rgba(180,190,254,0.10);border-radius:4px;padding:12px 14px;">
      <div style="color:var(--lavender);font-weight:600;font-size:13px;">&#x2B21; OpenComputer</div>
      <div style="color:var(--overlay1);font-size:11px;margin:2px 0;">projects/opencomputer/ &middot; 2024 &middot; Collab</div>
      <div style="color:var(--subtext0);font-size:12px;margin:4px 0 8px;">Building the frontend + native AI skill/plugin curiosity and discoverability.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(137,180,250,0.4);color:var(--blue);border-radius:3px;">TypeScript</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(148,226,213,0.4);color:var(--teal);border-radius:3px;">Bun</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(203,166,247,0.4);color:var(--mauve);border-radius:3px;">AI</span>
      </div>
      <div style="font-size:11px;color:var(--overlay0);">&#x2B0F; /open opencomputer &mdash; open on GitHub</div>
    </div>

    <div style="border:1px solid rgba(180,190,254,0.10);border-radius:4px;padding:12px 14px;">
      <div style="color:var(--lavender);font-weight:600;font-size:13px;">&#x2B21; The Procrastination Engine</div>
      <div style="color:var(--overlay1);font-size:11px;margin:2px 0;">projects/procrastination-engine/ &middot; 2023 &middot; For fun</div>
      <div style="color:var(--subtext0);font-size:12px;margin:4px 0 8px;">A clock made of several tiny clocks. It&apos;s time&hellip; within a time&hellip; within a time.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(249,226,175,0.4);color:var(--yellow);border-radius:3px;">JavaScript</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(250,179,135,0.4);color:var(--peach);border-radius:3px;">Canvas</span>
      </div>
      <div style="font-size:11px;color:var(--overlay0);">&#x2B0F; /open procrastination-engine &mdash; open on GitHub</div>
    </div>

  </div>
` });
```

- [ ] **Step 2: Create `src/terminal/commands/skills.ts`**

```typescript
// src/terminal/commands/skills.ts
import type { CommandHandler } from '../commands';

export const skills: CommandHandler = () => ({ html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Glob</span><span class="cc-tool-args">(skills/**)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 34 skills</span></div>
  <div class="cc-output-block" style="font-size:12px;line-height:2;">

    <div style="color:var(--teal);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>spoken-languages/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">English</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--teal);"></div></div><span style="color:var(--overlay0);font-size:10px;">native</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">French</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--teal);"></div></div><span style="color:var(--overlay0);font-size:10px;">native</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Kannada</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--teal);"></div></div><span style="color:var(--overlay0);font-size:10px;">conversational</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Hindi</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--teal);"></div></div><span style="color:var(--overlay0);font-size:10px;">basic</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Mandarin</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--teal);"></div></div><span style="color:var(--overlay0);font-size:10px;">basic</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">German</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--teal);"></div></div><span style="color:var(--overlay0);font-size:10px;">basic</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Tamil</span><div class="skill-bar-bg"><div class="skill-bar" style="width:20%;background:var(--teal);"></div></div><span style="color:var(--overlay0);font-size:10px;">understand only</span></div>

    <div style="color:var(--blue);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>languages/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">JavaScript</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--blue);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">TypeScript</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--blue);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Python</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--blue);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Java</span><div class="skill-bar-bg"><div class="skill-bar" style="width:60%;background:var(--blue);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Rust</span><div class="skill-bar-bg"><div class="skill-bar" style="width:20%;background:var(--blue);"></div></div><span style="color:var(--overlay0);font-size:10px;">learning</span></div>

    <div style="color:var(--mauve);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>frontend/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">React.js</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--mauve);"></div></div></div>

    <div style="color:var(--green);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>backend/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Node.js</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--green);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Express</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--green);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Bun</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--green);"></div></div></div>

    <div style="color:var(--peach);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>cloud/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">AWS</span><div class="skill-bar-bg"><div class="skill-bar" style="width:50%;background:var(--peach);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Microsoft Azure</span><div class="skill-bar-bg"><div class="skill-bar" style="width:50%;background:var(--peach);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Google Cloud</span><div class="skill-bar-bg"><div class="skill-bar" style="width:50%;background:var(--peach);"></div></div></div>

    <div style="color:var(--sapphire);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>data/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">PostgreSQL</span><div class="skill-bar-bg"><div class="skill-bar" style="width:60%;background:var(--sapphire);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">MongoDB</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--sapphire);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">SQL</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--sapphire);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Machine Learning</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--sapphire);"></div></div><span style="color:var(--overlay0);font-size:10px;">learning</span></div>

    <div style="color:var(--lavender);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>engineering/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Git</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--lavender);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Object-Oriented</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--lavender);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Computer Networks</span><div class="skill-bar-bg"><div class="skill-bar" style="width:60%;background:var(--lavender);"></div></div></div>

    <div style="color:var(--yellow);margin-bottom:2px;">&#x2514;&#x2500;&#x2500; <strong>soft-skills/</strong></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&nbsp;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Project Management</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--yellow);"></div></div><span style="color:var(--overlay0);font-size:10px;">learning</span></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&nbsp;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Problem Solving</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--yellow);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&nbsp;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Team Collaboration</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--yellow);"></div></div></div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--overlay0);">&nbsp;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span style="color:var(--subtext0);min-width:160px;">Leadership</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--yellow);"></div></div></div>

  </div>
` });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/terminal/commands/projects.ts src/terminal/commands/skills.ts
git commit -m "feat: add projects and skills command modules"
```

---

## Task 8: Wire command registry

**Files:**
- Modify: `src/terminal/commands.ts`

- [ ] **Step 1: Replace the full file with the wired registry**

```typescript
// src/terminal/commands.ts
import { splash }   from './commands/splash';
import { help }     from './commands/help';
import { about }    from './commands/about';
import { projects } from './commands/projects';
import { skills }   from './commands/skills';
import { contact }  from './commands/contact';
import { open }     from './commands/open';

export interface CommandResult {
  html: string;
}
export type CommandHandler = (args: string[]) => CommandResult;

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

export const COMMANDS: Record<string, CommandHandler> = {
  'splash':    splash,
  '/help':     help,
  '/about':    about,
  '/projects': projects,
  '/skills':   skills,
  '/contact':  contact,
  '/open':     open,
  '/clear':    () => ({ html: '__CLEAR__' }),
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/terminal/commands.ts
git commit -m "feat: wire full command registry"
```

---

## Task 9: Rewrite `TerminalWindow.astro` — single viewport terminal

**Files:**
- Modify: `src/components/TerminalWindow.astro`

- [ ] **Step 1: Replace the entire file**

```astro
---
// No props — this is the single global terminal
---
<div id="terminal-island">
  <div class="terminal-window">

    <div class="titlebar">
      <div class="titlebar-logo">
        <canvas id="sans-logo-titlebar" class="sans-logo-canvas"
                width="24" height="24"
                style="image-rendering:pixelated;cursor:default;"
                aria-label="Sans from Undertale pixel art"></canvas>
      </div>
      <div class="tab">
        <span class="tab-label">sankalpkrish.com</span>
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
      <div id="terminal-output"></div>
      <div class="prompt-row">
        <span class="cc-prompt-sym">❯</span>
        <input type="text" class="prompt-input" id="terminal-input"
               autocomplete="off" spellcheck="false" aria-label="Terminal input" />
      </div>
    </div>

    <div class="statusbar">
      <span>&#x2394; sankalpkrish.com</span>
      <span class="statusbar-right" data-ist-clock></span>
    </div>

  </div>
</div>

<script>
  import { TerminalEngine } from '../terminal/TerminalEngine';
  import { SansLogo } from '../canvas/SansLogo';

  new TerminalEngine(
    document.getElementById('terminal-output')!,
    document.getElementById('terminal-input') as HTMLInputElement,
  );

  document.addEventListener('DOMContentLoaded', () => {
    SansLogo.render('#sans-logo-titlebar');
    SansLogo.initHover();
  });

  function updateClock() {
    document.querySelectorAll<HTMLElement>('[data-ist-clock]').forEach(el => {
      el.textContent = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Kolkata',
      }) + ' IST';
    });
  }
  updateClock();
  setInterval(updateClock, 1000);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TerminalWindow.astro
git commit -m "refactor: TerminalWindow — single viewport terminal with Sans titlebar logo"
```

---

## Task 10: Rewrite `index.astro` and update styles

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/terminal.css`
- Modify: `src/styles/animations.css`
- Modify: `src/canvas/ParticleSystem.ts`

- [ ] **Step 1: Replace `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import TerminalWindow from '../components/TerminalWindow.astro';
---
<Base>
  <TerminalWindow />
</Base>
```

- [ ] **Step 2: Update `src/styles/terminal.css`**

Replace the `.terminal-window`, `.terminal-body`, and add `#terminal-island` — keep all `.cc-*` classes intact:

```css
/* Centered island wrapper */
#terminal-island {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.terminal-window {
  pointer-events: all;
  width: min(900px, 88vw);
  height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(30, 30, 46, 0.65);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  border: 1px solid rgba(180, 190, 254, 0.18);
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
.titlebar-logo { display: flex; align-items: center; padding: 0 6px 0 2px; flex-shrink: 0; }
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
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

#terminal-output {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 8px;
  font-size: 13px;
  line-height: 1.7;
  scrollbar-width: thin;
  scrollbar-color: var(--overlay0) transparent;
}
#terminal-output::-webkit-scrollbar { width: 6px; }
#terminal-output::-webkit-scrollbar-track { background: transparent; }
#terminal-output::-webkit-scrollbar-thumb { background: var(--overlay0); border-radius: 3px; }

.prompt-row {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px 12px;
  border-top: 1px solid rgba(180, 190, 254, 0.07);
  flex-shrink: 0;
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
  flex-shrink: 0;
}
.statusbar-right { margin-left: auto; }

/* cc-* output classes — unchanged */
.cc-hr { border: none; border-top: 1px solid rgba(180, 190, 254, 0.08); margin: 12px 0; }
.cc-user-turn { display: flex; gap: 8px; align-items: baseline; margin-top: 14px; margin-bottom: 2px; }
.cc-prompt-sym { color: var(--green); font-weight: 700; flex-shrink: 0; }
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

/* Skill bars */
.skill-bar-bg { width: 120px; height: 4px; background: rgba(180,190,254,0.1); border-radius: 2px; flex-shrink: 0; }
.skill-bar { height: 100%; border-radius: 2px; }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

@media (max-width: 768px) {
  .terminal-window { width: 100vw; height: 100dvh; border-radius: 0; }
  .tab-new, .titlebar-chevron { display: none; }
  #terminal-output { padding: 12px 14px 8px; font-size: 12px; }
}
```

- [ ] **Step 3: Update `src/styles/animations.css`**

Remove scroll-triggered rules — keep only non-scroll animations:

```css
/* animations.css — scroll-triggered animations removed (no scrolling sections) */

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 4: Remove `ScrollState` import from `src/canvas/ParticleSystem.ts`**

Open `src/canvas/ParticleSystem.ts`. Remove the line:
```typescript
import { ScrollState } from './ScrollState';
```
And remove any usage of `ScrollState` in that file (search for `ScrollState` — remove any variable declarations and calls to it).

- [ ] **Step 5: Verify build succeeds**

```bash
cd "C:/Users/sanka/Documents/GitHub/Portfolio Site"
bun run build
```

Expected: build completes with no errors. Warnings about unused imports are okay; errors are not.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/styles/terminal.css src/styles/animations.css src/canvas/ParticleSystem.ts
git commit -m "feat: single terminal viewport layout, updated styles, remove ScrollState"
```

---

## Task 11: Verify in browser and push

- [ ] **Step 1: Start dev server**

```bash
cd "C:/Users/sanka/Documents/GitHub/Portfolio Site"
bun run dev
```

Open `http://localhost:4321` in your browser.

- [ ] **Step 2: Check splash screen**

- Sans pixel-art logo renders in the splash output (left column, 80×80)
- Sans logo renders in the titlebar (24×24)
- Version line, command list visible on the right
- Typewriter effect plays on load

- [ ] **Step 3: Check hover speech bubble**

Hover over either Sans canvas. A pixel-art white speech bubble with black border should appear above it with a random quip. Move away — it fades out.

- [ ] **Step 4: Check each command**

Type each command and verify output appears and accumulates:
- `/about` — education timeline and hobbies
- `/projects` — 3 project cards with `/open` hints
- `/skills` — tree with skill bars
- `/contact` — links + form
- `/help` — command list
- `/open midi.ai` — opens GitHub in new tab
- `/clear` — clears output
- An unknown command — shows a joke error

- [ ] **Step 5: Check particles**

- Particle canvas fills the full viewport behind the terminal
- "Sankalp Krish" SDF text convergence plays on load
- Terminal glass effect visible (particles shimmer through)

- [ ] **Step 6: Push to GitHub**

```bash
git push origin master
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Single terminal, command-only content | Tasks 9, 10 |
| Splash auto-runs on load | Task 3 (autoRun in constructor), Task 5 (splash module) |
| Logo-left, text-right splash layout | Task 5 |
| Sans canvas pixel-art render | Task 4 (SansLogo.render) |
| Sans in titlebar | Task 9 |
| Hover speech bubble, Undertale quips | Task 4 (SansLogo.initHover) |
| Particles full-screen background | Task 10 (ScrollState removed, ParticleSystem untouched) |
| Output appends (CLI history) | Task 3 (no clear on run) |
| Commands module split | Tasks 5–8 |
| `navigate` field removed | Task 2 |
| Dead files deleted | Task 1 |
| Glassmorphic body | Task 10 (terminal.css) |
| Pinned input row | Task 10 (terminal.css flex layout) |
| Scrollable output | Task 10 (`#terminal-output` overflow-y: auto) |
| IST clock in statusbar | Task 9 |
| Contact form preserved | Task 6 (contact.ts links + form note) |

All spec requirements covered. No gaps found.
