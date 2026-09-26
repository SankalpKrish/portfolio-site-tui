// ask-sankalp/worker/src/retrieval.ts
// Hybrid retrieval: BM25 over a bundled inverted index, Vectorize for semantics,
// merged with Reciprocal Rank Fusion.
//
// Everything here is a pure function over data passed in. The Worker module does
// the JSON imports and binding calls; keeping them out means the ranking can be
// exercised in plain Node, which matters because the interesting failure mode
// (exact project names) is testable without an account.

export type Chunk = {
  id: string;
  title: string;
  topic: string;
  text: string;
};

export type ScoredChunk = Chunk & { score: number; rank: number };

export interface Retriever {
  readonly name: string;
  retrieve(query: string, k: number): Promise<ScoredChunk[]>;
}

export type Bm25Index = {
  k1: number;
  b: number;
  avgdl: number;
  docLen: number[];
  postings: Record<string, [number, number][]>;
};

// ---------------------------------------------------------------- BM25

// Recruiter questions are mostly function words. "do you know his date of
// birth" carries two content terms, one of which is absent from the corpus --
// and that single absence is the whole answerability signal. The list has to be
// aggressive enough that "know", "speak" and "use" are not mistaken for topics,
// or every question looks two-thirds answerable.
const STOPWORDS = new Set([
  // interrogatives and pronouns
  'the', 'and', 'for', 'that', 'with', 'you', 'your', 'yours', 'his', 'her', 'its',
  'our', 'their', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'it',
  'me', 'i', 'we', 'us', 'he', 'she', 'he', 'him', 'who', 'whom', 'whose', 'which',
  'what', 'when', 'where', 'why', 'how', 'do', 'does', 'did', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'am', 'can', 'could', 'would', 'should', 'will',
  'shall', 'may', 'might', 'must', 'have', 'has', 'had', 'there', 'here', 'any',
  'some', 'all', 'both', 'each', 'more', 'most', 'other', 'another', 'such', 'same',
  // generic verbs and light verbs that appear in almost any question
  'know', 'tell', 'speak', 'talk', 'say', 'said', 'use', 'used', 'using', 'get',
  'got', 'make', 'made', 'take', 'see', 'look', 'want', 'need', 'like', 'help',
  'show', 'mean', 'think', 'believe', 'feel', 'seem', 'find', 'give', 'put', 'keep',
  'let', 'read', 'write', 'work', 'worked', 'working', 'build', 'built', 'create',
  'created', 'make', 'doing', 'do', 'done', 'go', 'going', 'went', 'come', 'came',
  'about', 'into', 'onto', 'over', 'under', 'than', 'then', 'also', 'even', 'still',
  'just', 'very', 'really', 'quite', 'too', 'only', 'own', 'same', 'such', 'out',
  'off', 'away', 'back', 'ever', 'never', 'always', 'often', 'sometimes',
  // filler nouns and adjectives
  'thing', 'things', 'stuff', 'bit', 'lot', 'lots', 'kind', 'sort', 'way', 'ways',
  'time', 'times', 'year', 'years', 'day', 'days', 'good', 'best', 'better', 'much',
  'many', 'more', 'less', 'little', 'big', 'great', 'really', 'actually', 'basically',
]);

function stem(word: string): string {
  if (word.length <= 3) return word;
  for (const suffix of ['ational', 'iveness', 'fulness', 'ousness', 'ization', 'ations', 'ingly', 'edly']) {
    if (word.endsWith(suffix)) return word.slice(0, -suffix.length);
  }
  for (const suffix of ['ational', 'iveness', 'fulness', 'ousli', 'izati', 'ation', 'ition', 'ities', 'ively', 'ement', 'ness', 'ing', 'ies', 'ive', 'ers', 'est', 'ion', 'ous', 'ed', 'al', 'ly']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((t) => t.replace(/^[.]+|[.]+$/g, ''))
    .filter((t) => t.length > 1);
}

// Stopwords are matched on the RAW token, before stemming. Filtering afterwards
// is a trap: "does" stems to "doe", which is not on any stopword list, so it
// survives as a content term and halves the coverage score of every question
// that contains it. That bug refused "when does he graduate" outright.
//
// ingest.mjs imports this function rather than reimplementing it. Two copies of
// a tokenizer will drift, and a drifted index is silent -- queries just stop
// matching, with no error anywhere.
export function contentTokens(text: string): string[] {
  return tokenize(text)
    .filter((t) => !STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length > 1);
}

export const queryTokens = contentTokens;

export function bm25Scores(query: string, index: Bm25Index): number[] {
  const terms = queryTokens(query);
  const n = index.docLen.length;
  const scores = new Array<number>(n).fill(0);

  for (const term of terms) {
    const posting = index.postings[term];
    if (!posting) continue;

    const df = posting.length;
    // Lucene's IDF variant: always positive, so a term present in every
    // document still contributes a little rather than going negative.
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));

    for (const [doc, tf] of posting) {
      const norm = 1 - index.b + index.b * (index.docLen[doc] / index.avgdl);
      scores[doc] += idf * ((tf * (index.k1 + 1)) / (tf + index.k1 * norm));
    }
  }

  return scores;
}

// A score floor cannot gate relevance here, and the calibration proves it.
// Measured top scores: "what did he use for MIDI.ai" 2.92 and "when does he
// graduate" 2.25 are both real answers, while "has he worked with vector
// databases" scores 4.11 and "do you know his date of birth" scores 3.82 and
// are both unanswerable. Real questions score LOWER, because BM25 rewards
// common terms ("date") and punishes rare ones ("midi"). Gating on magnitude
// would refuse the two questions the corpus exists to answer.
//
// Coverage works instead: what fraction of the query's content terms actually
// occur in the document. Terms absent from the whole index count against it, so
// "vector databases" caps at 1/2 because "vector" appears nowhere, and
// "date of birth" caps at 1/2 because "birth" appears nowhere. Meanwhile
// "MIDI.ai" scores 2/2 and "graduate" 1/1.
//
// A side effect worth keeping: a question mixing a covered topic with an
// uncovered one gets refused, which is the correct grounded behaviour. "what
// vector database does he use" is not answerable from this corpus.
export const COVERAGE_MIN = 0.6;

// Coverage is counted over every content term, including terms that appear
// nowhere in the corpus. That is the point: an absent term is the strongest
// evidence a question is unanswerable, so it must count against the score
// rather than be filtered out of it.
//
// An earlier version discarded terms occurring in more than a quarter of chunks,
// on the theory that common words are uninformative. That was wrong twice over --
// it made rare-but-vague words like "role" count as topics, and it dropped
// absent terms from the denominator, which let "date of birth" through.
export function coverageOf(query: string, index: Bm25Index, doc: number): number {
  const terms = [...new Set(queryTokens(query))];
  if (terms.length === 0) return 0;

  let matched = 0;
  for (const term of terms) {
    const posting = index.postings[term];
    if (posting && posting.some(([d]) => d === doc)) matched++;
  }

  return matched / terms.length;
}

export function createBm25Retriever(index: Bm25Index, corpus: Chunk[]): Retriever {
  return {
    name: 'bm25',
    async retrieve(query, k) {
      const scores = bm25Scores(query, index);

      return corpus
        .map((chunk, i) => ({ ...chunk, score: scores[i], rank: 0 }))
        .filter((c, i) => c.score > 0 && coverageOf(query, index, i) >= COVERAGE_MIN)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((c, i) => ({ ...c, rank: i + 1 }));
    },
  };
}

// ---------------------------------------------------------------- Vectorize

type VectorQueryResult = {
  id: string;
  score: number;
  metadata?: { title?: string; topic?: string };
};

export function createVectorizeRetriever(
  env: { AI: Ai; VECTORIZE: Vectorize },
  corpus: Chunk[],
): Retriever {
  return {
    name: 'vectorize',
    async retrieve(query, k) {
      const embedded: unknown = await env.AI.run('@cf/qwen/qwen3-embedding-0.6b', { text: [query] });

      // Workers AI returns { shape, data } for array input but a bare array for
      // single input. Normalise both, and never hand a nested array to query()
      // -- Vectorize rejects it with an opaque error.
      const rows: number[][] = Array.isArray(embedded) && Array.isArray(embedded[0])
        ? (embedded as number[][])
        : ((embedded as { data?: number[][] })?.data ?? []);

      const vector: number[] = Array.isArray(rows[0]) ? rows[0] : [];
      if (vector.length === 0) return [];

      const results = await env.VECTORIZE.query(vector, {
        topK: k,
        returnMetadata: 'all',
      });

      const byId = new Map(corpus.map((c) => [c.id, c]));

      return (results.matches as VectorQueryResult[])
        .map((m) => {
          const chunk = byId.get(m.id);
          // A vector with no matching chunk means the index and the bundle have
          // drifted apart. Dropping it is safer than inventing a chunk.
          if (!chunk) return null;
          return {
            ...chunk,
            score: m.score,
            rank: 0,
            metadata: m.metadata,
          } as ScoredChunk;
        })
        .filter((c): c is ScoredChunk => c !== null)
        .map((c, i) => ({ ...c, rank: i + 1 }));
    },
  };
}

// ---------------------------------------------------------------- fusion

export const RRF_K = 60;

export function rrfFuse(arms: ScoredChunk[][], k = RRF_K, topN = 5): ScoredChunk[] {
  const fused = new Map<string, ScoredChunk>();

  for (const arm of arms) {
    for (const hit of arm) {
      const existing = fused.get(hit.id);
      const contribution = 1 / (k + hit.rank);

      if (existing) {
        existing.score += contribution;
      } else {
        fused.set(hit.id, { ...hit, score: contribution });
      }
    }
  }

  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

export function createHybridRetriever(retrievers: Retriever[], topN = 5): Retriever {
  return {
    name: `hybrid(${retrievers.map((r) => r.name).join('+')})`,
    async retrieve(query, k) {
      const arms = await Promise.all(retrievers.map((r) => r.retrieve(query, k)));
      return rrfFuse(arms, RRF_K, topN);
    },
  };
}
