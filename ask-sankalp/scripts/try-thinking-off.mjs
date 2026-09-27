// One-off: does a thinking-suppression parameter work on a Nemotron reasoning
// model, and does a prompt instruction work where the parameter does not?
// Run: node ask-sankalp/scripts/try-thinking-off.mjs <model>

const BASE = process.env.CHAT_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const KEY = process.env.NVIDIA_API_KEY ?? process.env.CHAT_API_KEY;
const MODEL = process.argv[2] ?? 'nvidia/nemotron-3.5-lightning-30b-a3b';

const SOURCES = `### [project-midi-ai] MIDI.ai
Stem isolation runs on a Hybrid Transformer Demucs v4 in PyTorch, which splits the mix into separate sources. Librosa handles tempo, key and tuning.`;

const QUESTION = 'what does MIDI.ai use for stem separation?';

const ANTI_REASONING = `You answer questions using ONLY the SOURCES below.

OUTPUT FORMAT, STRICT: reply with the answer and nothing else. Do not describe your
process. Do not write "Here's a thinking process", do not enumerate steps, do not
explain how you chose what to read. No preamble. Answer directly in one or two
paragraphs, then a Sources line.`;

async function attempt(label, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(120000),
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      max_tokens: 400,
      messages: [
        { role: 'system', content: `${ANTI_REASONING}\n\n${SOURCES}` },
        { role: 'user', content: QUESTION },
      ],
      ...body,
    }),
  });

  if (!res.ok) {
    console.log(`${label.padEnd(34)} ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let ttft = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (ttft === null) ttft = Date.now() - t0;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const d = line.slice(5).trim();
      if (d === '[DONE]') continue;
      try {
        const c = JSON.parse(d).choices?.[0]?.delta?.content;
        if (c) text += c;
      } catch {}
    }
  }

  const leaked = /thinking process|let's think|step \d|^\s*1\.\s|analyze user input|check sources|formulate answer/i.test(text);
  const answered = /demucs/i.test(text);
  const cited = /\[[a-z0-9-]+\]/i.test(text);

  console.log(
    `${label.padEnd(34)} ${String(Date.now() - t0).padStart(6)}ms  reasoning=${leaked ? 'LEAKED ' : 'clean   '}  answered=${answered}  cited=${cited}  ${text.length}ch`,
  );
  console.log(`    ${text.trim().slice(0, 180).replace(/\n/g, ' ')}\n`);
}

console.log(`model: ${MODEL}\n`);
await attempt('baseline (no extra params)', {});
await attempt('chat_template_kwargs', { chat_template_kwargs: { enable_thinking: false } });
await attempt('reasoning:false', { reasoning: false });
await attempt('enable_thinking:false', { enable_thinking: false });
