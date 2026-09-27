# Phase 0 probe — measure before building

Disposable. Delete this directory once the numbers are in. It exists only to answer
three questions that documentation cannot answer.

Run from `ask-sankalp/probe/` unless noted.

## Why this is needed

Three things are asserted by documentation but contradicted elsewhere, or not stated at all.
Each one changes the architecture, so each gets measured rather than assumed.

## Question 1 — is Vectorize available on the Workers Free plan?

This is the one that matters most, and it is not in the plan's risk table.

The two Cloudflare pricing pages contradict each other:

- **Workers pricing** (updated 2026-08-28) states, directly above the Vectorize table:
  > Vectorize is currently only available on the Workers paid plan.

  ...and then lists a Workers Free column with 30M queried / 5M stored dimensions.

- **Vectorize pricing** (updated 2026-04-21) states:
  > Vectorize is now Generally Available

  ...and lists the same Free-plan limits.

The line is present in Cloudflare's own docs source. One of the two pages is stale, and the
newer one is the one claiming paid-only. If that is accurate, Decision 12 (Workers Free) and
the entire hard-zero budget premise are both wrong: Workers Paid has a **$5/month minimum**.

```sh
npx wrangler vectorize create ask-probe --dimensions 1024 --metric cosine
```

- Succeeds → Free-plan Vectorize works. Note the index name for later steps.
- Fails with a plan/upgrade error → the architecture needs a different vector store, or a
  $5/month budget. **Stop here and report.**

Dimensions and metric are **immutable after creation**. If step 2 of the embed probe reports a
width other than 1024, delete the index (`npx wrangler vectorize delete ask-probe --force`)
and recreate it at the correct width.

## Question 2 — what does one query actually bill?

A query may bill for the whole index, only the returned top-K, or follow the aggregate
formula in the docs. The spread is three orders of magnitude, so it is measured.

```sh
set CLOUDFLARE_ACCOUNT_ID=...
set CLOUDFLARE_API_TOKEN=...
node embed.mjs
npx wrangler vectorize upsert ask-probe --file vectors.ndjson
```

`embed.mjs` embeds 20 synthetic vectors, asserts the width is exactly 1024, and writes
`vectors.ndjson`. It exits non-zero on any width mismatch — read the output before continuing.

Now open the Vectorize index in the Cloudflare dashboard and note the **queried dimensions**
counter. Then run exactly five queries:

```sh
npx wrangler vectorize query ask-probe --vector-id probe-0 --top-k 1
```

Repeat five times, then re-read the counter.

`--top-k 1` is deliberate. With 20 vectors and `top-k 1`, the candidate explanations produce
three clearly different numbers. Run it 5 times and compare the delta:

| Outcome | Queried-dim delta for 5 queries | What it means | Real budget at 120 chunks |
|---|---|---|---|
| **A** | ~5,120 | Only the returned vector bills | ~29,000 queries/month |
| **B** | ~25,600 | Docs' literal aggregate formula | ~29,000 queries/month |
| **C** | ~102,400 | Every query scans the whole index | **~244 queries/month** |

Outcome C is the pessimistic reading the plan assumes, and the only one where the corpus size
is load-bearing. If the delta lands anywhere near 102,400, the plan's 244/month stands and a
120-chunk corpus is correct. Outcomes A and B mean the corpus could grow well past 120.

The counter may lag by a minute. If the dashboard shows no movement, query again and wait.

## Question 3 — does the ratelimits binding work on Free?

The docs never say whether it is plan-gated. Deploy the probe Worker and call it four times
against a limit of 3.

```sh
cd ratelimit/worker
npx wrangler deploy
```

Then call the deployed URL four times. The first three should return `"success": true` and the
fourth `"success": false`.

```sh
curl https://ask-sankalp-ratelimit-probe.<subdomain>.workers.dev
```

Requires Wrangler >= 4.36.0. `npx wrangler --version` to confirm.

Two caveats that affect how the real design uses this, regardless of the outcome:

- **It runs inside the Worker, not before it.** The plan describes it as "before the Worker
  runs" — that is wrong. It costs CPU and is reached only when the code path hits it.
- **It is per-datacenter and eventually consistent.** Cloudflare states it is "permissive,
  eventually consistent, and intentionally designed to not be used as an accurate accounting
  system", and that bindings are "not currently visible in the Cloudflare dashboard". So it is
  a speed bump against casual abuse, not a budget guarantee. Caching and cache-only
  degradation remain the real budget protection.
- Cloudflare also explicitly advises **against** IP-based keys, since many users can share one
  behind NAT or a carrier. For an anonymous endpoint IP is the only identity available, so the
  real limit should be set generously enough that shared-IP users are not affected.

## Cleanup

```sh
npx wrangler vectorize delete ask-probe --force
cd ratelimit/worker && npx wrangler delete
```

## What to report back

1. Did `vectorize create` succeed, or did it demand a paid plan?
2. The embedding width that `embed.mjs` printed.
3. The queried-dimensions counter before and after the five queries, and which outcome (A/B/C)
   the delta matches.
4. Did the fourth call to the rate-limit probe return `success: false`?
5. Whether the account is on Workers Free or Paid, and whether a Workers Paid subscription
   would need a card.
