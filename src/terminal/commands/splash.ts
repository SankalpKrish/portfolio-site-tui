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
