import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { LEAD, LEAD_BYTES } from './sarin-lead-fixture.mjs';
import { createHistoryStore } from '../../server/sarin/history.js';
import { clearRestoredHistory } from '../../server/sarin/history-recovery.js';
import { handleSarinSession } from '../../server/sarin/sessions.js';
import { NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION } from '../../scripts/modules/sarin-consent.js';

const BASE = Date.UTC(2026, 9, 17, 12), DAY = 86400000;
const HASH = 'a'.repeat(64), IDENTITY = 'b'.repeat(64), ID = '00000000-0000-4000-8000-000000000001';
const CONSENT = { noticeVersion: 'fixture-v1', privacyVersion: 'fixture-v1', termsVersion: 'fixture-v1', noticeHash: 'c'.repeat(64), method: 'checkbox_and_start' };
const missing = error => error.status === 503 && error.code === 'history_unavailable';
const count = (sqlite, table) => sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
async function setup(t, limits = {}, leads = true) {
  const fixture = await sqliteFixture({ history: true, leads }); t.after(fixture.close);
  let clock = BASE;
  const store = createHistoryStore({ db: fixture.db, now: () => clock, limits });
  return { ...fixture, store, time: value => { clock = value; },
    session: (tokenHash = HASH, lead = LEAD) => store.createSession({ tokenHash, identity: IDENTITY, consent: CONSENT, lead }) };
}

test('contacto normalizado aparece sólo en consultas administrativas y cuenta bytes UTF-8', async t => {
  const f = await setup(t);
  const lead = { firstName: '  Ana  María ', lastName: ' Pe\u0301rez ', email: 'Local@EXAMPLE.TEST' };
  const created = await f.session(HASH, lead);
  const expected = { firstName: 'Ana María', lastName: 'Pérez', email: 'Local@example.test' };
  assert.deepEqual((await f.store.getConversation(created.conversationId)).lead, expected);
  assert.deepEqual((await f.store.listConversations()).items[0].lead, expected);
  assert.deepEqual(Object.keys(created).sort(), ['conversationId', 'sessionExpiresAt']);
  const bytes = Buffer.byteLength('Ana MaríaPérezLocal@example.test');
  assert.equal(f.sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, bytes);
  const turn = await f.store.beginTurn({ tokenHash: HASH, requestId: ID, message: 'Necesito una tienda' });
  assert.deepEqual(turn.history, []); assert.equal(JSON.stringify(turn).includes(expected.email), false);
});

test('almacén también exige contacto válido aunque se invoque sin handler HTTP', async t => {
  const f = await setup(t);
  for (const lead of [undefined, null, {}, { ...LEAD, email: 'invalid' }, { ...LEAD, extra: true }]) {
    await assert.rejects(() => f.store.createSession({ tokenHash: HASH, identity: IDENTITY, consent: CONSENT, lead }), error => error.status === 400);
  }
  assert.equal(count(f.sqlite, 'sarin_conversations'), 0); assert.equal(count(f.sqlite, 'sarin_counters'), 0);
});

test('capacidad de contacto rechaza el batch completo sin sesión, consentimiento ni cuota parcial', async t => {
  const f = await setup(t, { maxTextBytes: LEAD_BYTES - 1 });
  await assert.rejects(() => f.session(), error => error.status === 429 && error.code === 'history_capacity');
  for (const table of ['sarin_conversations', 'sarin_consents', 'sarin_leads', 'sarin_counters']) assert.equal(count(f.sqlite, table), 0, table);
  assert.equal(f.sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 0);
});

test('dos admisiones concurrentes respetan capacidad global incluyendo contacto', async t => {
  const f = await setup(t, { maxTextBytes: LEAD_BYTES });
  const result = await Promise.allSettled([f.session(), f.session('d'.repeat(64))]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(result.filter(item => item.status === 'rejected' && item.reason.code === 'history_capacity').length, 1);
  assert.equal(count(f.sqlite, 'sarin_conversations'), 1); assert.equal(count(f.sqlite, 'sarin_leads'), 1);
  assert.equal(f.sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, LEAD_BYTES);
});

test('esquema 0002 sin migración de contacto falla cerrado y revierte todas las escrituras', async t => {
  const f = await setup(t, {}, false);
  await assert.rejects(() => f.session(), missing);
  for (const table of ['sarin_conversations', 'sarin_consents', 'sarin_counters']) assert.equal(count(f.sqlite, table), 0, table);
});

test('API pública con esquema 0002 devuelve 503 sin cookie ni datos personales o escrituras', async t => {
  const f = await setup(t, {}, false);
  const request = new Request('https://fixture.test/api/sarin/session', { method: 'POST', headers: { Origin: 'https://fixture.test',
    'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify({ lead: LEAD,
      consent: { accepted: true, noticeVersion: NOTICE_VERSION, privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION } }) });
  const response = await handleSarinSession(request, { SARIN_ENABLED: 'true', SARIN_HISTORY_ENABLED: 'true', SARIN_DB: f.db, SARIN_IP_SECRET: 'fixture-private-ip-secret-with-at-least-32-characters' }, { now: () => BASE });
  assert.equal(response.status, 503); assert.equal(response.headers.has('Set-Cookie'), false);
  const body = await response.text(); assert.equal(body.includes(LEAD.email), false); assert.equal(body.includes('sarin_lead'), false);
  for (const table of ['sarin_conversations', 'sarin_consents', 'sarin_counters']) assert.equal(count(f.sqlite, table), 0, table);
});

test('migración aditiva conserva conversación antigua con lead null y permite continuarla', async t => {
  const f = await setup(t, {}, false);
  f.sqlite.prepare('INSERT INTO sarin_session_commands(id,token_hash,at,identity,max_conversations,per_minute,per_day,max_events) VALUES (?,?,?,?,?,?,?,?)')
    .run(ID, HASH, BASE, IDENTITY, 2000, 5, 20, 32);
  f.sqlite.exec(await readFile(new URL('../../migrations/sarin/0003_leads.sql', import.meta.url), 'utf8'));
  assert.equal((await f.store.getConversation(ID)).lead, null);
  assert.equal((await f.store.listConversations()).items[0].lead, null);
  assert.equal((await f.store.beginTurn({ tokenHash: HASH, requestId: ID, message: 'Continuar conversación antigua' })).turn, 1);
});

test('reversión de aplicación conserva contactos y admite el comando anterior sin borrar datos', async t => {
  const f = await setup(t); const current = await f.session();
  // El código anterior sólo usa este comando; la migración no altera su contrato.
  f.sqlite.prepare('INSERT INTO sarin_session_commands(id,token_hash,at,identity,max_conversations,per_minute,per_day,max_events) VALUES (?,?,?,?,?,?,?,?)')
    .run(ID, 'd'.repeat(64), BASE, IDENTITY, 2000, 5, 20, 32);
  assert.deepEqual((await f.store.getConversation(current.conversationId)).lead, LEAD);
  assert.equal((await f.store.getConversation(ID)).lead, null);
  assert.equal(count(f.sqlite, 'sarin_conversations'), 2); assert.equal(count(f.sqlite, 'sarin_leads'), 1);
  assert.equal(f.sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, LEAD_BYTES);
});

for (const started of [false, true]) test(`purga elimina contacto en cascada al vencer ${started ? '30 días desde primer mensaje' : '24 horas sin mensajes'}`, async t => {
  const f = await setup(t); const created = await f.session();
  assert.deepEqual((await f.store.getConversation(created.conversationId)).lead, LEAD);
  if (started) await f.store.beginTurn({ tokenHash: HASH, requestId: ID, message: 'Tienda' });
  f.time(BASE + (started ? 30 : 1) * DAY);
  assert.deepEqual((await f.store.listConversations()).items, []);
  await f.store.purge();
  assert.equal(count(f.sqlite, 'sarin_leads'), 0);
  assert.equal(f.sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 0);
});

test('eliminación administrativa libera contacto una vez sin borrar reservas monetarias', async t => {
  const f = await setup(t); const created = await f.session();
  assert.deepEqual((await f.store.getConversation(created.conversationId)).lead, LEAD);
  f.sqlite.prepare('INSERT INTO sarin_reservations(id,reserved_micros,stage,created_at,expires_at,daily_key,monthly_key) VALUES (?,?,?,?,?,?,?)')
    .run('unrelated-money', 1, 'classification', BASE, BASE + 35 * DAY, 'day-fixture', 'month-fixture');
  await f.store.adminAction({ id: created.conversationId, action: 'delete', actor: 'e'.repeat(64) });
  assert.equal(count(f.sqlite, 'sarin_leads'), 0); assert.equal(count(f.sqlite, 'sarin_reservations'), 1);
  assert.equal(f.sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 0);
});

test('recuperación conservadora incluye contacto y devuelve su capacidad sin retener datos', async t => {
  const f = await setup(t); const created = await f.session();
  assert.deepEqual((await f.store.getConversation(created.conversationId)).lead, LEAD);
  const result = await clearRestoredHistory({ db: f.db, maintenanceConfirmed: true, requestsDrained: true });
  assert.equal(result.leads, 1); assert.equal(result.capacityBytesReleased, LEAD_BYTES);
  assert.equal(count(f.sqlite, 'sarin_leads'), 0); assert.equal(JSON.stringify(result).includes(LEAD.email), false);
});
