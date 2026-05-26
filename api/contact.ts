import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const body = req.body as { message?: unknown };
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) { res.status(400).json({ error: 'empty message' }); return; }
  if (message.length > 2000) { res.status(400).json({ error: 'message too long' }); return; }

  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(500).json({ error: 'not configured' }); return; }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'portfolio@sankalpkrish.dev',
      to:      'sankalpkrish@outlook.com',
      subject: 'Portfolio contact',
      text:    message,
    }),
  });

  r.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'send failed' });
}
