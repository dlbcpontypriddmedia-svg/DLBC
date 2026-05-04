import type { VercelRequest } from '@vercel/node';
import { requiredEnv } from './env';
import { getSessionToken } from './session';
import { verifyJwt } from './jwt';

export type SessionPayload =
  | { role: 'admin'; exp?: number }
  | { role: 'staff'; branch_id: string; exp?: number };

export function requireSession(req: VercelRequest): SessionPayload {
  const secret = requiredEnv('SESSION_SECRET');
  const token = getSessionToken(req);
  if (!token) throw new Error('Unauthorized');
  const payload = verifyJwt(token, secret) as SessionPayload | null;
  if (!payload) throw new Error('Unauthorized');
  if (payload.role !== 'admin' && payload.role !== 'staff') throw new Error('Unauthorized');
  if (payload.role === 'staff' && typeof payload.branch_id !== 'string') throw new Error('Unauthorized');
  return payload;
}

