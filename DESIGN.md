---
name: sankalpkrish.com
description: Personal portfolio as living terminal — WebGPU particles, pixel-art mascot, CLI-driven progressive disclosure
colors:
  crust: "#11111b"
  mantle: "#181825"
  base: "#1e1e2e"
  surface0: "#313244"
  surface1: "#45475a"
  surface2: "#585b70"
  overlay0: "#6c7086"
  overlay1: "#7f849c"
  overlay2: "#9399b2"
  subtext0: "#a6adc8"
  subtext1: "#bac2de"
  text: "#cdd6f4"
  lavender: "#b4befe"
  blue: "#89b4fa"
  sapphire: "#74c7ec"
  sky: "#89dceb"
  teal: "#94e2d5"
  green: "#a6e3a1"
  yellow: "#f9e2af"
  peach: "#fab387"
  red: "#f38ba8"
  mauve: "#cba6f7"
typography:
  display:
    fontFamily: "'JetBrains Mono', 'Courier New', monospace"
    fontSize: "clamp(36px, 6vw, 72px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'JetBrains Mono', 'Courier New', monospace"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.8
    letterSpacing: "0.04em"
  title:
    fontFamily: "'JetBrains Mono', 'Courier New', monospace"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 2
  body:
    fontFamily: "'JetBrains Mono', 'Courier New', monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "'JetBrains Mono', 'Courier New', monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  xs: "3px"
  sm: "4px"
  md: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "24px"
components:
  terminal-window:
    backgroundColor: "rgba(30, 30, 46, 0.55)"
    rounded: "{rounded.md}"
    padding: "0"
  project-card:
    backgroundColor: "rgba(49, 50, 68, 0)"
    textColor: "{colors.lavender}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  tech-tag-blue:
    backgroundColor: "rgba(137, 180, 250, 0)"
    textColor: "{colors.blue}"
    rounded: "{rounded.xs}"
    padding: "1px 8px"
  autocomplete-item:
    backgroundColor: "rgba(180, 190, 254, 0.09)"
    textColor: "{colors.lavender}"
    rounded: "0"
    padding: "6px 16px"
  ask-badge:
    backgroundColor: "rgba(0, 0, 0, 0)"
    textColor: "{colors.overlay0}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
---

# Design System: sankalpkrish.com

## 1. Overview

**Creative North Star: "The Living Terminal, Handmade Machine, and Depth Map — all three."**

This is not a website styled to look like a terminal. It is a terminal that happens to live in a browser. Every design decision flows from that distinction. The particle system is GPU-computed physics. The mascot speaks in character. The commands feel like they actually run something. The surface is restrained, almost austere. But the system rewards the visitor who types.

The aesthetic is monospace-native: a single typeface family across every weight and size, a dark background chosen because a terminal in daylight still belongs to a desk after midnight, and a color palette (Catppuccin Mocha) used semantically rather than decoratively. Colors are not mood. Colors are signal: blue for commands, lavender for titles, teal for languages, green for status, red for warnings, mauve for accents. Each hue has a job and returns to that job consistently. The frosted glass on the terminal window is not decoration; the terminal is floating above a GPU particle field that is literally behind it. The blur is structural.

The personality is precise, playful, and confident, in that order. Precision comes first: every technical choice is justified and the implementation is ambitious. Playfulness is licensed by that precision: a pixel-art Sans mascot, Undertale quips, typewriter-streamed output. And confidence throughout: the site does not explain itself apologetically. It presents, and waits.

This system explicitly rejects generic dev portfolio aesthetics (GitHub streak widgets, glowing code snippets, identical project card grids), startup SaaS landing conventions (hero plus features plus CTA in Inter or DM Sans), and loud agency maximalism (scroll-jacking, cursor effects, 5-second load). It also rejects the opposite failure: minimalism so restrained it has no personality and could belong to anyone. The terminal IS the personality.

**Key Characteristics:**
- Mono-only typeface system; no sans, no serif, no display font outside JetBrains Mono
- Catppuccin Mocha as a semantic color language, not an aesthetic choice
- Frosted glass used exactly once (the terminal window) because it is structurally justified
- Progressive disclosure via CLI: the visitor navigates by typing, not scrolling
- Playfulness earns its place through precision; neither exists without the other

## 2. Colors: The Catppuccin Mocha Semantic System

The palette is Catppuccin Mocha verbatim. No custom colors, no overrides. What distinguishes this system is how the palette is deployed: every hue has exactly one semantic role, and it does not deviate.

### Neutral (background layers)
- **Deep Void** (`#11111b`, `--crust`): The page background. The particle canvas sits on this. Never used for text or interactive elements.
- **Dark Shell** (`#181825`, `--mantle`): Titlebar and statusbar backgrounds. The deepest chrome layer.
- **Terminal Floor** (`#1e1e2e`, `--base`): The terminal window glass base color at 55% opacity. Also the body background when glass is not in play.
- **Elevated Surface** (`#313244`, `--surface0`): Borders, project card outlines, separator lines.
- **Mid Surface** (`#45475a`, `--surface1`): Scrollbar track, secondary borders.
- **Upper Surface** (`#585b70`, `--surface2`): Reserved; unused at time of writing.

### Neutral (text layers)
- **Ghost Text** (`#6c7086`, `--overlay0`): Muted UI chrome: titlebar icons, status indicators, separator lines, `//` comments in terminal copy.
- **Dim Text** (`#7f849c`, `--overlay1`): Secondary labels, tool argument annotations.
- **Faded Text** (`#9399b2`, `--overlay2`): Tertiary content; tool result symbols.
- **Readable Subtext** (`#a6adc8`, `--subtext0`): Body copy inside terminal output blocks. Project descriptions, tool result text, skill names.
- **Near-Text** (`#bac2de`, `--subtext1`): Tab labels, secondary identifiers.
- **Primary Text** (`#cdd6f4`, `--text`): All primary readable content. Command output prose. Cursor color secondary.

### Primary
- **Command Blue** (`#89b4fa`, `--blue`): All slash-commands (`/about`, `/projects`), links, autocomplete command names, name headline in splash. The user's primary navigational affordance.

### Secondary
- **Title Lavender** (`#b4befe`, `--lavender`): Project names, section headings inside output blocks, cursor caret accent. One step above blue in perceived hierarchy.

### Tertiary (domain-coded hues in skills tree)
- **Language Teal** (`#94e2d5`, `--teal`): Spoken languages domain.
- **Backend Green** (`#a6e3a1`, `--green`): Backend skills domain. Also: online/active status dots.
- **Cloud Peach** (`#fab387`, `--peach`): Cloud skills domain.
- **Data Sapphire** (`#74c7ec`, `--sapphire`): Data/database skills domain.
- **Engineering Lavender** (`#b4befe`, `--lavender`): Engineering skills domain (shares with title lavender intentionally).
- **Warning Red** (`#f38ba8`, `--red`): Certifications domain. Close-button hover. Destructive or attention states.
- **Soft Skills Yellow** (`#f9e2af`, `--yellow`): Soft skills domain. Tech tag color for JavaScript.
- **Mauve Accent** (`#cba6f7`, `--mauve`): Frontend domain. The `/open` hint lines. Tech tag color for AI/ML. The one hue that floats across categories as a secondary accent.

### Named Rules

**The One Hue, One Job Rule.** Each Catppuccin hue is bound to a semantic role. `--blue` is commands and links. `--lavender` is titles and selection. `--green` is status and backend. `--red` is warning and close. Using `--blue` for a non-command decorative element, or `--green` for anything other than status or backend, breaks the system's signal clarity. `/ask` claims no hue of its own: it borrows `--blue` for the `Ask` tool name, `--mauve` for the badge dot, and the neutral text layers for everything else. A generated surface that introduced a new colour would be claiming a semantic role the system has not granted it.

**The No Hardcoded Colors Rule.** No hex values appear outside `tokens.css`. Any new color use must reference a CSS custom property from that file. The constraint is the system.

## 3. Typography: Mono-Native

**Display / Body / Label Font:** JetBrains Mono, with 'Courier New' and generic monospace as fallbacks.

There is no secondary typeface. JetBrains Mono handles everything from 72px display type to 10px badge labels. This is not a compromise; it is a position. A terminal uses one font. This site is a terminal.

**Character:** JetBrains Mono at weight 700 is bold enough to read as a headline. At weight 400 it is calm enough to read as body copy. The same letterforms at different scales and weights create a coherent visual rhythm without a single rule of typographic pairing to manage.

### Hierarchy

- **Display** (700, `clamp(36px, 6vw, 72px)`, line-height 1.1, letter-spacing -0.02em): The intro cinematic only. "Sankalp Krish" rendered in particle text before the terminal appears. Never reused inside terminal output.
- **Headline** (600, 15px, line-height 1.8, letter-spacing 0.04em): Name line in the splash screen. Section identifiers in command output.
- **Title** (600, 13px, line-height 2): Project names, category headers in the skills tree. Bold enough to register as a heading within body-sized context.
- **Body** (400, 13px, line-height 1.7): All terminal output prose. The default reading size. No line-length cap applies; the terminal window is `min(900px, 88vw)` and output is padded to `20px` each side.
- **Label** (400, 11–12px, line-height 1.5): Status bar text, tab labels, tech tags, skill proficiency labels, cert badges. The floor of legibility.

### Named Rules

**The Mono-Only Rule.** No sans, serif, or variable font is ever introduced. The moment a second typeface appears, the terminal illusion breaks. Every typographic need is solved by weight, size, and spacing within JetBrains Mono.

**The Scale Compression Rule.** The visible type scale runs from 72px (display, intro only) to 10px (segment badges). Inside the terminal, the working scale is 13px body to 10px label — a tight band. Hierarchy within terminal output is achieved primarily through color (blue commands, lavender titles, subtext body) rather than size jumps.

## 4. Elevation

This system uses exactly one elevated element: the terminal window. Everywhere else is flat. The elevation strategy is tonal layering: crust → mantle → base, each step slightly lighter, conveying depth without shadows.

The terminal window uses frosted glass (`backdrop-filter: blur(24px) saturate(1.8)`) with a deep drop shadow (`0 40px 120px rgba(0,0,0,0.8)`) and a thin lavender-tinted border (`1px solid rgba(180,190,254,0.22)`). This is justified exactly once because the terminal literally floats above a full-screen particle canvas. The blur reveals what's behind it. If there were no particle field, this treatment would be decoration and would be removed.

### Shadow Vocabulary

- **Terminal float** (`0 40px 120px rgba(0,0,0,0.8), 0 0 80px rgba(180,190,254,0.04), inset 0 1px 0 rgba(255,255,255,0.05)`): The terminal window only. Establishes that the window is a floating object above the canvas layer. Never replicated elsewhere.

### Named Rules

**The One Glass Rule.** `backdrop-filter` is used in exactly one place: the terminal window. It is justified because the terminal floats above a GPU particle layer. Using it on any other element (project cards, tooltips, autocomplete pane) would make it decorative and break the rationale.

**The Flat-By-Default Rule.** Inside the terminal, all surfaces are flat. Project cards use a thin border (`1px solid rgba(180,190,254,0.10)`) on a transparent background, not a card surface with shadow. The autocomplete pane uses a dark semi-transparent background. No inner shadows.

## 5. Components

### Terminal Window

The flagship component. An island: `min(900px, 88vw)` wide, `85vh` tall, centered on the viewport.

- **Chrome:** Titlebar (`40px`, dark mantle background at 75% opacity) with a thin lavender-tinted bottom border. Pixel-art Sans logo canvas (`24×24`) at left. Tab strip, chevron, window controls (close hover goes `--red`). On mobile (≤768px): border-radius collapses to 0, window fills viewport, tab-new and window controls hidden.
- **Body:** Output pane (`overflow-y: auto`) padded `16px 20px`. Prompt row padded `10px 20px 12px` with a thin top border. Statusbar at `7px 16px`.
- **Glass:** `rgba(30, 30, 46, 0.55)` base, `backdrop-filter: blur(24px) saturate(1.8)`, `border: 1px solid rgba(180,190,254,0.22)`. Entrance: scales from 0.95 to 1.0 with `cubic-bezier(0.16, 1, 0.3, 1)` over 1.2s.

### Project Cards

Not a card component in the conventional sense. Each project is a bordered block with transparent background inside a `cc-output-block`.

- **Border:** `1px solid rgba(180,190,254,0.10)` — just barely visible against the terminal floor.
- **Radius:** `4px` (sharp, not rounded).
- **Padding:** `12px 14px`.
- **Title:** `--lavender`, 600 weight, 13px. Preceded by a hex diamond glyph (`⬡`).
- **Meta line:** `--overlay1`, 11px (path, date, solo/collab).
- **Description:** `--subtext0`, 12px.
- **Tech tags:** Inline badges with hue-matched border and text color (blue for TypeScript, mauve for AI/ML, teal for Bun, yellow for JavaScript, peach for Canvas). `border-radius: 3px`, `padding: 1px 8px`, `font-size: 10px`.
- **Action line:** `--mauve`, 11px. The `/open [name]` hint. Not a button; it is copy that teaches the CLI.

### Skills Tree

A file-system tree rendered as terminal output. Category headers are hue-coded (teal, blue, mauve, green, peach, sapphire, lavender, red, yellow). Each skill row: tree line glyph (hidden on mobile) + skill name (160px min-width, 130px on mobile) + segmented bar + proficiency label.

- **Segmented bar:** 5 segments, `16px × 5px` each (desktop), `12px × 4px` (mobile ≤768px), `9px × 4px` (mobile ≤380px), `gap: 3px`, `border-radius: 1px`. Filled segments use `--skill-color` (CSS custom property set inline per category). Unfilled: `rgba(180,190,254,0.08)`.
- **Proficiency label:** `--overlay0`, 10px, right of bar.
- **Cert badge:** `--overlay0`, 10px, 50% opacity, hidden on mobile ≤768px.

### Autocomplete Pane

Appears between terminal output and prompt row when the user types a partial command.

- **Background:** `rgba(22, 22, 34, 0.7)`, `border-top: 1px solid rgba(180,190,254,0.1)`.
- **Item:** `padding: 6px 16px`, `font-size: 12px`. Default: transparent background. Active: `rgba(180,190,254,0.09)`.
- **Command name:** `--blue`, 600 weight, `140px` fixed width. Active: `--lavender`.
- **Description:** `--overlay0`, 11px. Active: `--subtext1`.

### Separator (cc-hr)

`border-top: 1px solid rgba(180,190,254,0.08)`. Used between output sections. Margin `12px 0`. No styling beyond this.

### Output Block (cc-output-block)

`border-left: 2px solid rgba(180,190,254,0.18)`. The one exception to the side-stripe ban: this is a semantic indent marker used consistently inside terminal output to indicate a command result block. It is not a card accent; it is a TUI tree branch.

### Ask Output (cc-ask)

The only surface on this site that produces its own prose at runtime. Everything else is authored by hand; this text comes from a model. That single fact drives every rule below.

It reuses the existing primitives rather than introducing new ones: a `cc-tool-use` row reading `Ask (sankalp)`, then a `cc-output-block` holding the answer. The tool row is what makes the response legible as a tool call rather than a human typing a paragraph, and reusing `cc-tool-use` is why no new chrome was needed.

- **Answer prose:** `.cc-prose` — `--text`, 13px, `line-height: 1.7`. Identical to every other block of body copy in the terminal. The AI does not get its own typography.
- **Badge:** `.cc-ask-badge`, `inline-flex`, `gap: 6px`, `margin-top: 10px`, `padding: 2px 8px`, `1px solid rgba(180,190,254,0.12)`, `border-radius: 3px`, `--overlay0`, 10px, `letter-spacing: 0.03em`. A 5×5px `--mauve` dot precedes the text. Copy is fixed: `AI twin, not Sankalp himself`.
- **Citations:** `.cc-ask-sources` label in `--overlay0` at 10px, reading `from`, followed by chunk ids in `.cc-ask-source` — `--overlay1`, 10px, `border-bottom: 1px dotted rgba(180,190,254,0.2)`. The dotted underline marks them as identifiers, not links, because they are not links.
- **Wait state:** `.cc-ask-wait` — `--overlay1`, 12px — reading `Thinking` with an animated ellipsis (`.cc-ask-dots::after`, `1.2s steps(4, end)`, keyframing `content`). The global `prefers-reduced-motion` rule collapses the duration to `0.01ms`; note that `steps(4, end)` on a zero-length infinite animation is not a reliable way to guarantee the dots disappear, so if that matters, suppress the pseudo-element explicitly rather than relying on the duration collapse. The wait state must remain legible either way — the word `Thinking` carries the meaning, the dots only decorate it.
- **Degraded copy:** `.cc-prose-dim` (`--subtext0`) for the detail line, with `--blue` reserved for the fallback command links. Offline, rate-limited, and non-2xx states all render in this register, and each names the fixed commands that still work.

**The badge is not decoration.** The model answers in the first person about a real person's projects, credentials and working style, in a voice deliberately identical to the rest of the site. That is what makes it useful and what makes it dangerous. The badge is the only thing separating a warm, confident answer from a fabricated one, so it appears on every single response — the idle prompt, a full answer, and a refusal alike — and it is never dismissible, collapsible, delayed, or shown only when convenient. Removing it does not degrade the feature; it makes the site deceptive.

Refusals are treated as first-class output, not as errors. "I don't have anything on that" is rendered in exactly the same block, with the same badge, as a successful answer, because a system that admits its limits is carrying the same claim as one that answers everything. Styling a refusal as a warning would imply the corpus failed when it did the correct thing.

### Ask Failure States

Three states never reached the Worker or never produced a token: offline, rate-limited, and non-2xx. None of them may render as a browser error, an unstyled rejection, or a stack trace. Each reads as a normal part of the terminal and each closes by pointing at `/projects`, `/skills`, `/about` or `/contact`, in `--blue`, because a dead end should always advertise the fixed pages that still work. This is the same graceful-parity principle as the Canvas 2D fallback, applied to a network dependency instead of a GPU one.

## 6. Do's and Don'ts

### Do:

- **Do** use `--blue` exclusively for commands, links, and user-navigable affordances. Visitors learn that blue means "I can type this."
- **Do** use `--lavender` for titles, selection states, and the caret. It is the one step above blue in perceived hierarchy inside the terminal.
- **Do** assign hues per domain in the skills tree: teal for spoken languages, blue for programming languages, green for backend, peach for cloud, sapphire for data, lavender for engineering, red for certifications, yellow for soft skills. These assignments are the legend; preserve them.
- **Do** use frosted glass (`backdrop-filter`) on the terminal window only. Never on a card, tooltip, dropdown, or secondary surface.
- **Do** use `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) for all entrance animations. State transitions: `0.15s–0.3s` standard easing.
- **Do** respect `prefers-reduced-motion`. When set, kill particle canvas display and collapse all animation durations to `0.01ms`.
- **Do** keep type within JetBrains Mono at all weights and sizes. No second typeface.
- **Do** write terminal copy in the established voice: direct, technically grounded, dry. "// I read everything. Eventually." is the register.
- **Do** keep the `AI twin, not Sankalp himself` badge on every `/ask` response, including the idle prompt and every refusal. It is load-bearing copy, not a label.
- **Do** render `/ask` refusals and failure states in the same visual register as successful answers. An admission of ignorance is a valid result, not a failure state, and should not be styled as one.

### Don't:

- **Don't** use `--blue` for decorative elements that are not commands or links. A colored heading that isn't interactive should be `--lavender` or `--text`, not `--blue`. Blue means "type me."
- **Don't** introduce a second typeface. No Inter, no DM Sans, no Georgia. The mono-only rule is non-negotiable.
- **Don't** add glassmorphism to any surface other than the terminal window. A frosted card, frosted nav, or frosted tooltip would make the terminal's glass meaningless.
- **Don't** build conventional card grids. Project output is a bordered list inside a `cc-output-block`. Identical same-sized cards with icon-heading-text pattern are the generic dev portfolio this site rejects by name.
- **Don't** hardcode hex values outside `tokens.css`. Every color must reference a CSS custom property. This is how Catppuccin is maintained as a system, not just a palette.
- **Don't** animate layout properties (`width`, `height`, `padding`, `margin`). Animate `opacity` and `transform` only.
- **Don't** use `border-left` greater than 2px as a decorative accent. The `cc-output-block` left border is semantic (TUI indent), not decoration, and is 2px. Any new use of a side stripe as a card accent is prohibited.
- **Don't** make the site explain itself. No "Welcome to my portfolio" headers. No "Here are my skills" intros. The terminal output copy is direct. Trust the visitor.
- **Don't** add scroll-driven animations, cursor effects, or page transitions. The site has no scroll. Adding parallax or cursor trails turns precision into performance.
- **Don't** let the particle canvas overshadow the terminal. It fades in at `opacity: 0.85` — a soft aura, not a spectacle. If tuning it, bias toward subtlety.
- **Don't** make the `/ask` badge dismissible, conditional, or skippable. No close button, no fade after N seconds, no "don't show this again". A badge that can be dismissed is a badge that will be dismissed, and the visitor who needed it is the one who dismissed it.
- **Don't** style the AI twin as Sankalp. No avatar, no `--lavender` title treatment, no first-person styling that distinguishes it from ordinary output. The twin borrows the terminal's existing voice and type exactly so that the badge is the single honest signal; adding personhood cues would make the surface more convincing than the truth warrants.
- **Don't** add a colour to `/ask` that the Catppuccin system has not already assigned. Generated surfaces are the most likely place for a system to grow an unassigned hue, and that is precisely how the One Hue, One Job rule dies.
