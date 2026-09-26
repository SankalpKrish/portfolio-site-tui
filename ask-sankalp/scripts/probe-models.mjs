// ask-sankalp/scripts/probe-models.mjs
// Finds out which chat models the account can actually reach, and which of them
// can be trusted with a strict grounding prompt.
//
// Listing models is not enough. The catalog advertises far more than responds,
// and a model that answers fluently while ignoring "cite the chunk ids" is worse
// than useless here -- it produces confident, uncited, ungrounded answers.
//
//   node ask-sankalp/scripts/probe-models.mjs            # list only
//   node ask-sankalp/scripts/probe-models.mjs --test     # list, then grade
//   node ask-sankalp/scripts/probe-models.mjs --test=6   # grade the first 6
//
// Key: NVIDIA_API_KEY env var, or CHAT_API_KEY, or a .secrets.local file at the
// repo root. The file route keeps the key out of shell history and transcripts.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.CHAT_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const KEY = process.env.NVIDIA_API_KEY ?? process.env.CHAT_API_KEY ?? readLocalSecret();
const TEST = process.argv.includes('--test');
const LIMIT = Number((process.argv.find((a) => a.startsWith('--test=')) ?? '').split('=')[1] || 0);

function readLocalSecret() {
  for (const p of [join(process.cwd(), '.secrets.local'), new URL('../../../.secrets.local', import.meta.url).pathname.slice(1)]) {
    if (!existsSync(p)) continue;
    const line = readFileSync(p, 'utf8')
      .split('\n')
      .find((l) => l.trim().startsWith('CHAT_API_KEY='));
    if (line) return line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

if (!KEY) {
  console.error('No API key. Set NVIDIA_API_KEY, or write CHAT_API_KEY=... into .secrets.local');
  process.exit(1);
}

// The prompt under test is the real system prompt, trimmed to the two rules that
// matter for a model to be usable here: cite an id, or say you do not know.
const SYSTEM = `You answer questions about Sankalp Krishnamurthy using ONLY the SOURCES below.
If the answer is not in them, say you do not know. Never speculate.
End with a Sources line naming the chunk ids you used, like [project-midi-ai]. Only cite ids present in SOURCES.

SOURCES:
### [project-midi-ai] MIDI.ai
MIDI.ai is a five-stage Python pipeline for polyphonic audio to MIDI, started December 2025. Stages are Demucs v4 stem isolation, Librosa MIR, YAMNet timbre, Basic Pitch transcription, PrettyMIDI post-processing.
### [languages] Languages
English native, French fluent, Kannada conversational, Hindi and German basic.`;

const CASES = [
  {
    q: 'what does MIDI.ai use for stem separation?',
    want: 'Demucs',
    cite: 'project-midi-ai',
  },
  {
    q: 'what is his kubernetes experience?',
    want: null, // must refuse; nothing in SOURCES covers it
    cite: null,
  },
  {
    q: 'what is his phone number?',
    want: null,
    cite: null,
  },
];

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  return res;
}

console.log(`base: ${BASE}`);
console.log(`key:  ${KEY.slice(0, 8)}...\n`);

const res = await api('/models', { method: 'GET' });
if (!res.ok) {
  console.error(`GET /models failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const body = await res.json();
const ids = (body.data ?? []).map((m) => m.id).sort();
console.log(`${ids.length} models advertised\n`);

if (!TEST) {
  for (const id of ids) console.log(`  ${id}`);
  process.exit(0);
}

// Narrow to plausible chat models. Embedding, rerank and safety models will
// either 400 on chat/completions or answer with something meaningless.
const CHAT = /nemotron|kimi|deepseek|llama|mistral|glm|gemma|qwen|phi|intern|baichuan|starcoder|nemotron/i;
const candidates = ids.filter((id) => CHAT.test(id) && !/embed|rerank|safety|guard|nim|punct|topic|pii/i.test(id));
const shortlist = LIMIT ? candidates.slice(0, LIMIT) : candidates;

console.log(`probing ${shortlist.length} chat candidates\n`);
console.log('model'.padEnd(46) + 'reachable  grounded  cited  refused  notes');
console.log('-'.repeat(100));

const results = [];

for (const id of shortlist) {
  const notes = [];
  let reachable = false;
  let grounded = 0;
  let cited = 0;
  let refused = 0;

  for (const c of CASES) {
    let text = '';
    try {
      const r = await api('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: id,
          stream: false,
          max_tokens: 300,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: c.q },
          ],
        }),
      });
      if (!r.ok) {
        notes.push(`${r.status}`);
        continue;
      }
      const b = await r.json();
      text = b.choices?.[0]?.message?.content ?? '';
      reachable = true;
    } catch (e) {
      notes.push('ERR');
      continue;
    }

    const low = text.toLowerCase();
    const hasCitation = /\[[a-z0-9-]+(,\s*[a-z0-9-]+)*\]/i.test(text);
    const saysNo = /don'?t (have|know)|no information|not (covered|in the sources)|nothing on that|don'?t have anything/i.test(low);

    if (c.cite === null) {
      if (saysNo && !hasCitation) refused++;
      else notes.push(c.want === null ? 'answered a refusal case' : 'bad');
    } else {
      if (c.want && low.includes(c.want.toLowerCase())) grounded++;
      else notes.push(`wrong: ${c.q.slice(0, 22)}`);
      if (hasCitation && text.toLowerCase().includes(c.cite)) cited++;
      else notes.push('no citation');
    }
  }

  const n = CASES.length;
  results.push({ id, reachable, grounded, cited, refused, notes });

  const mark = (v, total) => (total === 0 ? '   -  ' : v === total ? '  ok  ' : ` ${v}/${total} `);
  console.log(
    id.slice(0, 45).padEnd(46) +
    (reachable ? '   yes   ' : '   NO    ') +
    mark(grounded, 2) +
    mark(cited, 1) +
    mark(refused, 2) +
    ' ' + notes.slice(0, 2).join('; '),
  );
}

const usable = results.filter((r) => r.reachable && r.grounded === 2 && r.cited === 1 && r.refused === 2);
console.log(`\n${usable.length} of ${results.length} fully usable:`);
for (const r of usable) console.log(`  ${r.id}`);

if (usable.length === 0) {
  console.log('\nNone hold the contract. Weakest link is likely prompt adherence,');
  console.log('not capability -- a stricter system prompt or a larger model would fix it.');
}
