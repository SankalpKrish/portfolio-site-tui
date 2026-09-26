# Phase 0 results — measured 2026-09-26

Gate cleared. Four questions, four answers. Two of them retire risks from the plan; one is a
finding the plan did not anticipate.

## 1. Is Vectorize available on the Workers Free plan? — YES

`wrangler vectorize create ask-probe --dimensions 1024 --metric cosine` succeeded on a Free-plan
account.

The Workers pricing page states "Vectorize is currently only available on the Workers paid plan".
That line is **stale**. It sits directly above a table listing Free-plan limits, which would be
incoherent if the product were unavailable there. Decision 12 (Workers Free, hard-zero budget)
**holds**. No $5/month minimum.

## 2. Embedding output width — 1024

`@cf/qwen/qwen3-embedding-0.6b` returned exactly 1024 dimensions for all 20 probe vectors,
matching Cloudflare's own changelog table. The Vectorize index is created at the correct width
and, since Vectorize dimensions are immutable, this is the one chance to get it right.

## 3. Vectorize billing basis — NOT measured, deliberately

The index Metrics page exposes Queries, Query Latency and Stored Vectors. It has **no
queried-dimensions counter**, so the plan's Step 3 was measuring a number that is not on that
page. The dimension figure lives at account level under Billing, behind a slower reporting loop.

**Decision: design to the pessimistic reading rather than measure further.** A query bills against
the whole index, which at 120 chunks x 1024 dims gives ~122,880 queried dimensions per query and
therefore **~244 uncached queries/month** against the 30M free allocation. The optimistic
readings (1,464 or 29,000/month) are not relied upon.

244/month is comfortable for a portfolio site once caching is load-bearing, which Decision 19
already makes it. Designing down is free; a surprise bill on a hard-zero budget is not.

Revisit in November by reading Billing -> Usage. If reality is materially better, the corpus can
grow.

## 4. Rate Limiting binding on Free — WORKS, and is not a hard gate

Deployed a Worker with a `ratelimits` binding (limit 3, period 60) and called it 8 times.
`success` was `true` for the first 7 and `false` for the 8th.

So the binding is available on Free — never stated in the docs, now confirmed. But it permitted
roughly **2.3x the configured limit** before refusing, which is the documented eventually-consistent
behaviour: each isolate checks a locally cached counter that the backing store updates
asynchronously.

Three consequences for the design, all contrary to the plan's Decision 20:

- It runs **inside** the Worker, not before it, and consumes CPU.
- It is **per-datacenter** and eventually consistent, so it is not a global limit.
- It is therefore a **speed bump against casual abuse, not budget protection.** A scraper can
  overshoot the nominal figure several-fold. Cache hits and cache-only degradation remain the
  actual budget control, which is what the plan's Decision 21 already provides for.

It is also invisible in the dashboard, so 429s must be observed through Workers Logs.

## 5. Vector arm cannot gate answerability — measured, not guessed

Run after the index was populated with all 25 chunks. `npm run calibrate`, 26 queries.

The plan assumed the vector arm would need a cosine floor to avoid answering questions the corpus
does not cover. The first guess was 0.45. It is wrong, and the data says so plainly:

```
lowest  answerable top-score : 0.379
highest refusal   top-score : 0.548
```

**The ranges overlap, so no threshold separates them.** At 0.45 the vector arm admitted 5 of 8
unanswerable questions, each of which would then have been answered from an unrelated chunk:

```
0.548  "has he worked with vector databases"      -> skills-data-cloud
0.526  "what is his experience with graphql"       -> skills-data-cloud
0.496  "tell me about his kubernetes experience"   -> skills-data-cloud
0.488  "is he a terraform expert"                  -> skills-data-cloud
0.452  "what is his phone number"                 -> contact
```

"Is he a terraform expert" scoring 0.488 against the programming-skills chunk is the clearest
example of the failure: semantically close enough to look like a match, factually worthless.

**Shipped architecture instead:** BM25 term coverage is the *sole* admission test, and the vector
arm only reorders chunks after admission has passed. This is strictly safer, and also cheaper,
because a refused question now costs no Vectorize query at all — the most expensive operation
here at ~122,880 dimensions.

Result over the 26 queries: **24 correct, 0 false answers, 2 false refusals.**

The 2 false refusals are pure paraphrases BM25 cannot reach, both of which the vector arm *did*
find correctly:

- "how does he decide which model to use for a request" -> `project-open-slides-stack` (0.475)
- "what is he trying to do professionally" -> `availability` (0.417)

That is the deliberate trade. A recruiter who is refused can rephrase; a recruiter who is
confidently told Sankalp has Terraform experience cannot. The paraphrase failure is the softer of
the two, and it shrinks as the corpus grows.

Note the vector arm still earns its cost: it is the only thing that ranks these chunks sensibly
once admitted, and it is what surfaces `project-open-slides-stack` first for model-routing
questions. Dropping it would save ~122,880 dimensions per admitted query, and is the first thing
to revisit if the November billing figure is worse than expected.

## 6. Chat model — measured on NVIDIA's free tier, live end to end

Deployed at `https://ask-sankalp.sankalp-96e.workers.dev` against
`integrate.api.nvidia.com/v1`. 56 KiB bundle, 1 ms startup.

The free tier is ~40 requests/minute and NVIDIA staff state increases are not
granted. The rate limit binding is 20 per 60s, deliberately about half that
ceiling, so our own limiter throttles before NVIDIA's does. Monthly budget is
~244 queries, so throughput was never the constraint.

### Model selection was measured, not chosen by reputation

```
model                            ttft     total    chars  rate
z-ai/glm-5.3-flash               29948ms  45147ms    483   11/s   <- in use
nvidia/nemotron-3.5-lightning-30b 11876ms  21431ms   1868   87/s
moonshotai/kimi-k3               timeout >120s
```

`nemotron-3.5-lightning` is 2.5x faster to first token and generated 3.9x more
text, and it was the obvious pick on the numbers. **It is unusable here**: it
streams its reasoning trace verbatim into the terminal —

> Here's a thinking process: 1. **Analyze User Input:** … 3. **Scan Sources
> for Stem Separation Info:** …

`chat_template_kwargs: {enable_thinking: false}` does suppress it, but that
variant measured **70421ms** — slower than glm — and dropped the citation
entirely. `reasoning: false` is silently ignored; a bare `enable_thinking` is
rejected with a 400.

`glm-5.3-flash` is slower to first token but its answers were read directly and
cite correctly every time. The Worker sends `chat_template_kwargs` regardless,
so a future swap to a reasoning model will not start leaking scratchpads.

### Free-tier generation latency is the main UX weakness

A covered answer takes ~58s server-side, of which ~37s is time to first token.
Streaming means the terminal fills progressively over ~21s rather than sitting
blank, and `npm run ask` confirms it. The "Thinking" state and the answer cache
are what make that tolerable; neither was optional.

### Verified live

| Case                        | Result                                                    |
| --------------------------- | --------------------------------------------------------- |
| covered question            | grounded, first person, cites `[project-midi-ai-pipeline project-midi-ai]` |
| uncoverable ("terraform")   | `no-coverage` refusal, ~5ms, no model call                  |
| PII ("salary")              | `blocked` refusal, ~5ms, no model call                     |
| trivial ("hi")              | `trivial` prompt, ~4ms                                     |

## What was not built

Phase 5, the eval harness. Jev is entirely unintegrated — see the plan. The
deterministic half of it is unblocked and can be built now; the Jev half needs a
TypeSafe AI key on top of what already works.



## Cleanup owed by the operator

```sh
npx wrangler vectorize delete ask-probe --force
cd ratelimit/worker && npx wrangler delete
```
