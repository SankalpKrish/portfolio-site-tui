// ask-sankalp/worker/src/guardrails.ts
// Pre-filter for questions the bot must never engage with, and the system prompt
// that keeps the answers honest.
//
// The blocklist runs before any model call. A prompt instruction not to discuss
// salary is a request; a regex is a gate. Asking a model to decline politely is
// asking it to be reliable about the one thing models are least reliable about.

export type Block = { label: string; re: RegExp };

// Every pattern is word-bounded. Unbounded /age/ matches "package", "advantage",
// "manage" and "message"; /pay/ matches "repayment" and "payload". That mistake
// would block most legitimate portfolio questions.
export const PII_BLOCKS: Block[] = [
  {
    label: 'compensation',
    re: /\b(salary|salaries|wage|wages|compensation|remuneration|stipend|ctc|pay ?check|paycheck|payroll|paid|get paid|gets paid|bonus|notice period|per annum|per month|lpa)\b/i,
  },
  {
    // "how old" is only age when a person is the subject. "how old is the React
    // version he uses" is a legitimate technical question, so the pronoun is
    // required rather than the phrase.
    label: 'age-or-dob',
    re: /(\bhow old (?:is|are|was|were) (?:he|she|they|you|him|her|it)\b)|(\b(age|aged|years old|date of birth|d\.?o\.?b\.?|birth ?date|born|birthday|old enough|turning \d+)\b)/i,
  },
  {
    label: 'gender-or-marital',
    re: /\b(gender|gender identity|male|female|man|woman|sex|sexual orientation|marital status|married|unmarried|single|divorced|husband|wife|boyfriend|girlfriend|engaged)\b/i,
  },
  {
    label: 'religion-or-caste',
    re: /\b(religion|religious|hindu|hinduism|muslim|islam|christian|sikh|sikhism|jain|buddhist|parsi|caste|brahmin|dalit)\b/i,
  },
  {
    label: 'health-or-disability',
    re: /\b(health|medical|medication|illness|disease|disabilit|disabled|impair|mental health|anxiety|depression|bipolar|therapy|diagnosis|fit to work|physically fit)\b/i,
  },
  {
    // "politic" needs a trailing \w* to reach "politics" and "political".
    // \bpolitic\b alone silently fails on the most obvious phrasing there is.
    label: 'politics',
    re: /(politic\w*)|(\b(voted|voting|vote|ballot|election|bjp|congress party|aap |communist party)\b)/i,
  },
  {
    label: 'personal-identifiers',
    re: /\b(phone number|mobile number|telephone|home address|permanent address|passport number|aadhaar|aadhar|pan card|bank account|account number|ifsc|ssn|social security)\b/i,
  },
  {
    label: 'photo-and-biometrics',
    re: /\b(send (me )?(a )?photo|his face|her face|what does he look like|picture of him|photo of him|appearance|banknote|signature|identity document)\b/i,
  },
];

export type ScreenResult = { blocked: true; label: string } | { blocked: false };

export function screenQuery(query: string): ScreenResult {
  for (const { label, re } of PII_BLOCKS) {
    if (re.test(query)) return { blocked: true, label };
  }
  return { blocked: false };
}

// Short answers and greetings have no content to retrieve and would burn a
// Vectorize query to produce nothing.
const TRIVIAL = /^(hi|hey|hello|yo|sup|thanks|thankyou|ty|ok|okay|cool|nice|bye|goodbye|test|there|and|you|all|good|morning|evening|afternoon|up|\?|\.)+$/i;

export function isTrivial(query: string): boolean {
  const q = query.trim();
  if (q.length < 3) return true;
  // Matched against the whitespace-stripped form so "hey there" and "hi there"
  // are caught by the same alternation as "hey" and "hi".
  return TRIVIAL.test(q.replace(/\s+/g, ''));
}

export function refusalText(reason: 'no-coverage' | 'blocked', label?: string): string {
  if (reason === 'blocked') {
    return "I'm not going to answer that one, and it's not a limitation of what I can see — it's a line I don't cross. I'm an AI stand-in for Sankalp, built to answer questions about his work, and personal details aren't part of that.\n\nIf it's relevant to a role, the /contact command has how to reach him directly.";
  }

  return "I don't have anything on that, and I'd rather say so than guess.\n\nI answer from a fixed set of notes about Sankalp's projects, skills and background — currently 25 topics. If you rephrase around something in there, or ask about MIDI.ai, Open Slides, Open Computer, his skills or when he graduates, I'll have something real to say.\n\n/contact has his email if you'd rather just ask him.";
}

export const SYSTEM_PROMPT = `You are the AI stand-in for Sankalp Krishnamurthy, answering questions from his portfolio site (sankalpkrish.com). You are not a chatbot in general and you are not talking about the portfolio as a project — you are speaking as Sankalp.

CRITICAL RULES, in priority order:

1. GROUNDING. You may only use the SOURCES below. They are the entire permitted
   knowledge base. If the answer is not in them, say you do not know. Never infer,
   speculate, or fill a gap with something plausible-sounding. A short honest
   "I don't cover that" is a correct and valued answer.

2. ATTRIBUTION. You are an AI, not Sankalp. If asked directly whether you are a
   bot, or whether you are Sankalp, say plainly that you are an AI version of him.
   Do not volunteer this disclaimer on every answer, but never deny being an AI.

3. NO INVENTED CREDENTIALS. Do not claim skills, projects, dates, employers or
   numbers that are not in the sources. Do not round, estimate, or extrapolate.
   If the sources say "average" do not say "expert".

4. DECLINE THESE TOPICS entirely, briefly and without lecturing: salary and
   compensation, age or date of birth, gender, marital or relationship status,
   religion or caste, health and disability, and political views. Also decline to
   provide phone numbers, home addresses, or identity documents. Treat a question
   that merely skirts these (for example asking about "notice period") the same way.

5. CITATIONS. End with a Sources line naming the chunk ids you actually used,
   in brackets, like [project-midi-ai-pipeline skills-ml]. Only cite ids present in
   the SOURCES. If you used none, write [none].

6. VOICE. Direct, technically grounded, occasionally dry. Short paragraphs. No
   bullet-point spam, no emoji, no restating the question, no "Great question!".
   Write like someone who builds things and is slightly tired of explaining them.
   First person singular for Sankalp's own work. Use an em dash — where it helps.

7. LENGTH. Two short paragraphs plus the Sources line. Recruiters read a dozen of
   these. Be useful in four lines rather than complete in four paragraphs.

8. NO PROCESS. Reply with the answer only. Never describe your reasoning, never
   write "Here's a thinking process", never enumerate the steps you took, never
   explain how you decided what to read. A reader of this terminal has no use for
   your scratchpad and no patience for it.

The sources are written in first person as Sankalp's own notes. Treat their voice
as his voice when you answer.

SOURCES:`;
