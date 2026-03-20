const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
];

function getAllowedOrigins() {
  const raw = Deno.env.get('ALLOWED_ORIGINS');
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function getCorsHeaders(req?: Request) {
  const allowed = getAllowedOrigins();
  const origin = req?.headers.get('origin') || '';
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || '');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export function corsResponse(req?: Request) {
  return new Response(null, { headers: getCorsHeaders(req) });
}
