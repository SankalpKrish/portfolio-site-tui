interface Env {
  RESEND_API_KEY: string;
}

// Local helper type to represent Cloudflare Pages Functions without polluting global DOM types
type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  params: Record<string, string>;
  data: Record<string, any>;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}) => Promise<Response> | Response;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return Response.json({ error: 'empty message' }, { status: 400 });
  if (message.length > 2000) return Response.json({ error: 'message too long' }, { status: 400 });

  const key = env.RESEND_API_KEY || 're_69Yqsc2j_Akxg1eF8iQA85Tkdw4qmi5AW';
  if (!key) return Response.json({ error: 'not configured' }, { status: 500 });

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'portfolio@sankalpkrish.com',
      to:      'sankalpkrish@outlook.com',
      subject: 'Portfolio contact',
      text:    message,
    }),
  });

  return r.ok
    ? Response.json({ ok: true })
    : Response.json({ error: 'send failed' }, { status: 502 });
};
