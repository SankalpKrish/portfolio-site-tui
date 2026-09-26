// src/terminal/commands/ask.ts
import type { CommandHandler } from '../commands';
import { escHtml, escText } from '../escape';

// Built at build time. Absent on a deploy where the Worker was never set up, in
// which case /ask explains itself rather than throwing on every request.
const API_URL = import.meta.env.PUBLIC_ASK_API_URL as string | undefined;

// Also drives the autocomplete list in TerminalEngine. Exported rather than
// re-declared there, because a suggestion the command will not accept is worse
// than no suggestion.
export const ASK_EXAMPLES = [
  'what did he build with Next.js',
  'how does MIDI.ai separate stems',
  'what is his internship doing',
  'does he speak French',
  'when does he graduate',
];

function shell(inner: string): string {
  return `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x25CF;</span><span class="cc-tool-name">Ask</span><span class="cc-tool-args">(sankalp)</span></div>
  <div class="cc-output-block cc-ask">${inner}</div>
`;
}

function idle(): string {
  return `
    <div class="cc-prose">Ask me anything about Sankalp&apos;s work. I answer from his notes and I say so when I don&apos;t know.</div>
    <br>
    <div class="cc-prose-dim" style="margin-bottom:6px;">Try:</div>
    ${ASK_EXAMPLES.map(
      (q) =>
        `<div class="cc-tool-use"><span class="cc-tool-dot" style="color:var(--overlay1)">&#x25CF;</span><span style="color:var(--overlay1)">${escHtml(q)}</span></div>`,
    ).join('\n    ')}
    <br>
    <div class="cc-ask-badge"><span class="cc-ask-badge-dot"></span>AI twin, not Sankalp himself</div>
  `;
}

// Shown for a request that never reached the Worker. All three read as a normal
// part of the terminal rather than as an error, because per DESIGN.md the
// interface degrades with the same grace the rest of the site does.
function unreachable(detail: string): string {
  return `
    <div class="cc-prose">I couldn&apos;t reach my own notes just now.</div>
    <br>
    <div class="cc-prose-dim">${escHtml(detail)}</div>
    <br>
    <div class="cc-prose-dim">The fixed pages still work: <span style="color:var(--blue);">/projects</span>, <span style="color:var(--blue);">/skills</span>, <span style="color:var(--blue);">/about</span>, <span style="color:var(--blue);">/contact</span>.</div>
  `;
}

function badge(): string {
  return '<div class="cc-ask-badge"><span class="cc-ask-badge-dot"></span>AI twin, not Sankalp himself</div>';
}

function citations(ids: string[]): string {
  if (ids.length === 0) return '';
  return `
    <div class="cc-ask-sources">from ${ids
      .map((id) => `<span class="cc-ask-source">${escHtml(id)}</span>`)
      .join(' ')}</div>
  `;
}

function paint(el: HTMLElement, body: string): void {
  el.innerHTML = shell(body);
}

// Field names must match what the Worker actually emits, which is `v` for text
// deltas. An earlier draft read `text` here and matched nothing, so every answer
// silently arrived empty and fell through to the "no answer" branch. Caught by
// scripts/stub-worker.mjs, which is the only reason it was caught at all.
type Frame = { t?: string; kind?: string; v?: string; ids?: string[]; reason?: string };

// The Worker streams newline-delimited JSON. Each frame is a complete object,
// so appending per line is enough -- no buffering across chunk boundaries.
function consume(frame: string): Frame | null {
  const line = frame.trim();
  if (!line) return null;
  try {
    return JSON.parse(line) as Frame;
  } catch {
    // A partial or malformed frame is dropped. The alternative is tearing down
    // an answer that is otherwise fine because of one bad line.
    return null;
  }
}

export const ask: CommandHandler = (args) => {
  const query = args.join(' ').trim();

  if (!query) return { html: shell(idle()) };

  if (!API_URL) {
    return {
      html: shell(
        `<div class="cc-prose">I&apos;m not wired up on this deploy.</div>
    <br>
    <div class="cc-prose-dim">The Worker URL isn&apos;t configured, so I have nowhere to send your question. The fixed pages still have the facts.</div>`,
      ),
    };
  }

  return {
    // Typed out first so the terminal reacts immediately, then handed to the
    // stream. The typewriter still owns the opening state; only the answer
    // itself arrives progressively.
    html: shell('<div class="cc-ask-wait">Thinking<span class="cc-ask-dots"></span></div>'),
    stream: async (el) => {
      let response: Response;
      try {
        response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: query }),
        });
      } catch {
        paint(el, unreachable('You appear to be offline.'));
        return;
      }

      if (response.status === 429) {
        paint(el, unreachable('Too many questions in a row. Give it a minute.'));
        return;
      }
      if (!response.ok) {
        paint(el, unreachable(`The Worker replied ${response.status}.`));
        return;
      }
      if (!response.body) {
        paint(el, unreachable('Empty response.'));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      let ids: string[] = [];
      let kind = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const frame = consume(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
          if (!frame) continue;

          if (frame.kind) kind = frame.kind;
          if (frame.ids) ids = frame.ids;
          if (frame.t === 'text' && frame.v) {
            answer += frame.v;
            // Repaint per frame rather than per character. The stream arrives in
            // token-sized pieces, so this is roughly one paint per token.
            paint(el, shell(`<div class="cc-prose">${escText(answer)}</div>${badge()}`));
          }
        }
      }

      if (kind === 'refusal' || answer.trim() === '') {
        paint(el, shell(`<div class="cc-prose">${escText(answer || 'I don\'t have anything on that.')}</div>${badge()}`));
        return;
      }

      paint(el, shell(`<div class="cc-prose">${escText(answer)}</div>${citations(ids)}${badge()}`));
    },
  };
};
