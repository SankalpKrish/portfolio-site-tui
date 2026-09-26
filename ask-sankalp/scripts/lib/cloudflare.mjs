// ask-sankalp/scripts/lib/cloudflare.mjs
// Workers AI and Vectorize access for the build-time scripts.
//
// Separate from the Worker on purpose. The Worker reaches these through
// bindings; these scripts have no bindings, so they use the REST API with the
// same OAuth token wrangler already cached.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MODEL = '@cf/qwen/qwen3-embedding-0.6b';
export const DIMS = 1024;
export const API = 'https://api.cloudflare.com/client/v4';

// The account id is not a secret and is committed in wrangler.toml.
export function accountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const toml = readFileSync(new URL('../../worker/wrangler.toml', import.meta.url), 'utf8');
  const match = toml.match(/^\s*account_id\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error('no account_id in wrangler.toml and CLOUDFLARE_ACCOUNT_ID is unset');
  return match[1];
}

// Prefers an explicit token, and otherwise borrows the OAuth token wrangler has
// already cached from `wrangler login`. That keeps a credential out of the
// environment and out of anyone's shell history, and means these scripts work
// for anyone who has run wrangler once.
//
// The cache location is a wrangler implementation detail and may move. When it
// does, this falls through to the CLOUDFLARE_API_TOKEN path, which is stable.
export function apiToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;

  const appData = process.env.APPDATA ?? '';
  const candidates = [
    process.env.WRANGLER_CONFIG,
    appData && join(appData, '.wrangler', 'config', 'default.toml'),
    appData && join(appData, 'xdg.config', '.wrangler', 'config', 'default.toml'),
    process.env.XDG_CONFIG_HOME && join(process.env.XDG_CONFIG_HOME, '.wrangler', 'config', 'default.toml'),
    process.env.HOME && join(process.env.HOME, '.wrangler', 'config', 'default.toml'),
  ].filter(Boolean);

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const token = readFileSync(path, 'utf8').match(/^\s*oauth_token\s*=\s*"([^"]+)"/m);
    if (token) return token[1];
  }

  throw new Error(
    'No API token. Run `npx wrangler login`, or set CLOUDFLARE_API_TOKEN to a token with ' +
      'Account > Workers AI (read) and Account > Vectorize (edit).',
  );
}

export async function embed(texts) {
  const res = await fetch(`${API}/accounts/${accountId()}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texts }),
  });

  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`);

  const body = await res.json();
  if (!body.success) throw new Error(`embed error: ${JSON.stringify(body.errors)}`);

  const raw = body.result?.data ?? body.result;
  const vectors = Array.isArray(raw?.[0]) ? raw : [raw];

  if (vectors.length !== texts.length) {
    throw new Error(`expected ${texts.length} vectors, got ${vectors.length}`);
  }
  for (const v of vectors) {
    if (v.length !== DIMS) {
      throw new Error(`vector width ${v.length} != ${DIMS}; the index is immutable, fix before upserting`);
    }
  }

  return vectors;
}

export async function queryIndex(indexName, vector, topK = 5) {
  const res = await fetch(`${API}/accounts/${accountId()}/vectorize/v2/indexes/${indexName}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken()}`, 'Content-Type': 'application/json' },
    // "all", not true. The binding accepts a boolean-ish form; the REST API
    // wants the enum string, and rejects a bare boolean with a parse error
    // buried 21k characters into the body.
    body: JSON.stringify({ vector, topK, returnMetadata: 'all' }),
  });

  if (!res.ok) throw new Error(`query failed: ${res.status} ${await res.text()}`);

  const body = await res.json();
  if (!body.success) throw new Error(`query error: ${JSON.stringify(body.errors)}`);

  return body.result.matches.map((m) => ({ id: m.id, score: m.score, metadata: m.metadata }));
}
