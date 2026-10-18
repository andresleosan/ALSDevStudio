import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { verifySarinBackup, restoreBackupSql } from './check-sarin-backup.mjs';

async function whatsappBackupSql() {
  const sql = (await Promise.all(['0001_usage.sql', '0002_history.sql', '0003_leads.sql', '0004_whatsapp_ingress.sql']
    .map(name => readFile(new URL(`../../migrations/sarin/${name}`, import.meta.url), 'utf8')))).join('\n');
  return `${sql}
    INSERT INTO sarin_wa_receipts(event_id,event_hash,message_key,message_hash,peer_key,kind,admission_token,received_at,expires_at)
      VALUES ('evt_synthetic','hash-event','hash-message-key','hash-message','hash-peer','inbound','synthetic-token',1,172800001);
    INSERT INTO sarin_wa_inbox(event_id,peer_key,kind,message_id,wamid,waba_id,business_phone,peer_phone,
      media_type,text,created_at,sent_at,received_at,expires_at,stored_bytes)
      VALUES ('evt_synthetic','hash-peer','inbound','message_synthetic','wamid.synthetic','12345','+573000000002',
        '+573000000001','text','CANARIO-WA-RESTAURADO',1,1,1,86400001,300);
    INSERT INTO sarin_wa_peers(peer_key,expires_at) VALUES ('hash-peer',86400001);
    UPDATE sarin_wa_state SET inbox_rows = 1,receipt_rows = 1,content_bytes = 300;`;
}

function changeDefinition(sql, name, change) {
  const db = new DatabaseSync(':memory:');
  try {
    restoreBackupSql(db, sql);
    const definition = db.prepare('SELECT sql FROM sqlite_master WHERE name = ?').get(name)?.sql;
    assert.ok(definition && sql.includes(definition), 'La mutación debe alcanzar el objeto real');
    return sql.replace(definition, change(definition));
  } finally { db.close(); }
}

const criticalObjects = [
  'sarin_wa_capture', 'sarin_wa_receipt_added', 'sarin_wa_receipt_removed', 'sarin_wa_inbox_added',
  'sarin_wa_inbox_removed', 'sarin_wa_admit', 'sarin_wa_receipts_message', 'sarin_wa_receipts_expiry',
  'sarin_wa_receipts_peer_rate', 'sarin_wa_receipts_global_rate', 'sarin_wa_inbox_expiry',
  'sarin_wa_inbox_peer', 'sarin_wa_peers_expiry',
];

for (const name of criticalObjects) {
  test(`rechaza respaldo sin objeto WA crítico ${name}`, async () => {
    let sql = await whatsappBackupSql();
    // Sin vista también falta su trigger: llegar a validación, no sólo a un error de sintaxis.
    if (name === 'sarin_wa_capture') sql = changeDefinition(sql, 'sarin_wa_admit', () => '');
    sql = changeDefinition(sql, name, () => '');
    await assert.rejects(() => verifySarinBackup(Buffer.from(sql)), error =>
      error.stage === 'integrity' && error.reason === 'verification');
  });
}

for (const name of ['sarin_wa_receipt_added', 'sarin_wa_receipt_removed', 'sarin_wa_inbox_added', 'sarin_wa_inbox_removed', 'sarin_wa_admit']) {
  test(`rechaza trigger WA presente con cuerpo inoperante ${name}`, async () => {
    const sql = changeDefinition(await whatsappBackupSql(), name, value => value.replace(/\bBEGIN\b[\s\S]*$/, 'BEGIN SELECT 1; END'));
    await assert.rejects(() => verifySarinBackup(Buffer.from(sql)), error =>
      error.stage === 'integrity' && error.reason === 'verification');
  });
}

for (const [name, change] of [
  ['sarin_wa_receipts_message', value => value.replace('UNIQUE INDEX', 'INDEX')],
  ['sarin_wa_receipts_peer_rate', value => value.replace("kind = 'inbound'", "kind = 'echo'")],
  ['sarin_wa_capture', value => value.replace('NULL AS event_id', '1 AS event_id')],
  ['sarin_wa_capture', value => value.replace('NULL AS event_id', '"NULL" AS event_id')],
]) {
  test(`rechaza definición cambiada bajo el mismo nombre ${name}/${String(change)}`, async () => {
    const sql = changeDefinition(await whatsappBackupSql(), name, change);
    await assert.rejects(() => verifySarinBackup(Buffer.from(sql)), error =>
      error.stage === 'integrity' && error.reason === 'verification');
  });
}

test('acepta export equivalente con nombres entre comillas y MAIN sin confundir literales', async () => {
  let sql = await whatsappBackupSql();
  for (const name of [...criticalObjects, 'sarin_wa_state', 'sarin_wa_receipts', 'sarin_wa_inbox', 'sarin_wa_peers']) {
    sql = changeDefinition(sql, name, value => value
      .replace(/^(CREATE (?:UNIQUE )?(?:TABLE|INDEX|TRIGGER|VIEW)) (sarin_wa_[a-z_]+)/, '$1 MAIN."$2"')
      .replace(/\bON (sarin_wa_[a-z_]+)/g, 'ON "$1"')
      .replace(/\bCREATE\b/g, 'create').replace(/\bWHERE\b/g, 'where'));
  }
  const result = await verifySarinBackup(Buffer.from(sql));
  assert.equal(result.verified, true);
  assert.deepEqual(result.whatsapp, { inbox: 1, receipts: 1, peers: 1 });
});

test('restaura una copia 0002 sólo en memoria y comprueba la migración aditiva sin mostrar filas', async () => {
  const sql = (await Promise.all(['0001_usage.sql', '0002_history.sql'].map(name => readFile(new URL(`../../migrations/sarin/${name}`, import.meta.url), 'utf8')))).join('\n');
  const report = await verifySarinBackup(Buffer.from(sql));
  assert.equal(report.verified, true);
  assert.equal(report.integrity, 'ok');
  assert.equal(report.foreignKeyErrors, 0);
  assert.equal(report.additiveMigrationPreservesCounts, true);
  assert.equal(report.leads, 0);
  assert.deepEqual(report.whatsapp, { inbox: 0, receipts: 0, peers: 0 });
  assert.equal(report.counts.sarin_conversations, 0);
  assert.match(report.sha256, /^[a-f0-9]{64}$/);
});

test('verifica una copia que ya incluye 0003 sin volver a crear sus tablas', async () => {
  const sql = (await Promise.all(['0001_usage.sql', '0002_history.sql', '0003_leads.sql']
    .map(name => readFile(new URL(`../../migrations/sarin/${name}`, import.meta.url), 'utf8')))).join('\n');
  const report = await verifySarinBackup(Buffer.from(`${sql}
    INSERT INTO sarin_conversations(id,token_hash,created_at,updated_at,session_expires_at,expires_at,max_events)
      VALUES ('synthetic-existing','synthetic-existing-hash',1,1,86400001,86400001,32);
    INSERT INTO sarin_leads(conversation_id,first_name,last_name,email)
      VALUES ('synthetic-existing','CANARIO-NOMBRE','CANARIO-APELLIDO','canario@ejemplo.invalid');`));
  assert.equal(report.verified, true);
  assert.equal(report.leads, 1);
  assert.equal(report.counts.sarin_conversations, 1);
  assert.deepEqual(report.whatsapp, { inbox: 0, receipts: 0, peers: 0 });
  assert.equal(JSON.stringify(report).includes('CANARIO'), false);
});

test('verifica respaldo 0004 sin reaplicar migraciones y preserva filas WA sin exponerlas', async () => {
  const report = await verifySarinBackup(Buffer.from(await whatsappBackupSql()));
  assert.equal(report.verified, true);
  assert.deepEqual(report.whatsapp, { inbox: 1, receipts: 1, peers: 1 });
  assert.equal(report.counts.sarin_wa_state, 1);
  assert.equal(report.counts.sarin_wa_inbox, 1);
  assert.equal(report.counts.sarin_wa_receipts, 1);
  assert.equal(report.counts.sarin_wa_peers, 1);
  assert.equal(report.additiveMigrationPreservesCounts, true);
  assert.doesNotMatch(JSON.stringify(report), /CANARIO|573000|hash-peer|synthetic-token/);
});

for (const changed of ['inbox_rows = 0', 'receipt_rows = 0', 'content_bytes = 299']) {
  test(`rechaza respaldo con contabilidad WA discordante: ${changed}`, async () => {
    const sql = `${await whatsappBackupSql()} UPDATE sarin_wa_state SET ${changed};`;
    await assert.rejects(() => verifySarinBackup(Buffer.from(sql)), error => {
      assert.equal(error.stage, 'integrity');
      assert.equal(error.reason, 'verification');
      assert.equal(error.cause, undefined);
      assert.doesNotMatch(JSON.stringify(error), /CANARIO|573000|hash-peer/);
      return true;
    });
  });
}

test('rechaza esquema WA parcial antes de intentar migrarlo como si no existiera', async () => {
  const sql = `${await whatsappBackupSql()} DROP TABLE sarin_wa_state;`;
  await assert.rejects(() => verifySarinBackup(Buffer.from(sql)), error => {
    assert.equal(error.stage, 'integrity');
    assert.equal(error.reason, 'verification');
    return true;
  });
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

test('missing_0005_trigger_rejects_backup',async()=>{
 const sql=await whatsappBackupSql()+'\n'+await readFile(new URL('../../migrations/sarin/0005_whatsapp_replies.sql',import.meta.url),'utf8');
 const changed=changeDefinition(sql,'sarin_wa_context_invalidate',()=> '');
 await assert.rejects(verifySarinBackup(Buffer.from(changed)),e=>e.stage==='integrity');
});
test('complete_cumulative_0005_backup_is_verified',async()=>{
 const sql=await whatsappBackupSql()+'\n'+await readFile(new URL('../../migrations/sarin/0005_whatsapp_replies.sql',import.meta.url),'utf8');
 const result=await verifySarinBackup(Buffer.from(sql));assert.equal(result.verified,true);assert.equal(result.whatsappWork.jobs,0);
});

for(const name of ['sarin_wa_proof_immutable','sarin_wa_proof_sync','sarin_wa_outbox_transition','sarin_wa_job_transition','sarin_wa_work_capture','sarin_wa_guard','sarin_wa_context_invalidate','sarin_wa_outbox_reconcile','sarin_wa_proofs_expiry','sarin_wa_proofs_provider','sarin_wa_proofs_external','sarin_wa_proofs_notice','sarin_wa_jobs_expiry','sarin_wa_jobs_dispatch','sarin_wa_one_owner','sarin_wa_send_month']){
 test('cumulative_backup_rejects_missing_'+name,async()=>{
  const sql=await whatsappBackupSql()+'\n'+await readFile(new URL('../../migrations/sarin/0005_whatsapp_replies.sql',import.meta.url),'utf8');
  await assert.rejects(verifySarinBackup(Buffer.from(changeDefinition(sql,name,()=>''))),e=>e.stage==='integrity');
 });
}
for(const [name,from,to] of [
 ['sarin_wa_send_closures',"scope IN('day','month')","scope IN('day','month','year')"],
 ['sarin_wa_consent_proofs','expires_at=recorded_at+172800000','expires_at>=recorded_at'],
 ['sarin_wa_outbox','reconcile_attempts BETWEEN 0 AND 3','reconcile_attempts BETWEEN 0 AND 99'],
 ['sarin_wa_outbox','reconcile_token TEXT','reconcile_token_wrong TEXT'],
 ['sarin_wa_delivery_targets',"'delivered'","'failed'"],
 ['sarin_wa_proof_immutable',"NEW.conflict<OLD.conflict","0"],
 ['sarin_wa_work_guard','NULL AS code',"'denied' AS code"],
 ['sarin_wa_outbox_reconcile','reconcile_state,reconcile_next_at','reconcile_next_at,reconcile_state']
]){
 test('cumulative_backup_rejects_changed_'+name+'/'+from,async()=>{
  const sql=await whatsappBackupSql()+'\n'+await readFile(new URL('../../migrations/sarin/0005_whatsapp_replies.sql',import.meta.url),'utf8');
  await assert.rejects(verifySarinBackup(Buffer.from(changeDefinition(sql,name,s=>{assert.ok(s.includes(from));return s.replace(from,to);}))),e=>e.stage==='integrity');
 });
}

async function extendedBackupSql(version=7){
 let sql=await whatsappBackupSql();
 const names=['0005_whatsapp_replies.sql','0006_whatsapp_handoff.sql','0007_whatsapp_audio.sql'];
 for(const name of names.slice(0,version-4))sql+='\n'+await readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8');
 return sql;
}
for(const version of [6,7])test('respaldo completo de extensión '+version+' se valida con su esquema y contadores',async()=>{
 const report=await verifySarinBackup(Buffer.from(await extendedBackupSql(version)));
 assert.equal(report.whatsappSchemaVersion,version);assert.equal(report.counts.sarin_wa_handoff,0);
 if(version===7){assert.equal(report.counts.sarin_wa_audio,0);assert.equal(report.counts.sarin_wa_audio_quota,0);}
});
for(const [version,name] of [[6,'sarin_wa_handoff_request'],[6,'sarin_wa_handoff_immutable'],[6,'sarin_wa_handoff_expiry'],
 [7,'sarin_wa_audio_delete'],[7,'sarin_wa_audio_immutable'],[7,'sarin_wa_audio_capacity'],[7,'sarin_wa_audio_capture'],[7,'sarin_wa_audio_quota'],[7,'sarin_wa_audio_month']]){
 test('respaldo de extensión rechaza objeto ausente '+name,async()=>{
  let sql=await extendedBackupSql(version);
  if(name==='sarin_wa_audio_quota')sql=changeDefinition(sql,'sarin_wa_audio_month',()=> '');
  await assert.rejects(verifySarinBackup(Buffer.from(changeDefinition(sql,name,()=>''))),error=>error.stage==='integrity');
 });
}
test('no confunde cuota de audio huérfana o tabla handoff parcial con versión anterior válida',async()=>{
 for(const orphan of ['CREATE TABLE sarin_wa_audio_quota(day_key TEXT);','CREATE TABLE sarin_wa_handoff(alert_id TEXT);']){
  await assert.rejects(verifySarinBackup(Buffer.from(await extendedBackupSql(5)+'\n'+orphan)),error=>error.stage==='integrity');
 }
});
