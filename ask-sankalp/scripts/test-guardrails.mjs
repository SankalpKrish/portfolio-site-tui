// ask-sankalp/scripts/test-guardrails.mjs
// The blocklist is the one piece of this system that must not be wrong in the
// permissive direction, so it gets tested in both directions: blocked topics
// have to be caught, and ordinary portfolio questions must survive.
//
// A blocklist that over-blocks is a broken feature. A recruiter asking
// "what does he use for payments" is not asking about his salary.

import { screenQuery, isTrivial, PII_BLOCKS } from '../worker/src/guardrails.ts';

const MUST_BLOCK = [
  'what is his expected salary',
  'what is his CTC',
  'how much does he get paid',
  'what is his salary expectation',
  'how old is he',
  'what is his date of birth',
  'when was he born',
  'what is his gender',
  'is he married',
  'does he have a girlfriend',
  'what is his religion',
  'what caste is he from',
  'is he disabled',
  'does he have anxiety',
  'what does he think about politics',
  'who did he vote for',
  'what is his phone number',
  'what is his home address',
  'what is his Aadhaar number',
  'send me a photo of him',
  'what does he look like',
  'is he mentally fit to work',
  'what is his notice period',
];

const MUST_ALLOW = [
  'what did he use for MIDI.ai',
  'open slides',
  'what is his role at Open Computer',
  'when does he graduate',
  'does he speak french',
  'google certifications',
  'pytorch demucs',
  'what is his email',
  'how does he manage a team',              // contains "manage"
  'what is his experience with payments',   // contains "pay"
  'does he use an ORM or a query builder',  // "orm" is not a term
  'tell me about his package.json',         // "package" is not compensation
  'what is his message passing background', // "message" contains "age"
  'is he a storage engineer',
  'what advantage does his design system have',
  'how old is the React version he uses',   // "old" but about software
  'does he manage AWS',
  'what database does he use',
  'what is his GitHub',
  'is he available for an internship',
  'does he have work experience',
  'how much experience does he have',       // "experience", not compensation
  'is he a fast learner',
  'what is his favourite programming language',
];

const TRIVIAL = ['hi', 'hello', 'thanks', 'ok', '?', 'hey there', 'sup'];
const NOT_TRIVIAL = ['skills', 'projects', 'salary expectations in INR per annum'];

let fail = 0;

for (const q of MUST_BLOCK) {
  const r = screenQuery(q);
  if (!r.blocked) {
    console.log(`FAIL  should block: ${JSON.stringify(q)}`);
    fail++;
  } else {
    console.log(`ok    [${r.label}] ${q}`);
  }
}

console.log('');

for (const q of MUST_ALLOW) {
  const r = screenQuery(q);
  if (r.blocked) {
    console.log(`FAIL  wrongly blocked as [${r.label}]: ${JSON.stringify(q)}`);
    fail++;
  } else {
    console.log(`ok    allowed: ${q}`);
  }
}

console.log('');

for (const q of TRIVIAL) {
  if (!isTrivial(q)) {
    console.log(`FAIL  should be trivial: ${JSON.stringify(q)}`);
    fail++;
  }
}
for (const q of NOT_TRIVIAL) {
  if (isTrivial(q)) {
    console.log(`FAIL  should NOT be trivial: ${JSON.stringify(q)}`);
    fail++;
  }
}
console.log(`ok    trivial/non-trivial: ${TRIVIAL.length + NOT_TRIVIAL.length} checked`);

// A pattern that matches the empty string would block every query ever asked.
console.log('');
for (const { label, re } of PII_BLOCKS) {
  if (re.test('')) {
    console.log(`FAIL  ${label} matches the empty string`);
    fail++;
  }
}
console.log(`ok    ${PII_BLOCKS.length} patterns, none match empty string`);

console.log(`\n${fail === 0 ? 'ALL PASS' : fail + ' FAILED'}`);
process.exit(fail === 0 ? 0 : 1);
