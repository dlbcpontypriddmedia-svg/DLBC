import crypto from 'node:crypto';

function base64url(input: Buffer | string) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlJson(obj: unknown) {
  return base64url(Buffer.from(JSON.stringify(obj), 'utf8'));
}

function base64urlDecodeToString(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

export function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = base64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = base64urlJson(payload);
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

export function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const data = `${header}.${body}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest();
    const provided = Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(sig.length / 4) * 4, '='), 'base64');
    if (provided.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(provided, expected)) return null;
    const payload = JSON.parse(base64urlDecodeToString(body)) as Record<string, unknown>;
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
    if (exp && exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

