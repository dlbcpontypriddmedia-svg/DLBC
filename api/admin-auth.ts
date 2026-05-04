import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_shared/cors';
import { requiredEnv, optionalEnv } from './_shared/env';
import { signJwt } from './_shared/jwt';
import { setAuthCookie } from './_shared/session';
import { getServiceClient } from './_shared/supabase';
import { hashPassword, verifyPassword } from './_shared/password';

const SETTINGS_ID = '8f42b1c3-5d9e-4a7b-b2e1-9c3f4d5a6e7b';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const bootstrapAdminPassword = optionalEnv('ADMIN_PASSWORD');
  const sessionSecret = requiredEnv('SESSION_SECRET');
  const password = (req.body?.password as string) || '';

  const sb = getServiceClient();
  const { data: settings, error } = await sb
    .from('stream_settings')
    .select('admin_password_salt, admin_password_hash')
    .eq('id', SETTINGS_ID)
    .single();
  if (error) return res.status(500).json({ error: 'Server error' });

  const salt = (settings as any)?.admin_password_salt as string | null | undefined;
  const hash = (settings as any)?.admin_password_hash as string | null | undefined;

  if (salt && hash) {
    const ok = verifyPassword(password, { salt, hash });
    if (!ok) return res.status(401).json({ error: 'Invalid password' });
  } else {
    // Bootstrap mode: allow initial login from env secret, then persist a DB hash so future changes
    // can be made without redeploying.
    if (!bootstrapAdminPassword || password !== bootstrapAdminPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const record = hashPassword(password);
    await sb.from('stream_settings').update({
      admin_password_salt: record.salt,
      admin_password_hash: record.hash,
      updated_at: new Date().toISOString(),
    }).eq('id', SETTINGS_ID);
  }

  const token = signJwt({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 }, sessionSecret);
  res.setHeader('Set-Cookie', setAuthCookie(token));
  return res.status(200).json({ success: true, token });
}
