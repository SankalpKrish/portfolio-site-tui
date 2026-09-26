// ask-sankalp/scripts/ingest.mjs
// Turns content/*.md into three build artifacts:
//   worker/src/data/corpus.json  chunk text, bundled so the Worker can build prompts
//   worker/src/data/index.json   BM25 inverted index, bundled because KV caps writes at 1000/day
//   content/manifest.json        sha256 per chunk, so drift is detectable without a live round-trip
//
// Then optionally upserts the embeddings into Vectorize. Run with --upsert for that step.
//
// Not a Worker: Workers Free allows 10ms CPU and parsing embedding arrays is
// documented at 10-20ms. This runs on Node, where that ceiling does not apply.

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const MODEL = '@cf/qwen/qwen3-embedding-0.6b';
const DIMS = 1024;
const EMBED_BATCH = 20;
const UPSERT_BATCH = 5000;

const BM25_K1 = 1.5;
const BM25_B = 0.75;

const ROOT = new URL('..', import.meta.url);
const CONTENT_DIR = new URL('./content/', ROOT);
const DATA_DIR = new URL('./worker/src/data/', ROOT);

const args = new Set(process.argv.slice(2));
const doUpsert = args.has('--upsert');

// ---------------------------------------------------------------- front-matter

// Hand-rolled rather than pulling in a YAML dependency: the schema is four flat
// scalar keys, and the Worker has no node_modules to carry a parser for.
function parseFrontMatter(raw) {
  if (!raw.startsWith('---')) throw new Error('missing front-matter');
  const end = raw.indexOf('\n---', 3);
  if (end === -1) throw new Error('unterminated front-matter');

  const meta = {};
  for (const line of raw.slice(3, end).split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }

  return { meta, body: raw.slice(end + 4).trim() };
}

// ---------------------------------------------------------------- tokenising

// Imported, not reimplemented. The Worker owns the tokenizer so the index and
// the query path cannot drift apart -- see contentTokens in retrieval.ts for
// why that failure mode is silent rather than loud.
const { contentTokens } = await import('../worker/src/retrieval.ts');

// ---------------------------------------------------------------- load

async function loadChunks() {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.md') && f !== 'SOURCES.md');
  const chunks = [];

  for (const file of files.sort()) {
    const raw = await readFile(new URL(file, CONTENT_DIR), 'utf8');
    const { meta, body } = parseFrontMatter(raw);

    for (const key of ['id', 'title', 'topic', 'source']) {
      if (!meta[key]) throw new Error(`${file}: front-matter is missing "${key}"`);
    }
    if (!body) throw new Error(`${file}: empty body`);

    chunks.push({
      id: meta.id,
      title: meta.title,
      topic: meta.topic,
      source: meta.source,
      file,
      text: body,
      sha256: createHash('sha256').update(raw).digest('hex'),
    });
  }

  const seen = new Set();
  for (const c of chunks) {
    if (seen.has(c.id)) throw new Error(`duplicate chunk id: ${c.id}`);
    seen.add(c.id);
  }

  return chunks;
}

// ---------------------------------------------------------------- BM25

function buildIndex(chunks) {
  const postings = {};
  const docLen = [];
  let totalLen = 0;

  chunks.forEach((chunk, i) => {
    // The title carries most of the exact-match signal a recruiter query needs
    // ("MIDI.ai", "Open Slides"), so it is indexed alongside the body.
    const tokens = contentTokens(`${chunk.title}. ${chunk.text}`);
    docLen[i] = tokens.length;
    totalLen += tokens.length;

    for (const term of tokens) {
      if (!postings[term]) postings[term] = [];
      const entry = postings[term][postings[term].length - 1];
      if (entry && entry[0] === i) entry[1]++;
      else postings[term].push([i, 1]);
    }
  });

  return {
    k1: BM25_K1,
    b: BM25_B,
    avgdl: Number((totalLen / docLen.length).toFixed(2)),
    docLen,
    postings,
  };
}

// ---------------------------------------------------------------- embed

async function embed(texts) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required');
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texts }),
  });

  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`);

  const body = await res.json();
  if (!body.success) throw new Error(`embed error: ${JSON.stringify(body.errors)}`);

  const raw = body.result?.data ?? body.result;
  const vectors = Array.isArray(raw?.[0]) ? raw : [raw];

  if (vectors.length !== texts.length) {
    throw new Error(`expected ${texts.length} vectors, got ${vectors.length}`);
  }
  for (const v of vectors) {
    if (v.length !== DIMS) {
      throw new Error(`vector width ${v.length} != ${DIMS}; the index is immutable, fix before upserting`);
    }
  }

  return vectors;
}

// ---------------------------------------------------------------- emit

async function emit(chunks) {
  await mkdir(DATA_DIR, { recursive: true });

  const corpus = chunks.map(({ id, title, topic, text }) => ({ id, title, topic, text }));
  await writeFile(new URL('./corpus.json', DATA_DIR), JSON.stringify(corpus));

  const index = buildIndex(chunks);
  await writeFile(new URL('./index.json', DATA_DIR), JSON.stringify(index));

  const manifest = Object.fromEntries(chunks.map((c) => [c.id, { sha256: c.sha256, file: c.file }]));
  await writeFile(new URL('./manifest.json', CONTENT_DIR), JSON.stringify(manifest, null, 2) + '\n');

  const vectors = Object.values(index.postings).reduce((n, p) => n + p.length, 0);
  console.log(`chunks:     ${chunks.length}`);
  console.log(`corpus:     ${(JSON.stringify(corpus).length / 1024).toFixed(1)} KB`);
  console.log(`index:      ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`);
  console.log(`            ${Object.keys(index.postings).length} terms, ${vectors} postings`);
  console.log(`avgdl:      ${index.avgdl}`);
  console.log(`manifest:   ${chunks.length} hashes`);

  return index;
}

async function upsert(chunks) {
  const vectors = new Map();
  const embedTexts = chunks.map((c) => `${c.title}\n\n${c.text}`);

  for (let i = 0; i < embedTexts.length; i += EMBED_BATCH) {
    const batch = embedTexts.slice(i, i + EMBED_BATCH);
    const out = await embed(batch);
    batch.forEach((_, j) => vectors.set(chunks[i + j].id, out[j]));
    console.log(`embedded ${Math.min(i + EMBED_BATCH, embedTexts.length)}/${embedTexts.length}`);
  }

  const ndjson = chunks
    .map((c) => JSON.stringify({ id: c.id, values: vectors.get(c.id), metadata: { title: c.title, topic: c.topic } }))
    .join('\n');

  const { writeFile: wf } = await import('node:fs/promises');
  const tmp = join(process.cwd(), '.ingest.ndjson');
  await wf(tmp, ndjson + '\n');
  console.log(`\nwrote ${tmp} — now run:`);
  console.log(`  npx wrangler vectorize upsert <INDEX_NAME> --file .ingest.ndjson --batch-size ${UPSERT_BATCH}`);
  console.log(`\nVectorize writes take a median of under 30s to become queryable.`);
}

const chunks = await loadChunks();
await emit(chunks);
if (doUpsert) await upsert(chunks);
