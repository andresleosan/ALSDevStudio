// Herramienta privada: restaura únicamente en memoria; nunca imprime filas ni SQL.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { schemaTokens } from '../../server/sarin/whatsapp/schema-tokens.js';

const tables = ['sarin_conversations', 'sarin_messages', 'sarin_consents', 'sarin_reservations', 'sarin_counters'];
const whatsappTables = ['sarin_wa_state', 'sarin_wa_inbox', 'sarin_wa_receipts', 'sarin_wa_peers'];
const optionalTables = ['sarin_leads', ...whatsappTables,'sarin_wa_handoff','sarin_wa_audio','sarin_wa_audio_quota','sarin_wa_profiles'];

/** Compara SQL ya aceptado por SQLite. Ignora formato, conserva literales y sólo
 * equipara identificadores citados conocidos; "NULL" nunca equivale a NULL.
 */

/** Referencia obtenida de la migración local, sin modificar el respaldo restaurado. */
function whatsappSchema(migration) {
  const reference = new DatabaseSync(':memory:');
  try {
    reference.exec(migration);
    const objects = reference.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE lower(name) GLOB 'sarin_wa_*' AND sql IS NOT NULL").all();
    const objectNames = new Set(objects.map(row => row.name.toLowerCase()));
    const identifiers = new Set([...objectNames, 'new', 'old']);
    for (const object of objects.filter(row => ['table', 'view'].includes(row.type))) {
      for (const column of reference.prepare('SELECT name FROM pragma_table_info(?)').all(object.name)) {
        identifiers.add(column.name.toLowerCase());
      }
    }
    return Object.assign(db => {
      for (const expected of objects) {
        const actual = db.prepare('SELECT type,tbl_name,sql FROM sqlite_master WHERE name = ? COLLATE NOCASE').get(expected.name);
        if (!actual || actual.type !== expected.type || actual.tbl_name.toLowerCase() !== expected.tbl_name.toLowerCase()
          || typeof actual.sql !== 'string'
          || schemaTokens(actual.sql, identifiers, objectNames) !== schemaTokens(expected.sql, identifiers, objectNames)) throw new Error();
      }
    },{objectNames});
  } finally { reference.close(); }
}

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
    const whatsappMigration = await readFile(new URL('../../migrations/sarin/0004_whatsapp_ingress.sql', import.meta.url), 'utf8');
    const replyMigration=await readFile(new URL('../../migrations/sarin/0005_whatsapp_replies.sql',import.meta.url),'utf8');
    const handoffMigration=await readFile(new URL('../../migrations/sarin/0006_whatsapp_handoff.sql',import.meta.url),'utf8');
    const audioMigration=await readFile(new URL('../../migrations/sarin/0007_whatsapp_audio.sql',import.meta.url),'utf8');
    const profileMigration=await readFile(new URL('../../migrations/sarin/0008_whatsapp_profiles.sql',import.meta.url),'utf8');
    const prior=(await Promise.all(['0001_usage.sql','0002_history.sql','0003_leads.sql'].map(name=>readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8')))).join('\n');
    const validateWhatsAppSchema=whatsappSchema(prior+'\n'+whatsappMigration);
    const validateWorkSchema=whatsappSchema(prior+'\n'+whatsappMigration+'\n'+replyMigration);
    const validateHandoffSchema=whatsappSchema(prior+'\n'+whatsappMigration+'\n'+replyMigration+'\n'+handoffMigration);
    const validateAudioSchema=whatsappSchema(prior+'\n'+whatsappMigration+'\n'+replyMigration+'\n'+handoffMigration+'\n'+audioMigration);
    const validateProfileSchema=whatsappSchema(prior+'\n'+whatsappMigration+'\n'+replyMigration+'\n'+handoffMigration+'\n'+audioMigration+'\n'+profileMigration);
    const validators=[validateWhatsAppSchema,validateWorkSchema,validateHandoffSchema,validateAudioSchema,validateProfileSchema];
    let whatsappSchemaVersion=0;
    db.exec('PRAGMA foreign_keys = ON');
    restoreBackupSql(db, bytes.toString('utf8'));
    const exists = name => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? COLLATE NOCASE").get(name));
    const validateWhatsApp = () => {
      const present = whatsappTables.filter(exists).length;
      const names=db.prepare("SELECT name FROM sqlite_master WHERE lower(name) GLOB 'sarin_wa_*'").all();
      if(present===0){if(names.length)throw new Error();return null;}
      if(present!==whatsappTables.length)throw new Error();
      if(names.some(row=>!validateProfileSchema.objectNames.has(row.name.toLowerCase())))throw new Error();
      let index=0;
      for(let candidate=1;candidate<validators.length;candidate++){
        if(names.some(row=>validators[candidate].objectNames.has(row.name.toLowerCase())
          && !validators[candidate-1].objectNames.has(row.name.toLowerCase())))index=candidate;
      }
      validators[index](db);whatsappSchemaVersion=index+4;
      const row = db.prepare(`SELECT inbox_rows,receipt_rows,content_bytes,
        (SELECT COUNT(*) FROM sarin_wa_state) AS stateRows,
        (SELECT COUNT(*) FROM sarin_wa_inbox) AS inbox,
        (SELECT COUNT(*) FROM sarin_wa_receipts) AS receipts,
        (SELECT COUNT(*) FROM sarin_wa_peers) AS peers,
        COALESCE((SELECT SUM(stored_bytes) FROM sarin_wa_inbox),0) AS storedBytes
        FROM sarin_wa_state WHERE id = 1`).get();
      if (!row || row.stateRows !== 1 || row.inbox_rows !== row.inbox
        || row.receipt_rows !== row.receipts || row.content_bytes !== row.storedBytes) throw new Error();
      return { inbox: row.inbox, receipts: row.receipts, peers: row.peers };
    };
    const restoredTables = [...tables, ...optionalTables.filter(exists)];
    const counts = () => Object.fromEntries(restoredTables.map(table => [table, db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n]));
    stage = 'counts';
    const before = counts();
    stage = 'integrity';
    const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
    const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all().length;
    if (integrity !== 'ok' || foreignKeyErrors) throw new Error();
    validateWhatsApp();
    stage = 'migration';
    if (!exists('sarin_leads')) {
      db.exec(await readFile(new URL('../../migrations/sarin/0003_leads.sql', import.meta.url), 'utf8'));
    }
    if (!exists('sarin_wa_state')) {
      db.exec(whatsappMigration);
    }
    stage = 'comparison';
    if (JSON.stringify(before) !== JSON.stringify(counts()) || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error();
    const whatsapp = validateWhatsApp();
    if (!whatsapp) throw new Error();
    return { verified: true, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
      integrity, foreignKeyErrors, counts: before, additiveMigrationPreservesCounts: true,
      leads: db.prepare('SELECT COUNT(*) AS n FROM sarin_leads').get().n,
      whatsapp,whatsappSchemaVersion,
      ...(exists('sarin_wa_pilot')?{whatsappWork:{jobs:db.prepare('SELECT COUNT(*) n FROM sarin_wa_jobs').get().n,
        outbox:db.prepare('SELECT COUNT(*) n FROM sarin_wa_outbox').get().n,consents:db.prepare('SELECT COUNT(*) n FROM sarin_wa_consent_proofs').get().n}}:{}) };
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
