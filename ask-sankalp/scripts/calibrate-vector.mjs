// ask-sankalp/scripts/calibrate-vector.mjs
// Measures the vector arm's answerability threshold against the real index.
//
// MIN_VECTOR_SCORE in worker/src/index.ts was a guess. BM25 decides
// answerability by term coverage, but the vector arm has no equivalent test, so
// without a floor it returns a topically adjacent chunk for a question the
// corpus never covers. This finds the number that separates the two.
//
//   npm run calibrate
//
// The same queries as test-retrieval.mjs, so the two arms can be compared
// directly. BM25 coverage handles all six refusals on its own; the question
// here is narrower -- does the vector arm introduce wrong answers, and at what
// score does that start happening?

import { readFile } from 'node:fs/promises';
import { embed, queryIndex, accountId } from './lib/cloudflare.mjs';
import { createBm25Retriever, coverageOf, COVERAGE_MIN, bm25Scores } from '../worker/src/retrieval.ts';

const INDEX = process.env.VECTORIZE_INDEX ?? 'ask-sankalp-content';
const CURRENT = 0.45;

const dataDir = new URL('../worker/src/data/', import.meta.url);
const corpusFile = JSON.parse(await readFile(new URL('corpus.json', dataDir), 'utf8'));
const index = JSON.parse(await readFile(new URL('index.json', dataDir), 'utf8'));
const corpus = corpusFile.chunks;
const bm25 = createBm25Retriever(index, corpus);

// answerable: the corpus really does cover it. refuse: it does not.
const CASES = [
  { q: 'what did he use for MIDI.ai', kind: 'answerable' },
  { q: 'open slides', kind: 'answerable' },
  { q: 'what is his role at Open Computer', kind: 'answerable' },
  { q: 'when does he graduate', kind: 'answerable' },
  { q: 'does he speak french', kind: 'answerable' },
  { q: 'google certifications', kind: 'answerable' },
  { q: 'pytorch demucs', kind: 'answerable' },
  { q: 'what is his email', kind: 'answerable' },
  { q: 'how does he handle model routing', kind: 'answerable' },
  { q: 'what database does he use', kind: 'answerable' },
  // Paraphrases with no term overlap. These are the whole reason the vector
  // arm exists -- BM25 cannot reach them, and without it /ask would refuse
  // questions the corpus plainly answers.
  { q: 'how does he decide which model to use for a request', kind: 'answerable' },
  { q: 'what does he do to keep an interface readable on a slow connection', kind: 'answerable' },
  { q: 'how does he turn a finished song into something editable', kind: 'answerable' },
  { q: 'where does he go to get in touch', kind: 'answerable' },
  { q: 'what is he trying to do professionally', kind: 'answerable' },
  { q: 'has he worked with vector databases', kind: 'refuse' },
  { q: 'what is his salary', kind: 'refuse' },
  { q: 'do you know his date of birth', kind: 'refuse' },
  { q: 'what is his phone number', kind: 'refuse' },
  { q: 'tell me about his kubernetes experience', kind: 'refuse' },
  { q: 'is he a terraform expert', kind: 'refuse' },
  { q: 'does he speak french', kind: 'answerable' },
  { q: 'does he know rust', kind: 'answerable' },
  // Answerable, and the honest answer is "learning, not production" -- the
  // corpus says so. Retrieving the chunk is correct behaviour, not a leak.
  { q: 'is he production ready with rust', kind: 'answerable' },
  { q: 'has he worked with kafka', kind: 'refuse' },
  { q: 'what is his experience with graphql', kind: 'refuse' },
];

console.log(`account: ${accountId()}`);
console.log(`index:   ${INDEX}`);
console.log(`corpus:  ${corpus.length} chunks, version ${corpusFile.version}\n`);

const vectors = await embed(CASES.map((c) => c.q));

const rows = [];
for (let i = 0; i < CASES.length; i++) {
  const { q, kind } = CASES[i];
  const matches = await queryIndex(INDEX, vectors[i], 3);
  const top = matches[0] ?? { id: '-', score: 0 };

  const scores = bm25Scores(q, index);
  const bestCovered = scores
    .map((s, d) => ({ s, d, cov: coverageOf(q, index, d) }))
    .filter((x) => x.cov >= COVERAGE_MIN)
    .sort((a, b) => b.s - a.s)[0];
  const bm25Passes = Boolean(bestCovered);

  rows.push({ q, kind, topId: top.id, topScore: top.score, bm25Passes, runnersUp: matches.slice(1, 3) });
}

const f = (n) => n.toFixed(3).padStart(6);
console.log('kind        top-vector-score  bm25-admits   verdict   correct   top chunk');
console.log('-'.repeat(96));
for (const r of rows) {
  // The shipped architecture: BM25 term coverage is the sole admission test.
  // The vector arm only reorders chunks after admission, so it cannot make an
  // unanswerable question answerable -- and cannot rescue one BM25 refuses.
  const admitted = r.bm25Passes;
  const correct = admitted === (r.kind === 'answerable');
  const verdict = (admitted ? 'ANSWER' : 'refuse').padEnd(9);
  console.log(
    `${r.kind.padEnd(11)} ${f(r.topScore)}       ${(r.bm25Passes ? 'pass' : '----').padEnd(12)} ${verdict} ${correct ? 'ok  ' : 'MISS '} ${r.topId}`,
  );
}

const admittedCorrect = rows.filter((r) => r.bm25Passes === (r.kind === 'answerable')).length;
const falseAnswers = rows.filter((r) => r.kind === 'refuse' && r.bm25Passes).length;
const falseRefusals = rows.filter((r) => r.kind === 'answerable' && !r.bm25Passes).length;

console.log(`\n${rows.length} queries: ${admittedCorrect} correct, ${falseAnswers} false answers, ${falseRefusals} false refusals.`);

// Where does the vector arm start admitting questions it should not?
const refusals = rows.filter((r) => r.kind === 'refuse').map((r) => r.topScore);
const answerables = rows.filter((r) => r.kind === 'answerable').map((r) => r.topScore);
const worstAnswerable = Math.min(...answerables);
const bestRefusal = Math.max(...refusals);

console.log('\n--- separation ---');
console.log(`lowest  answerable score : ${worstAnswerable.toFixed(3)}`);
console.log(`highest refusal score   : ${bestRefusal.toFixed(3)}`);

if (bestRefusal < worstAnswerable) {
  console.log(`\nSEPARABLE. Any threshold in (${bestRefusal.toFixed(3)}, ${worstAnswerable.toFixed(3)}] is clean.`);
  console.log(`Suggested MIN_VECTOR_SCORE: ${((bestRefusal + worstAnswerable) / 2).toFixed(3)}`);
} else {
  console.log('\nNOT SEPARABLE. The vector arm cannot gate answerability, so it must not');
  console.log('be used as a relevance gate. BM25 term coverage is the admission test,');
  console.log('and the vector arm only reorders chunks once admission has passed.');
}

// What the vector arm buys, and what it costs.
//
// It ranks well -- it is the only thing that reaches a pure paraphrase. But
// because its score range overlaps the refusal range, it cannot be an admission
// path. So its value is bounded to reordering chunks that BM25 already admitted,
// and its cost is that a paraphrase BM25 cannot reach gets refused.
console.log('\n--- what the vector arm buys ---');
const reachableOnlyByVector = rows.filter((r) => r.kind === 'answerable' && !r.bm25Passes && r.topScore >= CURRENT);
const refusedButVectorFound = rows.filter((r) => r.kind === 'answerable' && !r.bm25Passes);
console.log(`  answerable queries BM25 cannot reach : ${refusedButVectorFound.length}`);
for (const r of refusedButVectorFound) {
  console.log(`    ${JSON.stringify(r.q)} -> ${r.topId} ${r.topScore.toFixed(3)}`);
}
console.log(`  ...of which clear a ${CURRENT} vector bar: ${reachableOnlyByVector.length}`);
console.log('  All of these are refused by the shipped architecture, because the vector');
console.log('  arm is not allowed to admit. That is the deliberate cost:');
console.log('  a false refusal the recruiter can retry, rather than a false answer.');

console.log('\n--- refusals that leaked under a 0.45 vector gate ---');
for (const r of rows.filter((x) => x.kind === 'refuse' && x.topScore >= CURRENT)) {
  console.log(`  ${r.topScore.toFixed(3)}  ${JSON.stringify(r.q)} -> ${r.topId}`);
}
console.log('  Every one of these would have been answered from an unrelated chunk.');

