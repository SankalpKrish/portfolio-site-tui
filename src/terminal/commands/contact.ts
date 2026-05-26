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
