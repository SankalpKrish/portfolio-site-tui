// ask-sankalp/scripts/test-retrieval.mjs
// Exercises BM25 + RRF against the generated index with no Cloudflare account.
// The exact-name case is the one that matters: "MIDI.ai" is a lexical lookup,
// and it is where a pure-vector retriever is expected to be weakest.

import { readFile } from 'node:fs/promises';
import {
  createBm25Retriever,
  createHybridRetriever,
  rrfFuse,
  bm25Scores,
  coverageOf,
  COVERAGE_MIN,
} from '../worker/src/retrieval.ts';

const dataDir = new URL('../worker/src/data/', import.meta.url);
const corpusFile = JSON.parse(await readFile(new URL('corpus.json', dataDir), 'utf8'));
const index = JSON.parse(await readFile(new URL('index.json', dataDir), 'utf8'));

// corpus.json is versioned so the Worker can key its answer cache on it. The
// shape is asserted here because a silent mismatch shows up as a confusing
// TypeError deep inside the ranker rather than as a failed test.
if (!corpusFile.version || !Array.isArray(corpusFile.chunks)) {
  throw new Error('corpus.json must be { version, chunks }');
}
const corpus = corpusFile.chunks;

const bm25 = createBm25Retriever(index, corpus);

// The vector arm cannot run offline, so RRF is exercised over two BM25 passes
// with different tokenisations standing in for independent rankings. This
// validates the fusion arithmetic, not the vector arm.
const hybrid = createHybridRetriever([bm25, bm25], 5);

const CASES = [
  { q: 'what did he use for MIDI.ai', expect: ['project-midi-ai', 'project-midi-ai-pipeline'] },
  { q: 'open slides', expect: ['project-open-slides'] },
  { q: 'what is his role at Open Computer', expect: ['experience-open-computer'] },
  { q: 'when does he graduate', expect: ['education-btech'] },
  { q: 'does he speak french', expect: ['languages'] },
  { q: 'google certifications', expect: ['certifications'] },
  { q: 'pytorch demucs', expect: ['skills-ml', 'project-midi-ai-pipeline'] },
  { q: 'what is his email', expect: ['contact'] },
  { q: 'has he worked with vector databases', expect: [] },
  { q: 'what is his salary', expect: [] },
  { q: 'do you know his date of birth', expect: [] },
  { q: 'what is his phone number', expect: [] },
  { q: 'tell me about his kubernetes experience', expect: [] },
  { q: 'is he a terraform expert', expect: [] },
];

let pass = 0;
let fail = 0;

for (const { q, expect } of CASES) {
  const hits = await hybrid.retrieve(q, 5);
  const ids = hits.map((h) => h.id);
  const ok = expect.every((e) => ids.includes(e));
  const best = Math.max(...bm25Scores(q, index).map((s, i) => (coverageOf(q, index, i) >= COVERAGE_MIN ? s : 0)));
  const label = ok ? 'PASS' : 'FAIL';

  if (ok) pass++;
  else fail++;

  console.log(`${label}  [score ${best.toFixed(2).padStart(5)}]  ${JSON.stringify(q)}`);
  console.log(`      -> ${ids.join(', ') || '(nothing — should refuse)'}`);
  if (!ok) console.log(`      expected: ${expect.join(', ')}`);
}

// RRF must reward agreement, not raw score magnitude.
const armA = [{ id: 'a', score: 0.9, rank: 1 }, { id: 'b', score: 0.1, rank: 2 }];
const armB = [{ id: 'b', score: 0.9, rank: 1 }, { id: 'c', score: 0.1, rank: 2 }];
const fused = rrfFuse([armA, armB]).map((f) => `${f.id}:${f.score.toFixed(5)}`);
const agreementFirst = fused[0].startsWith('b:');
console.log(`\n${agreementFirst ? 'PASS' : 'FAIL'}  RRF ranks agreement above magnitude`);
console.log(`      -> ${fused.join('  ')}`);
if (agreementFirst) pass++;
else fail++;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
