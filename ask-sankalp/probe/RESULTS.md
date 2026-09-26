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

## What was not built

Nothing beyond the probe. No corpus, no ingest, no Worker, no site changes, per the Phase 0 gate.

## Cleanup owed by the operator

```sh
npx wrangler vectorize delete ask-probe --force
cd ratelimit/worker && npx wrangler delete
```
