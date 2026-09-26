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

// Streamed, because that is how the Worker calls the model. Probing with
// stream:false rejects models that are merely slow to first byte -- which is
// most of the large MoE models on shared free-tier hardware -- and the Worker
// would have been perfectly happy with them.
async function chat(id, messages, maxTokens = 200) {
  const res = await api('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: id, stream: true, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) return { error: String(res.status) };
  if (!res.body) return { error: 'no body' };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let out = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) out += delta;
      } catch {
        // partial frame, dropped
      }
    }
  }

  return { text: out };
}

const SYSTEM = `You answer questions about Sankalp Krishnamurthy using ONLY the SOURCES below.
If the answer is not in them, say you do not know. Never speculate.
End with a Sources line naming the chunk ids you used, like [project-midi-ai]. Only cite ids present in SOURCES.

SOURCES:
### [project-midi-ai] MIDI.ai
MIDI.ai is a five-stage Python pipeline for polyphonic audio to MIDI, started December 2025. Stages are Demucs v4 stem isolation, Librosa MIR, YAMNet timbre, Basic Pitch transcription, PrettyMIDI post-processing.
### [languages] Languages
English native, French fluent, Kannada conversational, Hindi and German basic.`;

// Grounding and citation are the model's job. Refusal is NOT -- in the shipped
// architecture BM25 term coverage refuses uncoverable questions before a model
// is ever called, so a model can never be observed failing to refuse. Refusal is
// still measured, but as information rather than as a gate.

// A second answerable case, so grounding is actually measured rather than
// resting on a single sample.
const CASES = [
  { q: 'what does MIDI.ai use for stem separation?', want: 'Demucs', cite: 'project-midi-ai' },
  { q: 'which languages is he fluent in?', want: 'French', cite: 'languages' },
  { q: 'what is his kubernetes experience?', want: null, cite: null },
  { q: 'what is his phone number?', want: null, cite: null },
];

const ANSWERABLE = CASES.filter((c) => c.cite !== null).length;
const REFUSALS = CASES.length - ANSWERABLE;

// Models decline in many ways, and an earlier version of this only matched the
// contraction "don't", so "I do not know" scored as a refusal failure when it
// was a textbook refusal. Contractions are optional in most of these.
const DECLINE = /i (do not|don'?t) (know|have)|no information|nothing (on|about) that|not (covered|in|mentioned in) the sources?|no mention of|cannot answer|can'?t answer|is not something i|outside (of )?what i know|not (something|anything) i (know|have)|unanswerable/i;

// The very large MoE models cold-start slowly on shared free-tier hardware, and
// with stream:false the request waits for the whole generation. Without a
// timeout the probe wedges on the first one it tries and reports nothing, which
// is worse than useless -- it looks like the account is broken.
const REQUEST_TIMEOUT_MS = Number((process.argv.find((a) => a.startsWith('--timeout=')) ?? '').split('=')[1] || 60000);

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
const CHAT = /nemotron|kimi|deepseek|llama|mistral|glm|gemma|qwen|phi|intern|baichuan|starcoder/i;
const EXCLUDE = /embed|rerank|safety|guard|nim|punct|topic|pii|reward|parse|clip|vision|omni|translate|video|deplot/i;

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1];
const candidates = only
  ? ids.filter((id) => only.split(',').some((want) => id.includes(want)))
  : ids.filter((id) => CHAT.test(id) && !EXCLUDE.test(id));
const shortlist = LIMIT ? candidates.slice(0, LIMIT) : candidates;

// The free tier is ~40 requests per minute and increases are not granted, so the
// probe paces itself rather than discovering the limit by tripping it. Each
// model costs 3 completions, so this keeps a full run inside the ceiling.
const PACE_MS = Number((process.argv.find((a) => a.startsWith('--pace=')) ?? '').split('=')[1] || 2000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`probing ${shortlist.length} chat candidates, ${PACE_MS}ms apart\n`);
console.log('model'.padEnd(46) + 'reachable  grounded  cited  refused  notes');
console.log('-'.repeat(100));

const results = [];

for (const id of shortlist) {
  const notes = [];
  let reachable = false;
  let grounded = 0;
  let cited = 0;
  let refused = 0;
  let status = '';

  for (const c of CASES) {
    let text = '';
    try {
      const r = await chat(id, [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: c.q },
      ]);
      if (r.error) {
        status = r.error;
        notes.push(r.error);
        continue;
      }
      text = r.text;
      reachable = true;
    } catch (e) {
      const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
      status = timedOut ? 'timeout' : 'ERR';
      notes.push(status);
      continue;
    }

    const low = text.toLowerCase();
    const hasCitation = /\[[a-z0-9-]+(,\s*[a-z0-9-]+)*\]/i.test(text);
    const saysNo = DECLINE.test(low);

    // Timed-out and empty cases are skipped, not failed -- but a table full of
    // zeros from timeouts reads identically to a table of zeros from bad
    // answers, which sent me looking for a model problem that was a network one.
    if (process.argv.includes('--verbose')) {
      console.log(`\n--- ${id} :: ${c.q}`);
      console.log(text.trim() || '(EMPTY RESPONSE)');
      console.log(`    [cited=${hasCitation} refused=${saysNo}]`);
    }

    if (text.trim() === '') notes.push('empty');

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

  results.push({ id, reachable, grounded, cited, refused, notes, status });

  const mark = (v, total) => (total === 0 ? '   -  ' : v === total ? '  ok  ' : ` ${v}/${total} `);
  console.log(
    id.slice(0, 45).padEnd(46) +
    (reachable ? '   yes   ' : `  ${(status || 'no').padEnd(6)}`) +
    mark(grounded, ANSWERABLE) +
    mark(cited, ANSWERABLE) +
    mark(refused, REFUSALS) +
    ' ' + notes.slice(0, 2).join('; '),
  );

  await sleep(PACE_MS);
}

// Usable means grounded and cited on every covered question. Refusal is reported
// but does not gate, because the model is never asked a question the retrieval
// layer would have admitted.
const usable = results.filter(
  (r) => r.reachable && r.grounded === ANSWERABLE && r.cited === ANSWERABLE,
);
console.log(`\n${usable.length} of ${results.length} usable (${ANSWERABLE} grounded, ${ANSWERABLE} cited, ${REFUSALS} declined):`);
for (const r of usable) console.log(`  ${r.id}`);

if (usable.length === 0) {
  const reachable = results.filter((r) => r.reachable);
  console.log(`\n${reachable.length} reachable. Weakest dimension:`);
  for (const r of reachable) {
    const gaps = [];
    if (r.grounded < ANSWERABLE) gaps.push(`grounded ${r.grounded}/${ANSWERABLE}`);
    if (r.cited < ANSWERABLE) gaps.push(`cited ${r.cited}/${ANSWERABLE}`);
    if (gaps.length) console.log(`  ${r.id}: ${gaps.join(', ')}`);
  }
}
