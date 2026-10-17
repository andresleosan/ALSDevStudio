import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { createHistoryStore } from '../../server/sarin/history.js';

const load = path => import(path).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const worker = await load('../../workers/sarin-retention/index.js');
const recovery = await load('../../server/sarin/history-recovery.js');
const BASE = Date.UTC(2026, 9, 16, 12);
const DAY = 86400000;
const HASH = 'a'.repeat(64);
const EMPTY = 'b'.repeat(64);
const IDENTITY = 'c'.repeat(64);
const CONSENT = { noticeVersion: 'sarin-history-2026-10-16-v1', privacyVersion: '2026-10-16-sarin-history-v1', termsVersion: '2026-10-16-sarin-history-v1', noticeHash: 'd'.repeat(64), method: 'checkbox_and_start' };
const REQUEST = '00000000-0000-4000-8000-000000000001';
const PRIVATE = 'CONTENIDO-SINTETICO-QUE-NUNCA-SE-REGISTRA';
const count = (sqlite, table) => sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const retention = () => { assert.ok(worker?.runRetention, 'Falta implementar runRetention'); return worker.runRetention; };
const clear = () => { assert.ok(recovery?.clearRestoredHistory, 'Falta implementar clearRestoredHistory'); return recovery.clearRestoredHistory; };

async function setup(t) {
  const fixture = await sqliteFixture({ history: true });
  t.after(fixture.close);
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  let at = BASE;
  const now = () => at;
  const store = createHistoryStore({ db: fixture.db, now });
  return { ...fixture, store, now, setTime: value => { at = value; },
    session: (tokenHash = HASH) => store.createSession({ tokenHash, identity: IDENTITY, consent: CONSENT }),
    env: { SARIN_RETENTION_ENABLED: 'true', SARIN_DB: fixture.db } };
}

function money(sqlite) {
  return { state: sqlite.prepare('SELECT * FROM sarin_state').all(),
    counters: sqlite.prepare('SELECT * FROM sarin_counters ORDER BY key').all(),
    reservations: sqlite.prepare('SELECT * FROM sarin_reservations ORDER BY id').all() };
}

function seedMoney(sqlite) {
  sqlite.prepare('UPDATE sarin_state SET blocked = 1 WHERE singleton = 1').run();
  sqlite.prepare('INSERT INTO sarin_counters(key,value,expires_at) VALUES (?,?,?)').run('day:synthetic', 900, BASE + 35 * DAY);
  sqlite.prepare('INSERT INTO sarin_counters(key,value,expires_at) VALUES (?,?,?)').run('month:synthetic', 900, BASE + 35 * DAY);
  sqlite.prepare(`INSERT INTO sarin_reservations(id,stage,reserved_micros,daily_key,monthly_key,created_at,expires_at)
    VALUES ('synthetic-reservation','generation',900,'day:synthetic','month:synthetic',?,?)`).run(BASE, BASE + 35 * DAY);
}

async function populated(t) {
  const fixture = await setup(t);
  const { store, session, sqlite } = fixture;
  const { conversationId } = await session();
  await store.beginTurn({ tokenHash: HASH, requestId: REQUEST, message: PRIVATE });
  seedMoney(sqlite);
  await store.attachReservation({ conversationId, requestId: REQUEST, reservationId: 'synthetic-reservation' });
  await store.finishTurn({ tokenHash: HASH, requestId: REQUEST, status: 200, outcome: 'completed',
    body: { reply: 'Respuesta sintética.', examples: [], brief: {} } });
  await store.adminAction({ id: conversationId, action: 'review', actor: 'operator@example.test' });
  await session(EMPTY);
  await store.recordRejection({ code: 'invalid_request' });
  return { ...fixture, conversationId };
}

test('flag apagado evita cualquier acceso a D1 y no inicia lotes', async () => {
  const run = retention();
  for (const flag of [undefined, 'false', false, 'TRUE', '1', true]) {
    const env = { SARIN_RETENTION_ENABLED: flag, get SARIN_DB() { assert.fail('D1 debe quedar intacto'); } };
    const result = await run(env);
    assert.equal(result.status, 'disabled');
    assert.equal(result.batches, 0);
  }
});

test('cron elimina sesiones a 24h, rechazos/cuotas técnicas a 48h e historial/auditoría a 30d', async t => {
  const run = retention();
  const { env, now, store, sqlite, setTime } = await populated(t);
  setTime(BASE + DAY - 1);
  assert.equal((await run(env, { now })).sessions, 0);
  setTime(BASE + DAY);
  const sessions = await run(env, { now });
  assert.equal(sessions.sessions, 1);
  assert.equal(sessions.conversations, 0);
  assert.equal(count(sqlite, 'sarin_consents'), 1);
  setTime(BASE + 2 * DAY - 1);
  assert.equal((await run(env, { now })).rejections, 0);
  setTime(BASE + 2 * DAY);
  const technical = await run(env, { now });
  assert.equal(technical.rejections, 1);
  assert.equal(technical.counters, 2);
  setTime(BASE + 30 * DAY - 1);
  assert.equal((await run(env, { now })).conversations, 0);
  setTime(BASE + 30 * DAY);
  const history = await run(env, { now });
  assert.equal(history.conversations, 1);
  assert.equal(history.audits, 1);
  assert.equal(history.reservations, 0);
  for (const table of ['sarin_conversations', 'sarin_consents', 'sarin_messages', 'sarin_turns', 'sarin_turn_reservations', 'sarin_events', 'sarin_rejections', 'sarin_admin_audit']) assert.equal(count(sqlite, table), 0, table);
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 0);
  assert.deepEqual(await store.getPurgeStatus(), { lastRunAt: BASE + 30 * DAY, lastSuccessAt: BASE + 30 * DAY, lastErrorAt: null, status: 'ok', remaining: false });
  assert.equal(history.startedAt, BASE + 30 * DAY);
  assert.equal(history.finishedAt, BASE + 30 * DAY);
  setTime(BASE + 35 * DAY);
  const budget = await run(env, { now });
  assert.equal(budget.counters, 2);
  assert.equal(budget.reservations, 1);
});

test('límite de lote deja pendiente visible y siguiente ejecución suma y termina', async t => {
  const run = retention();
  const { env, now, store, sqlite } = await setup(t);
  const insert = sqlite.prepare('INSERT INTO sarin_rejections(minute,code,count,expires_at) VALUES (?,\'invalid_request\',1,?)');
  for (let n = 0; n < 251; n++) insert.run(n, BASE);
  const first = await run(env, { now, maxBatches: 1 });
  assert.equal(first.rejections, 100);
  assert.equal(first.batches, 1);
  assert.equal(first.remaining, true);
  assert.equal(count(sqlite, 'sarin_rejections'), 151);
  assert.equal((await store.getPurgeStatus()).remaining, true);
  const next = await run(env, { now });
  assert.equal(next.rejections, 151);
  assert.equal(next.batches, 2);
  assert.equal(next.remaining, false);
  assert.equal((await store.getPurgeStatus()).remaining, false);
});

test('una ejecución nunca procesa más de veinte lotes de cien', async t => {
  const run = retention();
  const { env, now, sqlite } = await setup(t);
  const insert = sqlite.prepare('INSERT INTO sarin_rejections(minute,code,count,expires_at) VALUES (?,\'invalid_request\',1,?)');
  for (let n = 0; n < 2001; n++) insert.run(n, BASE);
  const result = await run(env, { now });
  assert.equal(result.rejections, 2000);
  assert.equal(result.batches, 20);
  assert.equal(result.remaining, true);
  assert.equal(count(sqlite, 'sarin_rejections'), 1);
  await assert.rejects(() => run(env, { now, maxBatches: 21 }), { message: 'sarin_retention_failed' });
  assert.equal(count(sqlite, 'sarin_rejections'), 1);
});

test('fallo SQL produce estado error y excepción genérica sin contenido en logs', async t => {
  const run = retention();
  const { env, now, store, sqlite, setTime } = await populated(t);
  const logs = [];
  t.mock.method(console, 'log', (...args) => logs.push(args));
  t.mock.method(console, 'error', (...args) => logs.push(args));
  sqlite.exec(`CREATE TRIGGER synthetic_retention_failure BEFORE DELETE ON sarin_rejections BEGIN SELECT RAISE(ABORT,'${PRIVATE}'); END`);
  setTime(BASE + 2 * DAY);
  await assert.rejects(() => run(env, { now }), error => error.message === 'sarin_retention_failed' && error.cause === undefined);
  assert.deepEqual(await store.getPurgeStatus(), { lastRunAt: BASE + 2 * DAY, lastSuccessAt: null, lastErrorAt: BASE + 2 * DAY, status: 'error', remaining: false });
  assert.equal(count(sqlite, 'sarin_messages'), 2);
  assert.ok(logs.length > 0);
  assert.ok(!JSON.stringify(logs).includes(PRIVATE));
  assert.ok(!JSON.stringify(logs).includes('operator@example.test'));
  assert.ok(!JSON.stringify(logs).includes(HASH));
  for (const args of logs) for (const entry of args) {
    const record = typeof entry === 'string' ? JSON.parse(entry) : entry;
    assert.equal(record.event, 'sarin_retention');
    for (const [key, value] of Object.entries(record)) if (!['event', 'status'].includes(key)) assert.equal(typeof value, 'number', key);
  }
});

test('scheduled espera la purga real y el Worker no ofrece handler HTTP', async t => {
  retention();
  const { env, sqlite } = await setup(t);
  sqlite.prepare('INSERT INTO sarin_rejections(minute,code,count,expires_at) VALUES (0,\'invalid_request\',1,0)').run();
  assert.equal(worker.default.fetch, undefined);
  await worker.default.scheduled({ cron: '0 * * * *', scheduledTime: 0 }, env, {});
  assert.equal(count(sqlite, 'sarin_rejections'), 0);
  assert.equal(sqlite.prepare('SELECT purge_status FROM sarin_history_state').get().purge_status, 'ok');
  const config = JSON.parse(await readFile(new URL('../../workers/sarin-retention/wrangler.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(config.triggers.crons, ['0 * * * *']);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.route, undefined);
  assert.equal(config.routes, undefined);
  assert.equal(config.vars.SARIN_RETENTION_ENABLED, 'false');
  assert.equal(config.d1_databases[0].binding, 'SARIN_DB');
  assert.equal(config.d1_databases[0].database_id, '00000000-0000-0000-0000-000000000002');
});

test('producción comparte D1 con la purga y los previews quedan aislados y apagados', async () => {
  const pages = JSON.parse(await readFile(new URL('../../wrangler.jsonc', import.meta.url), 'utf8'));
  const purge = JSON.parse(await readFile(new URL('../../workers/sarin-retention/wrangler.jsonc', import.meta.url), 'utf8'));
  const operational = pages.d1_databases.find(entry => entry.binding === 'SARIN_DB');
  const job = purge.env?.production;
  assert.ok(job, 'Producción de purga debe elegirse explícitamente');
  assert.equal(job.vars.SARIN_RETENTION_ENABLED, 'true');
  assert.equal(job.d1_databases[0].database_id, operational.database_id);
  assert.notEqual(operational.database_id, purge.d1_databases[0].database_id, 'Desarrollo no usa el identificador operativo');
  assert.equal(job.workers_dev, false);
  assert.equal(job.preview_urls, false);
  assert.deepEqual(job.triggers.crons, ['0 * * * *']);
  assert.deepEqual(pages.env.preview.d1_databases, []);
  for (const key of ['SARIN_ENABLED', 'SARIN_HISTORY_ENABLED', 'SARIN_ADMIN_ENABLED']) {
    assert.equal(pages.vars[key], 'false');
    assert.equal(pages.env.preview.vars[key], 'false');
  }
});

test('recuperación exige mantenimiento y drenaje explícitos antes de tocar D1', async () => {
  const reset = clear();
  for (const [maintenanceConfirmed, requestsDrained] of [[false, false], [true, false], [false, true], ['true', true], [true, 'true']]) {
    const db = { prepare() { assert.fail('No debe consultar D1'); }, batch() { assert.fail('No debe mutar D1'); } };
    await assert.rejects(() => reset({ db, maintenanceConfirmed, requestsDrained }), { message: 'sarin_history_recovery_requires_maintenance' });
  }
});

test('recuperación borra también historial vigente y reconcilia capacidad sin modificar dinero', async t => {
  const reset = clear();
  const { db, sqlite } = await populated(t);
  const before = money(sqlite);
  // Simula un contador restaurado discordante; el borrado usa los triggers reales.
  sqlite.prepare('UPDATE sarin_history_state SET text_bytes = 1,rejection_overflow = 9,purge_status = \'ok\',last_success_at = ?').run(BASE);
  const result = await reset({ db, maintenanceConfirmed: true, requestsDrained: true });
  assert.deepEqual(result, { conversations: 2, turns: 1, messages: 2, consents: 2, turnReservations: 1, events: 2, rejections: 1, audits: 1,
    capacityBytesReleased: Buffer.byteLength(PRIVATE) + Buffer.byteLength(JSON.stringify({ reply: 'Respuesta sintética.', examples: [], brief: {} })), budgetReconciliationRequired: true });
  for (const table of ['sarin_conversations', 'sarin_consents', 'sarin_messages', 'sarin_turns', 'sarin_turn_reservations', 'sarin_events', 'sarin_rejections', 'sarin_admin_audit']) assert.equal(count(sqlite, table), 0, table);
  assert.deepEqual(money(sqlite), before);
  assert.deepEqual({ ...sqlite.prepare('SELECT * FROM sarin_history_state').get() }, { singleton: 1, text_bytes: 0, rejection_overflow: 0, last_run_at: null, last_success_at: null, last_error_at: null, purge_status: 'never', purge_remaining: 0 });
  assert.equal((await reset({ db, maintenanceConfirmed: true, requestsDrained: true })).conversations, 0);
});

test('recuperación fallida revierte todo el historial y capacidad en una transacción', async t => {
  const reset = clear();
  const { db, sqlite } = await populated(t);
  const beforeMoney = money(sqlite);
  const beforeCapacity = sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes;
  sqlite.exec(`CREATE TRIGGER synthetic_recovery_failure BEFORE DELETE ON sarin_admin_audit BEGIN SELECT RAISE(ABORT,'${PRIVATE}'); END`);
  await assert.rejects(() => reset({ db, maintenanceConfirmed: true, requestsDrained: true }), error => error.message === 'sarin_history_recovery_failed' && error.cause === undefined);
  assert.equal(count(sqlite, 'sarin_conversations'), 2);
  assert.equal(count(sqlite, 'sarin_messages'), 2);
  assert.equal(count(sqlite, 'sarin_rejections'), 1);
  assert.equal(count(sqlite, 'sarin_admin_audit'), 1);
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, beforeCapacity);
  assert.deepEqual(money(sqlite), beforeMoney);
});
