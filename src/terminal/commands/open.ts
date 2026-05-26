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
