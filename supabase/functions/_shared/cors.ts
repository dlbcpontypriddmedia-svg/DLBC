const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
];

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/$/, '');
}

function getAllowedOrigins() {
  const raw = Deno.env.get('ALLOWED_ORIGINS');
  // If ALLOWED_ORIGINS is not set, do not enforce an allowlist (less strict).
  if (!raw) return null;
  const list = raw.split(',').map(normalizeOrigin).filter(Boolean);
  return list.length ? list : DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin);
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

    // Wildcard rules:
    // - "https://*.vercel.app" matches any subdomain on that host suffix with HTTPS.
    // - "*.vercel.app" matches any scheme with that host suffix (less strict; prefer scheme).
    const ruleHasScheme = rule.includes('://');
    const ruleUrlPrefix = ruleHasScheme ? rule.split('://')[0] : '';
    const ruleRest = ruleHasScheme ? rule.slice(ruleUrlPrefix.length + 3) : rule;

    if (!ruleRest.startsWith('*.')) continue;
    const suffix = ruleRest.slice(1); // ".vercel.app"

    try {
      const originUrl = new URL(origin);
      if (ruleHasScheme && originUrl.protocol.replace(':', '') !== ruleUrlPrefix) continue;
      if (originUrl.hostname.endsWith(suffix) && originUrl.hostname.length > suffix.length) return true;
    } catch {
      // If origin isn't a valid URL, fail closed.
      continue;
    }
  }

  return false;
}

export function getCorsHeaders(req?: Request) {
  const allowed = getAllowedOrigins();
  const origin = normalizeOrigin(req?.headers.get('origin') || '');

  // If it's not a CORS request, don't emit CORS headers.
  if (!origin) return { 'Vary': 'Origin' };

  if (allowed && !isOriginAllowed(origin, allowed)) {
    // Fail closed: browser will block the response due to missing ACAO header.
    return { 'Vary': 'Origin' };
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export function corsResponse(req?: Request) {
  const headers = getCorsHeaders(req);
  // If CORS headers are absent for a CORS request, treat it as forbidden.
  const origin = normalizeOrigin(req?.headers.get('origin') || '');
  const isCors = Boolean(origin);
  const allowed = !isCors || Boolean(headers['Access-Control-Allow-Origin']);
  return new Response(null, { status: allowed ? 204 : 403, headers });
}
