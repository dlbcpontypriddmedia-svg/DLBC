import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_shared/cors';
import { proxyToSupabaseFunction } from './_shared/proxy';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const proxied = await proxyToSupabaseFunction(req, 'attendance-heartbeat', req.body);
  return res.status(proxied.status).json(proxied.data);
}

