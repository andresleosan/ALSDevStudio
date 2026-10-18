import { WHATSAPP_NOTICE_VERSION } from '../../server/sarin/whatsapp/consent.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { runRetention } from '../../workers/sarin-retention/index.js';
import { clearRestoredHistory } from '../../server/sarin/history-recovery.js';

const ingress = await import('../../server/sarin/whatsapp/ingress-store.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const BASE = Date.UTC(2026, 9, 17, 12);
const DAY = 86400000;
const PRIVATE = 'CANARIO-PRIVADO-DE-MANTENIMIENTO';
const WA_TABLES = ['sarin_wa_inbox', 'sarin_wa_receipts', 'sarin_wa_peers'];
const WEB_TABLES = ['sarin_conversations', 'sarin_messages', 'sarin_turns', 'sarin_consents',
  'sarin_leads', 'sarin_turn_reservations', 'sarin_events', 'sarin_rejections', 'sarin_admin_audit'];
const event = (id = 'maintenance', at = BASE) => ({ kind: 'inbound', eventId: `evt_${id}`,
  createdAt: at, messageId: `message_${id}`, wamid: `wamid.${id}`, wabaId: '12345',
  from: '+573000000001', to: '+573000000002', sentAt: at, mediaType: 'text', text: PRIVATE });
const count = (sqlite, table) => sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const money = sqlite => Object.fromEntries(['sarin_state', 'sarin_counters', 'sarin_reservations']
  .map(table => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()]));

async function setup(t, { whatsapp = true } = {}) {
  const f = await sqliteFixture({ history: true, whatsapp });
  t.after(f.close);
  const logs = [];
  t.mock.method(console, 'log', (...args) => logs.push(args));
  t.mock.method(console, 'error', (...args) => logs.push(args));
  let at = BASE;
  const now = () => at;
  if (whatsapp) assert.equal(typeof ingress?.createWhatsAppIngressStore, 'function');
  return { ...f, now, logs, setTime: value => { at = value; },
    store: whatsapp ? ingress.createWhatsAppIngressStore({ db: f.db, now }) : null,
    env: { SARIN_RETENTION_ENABLED: 'true', SARIN_WHATSAPP_INGRESS_ENABLED: 'false', SARIN_DB: f.db } };
}

function seedWebAndMoney(sqlite) {
  sqlite.prepare(`INSERT INTO sarin_conversations(id,token_hash,created_at,updated_at,session_expires_at,expires_at,max_events)
    VALUES ('web-maintenance','web-maintenance-hash',?,?,?, ?,32)`).run(BASE, BASE, BASE + DAY, BASE + 30 * DAY);
  sqlite.prepare(`INSERT INTO sarin_messages(id,conversation_id,turn,role,content,at,status)
    VALUES ('web-message','web-maintenance',1,'user',?,?,'completed')`).run(PRIVATE, BASE);
  sqlite.prepare(`INSERT INTO sarin_leads(conversation_id,first_name,last_name,email)
    VALUES ('web-maintenance','Synthetic','Contact','synthetic@example.invalid')`).run();
  sqlite.prepare('INSERT INTO sarin_counters(key,value,expires_at) VALUES (?,?,?)').run('day:maintenance', 500, BASE + 35 * DAY);
  sqlite.prepare('INSERT INTO sarin_counters(key,value,expires_at) VALUES (?,?,?)').run('month:maintenance', 500, BASE + 35 * DAY);
  sqlite.prepare(`INSERT INTO sarin_reservations(id,stage,reserved_micros,daily_key,monthly_key,created_at,expires_at)
    VALUES ('hold-maintenance','generation',500,'day:maintenance','month:maintenance',?,?)`).run(BASE, BASE + 35 * DAY);
  sqlite.exec('UPDATE sarin_state SET blocked = 1');
}

test('cron purga WA por esquema existente aunque el ingreso esté apagado y conserva el dinero vigente', async t => {
  const f = await setup(t);
  await f.store.capture(event());
  seedWebAndMoney(f.sqlite);
  const budget = money(f.sqlite);
  f.setTime(BASE + DAY);
  const first = await runRetention(f.env, { now: f.now });
  assert.equal(first.whatsappInbox, 1);
  assert.equal(first.whatsappPeers, 1);
  assert.equal(first.whatsappReceipts, 0);
  assert.equal(count(f.sqlite, 'sarin_wa_inbox'), 0);
  assert.equal(count(f.sqlite, 'sarin_wa_receipts'), 1);
  assert.deepEqual(money(f.sqlite), budget);
  f.setTime(BASE + 2 * DAY);
  const second = await runRetention(f.env, { now: f.now });
  assert.equal(second.whatsappReceipts, 1);
  assert.equal(second.remaining, false);
  assert.equal(count(f.sqlite, 'sarin_wa_receipts'), 0);
  assert.deepEqual(money(f.sqlite), budget);
  assert.doesNotMatch(JSON.stringify(f.logs), /CANARIO|573000|synthetic@example/);
});

test('cron conserva compatibilidad con 0003 sin tablas WA aun con flag de ingreso true', async t => {
  const f = await setup(t, { whatsapp: false });
  f.env.SARIN_WHATSAPP_INGRESS_ENABLED = 'true';
  const result = await runRetention(f.env, { now: f.now });
  assert.equal(result.status, 'ok');
  assert.equal(result.whatsappInbox, 0);
  assert.equal(result.whatsappReceipts, 0);
  assert.equal(result.whatsappPeers, 0);
  assert.equal(result.remaining, false);
});

test('un esquema WA parcial no se confunde con una base anterior a 0004', async t => {
  const f = await setup(t);
  await f.store.capture(event());
  seedWebAndMoney(f.sqlite);
  f.sqlite.exec('DROP TABLE sarin_wa_state');
  f.setTime(BASE + 2 * DAY);
  await assert.rejects(() => runRetention(f.env, { now: f.now }), { message: 'sarin_retention_failed' });
  await assert.rejects(() => clearRestoredHistory({ db: f.db, now: f.now, maintenanceConfirmed: true, requestsDrained: true }),
    { message: 'sarin_history_recovery_failed' });
  assert.equal(count(f.sqlite, 'sarin_conversations'), 1);
  assert.equal(count(f.sqlite, 'sarin_wa_inbox'), 1);
});

test('el límite de lotes incluye pendientes de WA aunque la web ya esté vacía', async t => {
  const f = await setup(t);
  for (let i = 0; i < 101; i++) {
    await f.store.capture({ ...event(`batch_${i}`), kind: 'echo', from: '+573000000002', to: '+573000000001' });
  }
  f.setTime(BASE + 2 * DAY);
  const first = await runRetention(f.env, { now: f.now, maxBatches: 1 });
  assert.equal(first.batches, 1);
  assert.equal(first.whatsappInbox, 100);
  assert.equal(first.whatsappReceipts, 100);
  assert.equal(first.remaining, true);
  assert.equal(count(f.sqlite, 'sarin_wa_inbox'), 1);
  const second = await runRetention(f.env, { now: f.now });
  assert.equal(second.whatsappInbox, 1);
  assert.equal(second.whatsappReceipts, 1);
  assert.equal(second.remaining, false);
  assert.equal(count(f.sqlite, 'sarin_wa_inbox'), 0);
});

test('un fallo de purga WA no se confirma como éxito ni expone contenido', async t => {
  const f = await setup(t);
  await f.store.capture(event());
  f.sqlite.exec(`CREATE TRIGGER fail_wa_purge BEFORE DELETE ON sarin_wa_inbox
    BEGIN SELECT RAISE(ABORT,'${PRIVATE}'); END;`);
  f.setTime(BASE + DAY);
  await assert.rejects(() => runRetention(f.env, { now: f.now }), error =>
    error.message === 'sarin_retention_failed' && error.cause === undefined);
  assert.equal(count(f.sqlite, 'sarin_wa_inbox'), 1);
  assert.equal(f.logs.some(args => args.some(record => record.status === 'ok')), false);
  assert.doesNotMatch(JSON.stringify(f.logs), /CANARIO|573000/);
});

test('recuperación vacía web y WA atómicamente, fija piso actual y pausa sin tocar cuotas ni holds', async t => {
  const f = await setup(t);
  await f.store.capture(event());
  seedWebAndMoney(f.sqlite);
  f.sqlite.exec('UPDATE sarin_wa_state SET paused_all = 0');
  const budget = money(f.sqlite);
  f.setTime(BASE + 1000);
  const result = await clearRestoredHistory({ db: f.db, now: f.now, maintenanceConfirmed: true, requestsDrained: true });
  for (const table of [...WEB_TABLES, ...WA_TABLES]) assert.equal(count(f.sqlite, table), 0, table);
  const state = f.sqlite.prepare('SELECT * FROM sarin_wa_state').get();
  assert.equal(state.paused_all, 1);
  assert.equal(state.replay_floor_at, BASE + 1000 + 300000);
  assert.equal(state.inbox_rows, 0);
  assert.equal(state.receipt_rows, 0);
  assert.equal(state.content_bytes, 0);
  assert.equal(result.whatsappInbox, 1);
  assert.equal(result.whatsappReceipts, 1);
  assert.equal(result.whatsappPeers, 1);
  assert.equal(result.budgetReconciliationRequired, true);
  assert.deepEqual(money(f.sqlite), budget);
  await assert.rejects(() => f.store.capture(event()), error => error.code === 'stale_event');
});

test('fallo dentro de limpieza WA revierte también el historial web y su capacidad', async t => {
  const f = await setup(t);
  await f.store.capture(event());
  seedWebAndMoney(f.sqlite);
  const waState = f.sqlite.prepare('SELECT * FROM sarin_wa_state').get();
  const historyState = f.sqlite.prepare('SELECT * FROM sarin_history_state').get();
  const budget = money(f.sqlite);
  f.sqlite.exec(`CREATE TRIGGER fail_wa_recovery BEFORE DELETE ON sarin_wa_receipts
    BEGIN SELECT RAISE(ABORT,'${PRIVATE}'); END;`);
  await assert.rejects(() => clearRestoredHistory({ db: f.db, now: f.now, maintenanceConfirmed: true, requestsDrained: true }),
    error => error.message === 'sarin_history_recovery_failed' && error.cause === undefined);
  assert.equal(count(f.sqlite, 'sarin_conversations'), 1);
  assert.equal(count(f.sqlite, 'sarin_messages'), 1);
  assert.equal(count(f.sqlite, 'sarin_wa_inbox'), 1);
  assert.equal(count(f.sqlite, 'sarin_wa_receipts'), 1);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM sarin_wa_state').get(), waState);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM sarin_history_state').get(), historyState);
  assert.deepEqual(money(f.sqlite), budget);
});

test('recuperación reconcilia contadores WA restaurados antes de disparar triggers de borrado', async t => {
  const f = await setup(t);
  await f.store.capture(event());
  seedWebAndMoney(f.sqlite);
  f.sqlite.exec('UPDATE sarin_wa_state SET inbox_rows = 0, receipt_rows = 0, content_bytes = 0');
  await clearRestoredHistory({ db: f.db, now: f.now, maintenanceConfirmed: true, requestsDrained: true });
  for (const table of [...WA_TABLES, 'sarin_conversations']) assert.equal(count(f.sqlite, table), 0, table);
  const state = f.sqlite.prepare('SELECT * FROM sarin_wa_state').get();
  assert.equal(state.inbox_rows, 0);
  assert.equal(state.receipt_rows, 0);
  assert.equal(state.content_bytes, 0);
  assert.equal(state.paused_all, 1);
});

test('recuperación rechaza reloj inválido antes de modificar cualquier dato', async t => {
  const f = await setup(t, { whatsapp: false });
  seedWebAndMoney(f.sqlite);
  for (const now of [null, () => NaN, () => -1, () => 0.5, () => Infinity, () => { throw new Error(PRIVATE); }]) {
    await assert.rejects(() => clearRestoredHistory({ db: f.db, now, maintenanceConfirmed: true, requestsDrained: true }),
      error => error.message === 'sarin_history_recovery_failed' && error.cause === undefined);
    assert.equal(count(f.sqlite, 'sarin_conversations'), 1);
  }
});

// Task 4: nuevas conductas, primero RED sobre 0005 existente.
import { maintenanceFixture, DAY as WORK_DAY } from './sarin-whatsapp-maintenance-fixture.mjs';
const maintenance=await import('../../server/sarin/whatsapp/work-maintenance.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});
const purgeWork=async(f,limit=100)=>{assert.equal(typeof maintenance?.purgeWhatsAppWork,'function');return maintenance.purgeWhatsAppWork({db:f.db,now:f.now,limit});};
test('purge_never_resets_active_send_caps',async t=>{
 const f=await maintenanceFixture(t);await f.notice();const before=f.row('sarin_wa_send_quota');
 f.setTime(f.now()+WORK_DAY);await purgeWork(f);assert.deepEqual(f.row('sarin_wa_send_quota'),before);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_jobs').get().n,0);
});
test('response_expires_with_inbound',async t=>{
 const f=await maintenanceFixture(t);await f.notice();f.setTime(f.now()+12*3600000);await f.accept();
 const consent=f.row('sarin_wa_contexts');f.setTime(f.now()+12*3600000);await purgeWork(f);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_outbox').get().n,0);
 assert.equal(f.row('sarin_wa_consent_proofs').accepted_at,consent.accepted_at);
 const c=await f.claim(await f.capture());assert.equal(c.work.decision,'generate');await f.store.markInferenceStarted(c);
});
test('retained_proof_conflict_never_reactivates_or_pauses_new_context',async t=>{
 const f=await maintenanceFixture(t);await f.notice();f.setTime(f.now()+12*3600000);await f.accept();
 await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:f.row('sarin_wa_contexts').revision,actor:'test'});
 f.setTime(f.now()+12*3600000);await purgeWork(f);const before=f.row('sarin_wa_contexts');
 await f.store.applyStatus({eventId:'late-failure',providerId:'notice-id',status:'failed',at:f.now()});
 assert.equal(f.row('sarin_wa_consent_proofs').conflict,1);assert.equal(f.row('sarin_wa_contexts').revision,before.revision);
 await f.store.applyStatus({eventId:'late-positive',providerId:'notice-id',status:'read',at:f.now()});
 const c=await f.claim(await f.capture());assert.notEqual(c.work.decision,'generate');
});
test('partial_0005_fails_closed',async t=>{
 for(const sql of ['DROP TRIGGER sarin_wa_context_invalidate','DROP INDEX sarin_wa_outbox_reconcile','DROP TABLE sarin_wa_control_events','DROP TRIGGER sarin_wa_inbox_removed']){
 const f=await maintenanceFixture(t);f.sqlite.exec(sql);
 await assert.rejects(runRetention({SARIN_RETENTION_ENABLED:'true',SARIN_DB:f.db},{now:f.now}),/sarin_retention_failed/);
 await assert.rejects(clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true}),/sarin_history_recovery_failed/);
 }
});
test('restore_rotates_epoch_and_closes_send',async t=>{
 const f=await maintenanceFixture(t);const n=await f.notice(false),old=f.row('sarin_wa_pilot');
 const quota=f.row('sarin_wa_send_quota');await clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.notEqual(f.row('sarin_wa_pilot').epoch,old.epoch);assert.equal(f.row('sarin_wa_pilot').enabled,0);
 assert.equal(f.row('sarin_wa_send_quota').consumed,quota.consumed);assert.equal(f.row('sarin_wa_send_quota').reserved,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_send_closures').get().n,2);
 assert.equal(f.row('sarin_state').blocked,1);
 assert.equal((await f.store.claimGeneration({jobId:n.jobId,epoch:n.epoch,token:crypto.randomUUID()})).status,'terminal');
});
test('restored_queue_reference_never_runs',async t=>{
 const f=await maintenanceFixture(t);const c=await f.claim(await f.capture());
 await clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.equal((await f.store.claimGeneration({jobId:c.jobId,epoch:c.epoch,token:crypto.randomUUID()})).status,'terminal');
 assert.deepEqual(await f.store.listDispatchable(),[]);
});
test('consent_proof_is_atomic_immutable_and_bounded',async t=>{
 const f=await maintenanceFixture(t);await f.notice();await f.accept();
 const proof=f.row('sarin_wa_consent_proofs');assert.equal(proof.expires_at,proof.recorded_at+2*WORK_DAY);
 assert.throws(()=>f.sqlite.exec("UPDATE sarin_wa_consent_proofs SET accepted_at=accepted_at+1"));
 assert.throws(()=>f.sqlite.exec("UPDATE sarin_wa_consent_proofs SET expires_at=expires_at+1"));
 f.setTime(proof.expires_at);const result=await purgeWork(f);assert.equal(result.consents,1);assert.equal(f.row('sarin_wa_contexts').accepted_at,null);
});

test('maintenance_expires_external_leases_without_refunding_money',async t=>{
 const f=await maintenanceFixture(t);await f.notice();await f.accept();const c=await f.claim(await f.capture());await f.store.markInferenceStarted(c);
 const reservation=crypto.randomUUID();f.sqlite.prepare(`INSERT INTO sarin_reservations(id,stage,reserved_micros,daily_key,monthly_key,created_at,expires_at) VALUES(?,'generation',500,'day:synthetic','month:synthetic',?,?)`).run(reservation,f.now(),f.now()+35*WORK_DAY);
 await f.store.attachReservation({...c,reservationId:reservation});const before=money(f.sqlite);
 f.setTime(f.now()+120000);await purgeWork(f);
 assert.equal(f.row('sarin_wa_jobs').state,'inference_uncertain');assert.equal(f.row('sarin_wa_contexts').paused,1);
 assert.equal(f.row('sarin_wa_send_quota').reserved,0);assert.deepEqual(money(f.sqlite),before);
 f.setTime(f.now()+WORK_DAY);await purgeWork(f);assert.deepEqual(money(f.sqlite),before);
});
test('closure_schema_rejects_invalid_UTC_periods',async t=>{
 const f=await maintenanceFixture(t);
 for(const [scope,key,end] of [['day','garbage!!!',f.now()+WORK_DAY],['month','2026-99',f.now()+WORK_DAY],['day','2026-02-30',Date.UTC(2026,2,3)],['day','2026-10-18',f.now()+1]])
 assert.throws(()=>f.sqlite.prepare("INSERT INTO sarin_wa_send_closures VALUES(?,?,?,?, 'restore')").run(scope,key,BASE,end));
});
test('expired_live_outbox_still_uses_retained_proof_before_purge',async t=>{
 const f=await maintenanceFixture(t);await f.notice();f.setTime(f.now()+12*3600000);await f.accept();f.setTime(f.now()+12*3600000);
 const result=await f.store.applyStatus({eventId:'expired-notice-failure',providerId:'notice-id',status:'failed',at:f.now()});
 assert.equal(result.status,'applied');assert.equal(f.row('sarin_wa_consent_proofs').conflict,1);
});
test('orphan_work_schema_rejects_backup',async()=>{
 const {verifySarinBackup}=await import('./check-sarin-backup.mjs');
 const {readFile}=await import('node:fs/promises');
 let sql='';for(const name of ['0001_usage.sql','0002_history.sql','0003_leads.sql','0004_whatsapp_ingress.sql'])sql+=await readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8');
 sql+='CREATE TABLE sarin_wa_audit(audit_id TEXT);';await assert.rejects(verifySarinBackup(Buffer.from(sql)),e=>e.stage==='integrity');
});

test('restoration_closures_guard_reserve_beginSend_and_rollover',async t=>{
 const f=await maintenanceFixture(t);const n=await f.notice(false);const quota=f.row('sarin_wa_send_quota');
 const statements=maintenance.getWhatsAppWorkRecoveryStatements({db:f.db,at:f.now()});
 // Solo cierres del batch real: conserva una salida ready para probar beginSend.
 await f.db.batch(statements.filter(s=>s.sql.includes('INSERT INTO sarin_wa_send_closures')));
 await assert.rejects(f.store.beginSend(n),e=>e.code==='work_quota');assert.deepEqual(f.row('sarin_wa_send_quota'),quota);
 const state=await f.store.getSendClosure();assert.equal(state.closed,true);assert.equal(state.closures.length,2);
 await f.store.pausePeer({peerKey:f.peerKey,expectedRevision:f.row('sarin_wa_contexts').revision,actor:'test'});
 await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:f.row('sarin_wa_contexts').revision,actor:'test'});
 let c=await f.claim(await f.capture());
 await assert.rejects(f.store.createFixedReply({...c,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)}),e=>e.code==='work_quota');
 await f.store.finishWithoutReply({...c,reason:'ignored'});
 f.setTime(Date.UTC(2026,9,19));assert.equal((await f.store.getSendClosure()).closures.length,1);
 c=await f.claim(await f.capture());await assert.rejects(f.store.createFixedReply({...c,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)}),e=>e.code==='work_quota');
 f.setTime(Date.UTC(2026,10,1));await purgeWork(f);assert.equal((await f.store.getSendClosure()).closed,false);
 c=await f.claim(await f.capture());const o=await f.store.createFixedReply({...c,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)});
 await f.store.beginSend({...o,token:c.token});assert.equal(f.row('sarin_wa_send_quota').consumed,1);
});
test('empty_restore_closes_periods_and_second_restore_preserves_consumption',async t=>{
 const f=await maintenanceFixture(t);assert.equal(f.row('sarin_wa_send_quota'),undefined);
 await clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.equal(f.row('sarin_wa_send_quota'),undefined);assert.equal((await f.store.getSendClosure()).closures.length,2);
 f.sqlite.exec("INSERT INTO sarin_wa_send_quota VALUES('2026-10-17','2026-10',17,0)");
 const before=f.row('sarin_wa_send_quota');await clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.deepEqual(f.row('sarin_wa_send_quota'),before);assert.equal((await f.store.getSendClosure()).closures.length,2);
});
test('proof_write_failure_rolls_back_permission_and_retry_preserves_exact_times',async t=>{
 const f=await maintenanceFixture(t);await f.notice();
 f.sqlite.exec("CREATE TRIGGER reject_proof BEFORE INSERT ON sarin_wa_consent_proofs BEGIN SELECT RAISE(ABORT,'synthetic'); END");
 await assert.rejects(f.capture('ACEPTO'),e=>e.code==='ingress_unavailable');
 const e={sentAt:f.row('sarin_wa_inbox').sent_at}; // Recibo ya persistido; permiso revertido.
 assert.equal(f.row('sarin_wa_contexts').accepted_at,null);assert.equal(f.row('sarin_wa_consent_proofs'),undefined);
 f.sqlite.exec('DROP TRIGGER reject_proof');f.setTime(f.now()+1000);await f.store.reconcileConsent({peerKey:f.peerKey});
 const p=f.row('sarin_wa_consent_proofs');assert.equal(p.accepted_at,f.now());assert.equal(p.consent_expires_at,e.sentAt+WORK_DAY);
 await f.store.reconcileConsent({peerKey:f.peerKey});assert.deepEqual(f.row('sarin_wa_consent_proofs'),p);
});
for(const [field,value] of [['wabaId','98765'],['from','+573000000099'],['to','+573000000099'],['externalId','wrong-external'],['wamid','wrong.wamid']]){
 test('retained_proof_rejects_identity_'+field,async t=>{
  const f=await maintenanceFixture(t);await f.notice();await f.store.applyStatus({eventId:'bind',providerId:'notice-id',status:'read',wamid:'notice.wamid',at:f.now()});
  f.setTime(f.now()+12*3600000);await f.accept();f.setTime(f.now()+12*3600000);await purgeWork(f);
  const event={eventId:'conflict-'+field,providerId:'notice-id',status:'read',at:f.now(),[field]:value};await f.store.applyStatus(event);
  assert.equal(f.row('sarin_wa_consent_proofs').conflict,1);const revision=f.row('sarin_wa_contexts').revision;
  await f.store.applyStatus(event);assert.equal(f.row('sarin_wa_contexts').revision,revision);
 });
}
test('late_positive_proof_never_restores_revoked_consent_or_extends_dates',async t=>{
 const f=await maintenanceFixture(t);await f.notice();f.setTime(f.now()+12*3600000);await f.accept();const p=f.row('sarin_wa_consent_proofs');
 f.setTime(f.now()+12*3600000);await purgeWork(f);await f.capture('STOP');
 await f.store.applyStatus({eventId:'positive',providerId:'notice-id',status:'read',at:f.now()});
 assert.deepEqual(f.row('sarin_wa_consent_proofs'),p);assert.equal(f.row('sarin_wa_contexts').accepted_at,null);assert.equal(f.row('sarin_wa_contexts').paused,1);
 f.setTime(p.expires_at);assert.equal((await f.store.applyStatus({eventId:'too-late',providerId:'notice-id',status:'read',at:f.now()})).status,'ignored');
});
test('purge_limit_reports_remaining_and_releases_only_selected_reservations',async t=>{
 const f=await maintenanceFixture(t);const n=await f.notice(false);const at=f.now();
 await f.capture();await f.capture();f.setTime(at+WORK_DAY+5000);
 const first=await purgeWork(f,1);assert.equal(first.jobs,1);assert.equal(first.outbox,1);assert.equal(first.remaining,true);
 assert.equal(f.row('sarin_wa_send_quota').reserved,0);
 await purgeWork(f,1);const third=await purgeWork(f,1);assert.equal(third.jobs,1);assert.equal(f.row('sarin_wa_send_quota').consumed,0);
 assert.equal((await f.store.claimGeneration({jobId:n.jobId,epoch:n.epoch,token:crypto.randomUUID()})).status,'terminal');
});
test('restore_cancels_reconciliation_token_and_preserves_monetary_rows',async t=>{
 const f=await maintenanceFixture(t);const n=await f.notice();
 // Delivered notice cannot claim lookup; create a fresh notice in a fresh context.
 await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:f.row('sarin_wa_contexts').revision,actor:'test'});
 const c=await f.claim(await f.capture()),o=await f.store.createFixedReply({...c,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)});
 await f.store.beginSend({...o,token:c.token});await f.store.finishSend({...o,token:c.token,result:{status:'accepted',providerId:'lookup-id'}});
 await f.store.requestReconciliation({...o,actor:'test'});const token=crypto.randomUUID();
 const claim=await f.store.claimReconciliation({token,recipient:{wabaId:'12345',from:'+573000000002',to:'+573000000001'}});assert.equal(claim.status,'claimed');
 seedWebAndMoney(f.sqlite);const budget=money(f.sqlite),quota=f.row('sarin_wa_send_quota');
 await clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.deepEqual(money(f.sqlite),budget);assert.deepEqual(f.row('sarin_wa_send_quota'),quota);
 await assert.rejects(f.store.finishReconciliation({...o,token,result:{kind:'pending'}}),e=>e.code==='work_denied');
 assert.equal((await f.store.applyStatus({eventId:'after-restore',providerId:'notice-id',status:'read',at:f.now()})).status,'ignored');
});

test('retained_provider_binding_cannot_be_reassigned_to_new_notice',async t=>{
 const f=await maintenanceFixture(t);await f.notice();f.setTime(f.now()+12*3600000);await f.accept();f.setTime(f.now()+12*3600000);await purgeWork(f);
 await f.capture('STOP');await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:f.row('sarin_wa_contexts').revision,actor:'test'});
 const c=await f.claim(await f.capture()),o=await f.store.createFixedReply({...c,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)});
 await f.store.beginSend({...o,token:c.token});
 await assert.rejects(f.store.finishSend({...o,token:c.token,result:{status:'accepted',providerId:'notice-id'}}),e=>e.code==='work_conflict');
 assert.equal(f.row('sarin_wa_outbox').conflict,1);
});

test('runtime_schema_detects_changed_definitions_and_disabled_legacy',async t=>{
 const {detectWhatsAppSchema}=await import('../../server/sarin/whatsapp/work-schema.js');
 for(const sql of [
  "DROP TRIGGER sarin_wa_proof_immutable; CREATE TRIGGER sarin_wa_proof_immutable BEFORE UPDATE ON sarin_wa_consent_proofs BEGIN SELECT 1; END;",
  'DROP INDEX sarin_wa_outbox_reconcile; CREATE INDEX sarin_wa_outbox_reconcile ON sarin_wa_outbox(reconcile_next_at);',
  'ALTER TABLE sarin_wa_outbox RENAME COLUMN reconcile_token TO reconcile_token_wrong',
  'DROP VIEW sarin_wa_delivery_targets; CREATE VIEW sarin_wa_delivery_targets AS SELECT 1 AS outbox_id'
 ]){const f=await maintenanceFixture(t);f.sqlite.exec(sql);await assert.rejects(detectWhatsAppSchema({db:f.db}),/wa_schema_invalid/);}
 const legacy=await sqliteFixture({history:true,whatsapp:true});t.after(legacy.close);
 assert.equal(await detectWhatsAppSchema({db:legacy.db}),4);
 await assert.rejects(detectWhatsAppSchema({db:legacy.db,repliesEnabled:true}),/wa_schema_invalid/);
});
test('proof_manifest_matches_accumulated_schema_and_backup_restores_populated_synthetic_copy',async t=>{
 const f=await maintenanceFixture(t);await f.notice();await f.accept();seedWebAndMoney(f.sqlite);
 const {detectWhatsAppSchema}=await import('../../server/sarin/whatsapp/work-schema.js');assert.equal(await detectWhatsAppSchema({db:f.db}),7);
 const {verifySarinBackup,restoreBackupSql}=await import('./check-sarin-backup.mjs');const {DatabaseSync}=await import('node:sqlite');
 const objects=f.sqlite.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*'").all();
 const quoted=value=>f.sqlite.prepare('SELECT quote(?) q').get(value).q;
 const sql=objects.map(o=>o.sql+';').join('\n')+'\n'+objects.filter(o=>o.type==='table').flatMap(o=>f.sqlite.prepare('SELECT * FROM '+o.name).all().map(r=>'INSERT INTO '+o.name+' VALUES('+Object.values(r).map(quoted).join(',')+');')).join('\n');
 const report=await verifySarinBackup(Buffer.from(sql));assert.equal(report.whatsappWork.consents,1);assert.equal(report.whatsappWork.outbox,1);
 const copy=new DatabaseSync(':memory:');t.after(()=>copy.close());copy.exec('PRAGMA foreign_keys=ON');restoreBackupSql(copy,sql);
 const budget=money(copy);const quota=copy.prepare('SELECT * FROM sarin_wa_send_quota').get();
 // Adaptador D1 local sin red; reproduce transacción única sobre la copia restaurada.
 const db={prepare(sql){return {sql,values:[],bind(...values){return {...this,values};}};},async batch(statements){copy.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>{const q=copy.prepare(s.sql);return {success:true,results:q.columns().length?q.all(...s.values):(q.run(...s.values),[])};});copy.exec('COMMIT');return result;}catch(e){copy.exec('ROLLBACK');throw e;}}};
 await clearRestoredHistory({db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 for(const name of ['sarin_wa_jobs','sarin_wa_outbox','sarin_wa_consent_proofs','sarin_wa_inbox','sarin_messages'])assert.equal(count(copy,name),0);
 assert.deepEqual(money(copy),budget);assert.deepEqual(copy.prepare('SELECT * FROM sarin_wa_send_quota').get(),quota);
 assert.equal(copy.prepare('SELECT COUNT(*) n FROM sarin_wa_send_closures').get().n,2);
});

test('purging_expired_consent_rotates_context_before_surviving_inputs',async t=>{
 const f=await maintenanceFixture(t);await f.notice();await f.accept();const before=f.row('sarin_wa_contexts');
 f.setTime(before.consent_expires_at-60000);const pending=await f.capture();
 f.setTime(before.consent_expires_at);await purgeWork(f);
 const after=f.row('sarin_wa_contexts');assert.notEqual(after.context_id,before.context_id);assert.equal(after.paused,before.paused);
 const job=f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id=?').get(pending.eventId);assert.equal(job.state,'cancelled');
 assert.equal((await f.claim(await f.capture())).work.decision,'notice');
});

test('restore_reports_exact_work_counts',async t=>{
 const f=await maintenanceFixture(t);await f.notice();await f.accept();
 const expected={whatsappJobs:count(f.sqlite,'sarin_wa_jobs'),whatsappOutbox:count(f.sqlite,'sarin_wa_outbox'),whatsappConsents:count(f.sqlite,'sarin_wa_consent_proofs'),whatsappObservations:count(f.sqlite,'sarin_wa_delivery_observations')+count(f.sqlite,'sarin_wa_control_events'),whatsappAudits:count(f.sqlite,'sarin_wa_audit')};
 const result=await clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 for(const [key,value] of Object.entries(expected))assert.equal(result[key],value,key);
});

test('work_recovery_failure_rolls_back_epoch_closures_quotas_and_content',async t=>{
 const f=await maintenanceFixture(t);await f.notice();await f.accept();const c=await f.claim(await f.capture());await f.store.markInferenceStarted(c);
 const tables=['sarin_wa_pilot','sarin_wa_contexts','sarin_wa_jobs','sarin_wa_outbox','sarin_wa_consent_proofs','sarin_wa_send_quota','sarin_wa_send_closures','sarin_wa_inbox','sarin_state'];
 const before=Object.fromEntries(tables.map(name=>[name,f.sqlite.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]));
 f.sqlite.exec("CREATE TRIGGER fail_proof_delete BEFORE DELETE ON sarin_wa_consent_proofs BEGIN SELECT RAISE(ABORT,'CANARIO'); END");
 await assert.rejects(clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true}),e=>e.message==='sarin_history_recovery_failed'&&!e.cause);
 for(const name of tables)assert.deepEqual(f.sqlite.prepare('SELECT * FROM '+name+' ORDER BY 1').all(),before[name],name);
});

test('hundred_expired_jobs_apply_consequences_with_fixed_bindings_and_SQL',async t=>{
 const f=await maintenanceFixture(t);const at=f.now();
 for(let i=0;i<100;i++){
  const peer='bulk-peer-'+i,context='bulk-context-'+i,job='bulk-job-'+i,kind=i%5,day='2026-10-'+String(1+Math.floor(i/20)).padStart(2,'0');
  f.sqlite.prepare("INSERT INTO sarin_wa_contexts(peer_key,context_id,paused) VALUES(?,?,0)").run(peer,context);
  f.sqlite.prepare(`INSERT INTO sarin_wa_jobs(job_id,event_id,peer_key,epoch,context_id,peer_revision,state,token,lease_until,inference_started_at,reserved_bytes,quota_day,quota_month,quota_state,created_at,expires_at)
   VALUES(?,?,?,?,?,0,?,?,?, ?,4800,?,'2026-10',?,?,?)`).run(job,'bulk-event-'+i,peer,'bulk-epoch',context,['completed','inference_started','ready','claimed','queued'][kind],'bulk-token',at-1,kind===1?at-1000:null,day,kind===0?'consumed':'reserved',at-2000,at-1);
  f.sqlite.prepare(`INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed,reserved) VALUES(?,'2026-10',?,?)
   ON CONFLICT(day_key) DO UPDATE SET consumed=consumed+excluded.consumed,reserved=reserved+excluded.reserved`).run(day,kind===0?1:0,kind===0?0:1);
  if(kind===0||kind===2)f.sqlite.prepare(`INSERT INTO sarin_wa_outbox(outbox_id,job_id,peer_key,context_id,epoch,purpose,text,stored_bytes,external_id,state,started_at,created_at,expires_at)
   VALUES(?,?,?,?,?,'reply','Ficticio',8,?,?,?, ?,?)`).run('bulk-outbox-'+i,job,peer,context,'bulk-epoch','bulk-external-'+i,kind===0?'sending':'ready',kind===0?at-1000:null,at-1500,at-1);
 }
 let bindings=0,sql=0;const db={prepare:f.db.prepare,batch:async statements=>{bindings++;sql+=statements.length;return f.db.batch(statements);}};
 const result=await maintenance.purgeWhatsAppWork({db,now:f.now,limit:100});
 assert.equal(result.jobs,100);assert.equal(result.outbox,40);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM sarin_wa_contexts WHERE peer_key LIKE 'bulk-%' AND paused=1").get().n,40);
 assert.equal(f.sqlite.prepare('SELECT SUM(consumed) n FROM sarin_wa_send_quota').get().n,20);
 assert.equal(f.sqlite.prepare('SELECT SUM(reserved) n FROM sarin_wa_send_quota').get().n,0);
 assert.ok(bindings<=2,'binding calls='+bindings);assert.ok(sql<=25,'explicit SQL='+sql);
 t.diagnostic(JSON.stringify({limit:100,bindings,explicitSql:sql,expired:result.jobs,outputs:result.outbox,paused:40}));
});

test('bulk_expiry_recovers_unstarted_ready_without_releasing_its_reservation',async t=>{
 const f=await maintenanceFixture(t);const n=await f.notice(false);f.setTime(f.now()+120000);
 const result=await purgeWork(f);assert.equal(result.jobs,0);assert.equal(f.row('sarin_wa_jobs').state,'ready');assert.equal(f.row('sarin_wa_jobs').token,null);
 assert.equal(f.row('sarin_wa_contexts').paused,0);assert.equal(f.row('sarin_wa_send_quota').reserved,1);
 const token=crypto.randomUUID();assert.equal((await f.store.claimSend({jobId:n.jobId,epoch:n.epoch,token})).status,'claimed');
 await f.store.beginSend({outboxId:n.outboxId,token});assert.equal(f.row('sarin_wa_send_quota').consumed,1);
});
for(const renewed of [false,true])test('bulk_expiry_sending_context_guard_'+renewed,async t=>{
 const f=await maintenanceFixture(t);const n=await f.notice(false);await f.store.beginSend(n);
 if(renewed)await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:f.row('sarin_wa_contexts').revision,actor:'test'});
 const before=f.row('sarin_wa_contexts');f.setTime(f.now()+120000);await purgeWork(f);
 assert.equal(f.row('sarin_wa_outbox').state,'send_uncertain');assert.equal(f.row('sarin_wa_jobs').token,null);assert.equal(f.row('sarin_wa_send_quota').consumed,1);
 assert.equal(f.row('sarin_wa_contexts').paused,renewed?0:1);if(renewed)assert.equal(f.row('sarin_wa_contexts').revision,before.revision);
});
test('bulk_expiry_failure_rolls_back_markers_and_consequences',async t=>{
 const f=await maintenanceFixture(t);const n=await f.notice(false);await f.store.beginSend(n);f.setTime(f.now()+WORK_DAY);
 const tables=['sarin_wa_jobs','sarin_wa_outbox','sarin_wa_contexts','sarin_wa_send_quota'];const before=Object.fromEntries(tables.map(name=>[name,f.sqlite.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]));
 f.sqlite.exec("CREATE TRIGGER fail_work_delete BEFORE DELETE ON sarin_wa_jobs BEGIN SELECT RAISE(ABORT,'synthetic'); END");
 await assert.rejects(purgeWork(f));for(const name of tables)assert.deepEqual(f.sqlite.prepare('SELECT * FROM '+name+' ORDER BY 1').all(),before[name],name);
});

test('bulk_expiry_remaining_includes_unselected_ready_leases',async t=>{
 const f=await maintenanceFixture(t);await f.notice(false);const j=f.row('sarin_wa_jobs');
 f.sqlite.prepare("INSERT INTO sarin_wa_contexts(peer_key,context_id,paused) VALUES('ready-peer','ready-context',0)").run();
 f.sqlite.prepare(`INSERT INTO sarin_wa_jobs(job_id,event_id,peer_key,epoch,context_id,peer_revision,state,token,lease_until,quota_day,quota_month,quota_state,reserved_bytes,created_at,expires_at)
  VALUES('ready-job','ready-event','ready-peer',?,'ready-context',0,'ready','ready-token',?, ?,?,'reserved',100,?,?)`).run(j.epoch,j.lease_until,j.quota_day,j.quota_month,j.created_at,j.expires_at+1);
 f.sqlite.prepare('UPDATE sarin_wa_send_quota SET reserved=reserved+1 WHERE day_key=?').run(j.quota_day);
 f.sqlite.prepare(`INSERT INTO sarin_wa_outbox(outbox_id,job_id,peer_key,context_id,epoch,purpose,text,stored_bytes,external_id,created_at,expires_at)
  VALUES('ready-outbox','ready-job','ready-peer','ready-context',?,'notice','Aviso',5,'ready-external',?,?)`).run(j.epoch,j.created_at,j.expires_at+1);
 f.setTime(j.lease_until);const result=await purgeWork(f,1);assert.equal(result.remaining,true);
 assert.equal((await purgeWork(f,1)).remaining,false);
});

test('uppercase_schema_identifiers_are_not_mistaken_for_absent_channel',async t=>{
 const {readFile}=await import('node:fs/promises');const {detectWhatsAppSchema}=await import('../../server/sarin/whatsapp/work-schema.js');
 const f=await sqliteFixture({history:true});t.after(f.close);
 for(const name of ['0004_whatsapp_ingress.sql','0005_whatsapp_replies.sql'])f.sqlite.exec((await readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8')).replace(/\bsarin_wa_[a-z_]+\b/g,n=>n.toUpperCase()));
 assert.equal(await detectWhatsAppSchema({db:f.db}),5);
});
