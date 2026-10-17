// Herramienta privada: restaura únicamente en memoria; nunca imprime filas ni SQL.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const tables = ['sarin_conversations', 'sarin_messages', 'sarin_consents', 'sarin_reservations', 'sarin_counters'];

/** Separa SQL sin interpretar su contenido: literales, identificadores y comentarios
 * conservan sus bytes; un trigger acaba tras su END exterior, no en sus sentencias.
 */
function backupStatements(sql) {
  const statements = [];
  let start = 0, state = '', token = '', prefix = [], trigger = false, body = false, depth = 0, previous = '';
  const word = value => value !== undefined && /[A-Za-z0-9_$\u0080-\uffff]/.test(value) && value !== '\ufeff';
  function flushToken() {
    if (!token) return;
    const keyword = token.toUpperCase(); token = '';
    if (prefix.length < 3) prefix.push(keyword);
    trigger = prefix[0] === 'CREATE' && (prefix[1] === 'TRIGGER' || (['TEMP', 'TEMPORARY'].includes(prefix[1]) && prefix[2] === 'TRIGGER'));
    if (trigger && previous !== '.') {
      if (keyword === 'BEGIN') { body = true; depth++; }
      else if (keyword === 'CASE') depth++;
      else if (keyword === 'END' && depth > 0) depth--;
    }
    previous = 'word';
  }
  for (let index = 0; index < sql.length; index++) {
    const current = sql[index], next = sql[index + 1];
    if (state === '--') { if (current === '\n' || current === '\r') state = ''; continue; }
    if (state === '/*') { if (current === '*' && next === '/') { state = ''; index++; } continue; }
    if (state) {
      if (current === state) {
        if (next === state && state !== ']') index++;
        else { state = ''; previous = 'quoted'; }
      }
      continue;
    }
    if (word(current)) { token += current; continue; }
    flushToken();
    if (current === '-' && next === '-') { state = '--'; index++; continue; }
    if (current === '/' && next === '*') { state = '/*'; index++; continue; }
    if (["'", '"', '`', '['].includes(current)) { state = current === '[' ? ']' : current; continue; }
    if (current === ';' && (!trigger || (body && depth === 0))) {
      statements.push({ sql: sql.slice(start, index + 1), trigger });
      start = index + 1; prefix = []; trigger = false; body = false; depth = 0; previous = '';
    } else if (!/\s/.test(current)) previous = current;
  }
  flushToken();
  if (sql.slice(start).trim()) statements.push({ sql: sql.slice(start), trigger });
  return statements;
}

/** Export D1 puede anteponer triggers a sus vistas. Se difieren hasta después de
 * esquema y datos; el resto mantiene su orden y los INSERT no disparan triggers.
 * El llamador usa exclusivamente una DatabaseSync(':memory:').
 */
export function restoreBackupSql(db, sql) {
  const statements = backupStatements(sql);
  db.exec(statements.filter(statement => !statement.trigger).map(statement => statement.sql).join('\n'));
  db.exec(statements.filter(statement => statement.trigger).map(statement => statement.sql).join('\n'));
}

export async function verifySarinBackup(bytes) {
  const db = new DatabaseSync(':memory:');
  let stage = 'restore';
  try {
    db.exec('PRAGMA foreign_keys = ON');
    restoreBackupSql(db, bytes.toString('utf8'));
    const counts = () => Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n]));
    stage = 'counts';
    const before = counts();
    stage = 'integrity';
    const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
    const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all().length;
    if (integrity !== 'ok' || foreignKeyErrors) throw new Error();
    stage = 'migration';
    db.exec(await readFile(new URL('../../migrations/sarin/0003_leads.sql', import.meta.url), 'utf8'));
    stage = 'comparison';
    if (JSON.stringify(before) !== JSON.stringify(counts()) || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error();
    return { verified: true, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
      integrity, foreignKeyErrors, counts: before, additiveMigrationPreservesCounts: true,
      leads: db.prepare('SELECT COUNT(*) AS n FROM sarin_leads').get().n };
  } catch (error) {
    const safeSqlError = /^(?:no such (?:table|column|function)|object name reserved for internal use): (?:main\.)?(?:sarin_[a-z_]+|sqlite_sequence)$/;
    const reason = error?.message?.includes('FOREIGN KEY constraint failed') ? 'foreign_key'
      : safeSqlError.test(error?.message) ? error.message : 'verification';
    throw Object.assign(new Error('El respaldo no superó la verificación privada.'), { stage, reason });
  } finally { db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (!process.argv[2] || process.argv.length !== 3) throw new Error();
    console.log(JSON.stringify(await verifySarinBackup(await readFile(process.argv[2]))));
  } catch (error) {
    console.error(JSON.stringify({ error: 'El respaldo no superó la verificación privada.', stage: error.stage || 'read', reason: error.reason || 'verification' }));
    process.exitCode = 1;
  }
}
