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
