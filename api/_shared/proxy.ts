import type { VercelRequest } from '@vercel/node';
import { requiredEnv } from './env';

export async function proxyToSupabaseFunction(req: VercelRequest, fnName: string, body?: unknown) {
  const projectUrl = requiredEnv('PROJECT_URL').replace(/\/+$/, '');
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = requiredEnv('SERVICE_ROLE_KEY');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Supabase Functions require an anon `apikey` header for invocation + auth.
    apikey: anonKey,
  };

  const incomingAuth = req.headers.authorization;
  if (typeof incomingAuth === 'string' && incomingAuth.trim()) {
    headers.Authorization = incomingAuth;
  } else {
    // For server-initiated calls (cron/admin), use service role.
    headers.Authorization = `Bearer ${serviceRoleKey}`;
  }

  const res = await fetch(`${projectUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? req.body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

