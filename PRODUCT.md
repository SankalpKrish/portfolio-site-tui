# Product

## Register

brand

## Users

Recruiters, hiring managers, and technical collaborators who land on sankalpkrish.com while evaluating Sankalp as a candidate or potential collaborator. They arrive with low context and variable patience. The site must earn sustained attention before they decide whether to reach out.

Secondary: developers and engineers who stumble on the site and are curious about how it works.

## Product Purpose

A personal portfolio that functions as a project in its own right. The terminal-as-interface pattern is not decoration; it is the demonstration. Visitors who explore the CLI are experiencing the work, not just reading about it. Success means a visitor reaches the contact command or follows an external link feeling genuinely impressed, not just informed.

## Brand Personality

Precise, playful, confident.

- Precision: every technical choice is deliberate and explained. WebGPU with a Canvas 2D fallback, WGSL shaders, zero-runtime static output. No accidental complexity.
- Playful: a pixel-art Sans mascot, Undertale quips, typewriter output. Depth without stiffness.
- Confident: the site doesn't hedge or explain itself apologetically. It presents a strong point of view and trusts the visitor to engage.

## Anti-references

- Generic dev portfolio: dark background, glowing code snippet hero, GitHub streak widget, identical project cards in a grid. This site is already the opposite of that.
- Startup SaaS landing: feature grid, pricing section, CTA button in Inter. Nothing here is trying to sell a product.
- Minimalist to the point of invisible: so restrained it has no personality and could belong to anyone. The terminal conceit means every design choice has to earn its place.
- Loud agency site: scroll-jacking, cursor trails, 10 JS libraries, 5-second load. The WebGPU particle system is a technical achievement, not a spectacle for its own sake. The fallback must have full visual parity.

## Design Principles

1. **The portfolio is the project.** Every design and engineering decision should demonstrate capability, not just describe it. If a feature can be built in a way that shows the work, build it that way.
2. **Progressive disclosure, not front-loading.** The CLI pattern lets visitors choose their depth. Don't push everything onto a single screen. Let curiosity drive the navigation.
3. **Earn the flourish.** Playfulness (the mascot, the quips, the typewriter) is licensed by the underlying precision. One without the other reads as either cold or chaotic.
4. **Graceful parity.** Every visual experience must work at feature parity on the Canvas 2D path. WebGPU is an enhancement, not a prerequisite.
5. **Voice is consistent.** Terminal output copy, README prose, and any visible UI text share the same register: direct, technically grounded, occasionally dry.

## Accessibility & Inclusion

- Keyboard navigation is intrinsic to the terminal interface; all commands are keyboard-first.
- Reduced-motion: particle animation should respect `prefers-reduced-motion` and degrade gracefully.
- Color contrast: Catppuccin Mocha tokens should meet WCAG AA at minimum for text-on-background pairs.
- Screen readers: terminal output injected into the DOM should be accessible to assistive technology where possible.
