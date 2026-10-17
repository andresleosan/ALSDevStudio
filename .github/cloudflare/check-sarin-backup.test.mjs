import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { verifySarinBackup, restoreBackupSql } from './check-sarin-backup.mjs';

test('restaura una copia 0002 sólo en memoria y comprueba la migración aditiva sin mostrar filas', async () => {
  const sql = (await Promise.all(['0001_usage.sql', '0002_history.sql'].map(name => readFile(new URL(`../../migrations/sarin/${name}`, import.meta.url), 'utf8')))).join('\n');
  const report = await verifySarinBackup(Buffer.from(sql));
  assert.equal(report.verified, true);
  assert.equal(report.integrity, 'ok');
  assert.equal(report.foreignKeyErrors, 0);
  assert.equal(report.additiveMigrationPreservesCounts, true);
  assert.equal(report.leads, 0);
  assert.equal(report.counts.sarin_conversations, 0);
  assert.match(report.sha256, /^[a-f0-9]{64}$/);
});

test('fallo de respaldo no expone texto SQL ni detalles personales en su error', async () => {
  await assert.rejects(() => verifySarinBackup(Buffer.from('SELECT persona_privada@ejemplo.invalid;')), error => error.message === 'El respaldo no superó la verificación privada.');
});

test('restaura export con triggers anteriores a vistas sin partir literales privados multilínea', async () => {
  const source = (await Promise.all(['0001_usage.sql', '0002_history.sql'].map(name => readFile(new URL(`../../migrations/sarin/${name}`, import.meta.url), 'utf8')))).join('\n');
  const views = source.match(/CREATE VIEW[\s\S]*?;/g);
  assert.ok(views?.length);
  const canary = "CANARIO-PRIVADO 'comillas';\nBEGIN CASE WHEN END;\n-- no es comentario;\n/* tampoco */";
  const literal = `'${canary.replaceAll("'", "''")}'`;
  const reordered = `${source.replace(/CREATE VIEW[\s\S]*?;/g, '')}\n${views.join('\n')}
    INSERT INTO sarin_conversations(id,token_hash,created_at,updated_at,session_expires_at,expires_at,max_events)
      VALUES ('synthetic-conversation','synthetic-hash',1,1,86400001,86400001,32);
    INSERT INTO sarin_messages(id,conversation_id,turn,role,content,at,status)
      VALUES ('synthetic-message','synthetic-conversation',1,'user',${literal},1,'completed');`;
  const bytes = Buffer.from(reordered);
  const report = await verifySarinBackup(bytes);
  assert.equal(report.verified, true); assert.equal(report.counts.sarin_conversations, 1); assert.equal(report.counts.sarin_messages, 1);
  assert.equal(report.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(JSON.stringify(report).includes('CANARIO-PRIVADO'), false);
  assert.equal(bytes.toString('utf8'), reordered, 'el export original no se modifica');
});

test('conserva trigger TEMP con CASE anidados, comillas, identificadores y comentarios con punto y coma', () => {
  const db = new DatabaseSync(':memory:');
  const canary = "CANARIO 'escapado';\nBEGIN; CASE END; -- literal\n/* literal */";
  const literal = `'${canary.replaceAll("'", "''")}'`;
  try {
    restoreBackupSql(db, `-- CREATE TRIGGER falso; BEGIN END;
      CREATE TABLE \`eventos;END\` ([texto;CASE] TEXT);
      /* ; BEGIN CASE END; CREATE VIEW falso; */
      CREATE TEMPORARY TRIGGER "trigger;BEGIN" INSTEAD OF INSERT ON [comando;CASE]
      WHEN CASE WHEN NEW."valor;END" IS NOT NULL THEN 1 ELSE 0 END
      BEGIN
        INSERT INTO \`eventos;END\` ([texto;CASE])
          VALUES (CASE WHEN length(NEW."valor;END") > 0
            THEN CASE WHEN 1 THEN NEW."valor;END" ELSE 'END; ;' END ELSE 'BEGIN; CASE END;' END);
        -- ; END; CREATE VIEW no_real;
        UPDATE \`eventos;END\` SET [texto;CASE] = [texto;CASE] || ';END;' WHERE rowid = last_insert_rowid();
      END;
      CREATE VIEW [comando;CASE] AS SELECT NULL AS "valor;END";
      INSERT INTO \`eventos;END\` ([texto;CASE]) VALUES (${literal});`);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM `eventos;END`').get().n, 1);
    assert.equal(db.prepare('SELECT [texto;CASE] AS value FROM `eventos;END`').get().value === canary, true);
    db.exec(`INSERT INTO [comando;CASE] ("valor;END") VALUES (${literal})`);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM `eventos;END`').get().n, 2);
    assert.equal(db.prepare('SELECT [texto;CASE] AS value FROM `eventos;END` ORDER BY rowid DESC LIMIT 1').get().value === `${canary};END;`, true);
  } finally { db.close(); }
});

test('restaura datos en su orden sin disparar triggers y los habilita al terminar', () => {
  const db = new DatabaseSync(':memory:');
  try {
    restoreBackupSql(db, `CREATE TABLE datos(id INTEGER PRIMARY KEY,orden TEXT);
      CREATE TABLE auditoria(id INTEGER);
      CREATE TRIGGER al_insertar AFTER INSERT ON datos BEGIN INSERT INTO auditoria VALUES (NEW.id); END;
      INSERT INTO datos VALUES (1,'primero'); INSERT INTO datos VALUES (2,'segundo');`);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM auditoria').get().n, 0);
    assert.equal(db.prepare('SELECT group_concat(orden) AS value FROM datos ORDER BY id').get().value, 'primero,segundo');
    db.exec("INSERT INTO datos VALUES (3,'tercero')");
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM auditoria').get().n, 1);
  } finally { db.close(); }
});

test('error de literal incompleto conserva únicamente etapa y razón permitidas', async () => {
  await assert.rejects(() => verifySarinBackup(Buffer.from("CREATE TABLE datos(value); INSERT INTO datos VALUES ('CANARIO-PRIVADO")), error => {
    assert.equal(error.stage, 'restore'); assert.equal(error.reason, 'verification');
    assert.equal(JSON.stringify(error).includes('CANARIO-PRIVADO'), false);
    assert.equal(error.message.includes('CANARIO-PRIVADO'), false); return true;
  });
});
