# Ask Sankalp Implementation Plan

**Date:** 2026-09-26
**Status:** Draft — awaiting execution
**Target repo:** `SankalpKrish/portfolio-site-tui` (work on a feature branch, NOT `master`)
**Deployment:** new Cloudflare Worker, separate from the existing Pages project

> **For agentic workers:** this plan is self-contained. It records every decision, every
> constraint discovered during research, and every risk found in the existing codebase.
> Do not re-derive them. Where this plan says "verify", you must actually run the command
> and read the output before proceeding.

> **Addendum 2026-09-27 — this document is a pre-execution snapshot.** It was written before
> any of it ran, and Phases 0–4 and 6 shipped. Read [probe/RESULTS.md](probe/RESULTS.md) for what
> was actually measured. Three points where the build deliberately diverged from the text below:
>
> - **Decisions 4 and 5 are superseded.** Gemini Flash via AI Gateway was never used. The chat
>   provider was made swappable and the shipped choice is NVIDIA's free tier running
>   `z-ai/glm-5.3-flash`, selected by measurement. See RESULTS.md §6.
> - **Decision 13 is superseded.** The corpus is 25 chunks, not ~120, because Phase 0 showed the
>   vector arm cannot gate answerability, so admission is BM25-only and a refused question costs
>   no Vectorize query. That also makes a larger corpus cheaper than this plan assumed, so growing
>   back toward 120 is now viable rather than budget-blocked.
> - **Decision 20 is contradicted by measurement.** The rate limit binding runs inside the Worker
>   and overshoots ~2.3x, so it is a speed bump, not budget protection. The cache is the budget.
>
> Phase 5 (eval) was not built, and neither was `verify-index` from Phase 2 Step 4 — `RESULTS.md`
> records the eval gap but not the missing `verify-index` script. The two npm scripts this plan's
> Verification section relies on, `verify-index` and `eval`, do not exist in `package.json`.

---

## Problem

`sankalpkrish.com` is a static Astro site whose entire content is a fake terminal UI. It has
`/about`, `/projects`, `/skills`, `/contact`. A recruiter has to already know what to type to
get anything out of it, and the site cannot answer a question like *"has he worked with
vector databases?"* or *"what did he use for MIDI.ai?"* — only *look up* a fixed page.

This plan adds a `/ask` command backed by a retrieval-augmented chatbot, so a recruiter can ask
a natural-language question and get a grounded, cited answer drawn from a curated corpus of
portfolio facts.

## Goal

Ship a `/ask` terminal command that answers recruiter questions from a ~120-chunk curated
corpus, with every claim tied to a source, honest refusals when the corpus does not cover the
question, and a hard block on personal topics.

## Non-Goals

Explicitly out of scope. Do not build these.

- Refactoring the existing commands to read from a shared content layer
- Multi-turn persistence across page loads
- Voice, avatars, or realtime speech
- Hindi or Kannada support
- A job-application agent, cover-letter generator, or CV tailor
- Agentic retrieval, query decomposition, or a cross-encoder reranker
- Any change to the visual design, typography, colour, or layout of the terminal
- Making the corpus a shared source of truth with the site

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  portfolio-site-tui  (Cloudflare Pages, static, auto-deploy) │
│                                                              │
│  src/terminal/commands/ask.ts   →  fetch(ASK_API_URL)         │
│  TerminalEngine.ts              →  widened async dispatch     │
└────────────────────────────┬─────────────────────────────────┘
                             │  HTTPS, streaming
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  Worker "ask-sankalp"  (Cloudflare Workers, FREE plan)       │
│                                                              │
│  rate limit binding ──► cache lookup (KV / Cache API)        │
│        │                                                      │
│        ▼                                                      │
│  hybrid retrieval:  BM25 (bundled inverted index)            │
│                   + Vectorize query (qwen3-embedding-0.6b)  │
│        │                    RRF merge → top 5                │
│        ▼                                                      │
│  guardrails (PII blocklist, refusal detection)               │
│        │                                                      │
│        ▼                                                      │
│  Gemini Flash via AI Gateway (server-side key, BYOK)        │
│        │                                                      │
│        ▼                                                      │
│  streamed answer + citations                                  │
└──────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
┌──────────────────────┐              ┌────────────────────────┐
│  Vectorize index     │              │  content/*.md  (~120)   │
│  1024 dims, cosine   │              │  hand-written, reviewed │
└──────────────────────┘              └───────────┬────────────┘
    ▲                                             │
    └──────────── ingest (Node script, local) ─────┘
                        NOT a Worker
```

Memory is in-request only. No session store, no conversation table, no D1 in the hot path.

---

## Decisions

Every choice below was made deliberately. Do not silently substitute an alternative.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Command is `/ask` | Matches the existing slash style (`/about`, `/projects`). Recruiter-facing verb. |
| 2 | Command calls a separate Worker | Site is `output: 'static'` with no adapter. A Pages Function or separate Worker is the only option that does not change the Astro build. |
| 3 | Site change is the `/ask` command only | Smallest possible diff to a live production site. |
| 4 | Chat model: Gemini Flash, free tier | One key, no card, verified reachable from Bengaluru. |
| 5 | Called through **AI Gateway** with BYOK | Gives response caching and request logging for free, which directly serves the caching requirement. |
| 6 | Embeddings: `@cf/qwen/qwen3-embedding-0.6b` via Workers AI | 1024 dims, 8192 input tokens, $0.0118/M. Only Workers AI embedding model with a long enough context. |
| 7 | Vectorize, `cosine` metric | GA, predictable pricing, you own the pipeline. |
| 8 | **Hand-rolled BM25**, ~150 lines | Vectorize has NO keyword search. The alternative (AI Search) is open beta, unpriced, re-chunks your content, and locks the embedding model at creation. |
| 9 | BM25 behind a `Retriever` interface | So BM25/Vectorize can be swapped or A/B tested without touching callers. |
| 10 | Fusion: Reciprocal Rank Fusion, k=60 | Standard, no score-scale normalisation needed. |
| 11 | RRF `k` pinned to 60, top 20 per arm, merge to top 5 | Explicit constants. Do not leave these implicit. |
| 12 | Workers **Free** plan | ~$0. Budget is hard-zero. |
| 13 | Corpus ~120 chunks | Free tier allows ~244 uncached queries/month at 120 chunks × 1024 dims. |
| 14 | Corpus is **hand-written** markdown | Retrieval quality depends on curation, not on parser output. |
| 15 | Raw sources NOT committed | Resume, LinkedIn export, diplomas are PII. Only curated `content/*.md` is committed. |
| 16 | Ingest runs from a **Node script**, not a Worker | Workers Free is 10 ms CPU. Parsing embedding arrays inside a Worker is exactly the documented 10–20 ms cost. |
| 17 | Ingest writes via HTTP API, account token | 5000-vector batches vs 1000 via the binding. |
| 18 | First: **measure** Vectorize billing | Cloudflare's own docs contradict themselves. See Risks. |
| 19 | Cache answers aggressively | With ~244 queries/month, the cache is load-bearing infrastructure, not an optimisation. |
| 20 | Rate limit via Workers Rate Limiting binding | Per-IP, edge-level, before the Worker runs. Abusive requests cost nothing. |
| 21 | On budget exhaustion: **degrade to cache-only** | Never error, never surprise-bill. Show a small note pointing to email. |
| 22 | Persona: **first person**, with a visible AI badge | Warmer and more distinctive, but the badge is mandatory. Without it this is deceptive. |
| 23 | Grounded + PII firewall | Every claim cites a chunk. Hard block: salary, age, gender, religion, health, politics. |
| 24 | Streaming responses | Makes it feel responsive rather than like a search box. |
| 25 | Memory: in-request only | Recruiters almost never continue past one question. Zero storage, zero privacy surface. |
| 26 | Telemetry: log questions, not answers | Learn what recruiters ask. No prompt or answer text leaves the Worker. |
| 27 | Eval: golden question set + scorer, **Jev as judge** | TypeSafe AI's Jev is a decision model returning boolean/score + confidence — exactly a groundedness judge's shape. |
| 28 | English only | `qwen3-embedding-0.6b` is English-optimised, corpus is English. Adding a language forces a full re-embed. |
| 29 | Ingest is manual + CI drift check | Vectorize writes take a median of <30 s to become queryable, so CI cannot reindex-and-verify synchronously. CI validates a **content-hash manifest locally**; a separate manual `verify-index` checks the live index. |
| 30 | Work on a feature branch, never `master` | The site auto-deploys to production on push to `master`. |

---

## Critical Findings

These were discovered by reading the actual code and the current vendor docs. They change the
implementation and are easy to get wrong.

### The terminal's command interface is synchronous

`src/terminal/commands.ts:11-14` defines the entire contract:

```ts
export interface CommandResult {
  html: string;
}
export type CommandHandler = (args: string[]) => CommandResult;
```

`src/terminal/TerminalEngine.ts:232` dispatches **without `await`**:

```ts
const result: CommandResult = handler ? handler(args) : unknownCommandResult(cmd);
```

`/ask` must make a network call, so it **cannot** conform to this type as written.

**Required change:** widen to `CommandResult | Promise<CommandResult>` and `await` at the
dispatch site. This is the single mandatory architectural change to the terminal. Prefer this
over having `/ask` inject its own DOM, which would bypass the typewriter and break house style.

### A new command must be registered in FOUR places

None of these derive from each other. Missing any one leaves a silently broken command.

| # | Location | What to add |
|---|----------|-------------|
| 1 | `src/terminal/commands.ts` — `COMMANDS` record | `'/ask': ask` |
| 2 | `src/terminal/TerminalEngine.ts:23-31` — `commandsList` | `{ name: '/ask', desc: '...' }` |
| 3 | `src/terminal/commands/help.ts` — the help table | an `/ask` row |
| 4 | `src/terminal/commands/splash.ts:14-20` — the splash table | an `/ask` row |

Location 2 is a hardcoded array that does **not** derive from `COMMANDS`. Note `/clear` is
currently missing from it — a pre-existing bug. Do not copy it.

`/help` also has a pre-existing inaccuracy: it says "Found 6 commands" while listing 8. Update
the count when adding `/ask`.

### Output is raw HTML injected via innerHTML

`src/terminal/typewriter.ts:1-2` states the contract: the `html` string is "trusted,
pre-escaped HTML authored in commands.ts".

**A Worker response is untrusted input.** Escape it. Additionally, the existing `escHtml`
does **not** escape the single-quote character (known issue C7 in
`.planning/codebase/CONCERNS.md`). Since the answer is embedded in HTML, either harden
`escHtml` or use a strict allowlist. Do not pass LLM output through unescaped.

### Args are pre-split on spaces

`TerminalEngine.ts` does `raw.split(' ')`, so `/ask what is rust` yields
`args = ['what','is','rust']`. The query must be re-joined with `args.join(' ')`.

Autocomplete for argument-taking commands already has a special-case branch at
`TerminalEngine.ts:57-81`, written for `/open`. `/ask` needs the same treatment.

### Existing content is hard-coded HTML in command files

There is no `src/content/` and no data directory. All portfolio facts live as HTML string
literals across eight command files plus JSON-LD in `Base.astro:40-53`. Useful specifics:

- `about.ts` — education history, hobbies
- `projects.ts` — three projects: MIDI.ai, OpenComputer, The Procrastination Engine
- `skills.ts` — 31 skill rows across 8 domains, plus 2 certifications (completed June 2026)
- `contact.ts` — `sankalpkrish@outlook.com`, LinkedIn, GitHub
- `Base.astro` JSON-LD — full legal name **Sankalp Krishnamurthy**
- `splash.ts:10` — short name **Sankalp Krish**

`skills.ts` claims "Found 36 skills" but shows 31 rows. Do not propagate that number into the
corpus without checking.

### Conventions that must be followed

From `DESIGN.md` and `.planning/codebase/CONVENTIONS.md`:

- **All non-ASCII glyphs as HTML entities** — `&#x25CF;`, `&mdash;`, `&rarr;`, `&hellip;`
- **No hardcoded hex** outside `src/styles/tokens.css`; colours are `var(--token)`
- One command per file, named export, `import type { CommandHandler } from '../commands'`
- File header comment matching its path: `// src/terminal/commands/ask.ts`
- Sentinels are `__UPPER_SNAKE__` in the `html` field
- CSS prefix `cc-*`; reuse `cc-tool-use` as the list-row primitive
- `rel="noopener"` on every `target="_blank"`
- No barrel files, no path aliases, relative `../` imports only
- Comments explain **why**, not what. No `TODO`/`FIXME` in `src/`. No `console.*`
- Voice: "direct, technically grounded, occasionally dry"

### Other repo facts

- **No tests, no lint, no CI.** No `.github/` directory. The only automated gate is
  `npx astro check`, which is not even wired to an npm script.
- `astro.config.mjs` is `output: 'static'`, `compressHTML: true`, no adapter.
- `wrangler.toml` is 3 lines: `pages_build_output_dir = "dist"`, `compatibility_date = "2024-09-23"`.
- **The site previously had a serverless backend and deliberately removed it** —
  commit `2937342` removed `/mail`, `MailComposer`, the Resend API and related UI. Read that
  commit before re-introducing a backend; understand why it was backed out.
- **`DESIGN.md` and `PRODUCT.md` are untracked.** They are not in git. A branch cut from a
  fresh clone will not have them.
- `origin/dev` exists and is 20 commits behind `master`. There are four stale
  `worktree-agent-*` branches. Neither matters; do not delete them as part of this work.
- Commit style: Conventional Commits, lowercase (`feat:`, `fix:`, `fix(a11y):`, `content(about):`).

---

## Platform Constraints (Workers Free, verified Sept 2026)

These are hard limits. The design must fit inside them.

| Resource | Free limit | Consequence here |
|----------|-----------|------------------|
| CPU per request | **10 ms**, cannot be raised | No embedding arrays parsed in the Worker. No large JSON. |
| Vectorize queried dims | 30 M/month | ~244 queries/month at 120 chunks × 1024 dims |
| Vectorize stored dims | 5 M | 120 × 1024 = 123 K. Non-issue. |
| Workers AI | 10,000 Neurons/day, **hard error** on exhaustion | Must catch and degrade, never throw |
| Subrequests | 50 external / 1,000 internal | Bindings are internal. Fine. |
| KV writes | **1,000/day** | Do NOT store chunk text in KV. Use a bundled index. |
| KV `cacheTtl` | 30 s minimum | Cannot cache answers for less than 30 s |
| D1 queries/invocation | 50 | Sufficient, but D1 is not in the hot path anyway |
| Memory | 128 MB | Never load the whole corpus per request |
| Requests | 100,000/day | Route must **fail closed**; default fail-open silently bypasses the Worker |
| Logs | 200 K events/day, 3-day retention | Thin. Do not rely on logs for eval. |
| Rate Limiting binding | available, `simple.period` must be `10` or `60` | Requires Wrangler ≥ 4.36.0 |

**CPU guidance:** Cloudflare documents that "parse large payloads typically use 10-20 ms" —
i.e. at or above the entire Free budget. So payload volume is the thing to avoid, not
arithmetic. BM25 over 120 chunks is microseconds. Using bindings rather than `fetch()` against
the REST APIs is what keeps this affordable; `env.AI.run()` returns a deserialised object, so
there is no `JSON.parse` on the hot path.

**Local dev caveat:** `wrangler dev` does **not** simulate the AI or Vectorize bindings, and
does **not** enforce CPU limits. Use `wrangler dev --remote` or per-binding remote connections
to exercise the real thing. The Rate Limiting binding simulates locally but cannot be remotely
connected, so local 429 behaviour is not the real counter behaviour.

---

## Risks

| Risk | Severity | Response |
|------|----------|----------|
| **Vectorize billing basis is undocumented and self-contradictory.** One example implies a query bills for the whole index; two others imply one vector-width per query. At 120 chunks the difference is ~244 queries/month versus effectively zero. | **Critical** | Phase 0 measures it. Do not proceed past Phase 0 without a number. |
| Free tier exhausted by a launch spike or a bot | High | Cache-first architecture, degrade to cache-only, rate limit at the edge, monitor the dashboard. |
| 10 ms CPU overrun → Error 1102 | High | Bindings not `fetch()`. `topK` 10–20, not 50. Fetch chunk text for ~5 candidates only. Profile with `wrangler dev --remote` + DevTools Profiler (press `D`). |
| Corpus quality is the ceiling | High | 120 hand-written chunks. Retrieval cannot rescue a thin corpus. |
| `/ask` undiscoverable | Medium | Add a visible affordance on the landing screen and an `/ask` row in `/help` and splash. |
| Embedding model output width ≠ 1024 | Medium | Verify the actual vector length before creating the Vectorize index. Dimensions and metric are **immutable** after creation. |
| Pooling-mode mismatch corrupts the index | Medium | Pin the exact model ID and any pooling parameter. Mixing `cls` and `mean` vectors silently produces garbage. |
| GitHub rate limit (60/hr unauthenticated) during ingest | Low | Batch commits, or use a token. |
| `origin/dev` 20 commits behind | Low | Work from `master`, do not merge `dev`. |

---

## Phases

### Phase 0 — Measure the free tier (BLOCKING GATE)

**Do not proceed until this produces numbers.** Every later decision depends on it.

- [ ] **Step 1:** Create the Vectorize index at 1024 dims, `cosine`.
- [ ] **Step 2:** Embed 20 dummy vectors and upsert them.
- [ ] **Step 3:** Run exactly 5 queries. Record the queried-dimensions counter from the
      Cloudflare dashboard before and after.
- [ ] **Step 4:** Compute the real per-query cost and the real monthly query budget.
- [ ] **Step 5:** Deploy a trivial Worker on the Free plan with a `ratelimits` binding and
      call `limit()` once. Confirms the binding works without Paid — the docs never state
      this outright, it is inferred from the absence of gating.
- [ ] **Step 6:** Write the measured numbers into this plan's Risks table and size the corpus
      to match. **If the pessimistic reading is correct, the corpus must shrink to ~30 chunks
      or the design changes.**

**Expected:** a table of real numbers replacing the estimated ones.

---

### Phase 1 — Corpus

- [ ] **Step 1:** Create `ask-sankalp/content/` with ~120 markdown files, one topic each.
- [ ] **Step 2:** Suggested distribution: ~35 skills, ~10 projects, ~10 education/certifications,
      ~10 bio/hobbies, ~10 role-relevant ("why hire", "what he's looking for"), plus
      contact and availability.
- [ ] **Step 3:** Front-matter each chunk with `id`, `title`, `topic`, and `source` (where the
      fact came from on disk).
- [ ] **Step 4:** Write a `content/manifest.json` of `{ id → sha256 }` for drift detection.
- [ ] **Step 5:** Write `content/SOURCES.md` recording which local files each fact derives
      from — for your own provenance. **Do not commit raw PDFs, `.tex`, or the LinkedIn export.**

Extract from: `about.ts`, `projects.ts`, `skills.ts`, `contact.ts`, `Base.astro` JSON-LD,
`ai-job-search/cv/main_example.tex`, your GitHub profile README, the newest resume in
`Downloads/Recents`, `Documents/GitHub/*/README.md` for project depth, and the certifications
folder.

**Note:** ~31 visible skill rows exist but `/skills` claims 36. Reconcile before writing.

---

### Phase 2 — Ingest

- [ ] **Step 1:** Node script: read `content/*.md` → chunk → embed via Workers AI HTTP API
      (`POST /accounts/{id}/ai/run/@cf/qwen/qwen3-embedding-0.6b`, `Authorization: Bearer`).
- [ ] **Step 2:** Batch embeddings. Batch upserts to Vectorize (5000 max via HTTP API, not 1000).
- [ ] **Step 3:** Build the BM25 inverted index at ingest time and emit it as a compact JSON
      artifact bundled into the Worker. **Not KV** — 1000 writes/day and a 30 s minimum
      `cacheTtl` make it the wrong store.
- [ ] **Step 4:** `verify-index` command: compares live Vectorize contents against
      `manifest.json` and reports drift.
- [ ] **Step 5:** A CI check that re-hashes `content/*.md` and fails on manifest mismatch.
      Purely local — no Vectorize round-trip, because writes are not immediately queryable.

**Expected:** `npm run ingest` populates the index; `npm run verify-index` reports clean.

---

### Phase 3 — Retrieval

- [ ] **Step 1:** `Retriever` interface — `retrieve(query, k) → ScoredChunk[]`.
- [ ] **Step 2:** `VectorizeRetriever` — embed the query, `query()` with `topK: 20`,
      `returnMetadata`.
- [ ] **Step 3:** `Bm25Retriever` — k1=1.5, b=0.75, porter stemming, over the bundled index.
- [ ] **Step 4:** `RrfFusion` — k=60, merge both arms, return top 5.
- [ ] **Step 5:** Sanity-check with curl. `/ask what did he use for MIDI.ai` must surface the
      MIDI.ai chunk. Exact-name queries are the case where BM25 must beat pure vector.

---

### Phase 4 — Generation and guardrails

- [ ] **Step 1:** Worker endpoint `POST /ask`. CORS locked to `https://sankalpkrish.com`.
- [ ] **Step 2:** Gemini Flash via AI Gateway, BYOK under the `default` alias. Key server-side
      only — **never in the bundle, never in the corpus, never committed**.
- [ ] **Step 3:** System prompt: first person, **must state it is an AI twin**, must cite
      chunk IDs, must refuse beyond the corpus, must never discuss the PII blocklist topics.
- [ ] **Step 4:** Pre-filter the PII blocklist **before** calling the model. Do not rely on the
      prompt alone.
- [ ] **Step 5:** Cache layer, checked before retrieval.
- [ ] **Step 6:** Rate limit binding, checked first.
- [ ] **Step 7:** Catch Workers AI exhaustion. Serve cache-only, never throw.
- [ ] **Step 8:** Telemetry — log question, retrieved chunk IDs, refusal flag, latency. **Not**
      the answer text.

---

### Phase 5 — Eval

- [ ] **Step 1:** ~40 golden questions: 15 answerable, 10 partially answerable, 15 must-refuse.
- [ ] **Step 2:** Scorer calls **Jev** (`api.typesafe.ai/v1/systemone`) for groundedness as
      boolean + confidence, and citation correctness. Note Jev is **not** OpenAI-compatible and
      has no `/chat/completions` — use the `@typesafe-ai/sdk` or plain REST.
- [ ] **Step 3:** Deterministic assertions too: does every cited chunk ID exist, does a
      must-refuse question actually refuse.
- [ ] **Step 4:** `npm run eval` prints groundedness, citation accuracy, refusal accuracy.
      **Run it before and after every prompt change.**

---

### Phase 6 — Site integration

- [ ] **Step 1:** Branch from `master`: `git checkout -b feat/ask-command`.
- [ ] **Step 2:** Widen `CommandHandler` to allow a Promise; `await` in `TerminalEngine.run()`.
- [ ] **Step 3:** `src/terminal/commands/ask.ts` — fetch the Worker, stream into a
      `cc-output-block`. Escape all response HTML.
- [ ] **Step 4:** Register in all **four** locations.
- [ ] **Step 5:** Handle failure in the UI — offline, rate-limited, and exhausted states must
      all read as intentional, per `DESIGN.md`'s "graceful parity" principle.
- [ ] **Step 6:** Verify: `npx astro check` → `npx astro build` → manual browser check.

**Expected:** `/ask what did he build` returns a cited, streamed, first-person answer with a
visible AI badge.

---

## Verification

There is no test framework, no lint, and no CI in this repo. Adding one is a net-new
convention — out of scope. Verification is:

```bash
npx astro check      # type check — the only automated gate
npx astro build      # must complete clean
```

Plus, for the Worker:

```bash
npm run ingest
npm run verify-index
npm run eval         # must pass before shipping a prompt change
```

Plus manual: type `/ask` in `npm run dev` at `localhost:4321` and confirm the streamed answer,
citations, badge, and each failure state.

---

## Open Questions

Carry these forward; do not guess.

1. What are the measured Vectorize numbers from Phase 0?
2. Does the Rate Limiting binding actually work on the Free plan?
3. Why was the Resend backend removed in `2937342`? Read it before adding a new one.
4. Is `qwen3-embedding-0.6b`'s real output width exactly 1024?
5. Why does `/skills` claim 36 skills but show 31 — which is correct?
6. Should the repo go public later? If so, the corpus must be re-reviewed for anything that
   should not be public.

---

## Self-Review

**Spec coverage:** every Phase 0–6 task traces to a decision or a Critical Finding. No phase
depends on a decision that was not made.

**Placeholder scan:** no TBDs. The six Open Questions are genuine unknowns about the external
environment, not gaps in this plan.

**Type consistency:** `Retriever`, `ScoredChunk`, and the widened `CommandHandler` are the only
new types. `CommandResult` keeps its `{ html: string }` shape so all eight existing commands
compile unchanged.

**Edge cases noted:** empty query (`/ask` with no args → prompt, not a fetch); query with only
stopwords (BM25 returns nothing → vector-only fallback); a question matching a chunk that
refuses to answer (must return the refusal, not a low-confidence guess); cache hit for a
question whose answer has since changed (key includes the manifest hash).
