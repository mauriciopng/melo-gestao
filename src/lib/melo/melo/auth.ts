import crypto from 'crypto';
import { readDb, writeDb } from './db';

interface AuthData { pinHash: string; createdAt: string; }
interface Session  { token: string; createdAt: number; }

const SALT    = 'melo-digital-studio-2024';
const TTL_MS  = 30 * 24 * 60 * 60 * 1000; // 30 dias

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + SALT).digest('hex');
}

async function getAuthData(): Promise<AuthData> {
  const data = await readDb<AuthData | null>('auth', null);
  // Sem dados ou ainda usando PIN padrão antigo → migra para 3756
  if (!data || data.pinHash === hashPin('1234')) {
    const newAuth: AuthData = { pinHash: hashPin('3756'), createdAt: new Date().toISOString() };
    await writeDb('auth', newAuth);
    return newAuth;
  }
  return data;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const auth = await getAuthData();
  return auth.pinHash === hashPin(pin);
}

export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  if (!(await verifyPin(currentPin))) return false;
  await writeDb('auth', { pinHash: hashPin(newPin), createdAt: new Date().toISOString() });
  return true;
}

export async function createSession(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = await readDb<Session[]>('sessions', []);
  const now = Date.now();
  const active = sessions.filter(s => now - s.createdAt < TTL_MS);
  active.push({ token, createdAt: now });
  await writeDb('sessions', active);
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  if (!token) return false;
  const sessions = await readDb<Session[]>('sessions', []);
  const now = Date.now();
  const session = sessions.find(s => s.token === token);
  if (!session) return false;
  if (now - session.createdAt > TTL_MS) {
    await writeDb('sessions', sessions.filter(s => s.token !== token));
    return false;
  }
  return true;
}

export async function deleteSession(token: string): Promise<void> {
  const sessions = await readDb<Session[]>('sessions', []);
  await writeDb('sessions', sessions.filter(s => s.token !== token));
}

export function extractToken(authHeader: string | null): string {
  return (authHeader ?? '').replace('Bearer ', '').trim();
}
