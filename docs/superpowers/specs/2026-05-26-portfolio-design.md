# Portfolio Site — Design Spec
**Date:** 2026-05-26
**Author:** Sankalp Krishna

---

## 1. Vision

A personal portfolio that signals "this person can actually code" through the medium itself — not by saying it, but by being it. The site is a glassmorphic Windows Terminal window floating over a live WebGPU particle field. Interaction follows Claude Code CLI conventions (`/commands`, `⏺` tool lines, `⎿` nested results). Every design decision is intentional and human — not generated.

Reference aesthetic: hubtown.co.in, thewatch.60fps.fr, yutaabe.com.

---

## 2. Aesthetic

**Style:** Hybrid — Neo-Minimalist structure and typography, Cyber-Gothic/Dark Cyberpunk palette and motion.

**Palette (Catppuccin Mocha):**
```
--base:     #1e1e2e   background panels
--mantle:   #181825   titlebar / status bar
--crust:    #11111b   page background
--text:     #cdd6f4   primary text
--subtext0: #a6adc8   secondary text
--overlay0: #6c7086   dim / muted
--lavender: #b4befe   names, titles
--blue:     #89b4fa   tool names, links
--teal:     #94e2d5   tags, accents
--green:    #a6e3a1   status, success
--mauve:    #cba6f7   section headers, Three.js
--peach:    #fab387   WebGPU, timestamps
--yellow:   #f9e2af   prompt symbol
--red:      #f38ba8   errors, close button hover
```

**Typography:**
- `JetBrains Mono` — everything. No other font.
- Headings: large, tight letter-spacing, font-weight 700
- Body/output: 13px, weight 400, line-height 1.7
- Status bar / meta: 11px, weight 400

**Motion principles:**
- Easing: `power3.out` everywhere (GSAP)
- Cursor: 2px lavender trailing dot, 80ms lag
- Nothing snaps — everything has weight and deceleration
- Scroll triggers offset — elements animate before fully in view

---

## 3. User Flow

### 3.1 Entry — WebGPU Particle Welcome
- Full-screen `#11111b` background, no UI chrome
- WebGPU compute shader: ~500k particles drift randomly across the viewport
- On load complete: particles converge and spell **"Sankalp Krish"**
- Text holds for ~2 seconds, then particles gently disperse back to ambient drift
- No scroll indicator, no buttons — the only cue is the particle motion settling

### 3.2 Scroll → Terminal Reveals
- As user scrolls past the particle hero, the glassmorphic terminal window slides up (`y: 60 → 0, opacity: 0 → 1`, `power3.out`, 600ms)
- Particles persist underneath — visible through the glass at reduced opacity
- Terminal auto-runs `whoami` on first appearance, output types in character by character

### 3.3 Terminal Interaction
- Real `>` prompt at the bottom of every section (exactly like Claude Code)
- Slash commands only: `/help`, `/about`, `/projects`, `/skills`, `/contact`, `/clear`, `/open [project]`
- Unknown commands: witty error response in CC style
- `/help` lists all commands with one-line descriptions, rendered as a CC-style output block
- Each command output types in progressively — not instant

### 3.4 Navigation
- Scroll naturally moves between the 5 terminal windows (each section is its own window pane)
- Tab strip updates: `SK://` → `SK://about` → `SK://projects` → `SK://skills` → `SK://contact`
- Commands also navigate: typing `/projects` from `/about` smoothly scrolls to that section and re-runs the command

---

## 4. Terminal Window Chrome

Identical to Windows Terminal — glassmorphic variant:

```
┌─────────────────────────────────────────────────────┐
│ [icon] SK://portfolio  ×  +  ⌄          — ☐ ✕      │  ← titlebar, 40px, rgba(17,17,27,0.75)
├─────────────────────────────────────────────────────┤
│                                                     │
│  terminal body content                              │  ← rgba(24,24,37,0.70) + blur(28px)
│                                                     │
├─────────────────────────────────────────────────────┤
│  ⎔ SK://portfolio                           IST time │  ← status bar, 11px
└─────────────────────────────────────────────────────┘
```

- `backdrop-filter: blur(28px) saturate(1.8)` — WebGPU particles bleed through
- `border: 1px solid rgba(180,190,254,0.10)`
- `box-shadow: 0 32px 96px rgba(0,0,0,0.75)`
- Window controls: `—` `☐` `✕` — close button turns red on hover

---

## 5. Sections

### 5.1 Hero (`SK://`)
- Auto-runs `whoami` on scroll-in
- Output:
  ```
  ✻ Welcome to SK://portfolio
  
  > whoami
  ⏺ Read(identity.json)
  ⎿  Read 1 file

  Sankalp Krishna
  Second-year student · Digital Transformation (CS) · India
  Building things at the intersection of systems and art.

  ⏺ Status   ── ● Open to opportunities
  ⏺ Stack    ── TypeScript · Bun · Three.js · WebGPU · Python · Rust (learning)
  ⏺ Location ── India · [live IST clock]
  ```

### 5.2 About (`SK://about`)
- Command: `/about` or `cat about.md`
- Output renders as a markdown-style prose block in CC style:
  ```
  > /about
  ⏺ Read(about.md)
  ⎿  Read 1 file

  I'm a second-year student studying Digital Transformation (CS)
  at Atria University, Bangalore (B.Tech, Aug 2024 – Jun 2028).
  Currently building personal projects and contributing to collaborative
  ones. I like making things that sit at the edge of what software
  is supposed to look like.

  Education:
  ⏺ Shuqun Primary School, Singapore     — Primary
  ⏺ Hillgrove Secondary School, Singapore — Secondary
  ⏺ Greenwood High, Bangalore            — IGCSE  (Apr 2021 – Apr 2022)
  ⏺ Greenwood High, Bangalore            — IBDP   (Aug 2022 – May 2024)
  ⏺ Atria University, Bangalore          — B.Tech (Aug 2024 – Jun 2028)

  When I'm not coding:
  ⏺ Plane spotting        — airports are underrated
  ⏺ Train spotting        — same energy, different iron
  ⏺ Gaming               — yes, seriously
  ⏺ Philosophy           — strong believer, don't @ me
  ⏺ Food                 — obsessed, no apologies
  ```

### 5.3 Projects (`SK://projects`)
- Command: `/projects` or `ls projects/`
- Cinematic list: project name + stack visible, hover reveals live Three.js preview scene
- On hover: clip-path reveal of a Three.js canvas (lazy-instantiated per project)

**Projects:**

**MIDI.ai** (solo)
- Description: A truly AI-powered audio track → MIDI file pipeline.
- Stack: Python
- GitHub: https://github.com/SankalpKrish/MIDI.ai
- Three.js preview: audio waveform visualizer

**OpenComputer** (collab — with mates)
- Description: Building the frontend + native AI skill/plugin curiosity and discoverability.
- Role: Frontend + AI integration design
- GitHub: https://github.com/sakshamzip2-sys/opencomputer
- Three.js preview: node graph / plugin network visualization

**The Procrastination Engine** (for fun)
- Description: A clock made of several tiny clocks. *"It's time... within a time... within a time."*
- Origin: Born from a Reddit rabbit hole.
- GitHub: https://github.com/SankalpKrish/The-Procrastination-Engine
- Three.js preview: recursive clock faces

### 5.4 Skills (`SK://skills`)
- Command: `/skills` or `tree skills/`
- Output renders as an animated tree, branches appear one by one:
  ```
  > /skills
  ⏺ Glob(skills/**)
  ⎿  Found 9 skills

  skills/
  ├── spoken-languages/
  │   ├── English             ██████████  native
  │   ├── French              ██████████  native
  │   ├── Kannada             ███████░░░  conversational
  │   ├── Hindi               ████░░░░░░  basic
  │   ├── Mandarin            ████░░░░░░  basic
  │   ├── German              ████░░░░░░  basic
  │   └── Tamil               ██░░░░░░░░  understand only
  ├── languages/
  │   ├── JavaScript          ████████░░  comfortable
  │   ├── TypeScript          ████████░░  comfortable
  │   ├── Python              ███████░░░  comfortable
  │   ├── Java                ██████░░░░  comfortable
  │   └── Rust                ██░░░░░░░░  learning
  ├── frontend/
  │   └── React.js            ███████░░░  comfortable
  ├── backend/
  │   ├── Node.js             ████████░░  comfortable
  │   ├── Express             ███████░░░  comfortable
  │   └── Bun                 ████████░░  comfortable
  ├── cloud/
  │   ├── AWS                 █████░░░░░  comfortable
  │   ├── Microsoft Azure     █████░░░░░  comfortable
  │   └── Google Cloud        █████░░░░░  comfortable
  ├── data/
  │   ├── PostgreSQL          ██████░░░░  comfortable
  │   ├── MongoDB             ███████░░░  comfortable
  │   ├── SQL                 ███████░░░  comfortable
  │   └── Machine Learning    ████░░░░░░  learning
  ├── engineering/
  │   ├── Git                 ████████░░  comfortable
  │   ├── Object-Oriented     ███████░░░  comfortable
  │   └── Computer Networks   ██████░░░░  comfortable
  └── soft-skills/
      ├── Project Management  ████░░░░░░  learning
      ├── Problem Solving     ████████░░
      ├── Team Collaboration  ██████████
      └── Leadership          ██████████
  ```
- Progress bars animate on section enter (left to right, GSAP)

### 5.5 Contact (`SK://contact`)
- Command: `/contact`
- Personality-forward, not formal:
  ```
  > /contact
  ⏺ Read(contact.json)
  ⎿  Read 1 file

  Want to talk planes, trains, food, or code? I'm in.
  
  ⏺ Email      ── sankalpkrish@outlook.com
  ⏺ LinkedIn   ── linkedin.com/in/sankalp-krish
  ⏺ GitHub     ── github.com/SankalpKrish
  
  // or just type a message below and hit enter.
  // I read everything. Eventually.

  > [live input field — sends email via form]
  ```
- The input at the bottom is a real form — styled as the CC prompt, submits via a serverless function

---

## 6. WebGPU Particle System

- **Entry:** 500k particles, WebGPU compute shader
- Particle state: `vec4<f32>` (position.xy, velocity.xy) in GPU storage buffer
- Each frame: compute pass applies noise-based drift + optional mouse attraction
- On load: particles converge to spell `"Sankalp Krish"` using signed distance field glyph targets
- **Fallback:** Three.js `Points` geometry (50k particles) if `navigator.gpu` unavailable
- Particles persist throughout the page — density and speed modulated by scroll position via a `ScrollState` singleton

---

## 7. Three.js Project Previews

Each project row has a lazy-instantiated `ProjectPreview` class:

| Project | Preview scene |
|---|---|
| MIDI.ai | Audio waveform bars animated with sine waves |
| OpenComputer | Floating node graph, edges pulse |
| Procrastination Engine | Recursive clock faces, each hand ticking |

- Rendered to offscreen canvas, revealed via `clip-path: inset(0 100% 0 0)` → `inset(0 0% 0 0)` on hover
- Instantiated only when row enters viewport (IntersectionObserver)
- Destroyed on scroll-out to save GPU memory

---

## 8. Toolchain

| Tool | Purpose |
|---|---|
| Astro 4 | Site framework, zero-JS by default |
| Bun | Package manager, dev server, build runner |
| Three.js | Project preview scenes |
| WebGPU (native) | Particle compute system |
| GSAP + ScrollTrigger | All scroll-driven animation |
| TypeScript | Everything |

**No React. No R3F.** All canvas code is raw TypeScript classes, instantiated from Astro `<script>` tags. This is intentional — the code signals mastery.

Build: `bun run build` → static `dist/` output, deployable to Vercel/Netlify/Cloudflare Pages.

---

## 9. Personality Details

- **Live IST clock** in status bar — grounds the site in a real moment
- **Trailing cursor dot** — 2px lavender, 80ms lag, always present
- **Witty unknown command errors** — e.g. `/npm install feelings` → `⎿ error: feelings not found in registry`
- **The Procrastination Engine description** — kept verbatim from the README, it's already perfect
- **Contact copy** — `"I read everything. Eventually."` — honest, casual, human

---

## 10. Responsive Behavior

- Desktop (>1024px): Full terminal window, centered, max-width 900px
- Tablet (768–1024px): Terminal window fills width, some chrome simplified
- Mobile (<768px): Titlebar collapses to icon + tab name only; font-size drops to 12px; particle count reduced to 100k

---

## 11. Accessibility

- All terminal output is real DOM text (not canvas) — screen reader accessible
- Particle canvas has `aria-hidden="true"`
- Color contrast: all text colors meet WCAG AA against `#1e1e2e` background
- Reduced motion: `prefers-reduced-motion` disables particle animation and GSAP transitions, shows static content

---

## 12. Deployment

- Static output via `bun run build`
- Target: Vercel (zero config for Astro static)
- No backend except one serverless function for contact form email
