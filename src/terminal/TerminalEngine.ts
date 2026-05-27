// src/terminal/TerminalEngine.ts
import { typewriter } from './typewriter';
import { COMMANDS, unknownCommandResult, type CommandResult } from './commands';
import type { MailComposer } from './MailComposer';

interface CommandItem {
  name: string;
  desc: string;
}

export class TerminalEngine {
  private outputEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private history: string[] = [];
  private historyIndex = -1;

  private mailComposer: MailComposer | null = null;

  // Autocomplete state
  private autocompleteEl: HTMLElement | null = null;
  private autocompleteActive = false;
  private autocompleteMatches: CommandItem[] = [];
  private autocompleteIndex = 0;
  private commandsList: CommandItem[] = [
    { name: '/about', desc: 'who I am' },
    { name: '/projects', desc: 'things I\'ve built' },
    { name: '/skills', desc: 'what I know' },
    { name: '/contact', desc: 'get in touch' },
    { name: '/mail', desc: 'send me an email' },
    { name: '/open', desc: 'open a project on GitHub' },
    { name: '/reload', desc: 'reload the website' },
    { name: '/help', desc: 'show this message' },
  ];

  constructor(outputEl: HTMLElement, inputEl: HTMLInputElement) {
    this.outputEl = outputEl;
    this.inputEl  = inputEl;
    this.autocompleteEl = document.getElementById('command-autocomplete');

    this.inputEl.addEventListener('keydown', this.onKeyDown.bind(this));
    this.inputEl.addEventListener('input', this.onInput.bind(this));
    this.inputEl.focus();
    this.autoRun('splash');
  }

  private onInput() {
    if (this.mailComposer) {
      this.mailComposer.handleInput();
      return;
    }

    const val = this.inputEl.value.trim();
    if (val.startsWith('/')) {
      this.autocompleteMatches = this.commandsList.filter(cmd =>
        cmd.name.toLowerCase().startsWith(val.toLowerCase())
      );

      if (this.autocompleteMatches.length > 0) {
        this.autocompleteActive = true;
        this.autocompleteIndex = Math.min(this.autocompleteIndex, this.autocompleteMatches.length - 1);
        if (this.autocompleteIndex < 0) this.autocompleteIndex = 0;
        this.renderAutocomplete();
      } else {
        this.hideAutocomplete();
      }
    } else {
      this.hideAutocomplete();
    }
  }

  private renderAutocomplete() {
    if (!this.autocompleteEl) return;
    this.autocompleteEl.innerHTML = this.autocompleteMatches.map((cmd, idx) => {
      const isActive = this.autocompleteIndex === idx;
      return `
        <div class="autocomplete-item ${isActive ? 'active' : ''}" data-index="${idx}">
          <span class="autocomplete-cmd">${cmd.name}</span>
          <span class="autocomplete-desc">${cmd.desc}</span>
        </div>
      `;
    }).join('');
    this.autocompleteEl.classList.add('show');
    this.outputEl.scrollTop = this.outputEl.scrollHeight;

    // Ensure selected item is scrolled into view in the pane
    const activeEl = this.autocompleteEl.querySelector('.autocomplete-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }

    // Add click event handlers to autocomplete items for convenience
    this.autocompleteEl.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0');
        this.inputEl.value = this.autocompleteMatches[idx].name;
        this.hideAutocomplete();
        this.inputEl.focus();
      });
    });
  }

  private hideAutocomplete() {
    this.autocompleteActive = false;
    this.autocompleteMatches = [];
    if (this.autocompleteEl) {
      this.autocompleteEl.classList.remove('show');
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    // 1. Delegate to mail composer if active
    if (this.mailComposer) {
      this.mailComposer.handleKeyDown(e);
      return;
    }

    // 2. Delegate to autocomplete menu if active
    if (this.autocompleteActive && this.autocompleteMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.autocompleteIndex = (this.autocompleteIndex + 1) % this.autocompleteMatches.length;
        this.renderAutocomplete();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.autocompleteIndex = (this.autocompleteIndex - 1 + this.autocompleteMatches.length) % this.autocompleteMatches.length;
        this.renderAutocomplete();
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        this.inputEl.value = this.autocompleteMatches[this.autocompleteIndex].name;
        this.hideAutocomplete();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hideAutocomplete();
        return;
      }
    }

    // 3. Regular CLI input controls
    if (e.key === 'Enter') {
      const raw = this.inputEl.value.trim();
      this.hideAutocomplete();
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

    if (result.html === '__RELOAD__') {
      window.location.reload();
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

    // Check if mail composer needs to be initialized
    const mailForm = this.outputEl.querySelector('#interactive-mail-form');
    if (mailForm) {
      const { MailComposer } = await import('./MailComposer');
      this.mailComposer = new MailComposer(
        mailForm as HTMLElement,
        this.inputEl,
        () => {
          this.mailComposer = null;
        }
      );
    }

    // Scroll output area to bottom
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  async autoRun(cmd: string) {
    await this.run(cmd);
  }
}
