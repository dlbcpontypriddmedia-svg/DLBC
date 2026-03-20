const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const data = encoder.encode(`${header}.${body}`);
  const key = await getKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  return `${header}.${body}.${base64url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const key = await getKey(secret);
    const data = encoder.encode(`${header}.${body}`);
    const valid = await crypto.subtle.verify('HMAC', key, base64urlDecode(sig), data);
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(base64urlDecode(body)));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookie(req: Request, name: string): string | null {
  const cookies = req.headers.get('cookie') || '';
  const match = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? match.split('=').slice(1).join('=') : null;
}

export function setAuthCookie(token: string): string {
  return `dlbc_session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=86400`;
}

export function clearAuthCookie(): string {
  return `dlbc_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
}
