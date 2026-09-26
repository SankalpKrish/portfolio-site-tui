// ask-sankalp/scripts/bench-models.mjs
// Time-to-first-token and total generation, streamed, for candidate models.
//
//   node ask-sankalp/scripts/bench-models.mjs z-ai/glm-5.3-flash nvidia/nemotron-3.5-lightning-30b-a3b
//
// TTFT is what a user actually feels. Total matters too, but only because it
// decides how long the Worker holds the connection.

const BASE = process.env.CHAT_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const KEY = process.env.NVIDIA_API_KEY ?? process.env.CHAT_API_KEY;

if (!KEY) {
  console.error('No API key. Set NVIDIA_API_KEY.');
  process.exit(1);
}

const models = process.argv.slice(2);
if (models.length === 0) {
  console.error('usage: node ask-sankalp/scripts/bench-models.mjs <model> [model...]');
  process.exit(1);
}

const SYSTEM = `You answer questions about Sankalp Krishnamurthy using ONLY the SOURCES below.
End with a Sources line naming the chunk ids you used, like [project-midi-ai].

SOURCES:
### [project-midi-ai] MIDI.ai
MIDI.ai is a five-stage Python pipeline for polyphonic audio to MIDI, started December 2025. Stages are Demucs v4 stem isolation, Librosa MIR, YAMNet timbre, Basic Pitch transcription, PrettyMIDI post-processing. The orchestrator, a 40-entry YAMNet-to-GM program mapper, the post-processor and the CLI wrapper are his own work.
### [languages] Languages
English native, French fluent, Kannada conversational, Hindi and German basic.`;

const QUESTION = 'what did he use for MIDI.ai?';

console.log('model'.padEnd(44) + 'ttft     total    chars  chunks/s');
console.log('-'.repeat(80));

for (const model of models) {
  const t0 = Date.now();
  let ttft = null;
  let chars = 0;
  let chunks = 0;

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(120000),
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: QUESTION },
        ],
      }),
    });

    if (!res.ok) {
      console.log(model.slice(0, 43).padEnd(44) + `${res.status}`);
      continue;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const d = JSON.parse(data).choices?.[0]?.delta?.content;
          if (d) {
            chars += d.length;
            chunks++;
          }
        } catch {
          // partial frame
        }
      }
    }

    const total = Date.now() - t0;
    const rate = total > 0 ? ((chars / total) * 1000).toFixed(0) : '-';
    console.log(
      model.slice(0, 43).padEnd(44) +
      `${String(ttft ?? '-').padStart(5)}ms ${String(total).padStart(6)}ms  ${String(chars).padStart(5)}  ${rate}`,
    );
  } catch (e) {
    const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
    console.log(model.slice(0, 43).padEnd(44) + (timedOut ? 'timeout >120s' : `ERR ${e.message}`));
  }
}
