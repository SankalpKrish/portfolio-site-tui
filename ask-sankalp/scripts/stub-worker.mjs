// ask-sankalp/scripts/stub-worker.mjs
// Speaks the same newline-delimited JSON protocol as the real Worker, so the
// /ask renderer can be exercised end to end without an account, a Vectorize
// index or a Gemini key.
//
// This exists because the streaming renderer, the citation footer and the AI
// badge are the parts of Phase 6 most likely to be wrong, and none of them can
// be reached until the Worker is deployed. Verifying them against a stub is
// strictly better than shipping them unverified.
//
//   node ask-sankalp/scripts/stub-worker.mjs
//   PUBLIC_ASK_API_URL=http://localhost:8788 npm run build
//
// Trigger special states by including the keyword in the question.

import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_PORT ?? 8788);
// Default 18ms is fast enough to finish before the terminal's typewriter has
// typed its opening state, which hides whether the client repaints
// incrementally. Raise it to watch the answer arrive token by token.
const DELAY = Number(process.env.STUB_DELAY ?? 18);
const ALLOWED = new Set(['https://sankalpkrish.com', 'http://localhost:4321']);

const REFUSALS = [
  'salary',
  'old',
  'gender',
  'religion',
  'phone',
];

const Canned = {
  midi: {
    ids: ['project-midi-ai', 'project-midi-ai-pipeline', 'skills-ml'],
    text: `MIDI.ai is a five-stage pipeline, and the whole design assumes you have to separate the track before you can transcribe it.

Stem isolation runs first, on a Hybrid Transformer Demucs v4 in PyTorch. Then Librosa MIR analysis for tempo, key and tuning. Then YAMNet for timbre. Then Spotify Basic Pitch does the actual note transcription. PrettyMIDI cleans up the result into something a DAW can open.

The models are all off the shelf. The orchestrator that sequences them, the YAMNet-to-GM program mapper, the post-processor and the CLI are mine.`,
  },
  slides: {
    ids: ['project-open-slides', 'project-open-slides-stack'],
    text: `Open Slides is the largest thing I have built alone. You talk to it, and a chat-driven agent builds and edits slide decks, documents, sheets and websites while you watch.

Next.js 16 on the App Router, React 19, TypeScript, Tailwind over a custom CSS-variable token layer. The part I care about is model routing: claude-router is an in-house proxy sitting in front of the provider, routing across Sonnet 4.6, Opus 4.7 and Haiku 4.5. Every call in the product goes through it.

WebContainer only runs in desktop Chromium, which I traded knowingly.`,
  },
};

function refuse(kind, reason, text) {
  return [
    { t: 'meta', kind, reason },
    { t: 'text', v: text },
    { t: 'citations', ids: [] },
    { t: 'done', ms: 1 },
  ];
}

function answer(canned) {
  const frames = [{ t: 'meta', kind: 'answer', ids: canned.ids }];
  // Split on word boundaries so the client sees token-ish deltas rather than
  // one blob, which is what makes the progressive repaint visible.
  for (const piece of canned.text.match(/\S+\s*/g) ?? []) {
    frames.push({ t: 'text', v: piece });
  }
  frames.push({ t: 'citations', ids: canned.ids });
  frames.push({ t: 'done', ms: 42 });
  return frames;
}

const server = createServer((req, res) => {
  const origin = req.headers.origin ?? null;
  const base = { 'Content-Type': 'application/x-ndjson' };
  if (origin && ALLOWED.has(origin)) base['Access-Control-Allow-Origin'] = origin;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...base, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let q = '';
    try {
      q = String(JSON.parse(body).q ?? '').trim();
    } catch {
      res.writeHead(400, { ...base, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'expected { q: string }' }));
    }

    if (/ratelimit/.test(q)) {
      res.writeHead(429, { ...base, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too many questions. Give it a minute.' }));
    }

    if (/budget/.test(q)) {
      res.writeHead(200, base);
      return res.end(
        refuse('refusal', 'budget', "I've hit my request limit for this month, so I'm running on cached answers only. Email is on the /contact page.").map((f) => JSON.stringify(f)).join('\n') + '\n',
      );
    }

    if (/nosuchthing/.test(q)) {
      res.writeHead(200, base);
      return res.end(
        refuse('refusal', 'no-coverage', "I don't have anything on that, and I'd rather say so than guess.\n\n/Ask works from 25 fixed notes about his work.").map((f) => JSON.stringify(f)).join('\n') + '\n',
      );
    }

    const blocked = REFUSALS.find((w) => q.toLowerCase().includes(w));
    if (blocked) {
      res.writeHead(200, base);
      return res.end(
        refuse('refusal', 'blocked', "I'm not going to answer that one, and it's not a limitation of what I can see — it's a line I don't cross.\n\n/contact has how to reach him.").map((f) => JSON.stringify(f)).join('\n') + '\n',
      );
    }

    const canned = /midi/i.test(q)
      ? Canned.midi
      : /slide|next\.?js|presentation/i.test(q)
        ? Canned.slides
        : {
            ids: ['identity', 'education-btech'],
            text: `Second-year B.Tech student in Digital Transformation at Atria University, graduating August 2028. I split my time between a paid internship at Open Computer and my own end-to-end AI products.\n\nThe degree mixes computer science with product, which is why my projects tend to be end-to-end rather than a model in isolation.`,
          };

    res.writeHead(200, base);
    const frames = answer(canned);
    let i = 0;
    const tick = setInterval(() => {
      if (i >= frames.length) {
        clearInterval(tick);
        return res.end();
      }
      res.write(JSON.stringify(frames[i++]) + '\n');
    }, DELAY);
  });
});

server.listen(PORT, () => console.log(`stub worker on http://localhost:${PORT}`));
