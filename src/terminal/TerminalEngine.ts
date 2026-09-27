// src/terminal/TerminalEngine.ts
import { typewriter } from './typewriter';
import { COMMANDS, unknownCommandResult, type CommandResult } from './commands';
import { ASK_EXAMPLES } from './commands/ask';

interface CommandItem {
  name: string;
  desc: string;
}

export class TerminalEngine {
  private outputEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private history: string[] = [];
  private historyIndex = -1;



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
    { name: '/ask', desc: 'ask me anything' },
    { name: '/open', desc: 'open a project on GitHub' },
    { name: '/clear', desc: 'clear the terminal' },
    { name: '/reload', desc: 'reload the website' },
    { name: '/help', desc: 'show this message' },
  ];

  constructor(outputEl: HTMLElement, inputEl: HTMLInputElement) {
    this.outputEl = outputEl;
    this.inputEl  = inputEl;
    this.autocompleteEl = document.getElementById('command-autocomplete');

    this.inputEl.addEventListener('keydown', this.onKeyDown.bind(this));
    this.inputEl.addEventListener('input', this.onInput.bind(this));

    // Focus input on clicking anywhere in terminal window
    const terminalWindow = this.inputEl.closest('.terminal-window');
    if (terminalWindow) {
      terminalWindow.addEventListener('click', () => {
        this.inputEl.focus();
      });
    }

    this.inputEl.focus();
    this.autoRun('splash');
  }

  private onInput() {
    const rawVal = this.inputEl.value;
    const val = rawVal.trim();
    if (rawVal.startsWith('/')) {
      if (rawVal.startsWith('/ask ')) {
        // Offer whole questions rather than command names, so the feature is
        // discoverable without reading /help first.
        const arg = rawVal.slice(5).trim().toLowerCase();
        this.setMatches(
          ASK_EXAMPLES
            .filter((q) => q.toLowerCase().includes(arg))
            .map((q) => ({ name: `/ask ${q}`, desc: '' })),
        );
      } else if (rawVal.startsWith('/open') || rawVal.startsWith('/open ')) {
        // Slice out '/open' (5 chars) to get the filter argument
        const arg = rawVal.slice(5).trim().toLowerCase();
        const projectsList = [
          { name: '/open midi.ai', desc: 'AI audio to MIDI pipeline' },
          { name: '/open opencomputer', desc: 'discover AI skills & plugins' },
          { name: '/open procrastination-engine', desc: 'clock made of tiny clocks' },
        ];

        this.setMatches(
          arg === ''
            ? projectsList
            : projectsList.filter((proj) => proj.name.slice(6).toLowerCase().startsWith(arg)),
        );
      } else {
        // Regular slash commands autocomplete
        this.setMatches(
          this.commandsList.filter((cmd) => cmd.name.toLowerCase().startsWith(val.toLowerCase())),
        );
      }
    } else {
      this.hideAutocomplete();
    }
  }

  private setMatches(matches: CommandItem[]) {
    if (matches.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.autocompleteMatches = matches;
    this.autocompleteActive = true;
    this.autocompleteIndex = Math.min(this.autocompleteIndex, matches.length - 1);
    if (this.autocompleteIndex < 0) this.autocompleteIndex = 0;
    this.renderAutocomplete();
  }

  // A completion ending in a space is a prefix waiting for an argument, so the
  // menu reopens to filter the next thing typed.
  private complete(name: string): string {
    return name.endsWith(' ') || name === '/open' || name === '/ask' ? `${name} ` : name;
  }

  private renderAutocomplete() {
    if (!this.autocompleteEl) return;
    this.autocompleteEl.innerHTML = this.autocompleteMatches.map((cmd, idx) => {
      const isActive = this.autocompleteIndex === idx;
      // Show only the argument for completions that carry one, so the menu reads
      // as suggestions rather than as a wall of repeated command names.
      const space = cmd.name.indexOf(' ');
      const displayName = cmd.name.startsWith('/') && space !== -1
        ? cmd.name.slice(space + 1)
        : cmd.name;
      return `
        <div class="autocomplete-item ${isActive ? 'active' : ''}" data-index="${idx}">
          <span class="autocomplete-cmd">${displayName}</span>
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
        const completed = this.complete(this.autocompleteMatches[idx].name);
        this.inputEl.value = completed;
        this.hideAutocomplete();
        if (completed.endsWith(' ')) {
          this.onInput();
        }
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
    // 1. Delegate to autocomplete menu if active
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
        const completed = this.complete(this.autocompleteMatches[this.autocompleteIndex].name);
        this.inputEl.value = completed;
        this.hideAutocomplete();
        if (completed.endsWith(' ')) {
          this.onInput();
        }
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
    // Awaited because /ask performs a network call. The other eight handlers
    // return synchronously and are unaffected.
    const result: CommandResult = await (handler ? handler(args) : unknownCommandResult(cmd));

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

    // Progressive renderers take the element over once the opening state has
    // been typed. The typewriter still owns that state, so a streaming command
    // does not bypass the terminal's rendering.
    if (result.stream) {
      await result.stream(responseDiv);
    }

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
