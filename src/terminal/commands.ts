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
