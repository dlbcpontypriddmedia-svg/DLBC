import crypto from 'node:crypto';

export type PasswordRecord = { salt: string; hash: string };

function timingSafeEqualHex(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function hashPassword(password: string): PasswordRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, record: PasswordRecord): boolean {
  const next = crypto.scryptSync(password, record.salt, 64).toString('hex');
  return timingSafeEqualHex(next, record.hash);
}

