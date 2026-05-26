// src/terminal/commands.ts
import { splash }   from './commands/splash';
import { help }     from './commands/help';
import { about }    from './commands/about';
import { projects } from './commands/projects';
import { skills }   from './commands/skills';
import { contact }  from './commands/contact';
import { open }     from './commands/open';

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

export const COMMANDS: Record<string, CommandHandler> = {
  'splash':    splash,
  '/help':     help,
  '/about':    about,
  '/projects': projects,
  '/skills':   skills,
  '/contact':  contact,
  '/open':     open,
  '/clear':    () => ({ html: '__CLEAR__' }),
};
