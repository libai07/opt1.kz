import { SignJWT, jwtVerify } from 'jose';

export interface AdminPayload {
  id: string;
  email: string;
  role: string;
}

const ITERATIONS = 100_000;
const HASH = 'SHA-256';
const SALT_LEN = 16;
const KEY_LEN = 32;

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: HASH },
    key,
    KEY_LEN * 8
  );
  return new Uint8Array(bits);
}

export async function hashPwd(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const derived = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(derived)}`;
}

export async function verifyPwd(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = parseInt(iterStr, 10);
    const salt = fromB64(saltB64);
    const expected = fromB64(hashB64);
    const derived = await pbkdf2(password, salt, iterations);
    if (derived.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

function getSecret(env: Env) {
  const secret = env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function createToken(admin: AdminPayload, env: Env): Promise<string> {
  return new SignJWT({ id: admin.id, email: admin.email, role: admin.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret(env));
}

export async function verifyToken(token: string, env: Env): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(env));
    return { id: String(payload.id), email: String(payload.email), role: String(payload.role) };
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(request: Request, env: Env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const payload = await verifyToken(token, env);
  if (!payload) return null;
  const admin = await env.DB.prepare(
    'SELECT id, email, role FROM admins WHERE id = ?'
  ).bind(payload.id).first<AdminPayload>();
  return admin || null;
}
