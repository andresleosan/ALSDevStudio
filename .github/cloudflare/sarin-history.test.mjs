import { LEAD, LEAD_BYTES } from './sarin-lead-fixture.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { createQuota } from '../../server/sarin/quota.js';

const implementation = await import('../../server/sarin/history.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const BASE = Date.UTC(2026, 9, 16, 12);
const DAY = 86400000;
const HASH = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const IDENTITY = 'c'.repeat(64);
const CONSENT = { noticeVersion: 'sarin-history-2026-10-16-v1', privacyVersion: '2026-10-16-sarin-history-v1', termsVersion: '2026-10-16-sarin-history-v1', noticeHash: 'd'.repeat(64), method: 'checkbox_and_start' };
const BODY = { reply: 'Puedo ayudarte con tu sitio.', examples: [], brief: {}, service: 'website' };
const ERROR = { error: { code: 'budget_limit', message: 'Límite de uso alcanzado.' } };
const rid = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const rejects = (status, code) => error => error instanceof implementation.HistoryError && error.status === status && (!code || error.code === code);
async function setup(t, limits = {}) {
  assert.ok(implementation, 'Falta implementar almacén de historial');
  const fixture = await sqliteFixture({ history: true });
  t.after(fixture.close);
  let clock = BASE;
  const store = implementation.createHistoryStore({ db: fixture.db, now: () => clock, limits });
  return { ...fixture, store, setTime: value => { clock = value; },
    session: (tokenHash = HASH, identity = IDENTITY) => store.createSession({ tokenHash, identity, consent: CONSENT, lead: LEAD }),
    begin: (number, message = 'Necesito un sitio', tokenHash = HASH) => store.beginTurn({ tokenHash, requestId: rid(number), message }),
    finish: (number, body = BODY, outcome = 'completed', status = 200, tokenHash = HASH) => store.finishTurn({ tokenHash, requestId: rid(number), body, outcome, status }),
  };
}

test('sesión guarda autorización con fecha del servidor y no conserva identidad IP', async t => {
  const { session, store, sqlite } = await setup(t);
  const created = await session();
  assert.match(created.conversationId, /^[a-f0-9-]{36}$/);
  assert.equal(created.sessionExpiresAt, BASE + DAY);
  const detail = await store.getConversation(created.conversationId);
  assert.deepEqual(detail.consent, { ...CONSENT, acceptedAt: BASE });
  assert.deepEqual(detail.messages, []);
  assert.equal(detail.status, 'empty');
  const transcript = sqlite.prepare('SELECT * FROM sarin_conversations').all();
  assert.ok(!JSON.stringify(transcript).includes(IDENTITY));
  assert.ok(!JSON.stringify(detail).includes(HASH));
});

test('sesiones requieren hash y consentimiento válidos y respetan 5/minuto 20/día', async t => {
  const { store, session, setTime } = await setup(t);
  for (const consent of [null, {}, { ...CONSENT, noticeHash: 'bad' }, { ...CONSENT, method: 'implicit' }]) {
    await assert.rejects(() => store.createSession({ tokenHash: HASH, identity: IDENTITY, consent, lead: LEAD }), rejects(400));
  }
  for (let number = 0; number < 20; number++) {
    setTime(BASE + Math.floor(number / 5) * 60000);
    await session(number.toString(16).padStart(64, '0'));
    if (number % 5 === 4) await assert.rejects(() => session('e'.repeat(64)), rejects(429, 'session_rate_limit'));
  }
  setTime(BASE + 5 * 60000);
  await assert.rejects(() => session('e'.repeat(64)), rejects(429));
  setTime(BASE + DAY);
  await session('e'.repeat(64));
});

test('propiedad, bloqueo, vigencia y UUID se verifican antes de guardar mensajes', async t => {
  const { store, session, begin, sqlite, setTime } = await setup(t);
  const { conversationId } = await session();
  await assert.rejects(() => begin(1, 'No admitido', OTHER), rejects(401, 'session_invalid'));
  await assert.rejects(() => store.beginTurn({ tokenHash: HASH, requestId: 'invalid', message: 'No' }), rejects(400));
  await store.adminAction({ id: conversationId, action: 'block', actor: 'owner@example.test' });
  await assert.rejects(() => begin(1), rejects(403, 'session_blocked'));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 0);
  setTime(BASE + DAY);
  await assert.rejects(() => begin(1), rejects(401, 'session_expired'));
});

test('admisión simultánea admite solo un mensaje y reserva respuesta máxima antes de cuota', async t => {
  const { session, begin, sqlite } = await setup(t, { maxReplyBytes: 100, maxTextBytes: 200 });
  await session();
  const results = await Promise.allSettled([begin(1, 'á'), begin(2, 'b')]);
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal(results.filter(value => value.status === 'rejected' && rejects(409)(value.reason)).length, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 1);
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 102 + LEAD_BYTES);
});

test('replay es estable, cambio de texto o request activo falla sin duplicar turnos', async t => {
  const { session, begin, finish, store } = await setup(t);
  const { conversationId } = await session();
  const started = await begin(1);
  assert.equal(started.turn, 1);
  assert.equal(started.expiresAt, BASE + 30 * DAY);
  await assert.rejects(() => begin(1), rejects(409, 'turn_in_progress'));
  await finish(1);
  const replay = await begin(1);
  assert.deepEqual(replay.replay, { status: 200, body: BODY });
  await assert.rejects(() => begin(1, 'Otro texto'), rejects(409, 'request_conflict'));
  assert.equal((await store.getConversation(conversationId)).turns, 1);
});

test('replay terminado sigue disponible mientras otro turno está pendiente', async t => {
  const { session, begin, finish } = await setup(t);
  await session(); await begin(1); await finish(1); await begin(2);
  assert.deepEqual((await begin(1)).replay, { status: 200, body: BODY });
});

test('finish de token ajeno no modifica el turno de otra sesión', async t => {
  const { session, begin, finish, store } = await setup(t);
  const { conversationId } = await session(); await session(OTHER); await begin(1);
  assert.deepEqual(await finish(1, BODY, 'completed', 200, OTHER), { applied: false });
  assert.equal((await store.getConversation(conversationId)).status, 'pending');
  assert.deepEqual(await finish(1), { applied: true });
});

test('contexto contiene únicamente cuatro pares auténticos sin errores', async t => {
  const { session, begin, finish } = await setup(t);
  await session();
  for (let number = 1; number <= 6; number++) {
    await begin(number, `entrada ${number}`);
    await finish(number, number === 3 ? ERROR : { ...BODY, reply: `salida ${number}` }, number === 3 ? 'error' : 'completed', number === 3 ? 429 : 200);
  }
  const next = await begin(7);
  assert.deepEqual(next.history.map(item => item.content), ['entrada 2', 'salida 2', 'entrada 4', 'salida 4', 'entrada 5', 'salida 5', 'entrada 6', 'salida 6']);
});

test('máximo quince turnos también se exige en servidor', async t => {
  const { session, begin, finish } = await setup(t);
  await session();
  for (let number = 1; number <= 15; number++) { await begin(number); await finish(number); }
  await assert.rejects(() => begin(16), rejects(429, 'turn_limit'));
  assert.ok((await begin(15)).replay);
});

test('capacidad global incluye sesiones vacías y reservas concurrentes, sin admisión parcial', async t => {
  const { session, begin, store, sqlite } = await setup(t, { maxConversations: 2, maxReplyBytes: 100, maxTextBytes: 120 + 2 * LEAD_BYTES });
  await session(); await session(OTHER, 'e'.repeat(64));
  await assert.rejects(() => session('f'.repeat(64)), rejects(429, 'history_capacity'));
  await begin(1, 'a');
  await assert.rejects(() => begin(2, 'b', OTHER), rejects(429, 'history_capacity'));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 1);
  assert.equal((await store.listConversations({})).items.length, 2);
});

test('finalización concurrente libera solo reserva restante una vez y preserva respuesta original', async t => {
  const { session, begin, finish, sqlite, store } = await setup(t);
  const { conversationId } = await session(); await begin(1, 'á');
  const done = await Promise.all([finish(1), finish(1)]);
  assert.deepEqual(done.map(item => item.applied).sort(), [false, true]);
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, LEAD_BYTES + 2 + Buffer.byteLength(JSON.stringify(BODY)));
  assert.deepEqual(await finish(1, { ...BODY, reply: 'diferente' }), { applied: false });
  const detail = await store.getConversation(conversationId);
  assert.equal(detail.messages.length, 2);
  assert.equal(detail.messages[1].content, BODY.reply);
});

test('fallo de cuota posterior conserva mensaje admitido y error público, excluido del contexto', async t => {
  const { session, begin, finish, store } = await setup(t);
  const { conversationId } = await session(); await begin(1);
  await finish(1, ERROR, 'error', 429);
  const detail = await store.getConversation(conversationId);
  assert.equal(detail.errorCount, 1);
  assert.equal(detail.messages[0].content, 'Necesito un sitio');
  assert.equal(detail.messages[1].content, ERROR.error.message);
  assert.deepEqual((await begin(2)).history, []);
});

test('respuestas inválidas no alteran turno pendiente ni capacidad', async t => {
  const { session, begin, finish, sqlite } = await setup(t, { maxReplyBytes: 200 });
  await session(); await begin(1);
  const before = sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes;
  for (const body of [null, {}, { reply: 'x'.repeat(1201) }, { ...BODY, private: 'not public' }, { ...BODY, examples: [{}] }, { ...BODY, examples: [{ id: 'secret', url: 'private' }] }, { error: { code: 'unknown', message: 'raw private provider' } }]) {
    await assert.rejects(() => finish(1, body), rejects(400));
  }
  await assert.rejects(() => finish(1, { ...BODY, reply: 'x'.repeat(190) }), rejects(400));
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, before);
});

test('finish rechaza metadatos válidos que pertenecen a otro turno o conversación', async t => {
  const { session, begin, finish, store, sqlite } = await setup(t);
  const { conversationId } = await session();
  const { conversationId: otherId } = await session(OTHER);
  const started = await begin(1);
  const publicBody = { ...BODY, conversationId, requestId: rid(1), turn: 1, expiresAt: started.expiresAt };
  const before = sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes;
  for (const extra of [{ conversationId: otherId }, { requestId: rid(2) }, { turn: 2 }, { expiresAt: started.expiresAt + 1 }]) {
    await assert.rejects(() => finish(1, { ...publicBody, ...extra }), rejects(400, 'invalid_request'));
  }
  assert.equal((await store.getConversation(conversationId)).messages.length, 1);
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, before);
  assert.deepEqual(await finish(1, publicBody), { applied: true });
  assert.deepEqual((await begin(1)).replay.body, publicBody);
});

test('reservas monetarias separadas enlazan uso verificado y retenido sin copiar identidad', async t => {
  const { session, begin, store, db } = await setup(t);
  const { conversationId } = await session(); await begin(1);
  const quota = createQuota({ db, identity: IDENTITY, now: () => BASE });
  await quota.reserve({ id: 'classification-one', stage: 'classification', amountMicros: 100 });
  await quota.reserve({ id: 'generation-one', stage: 'generation', amountMicros: 200 });
  for (const reservationId of ['classification-one', 'classification-one', 'generation-one']) await store.attachReservation({ conversationId, requestId: rid(1), reservationId });
  await quota.settle('classification-one', 30);
  const detail = await store.getConversation(conversationId);
  assert.deepEqual(detail.usage, { reservedMicros: 300, verifiedMicros: 30, retainedMicros: 200 });
  assert.ok(!JSON.stringify(detail).includes(IDENTITY));
});

test('borrado libera capacidad y finish tardío no recrea datos ni toca dinero', async t => {
  const { session, begin, finish, store, sqlite, db } = await setup(t);
  const { conversationId } = await session(); await begin(1);
  const quota = createQuota({ db, identity: IDENTITY, now: () => BASE });
  await quota.reserve({ id: 'retained', stage: 'classification', amountMicros: 100 });
  await store.attachReservation({ conversationId, requestId: rid(1), reservationId: 'retained' });
  await store.adminAction({ id: conversationId, action: 'delete', actor: 'owner@example.test' });
  assert.deepEqual(await finish(1), { applied: false });
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_reservations').get().n, 1);
  await assert.rejects(() => store.getConversation(conversationId), rejects(404));
  const audit = sqlite.prepare('SELECT * FROM sarin_admin_audit').get();
  assert.equal(audit.actor, 'owner@example.test');
  assert.ok(!JSON.stringify(audit).includes('Necesito'));
});

test('expiración lógica oculta inmediatamente y purga física es acotada e idempotente', async t => {
  const { session, begin, finish, store, setTime, sqlite } = await setup(t);
  const { conversationId } = await session(); await begin(1); await finish(1);
  await session(OTHER, 'e'.repeat(64));
  setTime(BASE + DAY);
  const emptyPurge = await store.purge({ limit: 1 });
  assert.equal(emptyPurge.sessions, 1);
  assert.equal((await store.listConversations({})).items.length, 1);
  setTime(BASE + 30 * DAY);
  assert.deepEqual(await store.listConversations({}), { items: [], nextCursor: null });
  await assert.rejects(() => store.getConversation(conversationId), rejects(404));
  assert.equal((await store.purge({ limit: 1 })).conversations, 1);
  assert.equal((await store.purge({ limit: 1 })).conversations, 0);
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 0);
});

test('lease vencido libera respuesta, mantiene entrada y descarta respuesta tardía', async t => {
  const { session, begin, finish, store, setTime, sqlite } = await setup(t);
  const { conversationId } = await session(); await begin(1, 'a');
  setTime(BASE + 45000);
  await store.purge();
  assert.deepEqual(await finish(1), { applied: false });
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 1 + LEAD_BYTES);
  assert.equal((await store.getConversation(conversationId)).messages.length, 1);
  const replay = await begin(1, 'a');
  assert.equal(replay.replay.status, 504);
  assert.equal(replay.replay.body.error.code, 'timeout');
});

test('solicitante recupera su lease vencido aunque haya más de cien pendientes anteriores', async t => {
  const { session, begin, finish, store, setTime, sqlite } = await setup(t);
  let lastToken;
  for (let number = 0; number <= 100; number++) {
    const token = number.toString(16).padStart(64, '0');
    const identity = (number + 1000).toString(16).padStart(64, '0');
    await session(token, identity);
    await begin(1, 'a', token);
    lastToken = token;
  }
  setTime(BASE + 45000);
  const started = await begin(2, 'b', lastToken);
  assert.equal(started.turn, 2);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sarin_turns WHERE outcome = 'timeout'").get().n, 101);
  assert.equal((await store.getConversation(started.conversationId)).messages.length, 2);
  assert.deepEqual(await finish(1, BODY, 'completed', 200, lastToken), { applied: false });
});

test('rechazos agregados tienen tope, no guardan cuerpos y vencen a 48 horas', async t => {
  const { store, sqlite, setTime } = await setup(t, { maxRejections: 2 });
  await store.recordRejection({ code: 'invalid_request' }); await store.recordRejection({ code: 'invalid_request' });
  await store.recordRejection({ code: 'session_invalid' }); await store.recordRejection({ code: 'body_too_large' });
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_rejections').get().n, 2);
  assert.equal(sqlite.prepare('SELECT SUM(count) AS n FROM sarin_rejections').get().n, 3);
  assert.equal(sqlite.prepare('SELECT rejection_overflow FROM sarin_history_state').get().rejection_overflow, 1);
  await assert.rejects(() => store.recordRejection({ code: 'private payload' }), rejects(400));
  setTime(BASE + 2 * DAY);
  const result = await store.purge({ limit: 1 });
  assert.equal(result.rejections, 1); assert.equal(result.remaining, true);
  await store.purge({ limit: 1 });
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_rejections').get().n, 0);
});

test('acciones y eventos usan contadores acotados y resumen camelCase', async t => {
  const { session, begin, finish, store } = await setup(t, { maxEvents: 2 });
  const { conversationId } = await session(); await begin(1); await finish(1, BODY, 'out_of_scope');
  for (const action of ['review', 'block', 'unblock', 'review', 'block', 'unblock']) await store.adminAction({ id: conversationId, action, actor: 'owner@example.test' });
  const detail = await store.getConversation(conversationId);
  assert.equal(detail.outOfScopeCount, 1);
  assert.equal(detail.reviewedAt, BASE);
  assert.equal(detail.blockedUntil, null);
  assert.ok(detail.events.length <= 2);
  assert.equal(detail.events.reduce((sum, event) => sum + event.count, 0), 7);
  assert.deepEqual(Object.keys(detail.messages[0]).sort(), ['at', 'content', 'id', 'role', 'status', 'turn']);
  assert.deepEqual(Object.keys(detail.events[0]).sort(), ['at', 'count', 'id', 'kind']);
});

test('listado pagina sin duplicados, filtra y rechaza cursores/filtros inválidos', async t => {
  const { session, store, setTime } = await setup(t);
  const first = await session(); setTime(BASE + 1); await session(OTHER);
  await store.adminAction({ id: first.conversationId, action: 'review', actor: 'owner@example.test' });
  const page = await store.listConversations({ limit: 1 });
  assert.equal(page.items.length, 1); assert.ok(page.nextCursor);
  const next = await store.listConversations({ limit: 1, cursor: page.nextCursor });
  assert.equal(next.items.length, 1); assert.notEqual(next.items[0].id, page.items[0].id);
  assert.equal((await store.listConversations({ state: 'reviewed' })).items.length, 1);
  assert.equal((await store.listConversations({ from: BASE + 1 })).items.length, 1);
  for (const filters of [{ limit: 51 }, { cursor: 'bad' }, { service: 'other' }, { state: 'other' }, { from: 'bad' }, { to: BASE - 1, from: BASE }]) await assert.rejects(() => store.listConversations(filters), rejects(400));
});

test('fallo SQL después de admisión revierte mensaje, turno y capacidad; error no revela DB', async t => {
  const { session, db, sqlite } = await setup(t); await session();
  const broken = implementation.createHistoryStore({ db: { prepare: db.prepare, batch: statements => db.batch([...statements, db.prepare('SELECT * FROM private_missing_table').bind()]) }, now: () => BASE });
  await assert.rejects(() => broken.beginTurn({ tokenHash: HASH, requestId: rid(1), message: 'a' }), error => rejects(503, 'history_unavailable')(error) && !error.message.includes('private'));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 0);
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, LEAD_BYTES);
});

test('fallo SQL finalizando revierte respuesta y devolución de capacidad, reintento finaliza una vez', async t => {
  const { session, begin, finish, db, sqlite, store } = await setup(t);
  const { conversationId } = await session(); await begin(1, 'a');
  const before = sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes;
  const broken = implementation.createHistoryStore({ db: { prepare: db.prepare, batch: statements => db.batch([...statements, db.prepare('SELECT * FROM private_missing_table').bind()]) }, now: () => BASE });
  await assert.rejects(() => broken.finishTurn({ tokenHash: HASH, requestId: rid(1), body: BODY, status: 200, outcome: 'completed' }), rejects(503));
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, before);
  assert.equal((await store.getConversation(conversationId)).messages.length, 1);
  assert.deepEqual(await finish(1), { applied: true });
  assert.equal((await store.getConversation(conversationId)).messages.length, 2);
});

test('purga fallida revierte borrado y capacidad; auditoría y cuotas vencen por plazos separados', async t => {
  const { session, begin, finish, store, sqlite, db, setTime } = await setup(t);
  const { conversationId } = await session(); await begin(1); await finish(1);
  await store.adminAction({ id: conversationId, action: 'review', actor: 'e'.repeat(64) });
  const quota = createQuota({ db, identity: IDENTITY, now: () => BASE });
  await quota.reserve({ id: 'money', stage: 'classification', amountMicros: 100 });
  let fail = true;
  const broken = implementation.createHistoryStore({ db: { prepare: db.prepare, batch: statements => { if (fail) { fail = false; return db.batch([...statements, db.prepare('SELECT * FROM private_missing_table').bind()]); } return db.batch(statements); } }, now: () => BASE + 30 * DAY });
  await assert.rejects(() => broken.purge(), rejects(503));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 2);
  assert.ok(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes > 0);
  setTime(BASE + 30 * DAY);
  const purged = await store.purge();
  assert.equal(purged.audits, 1); assert.equal(purged.conversations, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_reservations').get().n, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sarin_counters WHERE key LIKE 'session-%' OR key LIKE 'minute:%' OR key LIKE 'ip:%'").get().n, 0);
  setTime(BASE + 35 * DAY); await store.purge();
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_reservations').get().n, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_counters').get().n, 0);
});

test('configuración inválida o mutable no permite exceder topes y los mensajes sobredimensionados no se admiten', async t => {
  const { db, session, store, sqlite } = await setup(t);
  for (const limits of [{ maxConversations: 2001 }, { maxEvents: 33 }, { maxTurns: 16 }, { maxTextBytes: Infinity }, { unknown: 1 }]) {
    assert.throws(() => implementation.createHistoryStore({ db, limits }), rejects(503, 'history_config_invalid'));
  }
  const limits = { maxConversations: 1 };
  const limited = implementation.createHistoryStore({ db, now: () => BASE, limits }); limits.maxConversations = 2000;
  await session();
  await assert.rejects(() => limited.createSession({ tokenHash: OTHER, identity: IDENTITY, consent: CONSENT, lead: LEAD }), rejects(429, 'history_capacity'));
  for (const message of ['', 'a'.repeat(1201), '\u0000', {}]) await assert.rejects(() => store.beginTurn({ tokenHash: HASH, requestId: rid(1), message }), rejects(400));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 0);
});

test('estado purga registra éxito y fallos cerrados sin detalles de DB', async t => {
  const { store, db } = await setup(t);
  assert.deepEqual(await store.getPurgeStatus(), { lastRunAt: null, lastSuccessAt: null, lastErrorAt: null, status: 'never', remaining: false });
  await store.purge();
  assert.equal((await store.getPurgeStatus()).lastSuccessAt, BASE);
  let fail = true;
  const broken = implementation.createHistoryStore({ db: { prepare: db.prepare, batch: statements => { if (fail) { fail = false; throw new Error('private'); } return db.batch(statements); } }, now: () => BASE + 1 });
  await assert.rejects(() => broken.purge(), rejects(503));
  assert.deepEqual(await store.getPurgeStatus(), { lastRunAt: BASE + 1, lastSuccessAt: BASE, lastErrorAt: BASE + 1, status: 'error', remaining: false });
});

test('rollback historial conserva cuotas y objetos ajenos y permite reaplicar migración', async t => {
  const { sqlite } = await setup(t);
  sqlite.exec('CREATE TABLE unrelated(id INTEGER PRIMARY KEY); INSERT INTO unrelated VALUES (7)');
  const documentation = await readFile(new URL('../../migrations/sarin/README.md', import.meta.url), 'utf8');
  const rollback = documentation.match(/<!-- history-rollback -->\s*```sql\r?\n([\s\S]*?)```/)[1];
  sqlite.exec(`BEGIN IMMEDIATE; ${rollback} COMMIT;`);
  assert.equal(sqlite.prepare('SELECT blocked FROM sarin_state').get().blocked, 0);
  assert.equal(sqlite.prepare('SELECT id FROM unrelated').get().id, 7);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'sarin_conversations'").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('sarin_leads','sarin_lead_commands','sarin_history_lead')").get().n, 0);
  sqlite.exec(await readFile(new URL('../../migrations/sarin/0002_history.sql', import.meta.url), 'utf8'));
  sqlite.exec(await readFile(new URL('../../migrations/sarin/0003_leads.sql', import.meta.url), 'utf8'));
  assert.equal(sqlite.prepare('SELECT text_bytes FROM sarin_history_state').get().text_bytes, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_leads').get().n, 0);
});
