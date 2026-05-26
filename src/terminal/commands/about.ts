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
