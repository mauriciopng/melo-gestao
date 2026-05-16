import { createClient, Client } from '@libsql/client';

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL não configurada. Veja o guia de deploy.');
    }

    _client = createClient({ url, authToken: authToken ?? undefined });
  }
  return _client;
}

async function ensureTable(): Promise<void> {
  if (_initialized) return;
  const db = getClient();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS melo_store (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '[]'
    )
  `);
  _initialized = true;
}

export async function readDb<T>(key: string, defaultValue: T): Promise<T> {
  try {
    await ensureTable();
    const result = await getClient().execute({
      sql: 'SELECT value FROM melo_store WHERE key = ?',
      args: [key],
    });
    if (result.rows.length === 0) return defaultValue;
    return JSON.parse(result.rows[0].value as string) as T;
  } catch {
    return defaultValue;
  }
}

export async function writeDb<T>(key: string, data: T): Promise<void> {
  await ensureTable();
  await getClient().execute({
    sql: 'INSERT OR REPLACE INTO melo_store (key, value) VALUES (?, ?)',
    args: [key, JSON.stringify(data)],
  });
}
