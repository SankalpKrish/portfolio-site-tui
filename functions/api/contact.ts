import { Resend } from 'resend';

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

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from:    'onboarding@resend.dev',
    to:      env.RESEND_API_KEY ? 'sankalpkrish@outlook.com' : 'sankalp@outlook.sg',
    subject: 'Portfolio contact',
    text:    message,
  });

  if (error) {
    return Response.json({ error: error.message || 'send failed' }, { status: 502 });
  }

  return Response.json({ ok: true, id: data?.id });
};
