// Thin Turso client wrapper.
//
// @libsql/client/web works in Workers — we just need a per-request
// factory because the client isn't cacheable across requests (different
// env per isolate warm-up is rare, but the URL/token come from env
// bindings which we only see inside a handler).

import { createClient, type Client } from '@libsql/client/web';
import type { Env } from './types';

export function db(env: Env): Client {
  return createClient({
    url: env.TURSO_URL.replace(/^libsql:\/\//, 'https://'),
    authToken: env.TURSO_TOKEN,
  });
}

// Common row-shape helper — libsql returns `rows` as arrays of plain
// objects when we use .execute() in object form, but the typings are
// permissive. This gives us an escape hatch for "I know this query
// returns rows of type T" without spreading `any`.
export async function queryAll<T = Record<string, unknown>>(
  client: Client,
  sql: string,
  args: (string | number | null)[] = [],
): Promise<T[]> {
  const r = await client.execute({ sql, args });
  return r.rows as unknown as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  client: Client,
  sql: string,
  args: (string | number | null)[] = [],
): Promise<T | null> {
  const r = await client.execute({ sql, args });
  return (r.rows[0] as unknown as T) ?? null;
}

export async function exec(
  client: Client,
  sql: string,
  args: (string | number | null)[] = [],
): Promise<void> {
  await client.execute({ sql, args });
}

// Unix ms — standardized across the schema. Use this, not Date.now()
// scattered around, so every timestamp comes from one place.
export const now = (): number => Date.now();
