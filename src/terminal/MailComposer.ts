// src/terminal/MailComposer.ts

type Step = 'EMAIL' | 'SUBJECT' | 'CUSTOM_SUBJECT' | 'MESSAGE' | 'SUBMIT' | 'DONE';

export class MailComposer {
  private container: HTMLElement;
  private inputEl: HTMLInputElement;
  private onClose: () => void;

  private step: Step = 'EMAIL';
  private email = '';
  private subjectIndex = 0;
  private customSubject = '';
  private message = '';
  private submitIndex = 0;
  private isSubmitting = false;
  private statusMessage = '';
  private statusColor = 'var(--text)';

  // Track if each tab has been validated (by clicking Enter/Submitting)
  private emailFilled = false;
  private subjectFilled = false;
  private messageFilled = false;

  private subjects = [
    { title: 'General Inquiry', desc: 'Just saying hi or asking a general question.' },
    { title: 'Project Collaboration', desc: 'Discussing a new project or partnership.' },
    { title: 'Plane / Train Spotting', desc: 'Airports, rail lines, same energy.' },
    { title: 'Custom Subject...', desc: 'Type a custom subject for this email.' },
  ];

  private submitOptions = [
    { title: 'Send Message', desc: 'Send the email to sankalpkrish@outlook.com.' },
    { title: 'Go Back & Edit', desc: 'Make changes to your message.' },
    { title: 'Discard & Exit', desc: 'Discard this email and exit to shell.' },
  ];

  constructor(container: HTMLElement, inputEl: HTMLInputElement, onClose: () => void) {
    this.container = container;
    this.inputEl = inputEl;
    this.onClose = onClose;

    // Reset input element value and hide regular prompt row in Terminal window
    const terminalWindow = this.inputEl.closest('.terminal-window');
    if (terminalWindow) {
      terminalWindow.classList.add('mail-session-active');
    }

    this.inputEl.value = '';
    this.inputEl.focus();
    this.render();
  }

  public getStep(): Step {
    return this.step;
  }

  public handleInput() {
    const val = this.inputEl.value;
    if (this.step === 'EMAIL') {
      this.email = val;
      this.emailFilled = false; // Reset validated state upon modification
    } else if (this.step === 'CUSTOM_SUBJECT') {
      this.customSubject = val;
      this.subjectFilled = false; // Reset validated state upon modification
    } else if (this.step === 'MESSAGE') {
      this.message = val;
      this.messageFilled = false; // Reset validated state upon modification
    }
    this.render();
  }

  public handleKeyDown(e: KeyboardEvent) {
    // Esc cancels and exits
    if (e.key === 'Escape') {
      e.preventDefault();
      this.exit();
      return;
    }

    const isTextInputStep = this.step === 'EMAIL' || this.step === 'CUSTOM_SUBJECT' || this.step === 'MESSAGE';

    // Step/Tab Left/Right navigation
    if (e.key === 'ArrowLeft') {
      const atStart = !isTextInputStep || (this.inputEl.selectionStart === 0);
      if (atStart) {
        e.preventDefault();
        this.navigateLeft();
        return;
      }
    }
    if (e.key === 'ArrowRight') {
      const atEnd = !isTextInputStep || (this.inputEl.selectionStart === this.inputEl.value.length);
      if (atEnd) {
        e.preventDefault();
        this.navigateRight();
        return;
      }
    }

    if (this.step === 'EMAIL') {
      if (e.key === 'Tab') {
        e.preventDefault(); // Trap focus in terminal
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = this.email.trim();
        if (trimmed && trimmed.includes('@')) {
          this.emailFilled = true;
          this.step = 'SUBJECT';
          this.inputEl.value = '';
          this.render();
        } else {
          this.emailFilled = false;
          // Flash invalid input feedback
          this.statusMessage = 'Please enter a valid email address.';
          this.statusColor = 'var(--red)';
          this.render();
          setTimeout(() => {
            if (this.statusMessage === 'Please enter a valid email address.') {
              this.statusMessage = '';
              this.render();
            }
          }, 2500);
        }
      }
    } else if (this.step === 'SUBJECT') {
      const max = this.subjects.length;
      if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        this.subjectIndex = (this.subjectIndex + 1) % max;
        this.subjectFilled = false; // Selection changed, reset validation
        this.render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.subjectIndex = (this.subjectIndex - 1 + max) % max;
        this.subjectFilled = false; // Selection changed, reset validation
        this.render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.subjectIndex === 3) {
          this.step = 'CUSTOM_SUBJECT';
          this.inputEl.value = this.customSubject;
        } else {
          this.subjectFilled = true;
          this.step = 'MESSAGE';
          this.inputEl.value = this.message;
        }
        this.render();
      }
    } else if (this.step === 'CUSTOM_SUBJECT') {
      if (e.key === 'Tab') {
        e.preventDefault(); // Trap focus in terminal
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.customSubject.trim()) {
          this.subjectFilled = true;
          this.step = 'MESSAGE';
          this.inputEl.value = this.message;
          this.render();
        }
      }
    } else if (this.step === 'MESSAGE') {
      if (e.key === 'Tab') {
        e.preventDefault(); // Trap focus in terminal
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.message.trim()) {
          this.messageFilled = true;
          this.step = 'SUBMIT';
          this.inputEl.value = '';
          this.render();
        }
      }
    } else if (this.step === 'SUBMIT') {
      const max = this.submitOptions.length;
      if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        this.submitIndex = (this.submitIndex + 1) % max;
        this.render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.submitIndex = (this.submitIndex - 1 + max) % max;
        this.render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSubmitChoice();
      }
    } else if (this.step === 'DONE') {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        this.exit();
      }
    }
  }

  private navigateLeft() {
    if (this.step === 'SUBJECT') {
      this.step = 'EMAIL';
      this.inputEl.value = this.email;
    } else if (this.step === 'CUSTOM_SUBJECT') {
      this.step = 'SUBJECT';
      this.inputEl.value = '';
    } else if (this.step === 'MESSAGE') {
      if (this.subjectIndex === 3) {
        this.step = 'CUSTOM_SUBJECT';
        this.inputEl.value = this.customSubject;
      } else {
        this.step = 'SUBJECT';
        this.inputEl.value = '';
      }
    } else if (this.step === 'SUBMIT') {
      this.step = 'MESSAGE';
      this.inputEl.value = this.message;
    }
    this.render();
  }

  private navigateRight() {
    if (this.step === 'EMAIL' && this.emailFilled) {
      this.step = 'SUBJECT';
      this.inputEl.value = '';
    } else if (this.step === 'SUBJECT' && this.subjectFilled) {
      if (this.subjectIndex === 3) {
        this.step = 'CUSTOM_SUBJECT';
        this.inputEl.value = this.customSubject;
      } else {
        this.step = 'MESSAGE';
        this.inputEl.value = this.message;
      }
    } else if (this.step === 'CUSTOM_SUBJECT' && this.subjectFilled) {
      this.step = 'MESSAGE';
      this.inputEl.value = this.message;
    } else if (this.step === 'MESSAGE' && this.messageFilled) {
      this.step = 'SUBMIT';
      this.inputEl.value = '';
    }
    this.render();
  }

  private async handleSubmitChoice() {
    if (this.submitIndex === 0) {
      // Validate everything before sending
      if (!this.emailFilled || !this.subjectFilled || !this.messageFilled) {
        this.statusMessage = 'Cannot submit: please complete all previous sections first.';
        this.statusColor = 'var(--red)';
        this.render();
        return;
      }

      // Send message
      this.isSubmitting = true;
      this.step = 'DONE';
      this.statusMessage = 'Sending your email...';
      this.statusColor = 'var(--lavender)';
      this.render();

      const finalSubject = this.subjectIndex === 3 ? this.customSubject.trim() : this.subjects[this.subjectIndex].title;
      const formattedMessage = `From: ${this.email.trim()}\nSubject: ${finalSubject}\n\nMessage:\n${this.message.trim()}`;

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: formattedMessage }),
        });
        
        if (response.ok) {
          this.statusMessage = '✓ Email sent successfully! I will read it eventually. :)';
          this.statusColor = 'var(--green)';
        } else {
          const res = await response.json().catch(() => ({}));
          this.statusMessage = `Error: ${res.error || 'Failed to send email'}. Please try again later.`;
          this.statusColor = 'var(--red)';
        }
      } catch (err) {
        this.statusMessage = 'Network error: Failed to connect to serverless endpoint.';
        this.statusColor = 'var(--red)';
      }
      this.isSubmitting = false;
      this.render();
    } else if (this.submitIndex === 1) {
      // Go back
      this.step = 'MESSAGE';
      this.inputEl.value = this.message;
      this.render();
    } else {
      // Discard and exit
      this.exit();
    }
  }

  private exit() {
    const terminalWindow = this.inputEl.closest('.terminal-window');
    if (terminalWindow) {
      terminalWindow.classList.remove('mail-session-active');
    }
    this.inputEl.value = '';
    this.onClose();
  }

  private render() {
    const isAllFilled = this.emailFilled && this.subjectFilled && this.messageFilled;

    this.container.innerHTML = `
      <div class="mail-form">
        <div class="form-header">
          <span class="form-nav-arrow">&larr;</span>
          <span class="form-tab ${this.step === 'EMAIL' ? 'active' : ''}">${this.emailFilled ? '▣' : '☐'} Email</span>
          <span class="form-tab ${this.step === 'SUBJECT' || this.step === 'CUSTOM_SUBJECT' ? 'active' : ''}">${this.subjectFilled ? '▣' : '☐'} Subject</span>
          <span class="form-tab ${this.step === 'MESSAGE' ? 'active' : ''}">${this.messageFilled ? '▣' : '☐'} Message</span>
          <span class="form-tab ${this.step === 'SUBMIT' || this.step === 'DONE' ? 'active' : ''}">${isAllFilled ? '✓' : '✗'} Submit</span>
          <span class="form-nav-arrow">&rarr;</span>
        </div>

        <div class="form-content">
          ${this.renderBody()}
        </div>

        <div class="form-footer">
          Enter to select &middot; Tab/Arrow keys to navigate &middot; Esc to cancel
        </div>
      </div>
    `;

    // Scroll parent output area to bottom
    const outputEl = this.container.closest('#terminal-output');
    if (outputEl) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  private renderBody(): string {
    if (this.step === 'EMAIL') {
      const emailFilledLocal = this.email.length > 0;
      return `
        <div class="form-question">What is your email address?</div>
        <div class="form-option-list">
          <div class="form-option selected">
            <div class="form-option-line">
              <span class="form-option-cursor">❯</span>
              <span class="form-option-text">1.</span>
              <span class="form-option-checkbox">[${this.emailFilled ? '✓' : ' '}]</span>
              <span style="color:var(--text);font-weight:bold;">${emailFilledLocal ? this.escapeHtml(this.email) : 'Type your email...'}<span class="form-text-cursor" style="animation: blink 1s step-start infinite;color:var(--blue)">_</span></span>
            </div>
            <div class="form-option-desc">So I can reply to your message.</div>
          </div>
        </div>
        ${this.statusMessage ? `<div style="color:${this.statusColor};font-size:11px;margin-top:6px;padding-left:6px;">${this.statusMessage}</div>` : ''}
      `;
    }

    if (this.step === 'SUBJECT') {
      return `
        <div class="form-question">Select email subject:</div>
        <div class="form-option-list">
          ${this.subjects.map((subj, idx) => {
            const isSelected = this.subjectIndex === idx;
            return `
              <div class="form-option ${isSelected ? 'selected' : ''}">
                <div class="form-option-line">
                  <span class="form-option-cursor">❯</span>
                  <span class="form-option-text">${idx + 1}.</span>
                  <span class="form-option-checkbox">[${isSelected ? '✓' : ' '}]</span>
                  <span class="form-option-text">${subj.title}</span>
                </div>
                <div class="form-option-desc">${subj.desc}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (this.step === 'CUSTOM_SUBJECT') {
      const customFilledLocal = this.customSubject.length > 0;
      return `
        <div class="form-question">Type a custom subject:</div>
        <div class="form-option-list">
          <div class="form-option selected">
            <div class="form-option-line">
              <span class="form-option-cursor">❯</span>
              <span class="form-option-text">1.</span>
              <span class="form-option-checkbox">[${this.subjectFilled ? '✓' : ' '}]</span>
              <span style="color:var(--text);font-weight:bold;">${customFilledLocal ? this.escapeHtml(this.customSubject) : 'Type your custom subject...'}<span class="form-text-cursor" style="animation: blink 1s step-start infinite;color:var(--blue)">_</span></span>
            </div>
            <div class="form-option-desc">Describe what this is about.</div>
          </div>
        </div>
      `;
    }

    if (this.step === 'MESSAGE') {
      const msgFilledLocal = this.message.length > 0;
      return `
        <div class="form-question">Enter your message:</div>
        <div class="form-option-list">
          <div class="form-option selected">
            <div class="form-option-line">
              <span class="form-option-cursor">❯</span>
              <span class="form-option-text">1.</span>
              <span class="form-option-checkbox">[${this.messageFilled ? '✓' : ' '}]</span>
              <span style="color:var(--text);font-weight:bold;white-space:pre-wrap;overflow-wrap:break-word;">${msgFilledLocal ? this.escapeHtml(this.message) : 'Type your message...'}<span class="form-text-cursor" style="animation: blink 1s step-start infinite;color:var(--blue)">_</span></span>
            </div>
            <div class="form-option-desc">What's on your mind?</div>
          </div>
        </div>
      `;
    }

    if (this.step === 'SUBMIT') {
      const finalSubject = this.subjectIndex === 3 ? this.customSubject : this.subjects[this.subjectIndex].title;
      return `
        <div class="form-question">Email Summary:</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(180,190,254,0.06);border-radius:4px;padding:10px 14px;margin-bottom:14px;font-size:11.5px;line-height:1.6;">
          <div><span style="color:var(--lavender)">From:</span> ${this.escapeHtml(this.email)}</div>
          <div><span style="color:var(--lavender)">Subject:</span> ${this.escapeHtml(finalSubject)}</div>
          <div style="border-top:1px solid rgba(180,190,254,0.06);margin-top:6px;padding-top:6px;color:var(--subtext0);white-space:pre-wrap;overflow-wrap:break-word;">${this.escapeHtml(this.message)}</div>
        </div>
        <div class="form-question">Ready to submit?</div>
        <div class="form-option-list">
          ${this.submitOptions.map((opt, idx) => {
            const isSelected = this.submitIndex === idx;
            return `
              <div class="form-option ${isSelected ? 'selected' : ''}">
                <div class="form-option-line">
                  <span class="form-option-cursor">❯</span>
                  <span class="form-option-text">${idx + 1}.</span>
                  <span class="form-option-checkbox">[${isSelected ? '✓' : ' '}]</span>
                  <span class="form-option-text">${opt.title}</span>
                </div>
                <div class="form-option-desc">${opt.desc}</div>
              </div>
            `;
          }).join('')}
        </div>
        ${this.statusMessage ? `<div style="color:${this.statusColor};font-size:11.5px;margin-top:6px;padding-left:6px;">${this.statusMessage}</div>` : ''}
      `;
    }

    if (this.step === 'DONE') {
      return `
        <div class="form-question">Delivery Status:</div>
        <div class="cc-output-block" style="padding-left:10px;margin-top:10px;">
          <div style="color:${this.statusColor};font-weight:600;font-size:12.5px;">${this.statusMessage}</div>
        </div>
        ${!this.isSubmitting ? `<div style="font-size:11px;color:var(--overlay0);margin-top:12px;">Press Enter or Escape to return to the shell.</div>` : ''}
      `;
    }

    return '';
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
