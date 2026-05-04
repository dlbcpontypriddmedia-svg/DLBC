import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_shared/cors';
import { clearAuthCookie } from './_shared/session';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  res.setHeader('Set-Cookie', clearAuthCookie());
  return res.status(200).json({ success: true });
}

