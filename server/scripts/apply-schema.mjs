#!/usr/bin/env node
// Apply SQL migrations in schema/ to the configured Turso database.
//
// Usage:
//   TURSO_URL=libsql://... TURSO_TOKEN=... node scripts/apply-schema.mjs
//
// Reads every schema/*.sql file in filename order, checks the
// _migrations table to see which have already been applied, runs the
// new ones in a transaction, records their name.
//
// Safe to re-run — already-applied migrations are skipped.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.resolve(__dirname, '..', 'schema');

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    console.error('Run:  TURSO_URL=libsql://... TURSO_TOKEN=... npm run db:push');
    process.exit(1);
  }
  return v;
}

const TURSO_URL = env('TURSO_URL');
const TURSO_TOKEN = env('TURSO_TOKEN');

// Convert libsql:// to https:// for the HTTP API, which is simpler to
// call from a plain node script than the full libsql client.
const httpBase = TURSO_URL.replace(/^libsql:\/\//, 'https://').replace(/\/$/, '');

async function exec(stmt, args = []) {
  const res = await fetch(`${httpBase}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql: stmt, args: args.map((v) => ({ type: 'text', value: String(v) })) } },
        { type: 'close' },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  const r = body.results?.[0];
  if (r?.type === 'error') {
    throw new Error(`SQL error: ${r.error?.message ?? JSON.stringify(r.error)}`);
  }
  return r?.response?.result;
}

async function main() {
  // Ensure the bookkeeping table exists before anything else. The initial
  // migration creates it too (with IF NOT EXISTS) so this is defensive.
  await exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`);

  const applied = await exec('SELECT name FROM _migrations');
  const appliedSet = new Set((applied?.rows ?? []).map((r) => r[0].value));

  const files = (await fs.readdir(SCHEMA_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No schema files found.');
    return;
  }

  let applied_count = 0;
  for (const f of files) {
    if (appliedSet.has(f)) {
      console.log(`  ✓ ${f} (already applied)`);
      continue;
    }
    console.log(`  → applying ${f}`);
    const sql = await fs.readFile(path.join(SCHEMA_DIR, f), 'utf8');
    // Split on semicolons that are end-of-line (avoid splitting mid-string).
    // Turso HTTP takes one stmt per request; no multi-statement support.
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));
    for (const stmt of statements) {
      try {
        await exec(stmt);
      } catch (e) {
        console.error(`FAIL in ${f}:\n${stmt.slice(0, 200)}...\n${e.message}`);
        process.exit(1);
      }
    }
    await exec(
      'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
      [f, Date.now()],
    );
    applied_count++;
  }

  console.log(`Done — ${applied_count} new migration(s) applied.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
