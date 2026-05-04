import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/$/, '');
}

function getAllowedOrigins(): string[] | null {
  // If ALLOWED_ORIGINS is not set, do not enforce an allowlist (less strict).
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return null;
  return raw.split(',').map(normalizeOrigin).filter(Boolean);
}

function isOriginAllowed(origin: string, allowed: string[]) {
  if (!origin) return false;

  for (const ruleRaw of allowed) {
    const rule = normalizeOrigin(ruleRaw);
    if (!rule) continue;

    if (!rule.includes('*')) {
      if (origin === rule) return true;
      continue;
    }

    const ruleHasScheme = rule.includes('://');
    const [scheme, rest] = ruleHasScheme ? (rule.split('://') as [string, string]) : (['', rule] as const);
    if (!rest.startsWith('*.')) continue;
    const suffix = rest.slice(1); // ".vercel.app"

    try {
      const originUrl = new URL(origin);
      if (ruleHasScheme && originUrl.protocol.replace(':', '') !== scheme) continue;
      if (originUrl.hostname.endsWith(suffix) && originUrl.hostname.length > suffix.length) return true;
    } catch {
      continue;
    }
  }

  return false;
}

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = normalizeOrigin((req.headers.origin as string) || '');
  if (!origin) {
    res.setHeader('Vary', 'Origin');
    return { isCors: false, allowed: true };
  }

  const allowedOrigins = getAllowedOrigins();
  const allowed = !allowedOrigins || isOriginAllowed(origin, allowedOrigins);
  res.setHeader('Vary', 'Origin');
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  return { isCors: true, allowed };
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== 'OPTIONS') return false;
  const { allowed } = applyCors(req, res);
  res.status(allowed ? 204 : 403).end();
  return true;
}
