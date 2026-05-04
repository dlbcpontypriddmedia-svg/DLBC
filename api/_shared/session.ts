import type { VercelRequest } from '@vercel/node';

export function getCookie(req: VercelRequest, name: string): string | null {
  const header = (req.headers.cookie as string) || '';
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export function getBearerToken(req: VercelRequest): string | null {
  const auth = (req.headers.authorization as string) || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim() || null;
}

export function getSessionToken(req: VercelRequest): string | null {
  return getBearerToken(req) || getCookie(req, 'dlbc_session');
}

export function setAuthCookie(token: string): string {
  return `dlbc_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=86400`;
}

export function clearAuthCookie(): string {
  return `dlbc_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
}

