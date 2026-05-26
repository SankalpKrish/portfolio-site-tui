// src/terminal/TerminalEngine.ts
import { typewriter } from './typewriter';
import { COMMANDS, unknownCommandResult, type CommandResult } from './commands';

export class TerminalEngine {
  private outputEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private history: string[] = [];
  private historyIndex = -1;

  constructor(outputEl: HTMLElement, inputEl: HTMLInputElement) {
    this.outputEl = outputEl;
    this.inputEl  = inputEl;
    this.inputEl.addEventListener('keydown', this.onKeyDown.bind(this));
    this.inputEl.focus();
    this.autoRun('splash');
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const raw = this.inputEl.value.trim();
      if (!raw) return;
      this.history.unshift(raw);
      this.historyIndex = -1;
      this.inputEl.value = '';
      this.run(raw);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
      this.inputEl.value = this.history[this.historyIndex] ?? '';
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.historyIndex = Math.max(this.historyIndex - 1, -1);
      this.inputEl.value = this.historyIndex === -1 ? '' : this.history[this.historyIndex];
    }
  }

  private clearOutput() {
    while (this.outputEl.firstChild) {
      this.outputEl.removeChild(this.outputEl.firstChild);
    }
  }

  private async run(raw: string) {
    // splash is internal — not echoed, not user-typeable
    if (raw !== 'splash') {
      const userDiv = document.createElement('div');
      userDiv.className = 'cc-user-turn';
      const sym = document.createElement('span');
      sym.className = 'cc-prompt-sym';
      sym.textContent = '❯';
      const txt = document.createElement('span');
      txt.className = 'cc-user-text';
      txt.textContent = raw;
      userDiv.append(sym, txt);
      this.outputEl.appendChild(userDiv);
    }

    const [cmd, ...args] = raw.split(' ');
    const handler = COMMANDS[cmd];
    const result: CommandResult = handler ? handler(args) : unknownCommandResult(cmd);

    if (result.html === '__CLEAR__') {
      this.clearOutput();
      return;
    }

    const responseDiv = document.createElement('div');
    this.outputEl.appendChild(responseDiv);
    await typewriter(responseDiv, result.html, 4);

    // After splash types in, render the Sans logo canvas
    if (raw === 'splash') {
      const { SansLogo } = await import('../canvas/SansLogo');
      await SansLogo.render('#sans-logo');
    }

    // Scroll output area to bottom
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  async autoRun(cmd: string) {
    await this.run(cmd);
  }
}
