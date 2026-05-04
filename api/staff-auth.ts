import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { applyCors, handleOptions } from './_shared/cors';
import { requiredEnv } from './_shared/env';
import { signJwt } from './_shared/jwt';
import { setAuthCookie } from './_shared/session';
import { getServiceClient } from './_shared/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const branch_id = (req.body?.branch_id as string) || '';
  const password = (req.body?.password as string) || '';
  if (!branch_id || !password) return res.status(400).json({ error: 'Missing credentials' });

  const sb = getServiceClient();
  const { data: staff, error } = await sb
    .from('attendance_staff')
    .select('password_hash, branch_id')
    .eq('branch_id', branch_id)
    .single();

  if (error || !staff) return res.status(401).json({ error: 'Invalid credentials' });

  const hashHex = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
  if (hashHex !== staff.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const sessionSecret = requiredEnv('SESSION_SECRET');
  const token = signJwt({ role: 'staff', branch_id: staff.branch_id, exp: Math.floor(Date.now() / 1000) + 86400 }, sessionSecret);
  res.setHeader('Set-Cookie', setAuthCookie(token));
  return res.status(200).json({ success: true, branch_id: staff.branch_id, token });
}

