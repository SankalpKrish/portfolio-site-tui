// ask-sankalp/scripts/verify-index.mjs
// Reports drift between three things that are easy to desynchronise and hard to
// notice when they have:
//
//   content/*.md          what you actually wrote
//   content/manifest.json what the last ingest believed it wrote
//   Vectorize             what the bot will actually retrieve
//
// Exists because the retrieval tests cannot catch any of this. They read the
// bundled corpus.json, so they keep passing while the live index serves stale
// vectors -- and the symptom a recruiter sees is a confidently wrong answer, not
// an error.
//
//   node ask-sankalp/scripts/verify-index.mjs          cheap: local drift + id sets
//   node ask-sankalp/scripts/verify-index.mjs --deep   also checks vector freshness
//
// Exit code is 0 when clean and 1 on any drift, so it works as a gate.
//
// --deep embeds every chunk and queries the index once per chunk. On the
// pessimistic reading -- a query bills against the whole index -- that is
// chunks x DIMS dimensions per query, so the run costs
// chunks * chunks * DIMS of the 30M monthly allocation. At the shipped 25 chunks
// that is ~2%; at the planned 120 it would be ~49%, which is why this stays
// opt-in rather than becoming the default. Recomputed from the live corpus
// rather than hardcoded, so it cannot drift when the corpus grows.
const MONTHLY_QUERY_DIM_ALLOCATION = 30_000_000;

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';

import { accountId, apiToken, embed, indexInfo, listVectors, DIMS } from './lib/cloudflare.mjs';

const ROOT = new URL('..', import.meta.url);
const CONTENT_DIR = new URL('./content/', ROOT);
const CORPUS_URL = new URL('./worker/src/data/corpus.json', ROOT);

const deep = process.argv.includes('--deep');

// A chunk embedded from its own text should be its own nearest neighbour at
// cosine 1.0. Anything below this means the stored vector was built from
// different text, which is the failure the id-set checks cannot see.
const FRESHNESS_FLOOR = 0.99;

// Must match the string ingest.mjs embeds, or every chunk looks stale. The
// title is prepended there because it carries most of the exact-match signal,
// so embedding the body alone is not a like-for-like comparison.
const embedInput = (chunk) => `${chunk.title}\n\n${chunk.text}`;

const findings = [];
const fail = (check, detail) => findings.push({ check, detail });

// ------------------------------------------------------------------ helpers

function parseFrontMatter(raw) {
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

function indexName() {
  const toml = readFileSync(new URL('./worker/wrangler.toml', ROOT), 'utf8');
  const match = toml.match(/^\s*index_name\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error('no index_name in worker/wrangler.toml');
  return match[1];
}

// The Worker's cache key is this hash, so a stale corpus.json means answers are
// served from cache under a key that no longer describes the facts.
function expectedVersion(manifest) {
  return createHash('sha256')
    .update(Object.entries(manifest).map(([id, m]) => `${id}:${m.sha256}`).join('|'))
    .digest('hex')
    .slice(0, 16);
}

// Progress goes to stderr and only when it is a terminal. Piped into a log or a
// CI run, the carriage returns would just concatenate into one long line.
const isTTY = process.stderr.isTTY;
const label = (s) => `\x1b[2m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

// ------------------------------------------------------------------ local

const manifest = JSON.parse(readFileSync(new URL('./manifest.json', CONTENT_DIR), 'utf8'));
const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.md') && f !== 'SOURCES.md');

const onDisk = new Map();
for (const file of files) {
  const raw = await readFile(new URL(file, CONTENT_DIR), 'utf8');
  onDisk.set(file, { raw, sha256: createHash('sha256').update(raw).digest('hex') });
}

// 1. Does every chunk on disk still hash to what the manifest recorded?
const byFile = new Map(Object.entries(manifest).map(([id, m]) => [m.file, { id, ...m }]));

for (const [file, { sha256 }] of onDisk) {
  const entry = byFile.get(file);
  if (!entry) {
    fail('content', `${file} is not in manifest.json -- run \`npm run ingest\``);
    continue;
  }
  if (entry.sha256 !== sha256) {
    fail('content', `${file} changed since the last ingest (${entry.id}) -- run \`npm run ingest\``);
  }
}

for (const [file, { id }] of byFile) {
  if (!onDisk.has(file)) {
    fail('content', `manifest lists ${id} but ${file} is gone -- run \`npm run ingest\``);
  }
}

// 2. Does the corpus the Worker bundles match the manifest?
const corpus = JSON.parse(readFileSync(CORPUS_URL, 'utf8'));
const want = expectedVersion(manifest);

if (corpus.version !== want) {
  fail(
    'bundle',
    `worker/src/data/corpus.json is version ${corpus.version}, manifest implies ${want} -- ` +
      'the Worker would quote text that no longer matches content/',
  );
}

if (corpus.chunks.length !== Object.keys(manifest).length) {
  fail(
    'bundle',
    `corpus.json has ${corpus.chunks.length} chunks, manifest has ${Object.keys(manifest).length}`,
  );
}

console.log(`${label('local')}   ${files.length} files, manifest ${Object.keys(manifest).length} entries, corpus version ${corpus.version}`);

// ------------------------------------------------------------------ live

// The local checks above need no credential and no network, so they are worth
// running on their own -- on a plane, in CI, or before `wrangler login` has ever
// happened. Only the live half is allowed to depend on a token, and losing the
// token must not discard drift the local half already found.
const index = indexName();
let reachable = true;

try {
  apiToken();
} catch (err) {
  reachable = false;
  console.log(`${label('live')}    skipped -- ${err.message.split('.')[0]}`);
}

if (!reachable) {
  // ------------------------------------------------------------------ report
  if (findings.length === 0) {
    console.log(`\n${green('clean')}  content, manifest and bundle agree; ${index} was NOT checked`);
    process.exit(0);
  }
  report();
}

const config = await indexInfo(index);

if (!config) {
  fail('index', `${index} does not exist on account ${accountId()}`);
} else {
  if (config.dimensions !== DIMS) {
    fail('index', `${index} is ${config.dimensions}-dimensional, expected ${DIMS} (immutable)`);
  }
  if (config.metric !== 'cosine') {
    fail('index', `${index} uses ${config.metric}, expected cosine (immutable)`);
  }

  const live = await listVectors(index);
  if (live.isTruncated) {
    fail('index', `${index} listing was truncated at ${live.ids.length} of ${live.totalCount}`);
  }

  const liveIds = new Set(live.ids);
  const manifestIds = new Set(Object.keys(manifest));

  // 3. Missing from the index. Plausible because ingest writes .ingest.ndjson
  //    and leaves the wrangler upsert as a separate manual step.
  for (const id of manifestIds) {
    if (!liveIds.has(id)) {
      fail('index', `${id} is in the manifest but not in ${index} -- run \`npm run ingest:upsert\``);
    }
  }

  // 4. Present in the index but no longer in the corpus. This is the one that
  //    matters most: a chunk you deleted stays retrievable, so the bot keeps
  //    answering with a fact you removed and cites a source that no longer exists.
  for (const id of liveIds) {
    if (!manifestIds.has(id)) {
      fail('index', `${id} is in ${index} but not the manifest -- a deleted chunk is still answerable`);
    }
  }

  console.log(`${label('live')}    ${index}: ${live.totalCount} vectors, ${config.dimensions}d ${config.metric}`);

  // 5. Optional: are the stored vectors actually built from the current text?
  if (deep) {
    const ids = corpus.chunks.map((c) => c.id).filter((id) => liveIds.has(id));
    let stale = 0;

    for (let i = 0; i < ids.length; i += 20) {
      const batch = corpus.chunks.filter((c) => ids.slice(i, i + 20).includes(c.id));
      const vectors = await embed(batch.map(embedInput));

      for (const [j, chunk] of batch.entries()) {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId()}/vectorize/v2/indexes/${index}/query`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ vector: vectors[j], topK: 1 }),
          },
        );
        const body = await res.json();
        if (!body.success) throw new Error(`query error: ${JSON.stringify(body.errors)}`);

        const top = body.result.matches[0];
        if (!top || top.id !== chunk.id || top.score < FRESHNESS_FLOOR) {
          stale++;
          fail(
            'vectors',
            `${chunk.id} does not match its own embedding ` +
              `(top hit ${top ? `${top.id} @ ${top.score.toFixed(4)}` : 'none'}) -- ` +
              'the stored vector is stale, re-run `npm run ingest:upsert`',
          );
        }
      }
      if (isTTY) process.stderr.write(`\r${label('deep')}   checked ${Math.min(i + 20, ids.length)}/${ids.length} chunks`);
    }

    if (isTTY) process.stderr.write('\r\x1b[K');
    console.log(`${label('deep')}    ${ids.length - stale}/${ids.length} vectors fresh at >= ${FRESHNESS_FLOOR}`);
  } else if (!deep) {
    const perQuery = corpus.chunks.length * DIMS;
    const run = (perQuery * corpus.chunks.length) / MONTHLY_QUERY_DIM_ALLOCATION;
    console.log(
      `${dim('deep')}    skipped; pass --deep to check vector freshness ` +
        `(~${perQuery.toLocaleString()} dims per query, ~${(run * 100).toFixed(0)}% of the monthly query budget for one run)`,
    );
  }
}

// ------------------------------------------------------------------ report

function report() {
  if (findings.length === 0) {
    console.log(`\n${green('clean')}  no drift between content, manifest, bundle and ${index}`);
    process.exit(0);
  }

  console.log('');
  const order = { content: 0, bundle: 1, index: 2, vectors: 3 };
  findings.sort((a, b) => order[a.check] - order[b.check]);
  for (const f of findings) {
    console.log(`${red(f.check.padEnd(8))} ${f.detail}`);
  }
  console.log(`\n${red(`${findings.length} finding${findings.length === 1 ? '' : 's'}`)}`);
  process.exit(1);
}

report();
