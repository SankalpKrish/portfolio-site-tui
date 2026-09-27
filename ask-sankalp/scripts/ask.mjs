// ask-sankalp/scripts/ask.mjs
// Calls the deployed Worker and prints the NDJSON stream as it arrives.
//
//   node ask-sankalp/scripts/ask.mjs "what did he use for MIDI.ai"
//   ASK_URL=... node ask-sankalp/scripts/ask.mjs "..."
//
// Also the way to check a refusal, a rate limit or a degraded response without
// going through the terminal.

const URL = process.env.ASK_URL ?? 'https://ask-sankalp.sankalp-96e.workers.dev';
const question = process.argv.slice(2).join(' ');

if (!question) {
  console.error('usage: node ask-sankalp/scripts/ask.mjs "a question"');
  process.exit(1);
}

const res = await fetch(URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ q: question }),
});

console.log(`status: ${res.status}  cache: ${res.headers.get('X-Ask-Cache') ?? '-'}`);
if (!res.ok) {
  console.log(await res.text());
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let started = Date.now();
let text = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;

    const frame = JSON.parse(line);

    if (frame.t === 'meta') {
      console.log(`\n[meta] kind=${frame.kind}${frame.reason ? ` reason=${frame.reason}` : ''}`);
      if (frame.ids) console.log(`[meta] retrieved: ${frame.ids.join(', ')}`);
    }
    if (frame.t === 'text') {
      if (!text) process.stdout.write('\n');
      process.stdout.write(frame.v);
      text += frame.v;
    }
    if (frame.t === 'citations') console.log(`\n\n[sources] ${frame.ids.length ? frame.ids.join(', ') : '(none)'}`);
    if (frame.t === 'done') console.log(`[done] ${frame.ms}ms server-side`);
  }
}

console.log(`\n[client] ${Date.now() - started}ms, ${text.length} chars`);
