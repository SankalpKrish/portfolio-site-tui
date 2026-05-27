// src/terminal/commands/help.ts
import type { CommandHandler } from '../commands';

export const help: CommandHandler = () => ({ html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x25CF;</span><span class="cc-tool-name">Read</span><span class="cc-tool-args">(commands.json)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 7 commands</span></div>
  <div class="cc-output-block" style="font-size:12px;line-height:2;">
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/about</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">who I am</span></div>
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/projects</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">things I&apos;ve built</span></div>
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/skills</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">what I know</span></div>
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/contact</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">get in touch</span></div>
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/mail</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">send me an email</span></div>
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/open [name]</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">open a project on GitHub</span></div>
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/reload</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">reload the website</span></div>
    <div><span style="color:var(--blue);min-width:130px;display:inline-block;">/help</span><span style="color:var(--overlay0)">&rarr;</span> <span style="color:var(--subtext0)">show this message</span></div>
  </div>
` });
