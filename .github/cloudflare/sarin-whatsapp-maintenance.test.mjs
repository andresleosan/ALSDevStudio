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
