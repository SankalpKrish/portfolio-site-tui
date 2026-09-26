// ask-sankalp/probe/embed.mjs
// Phase 0 probe: embed N dummy vectors so the Vectorize billing basis can be measured.
//
// Confirms the embedding model's real output width before any index is created with
// fixed dimensions, and emits ndjson for `wrangler vectorize upsert`.

import { writeFileSync } from 'node:fs';

const MODEL = '@cf/qwen/qwen3-embedding-0.6b';
const COUNT = 20;

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN first.');
  process.exit(1);
}

const texts = Array.from(
  { length: COUNT },
  (_, i) => `probe vector ${i} — synthetic filler used only to measure Vectorize billing`,
);

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  },
);

if (!res.ok) {
  console.error(`Embedding failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const body = await res.json();
if (!body.success) {
  console.error(`Embedding returned success=false: ${JSON.stringify(body.errors)}`);
  process.exit(1);
}

// The model returns { shape, data } for array input, but a bare array for single input.
// Normalise both so a shape change surfaces here rather than as corrupt vectors later.
const raw = body.result?.data ?? body.result;
const vectors = Array.isArray(raw?.[0]) ? raw : [raw];

if (vectors.length !== COUNT) {
  console.error(`Expected ${COUNT} vectors, got ${vectors.length}.`);
  process.exit(1);
}

const width = vectors[0].length;
console.log(`model:    ${MODEL}`);
console.log(`vectors:  ${vectors.length}`);
console.log(`width:    ${width}`);

if (width !== 1024) {
  console.error(
    `\nSTOP. Width is ${width}, not 1024.\n` +
      `Vectorize dimensions are immutable after creation, so creating a 1024-dim index now\n` +
      `would be a permanent mistake. Report this width before continuing.`,
  );
  process.exit(1);
}

const ndjson = vectors
  .map((values, i) =>
    JSON.stringify({ id: `probe-${i}`, values, metadata: { i, synthetic: true } }),
  )
  .join('\n');

writeFileSync(new URL('./vectors.ndjson', import.meta.url), ndjson + '\n');
console.log(`wrote:    vectors.ndjson (${COUNT} vectors)`);
