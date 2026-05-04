import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_shared/cors.js';
import { optionalEnv, requiredEnv } from './_shared/env.js';
import { runYoutubeLiveCheck } from './_shared/youtube.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Optional protection for cron/automation: require a shared secret header if configured.
  const expected = optionalEnv('CRON_SECRET');
  if (expected) {
    const provided = (req.headers['x-cron-secret'] as string) || '';
    if (provided !== expected) return res.status(401).json({ error: 'Unauthorized' });
  }

  // Ensure required env exists (gives a clearer error than a 500 from Supabase).
  requiredEnv('PROJECT_URL');
  requiredEnv('SERVICE_ROLE_KEY');
  const force = req.body?.force === true;
  const result = await runYoutubeLiveCheck(force);
  return res.status(result.status).json(result.data);
}
