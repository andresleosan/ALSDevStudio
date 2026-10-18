import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';

// Ejecuta las sentencias y triggers reales; batch reproduce la transacción de D1.
export async function sqliteFixture({ history = false, leads = true, whatsapp = false, replies = false, extensions = true } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(await readFile(new URL('../../migrations/sarin/0001_usage.sql', import.meta.url), 'utf8'));
  if (history) sqlite.exec(await readFile(new URL('../../migrations/sarin/0002_history.sql', import.meta.url), 'utf8'));
  if (history && leads) sqlite.exec(await readFile(new URL('../../migrations/sarin/0003_leads.sql', import.meta.url), 'utf8'));
  if (whatsapp) sqlite.exec(await readFile(new URL('../../migrations/sarin/0004_whatsapp_ingress.sql', import.meta.url), 'utf8'));
  if (replies) sqlite.exec(await readFile(new URL('../../migrations/sarin/0005_whatsapp_replies.sql', import.meta.url), 'utf8'));
  if (replies && extensions) {
    for(const name of ['0006_whatsapp_handoff.sql','0007_whatsapp_audio.sql','0008_whatsapp_profiles.sql','0009_whatsapp_billing.sql','0010_whatsapp_billing_lookup.sql'])sqlite.exec(await readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8'));
  }
  function prepare(sql) {
    return {
      sql, values: [],
      bind(...values) { return { ...this, values }; },
      async all() { return execute(this); },
      async run() { return execute(this); },
      async first() { return execute(this).results[0] ?? null; },
    };
  }
  function execute(statement) {
    const stmt = sqlite.prepare(statement.sql);
    const results = stmt.columns().length ? stmt.all(...statement.values) : [];
    if (!stmt.columns().length) stmt.run(...statement.values);
    return { success: true, results, meta: { changes: sqlite.prepare('SELECT changes() AS n').get().n } };
  }
  const db = {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(execute);
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { db, sqlite, close: () => sqlite.close() };
}
