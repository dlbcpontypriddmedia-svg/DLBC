import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_shared/cors';
import { getServiceClient } from './_shared/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sb = getServiceClient();
  const { data, error } = await sb.from('branches').select('id, name').order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ branches: data || [] });
}

