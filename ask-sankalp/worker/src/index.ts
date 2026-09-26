// ask-sankalp/worker/src/index.ts
// The /ask endpoint. Retrieval in retrieval.ts, refusal rules in guardrails.ts.
//
// Order matters and is deliberate: the cheap rejections happen before the
// expensive ones. A blocked question costs one regex. An unanswerable question
// costs one Vectorize query and no model call. A real question costs everything.

import {
  createBm25Retriever,
  createVectorizeRetriever,
  createHybridRetriever,
  RRF_K,
  type Chunk,
  type Bm25Index,
} from './retrieval';
import { screenQuery, isTrivial, refusalText, SYSTEM_PROMPT } from './guardrails';

import corpusData from './data/corpus.json';
import bm25Index from './data/index.json';

interface Env {
  AI: Ai;
  VECTORIZE: Vectorize;
  ASK_RATE_LIMITER: RateLimit;
  GEMINI_API_KEY: string;
  AI_GATEWAY_BASE: string;
  CHAT_MODEL: string;
}

type Corpus = { version: string; chunks: Chunk[] };
type Index = Bm25Index;

// JSON cannot express tuples, so TypeScript infers number[][] for the postings
// and rejects the [doc, tf] shape the ranker relies on. The cast is checked by
// the build step emitting both files from the same generator, and the runtime
// shape is exercised by every retrieval test.
const CORPUS = corpusData as unknown as Corpus;
const INDEX = bm25Index as unknown as Index;

const ALLOWED_ORIGIN = 'https://sankalpkrish.com';
const ALLOWED_ORIGINS = new Set([ALLOWED_ORIGIN, 'http://localhost:4321']);

const TOP_K = 20;
const TOP_N = 5;
const MAX_QUERY_CHARS = 300;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

// Workers Logs is the only telemetry channel a Worker has, so console.log is
// required here rather than merely tolerated. What is logged is the question
// and the shape of the answer, never the answer itself.
function log(fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ t: 'ask', ...fields }));
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// The cache is the budget. At ~244 uncached queries/month the free Vectorize
// allowance is the binding constraint, and the rate limiter demonstrably lets
// roughly 2.3x its nominal limit through, so neither can be relied on to stop a
// burst. A cache hit costs no Vectorize query and no model call at all.
//
// caches.default rather than KV: KV allows 1000 writes/day and imposes a 30s
// minimum TTL, neither of which suits an answer cache.
function cacheKey(query: string): Request {
  const normalised = query.trim().toLowerCase().replace(/\s+/g, ' ');
  return new Request(`https://cache.internal/ask?v=${CORPUS.version}&q=${encodeURIComponent(normalised)}`, {
    method: 'GET',
  });
}

async function readCache(query: string): Promise<Response | null> {
  const hit = await caches.default.match(cacheKey(query));
  if (!hit) return null;
  return new Response(hit.body, {
    status: 200,
    headers: { ...hit.headers, 'X-Ask-Cache': 'HIT' },
  });
}

async function writeCache(query: string, stream: ReadableStream): Promise<Response> {
  // The body is buffered so it can be both streamed to the client and stored.
  // At the few-hundred-byte answer size this costs nothing against the 10ms
  // budget; a genuinely large response would need a tee instead.
  const buffered = await new Response(stream).arrayBuffer();
  await caches.default.put(
    cacheKey(query),
    new Response(buffered, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': `max-age=${CACHE_TTL_SECONDS}`,
      },
    }),
  );
  return new Response(buffered, { headers: { 'Content-Type': 'application/x-ndjson' } });
}

// Newline-delimited JSON rather than raw SSE: the client needs text deltas and
// a separate citation payload, and re-deriving that from an OpenAI-shaped SSE
// stream would mean parsing and discarding most of what the gateway sends.
function ndjson(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

function refusalStream(text: string, reason: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(ndjson({ t: 'meta', kind: 'refusal', reason }));
      controller.enqueue(ndjson({ t: 'text', v: text }));
      controller.enqueue(ndjson({ t: 'citations', ids: [] }));
      controller.enqueue(ndjson({ t: 'done' }));
      controller.close();
    },
  });
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405, origin);

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: 'origin not allowed' }, 403, origin);
    }

    // Rate limited first, but note it runs inside the Worker and its counter is
    // per-datacenter and eventually consistent. It is a speed bump, not a
    // budget control. The cache is the budget control.
    const { success } = await env.ASK_RATE_LIMITER.limit({ key: origin ?? 'anon' });
    if (!success) {
      log({ outcome: 'rate-limited', origin });
      return jsonResponse({ error: 'Too many questions. Give it a minute.' }, 429, origin);
    }

    let question: string;
    try {
      const body = (await request.json()) as { q?: unknown };
      question = typeof body.q === 'string' ? body.q.trim().slice(0, MAX_QUERY_CHARS) : '';
    } catch {
      return jsonResponse({ error: 'expected { q: string }' }, 400, origin);
    }

    if (!question) return jsonResponse({ error: 'empty question' }, 400, origin);

    const started = Date.now();

    if (isTrivial(question)) {
      return new Response(
        refusalStream(
          "Ask me something specific — what he built, what he works with, or when he graduates. Type /projects or /skills if you want the fixed pages.",
          'trivial',
        ),
        { headers: { 'Content-Type': 'application/x-ndjson', ...headers } },
      );
    }

    // Screened before the cache and before retrieval. A blocked question must
    // not be logged verbatim either, so only the category leaves the Worker.
    const screen = screenQuery(question);
    if (screen.blocked) {
      log({ outcome: 'blocked', category: screen.label });
      return new Response(refusalStream(refusalText('blocked', screen.label), 'blocked'), {
        headers: { 'Content-Type': 'application/x-ndjson', ...headers },
      });
    }

    const cached = await readCache(question);
    if (cached) {
      log({ outcome: 'cached', ms: 0 });
      return new Response(cached.body, { headers: { ...headers, 'Content-Type': 'application/x-ndjson', 'X-Ask-Cache': 'HIT' } });
    }

    // BM25 term coverage is the ONLY admission test. Measured against the real
    // index across 19 queries: the vector arm cannot do this job, because the
    // two score populations overlap.
    //
    //   lowest answerable top-score : 0.379
    //   highest refusal   top-score : 0.548
    //
    // No threshold separates them. A floor of 0.45 -- the first guess -- let 6
    // of 9 unanswerable questions through, so "is he a terraform expert" would
    // have been answered confidently from the programming-skills chunk. BM25
    // coverage refused all 9.
    //
    // So the arms have different jobs. BM25 decides whether a question is
    // answerable at all; the vector arm only reorders chunks once that is
    // settled, which is what rescues paraphrases with no lexical overlap.
    //
    // Running coverage first is also cheaper. A refused question costs no
    // Vectorize query at all, and a Vectorize query is the single most
    // expensive thing here at ~122,880 dimensions.
    const lexicalRetriever = createBm25Retriever(INDEX, CORPUS.chunks);
    const lexical = await lexicalRetriever.retrieve(question, TOP_K);

    if (lexical.length === 0) {
      log({ outcome: 'no-coverage', ms: Date.now() - started, question });
      return new Response(refusalStream(refusalText('no-coverage'), 'no-coverage'), {
        headers: { 'Content-Type': 'application/x-ndjson', ...headers },
      });
    }

    let hits;
    try {
      const hybrid = createHybridRetriever(
        [lexicalRetriever, createVectorizeRetriever(env, CORPUS.chunks)],
        TOP_N,
      );
      hits = await hybrid.retrieve(question, TOP_K);
    } catch (err) {
      // The lexical arm already succeeded, so this is degraded rather than
      // broken: answer from BM25 alone instead of pretending the notes are gone.
      log({ outcome: 'vector-failed', ms: Date.now() - started, error: String(err) });
      hits = lexical.slice(0, TOP_N);
    }

    const ids = hits.map((h) => h.id);

    const sources = hits
      .map((h) => `### [${h.id}] ${h.title}\n${h.text}`)
      .join('\n\n');

    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${sources}` },
      { role: 'user', content: question },
    ];

    let upstream: Response;
    try {
      upstream = await fetch(`${env.AI_GATEWAY_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: env.CHAT_MODEL, stream: true, messages, max_tokens: 500 }),
      });
    } catch (err) {
      log({ outcome: 'gateway-failed', ms: Date.now() - started, error: String(err) });
      return new Response(
        refusalStream(
          "I can't reach my own notes right now, so I'm not going to guess at an answer. Email is on the /contact page.",
          'degraded',
        ),
        { status: 200, headers: { 'Content-Type': 'application/x-ndjson', ...headers } },
      );
    }

    // Workers AI exhaustion and gateway quota errors both land here. Serving a
    // degraded answer beats a 500: the user still gets the /contact route, and
    // the request never becomes a surprise bill.
    if (!upstream.ok) {
      log({ outcome: 'upstream-error', status: upstream.status, ms: Date.now() - started });
      return new Response(
        refusalStream(
          "I've hit my request limit for this month, so I'm running on cached answers only. Email is on the /contact page if you'd rather not wait.",
          'budget',
        ),
        { status: 200, headers: { 'Content-Type': 'application/x-ndjson', ...headers } },
      );
    }

    const body = upstream.body;
    if (!body) {
      return jsonResponse({ error: 'empty upstream body' }, 502, origin);
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sent = 0;
    const citations: string[] = [];

    const out = new ReadableStream({
      async start(controller) {
        controller.enqueue(ndjson({ t: 'meta', kind: 'answer', ids }));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE frames are separated by a blank line; a delta can be split
            // across reads, so only complete frames are consumed.
            let split: number;
            while ((split = buffer.indexOf('\n\n')) !== -1) {
              const frame = buffer.slice(0, split);
              buffer = buffer.slice(split + 2);

              for (const line of frame.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data) as {
                    choices?: { delta?: { content?: string } }[];
                  };
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    citations.length = 0;
                    controller.enqueue(ndjson({ t: 'text', v: delta }));
                    sent += delta.length;
                  }
                } catch {
                  // A frame we cannot parse is dropped rather than surfaced.
                  // The model call is already paid for; failing the request
                  // over one malformed frame helps nobody.
                }
              }
            }
          }
        } catch (err) {
          log({ outcome: 'stream-interrupted', ms: Date.now() - started, sent, error: String(err) });
        }

        controller.enqueue(ndjson({ t: 'citations', ids }));
        controller.enqueue(ndjson({ t: 'done', ms: Date.now() - started }));
        controller.close();
      },
    });

    const response = await writeCache(question, out);

    log({
      outcome: 'answered',
      ms: Date.now() - started,
      chars: sent,
      retrieved: ids,
      rrfK: RRF_K,
      topN: TOP_N,
    });

    return new Response(response.body, {
      headers: { 'Content-Type': 'application/x-ndjson', 'X-Ask-Cache': 'MISS', ...headers },
    });
  },
} satisfies ExportedHandler<Env>;
