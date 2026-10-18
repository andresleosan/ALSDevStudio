import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';

const implementation = await import('../../server/sarin/whatsapp/ingress-store.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const BASE = Date.UTC(2026, 9, 17, 12);
const DAY = 86400000;
const incoming = (id = 'one', extra = {}) => ({ kind: 'inbound', eventId: 'event_' + id,
  createdAt: BASE, messageId: 'message_' + id, wamid: 'wamid.' + id, wabaId: '12345',
  from: '+573000000001', to: '+573000000002', sentAt: BASE - 1000,
  mediaType: 'text', text: 'Necesito una tienda café.', ...extra });
const echo = (id = 'human', extra = {}) => incoming(id, { kind: 'echo', from: '+573000000002', to: '+573000000001', ...extra });
function create(options) {
  assert.equal(typeof implementation?.createWhatsAppIngressStore, 'function', 'Falta implementar el almacén durable');
  return implementation.createWhatsAppIngressStore(options);
}
async function setup(t, limits = {}) {
  assert.equal(typeof implementation?.createWhatsAppIngressStore, 'function', 'Falta implementar el almacén durable');
  const f = await sqliteFixture({ history: true, whatsapp: true });
  t.after(f.close);
  let at = BASE;
  const now = () => at;
  return { ...f, now, setTime: value => { at = value; }, store: create({ db: f.db, now, limits }) };
}
const count = (f, table) => f.sqlite.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n;
const state = f => f.sqlite.prepare('SELECT * FROM sarin_wa_state').get();
const rejected = (operation, code, status) => assert.rejects(operation, error => {
  assert.equal(error.code, code); assert.equal(error.status, status); assert.equal(error.message, code);
  assert.equal(error.cause, undefined); assert.doesNotMatch(JSON.stringify(error), /573000|PRIVATE|café/);
  return true;
});

test('captura texto normalizado y queda pausado sin modificar tablas web ni dinero', async t => {
  const f = await setup(t);
  assert.deepEqual(await f.store.capture(incoming()), { status: 'captured', eventId: 'event_one' });
  const row = f.sqlite.prepare('SELECT * FROM sarin_wa_inbox').get();
  assert.equal(row.text, 'Necesito una tienda café.'); assert.equal(row.state, 'captured');
  assert.equal(row.expires_at, BASE + DAY);
  assert.equal(f.sqlite.prepare('SELECT expires_at FROM sarin_wa_receipts').get().expires_at, BASE + 2 * DAY);
  assert.equal(state(f).paused_all, 1); assert.equal(state(f).inbox_rows, 1); assert.equal(state(f).receipt_rows, 1);
  assert.equal(state(f).content_bytes, row.stored_bytes);
  assert.equal(f.sqlite.prepare('SELECT paused FROM sarin_wa_peers').get().paused, 1);
  for (const table of ['sarin_conversations', 'sarin_reservations', 'sarin_counters']) assert.equal(count(f, table), 0);
  const receipt = f.sqlite.prepare('SELECT * FROM sarin_wa_receipts').get();
  assert.doesNotMatch(JSON.stringify(receipt), /573000|Necesito|café/);
});

test('duplicados concurrentes sólo capturan una fila y no consumen frecuencia adicional', async t => {
  const f = await setup(t, { perMinute: 1 });
  const other = create({ db: f.db, now: f.now, limits: { perMinute: 1 } });
  const result = await Promise.all([f.store.capture(incoming()), other.capture(incoming())]);
  assert.deepEqual(result.map(r => r.status).sort(), ['captured', 'duplicate']);
  assert.equal(count(f, 'sarin_wa_inbox'), 1); assert.equal(count(f, 'sarin_wa_receipts'), 1);
  await rejected(f.store.capture(incoming('two')), 'ingress_rate_limit', 429);
});

test('mismo mensaje con otro evento guarda alias sin repetir contenido, frecuencia ni pausa', async t => {
  const f = await setup(t, { perMinute: 1 });
  await f.store.capture(echo());
  const prior = f.sqlite.prepare('SELECT * FROM sarin_wa_peers').get();
  const result = await f.store.capture(echo('human', { eventId: 'event_alias', createdAt: BASE + 1 }));
  assert.deepEqual(result, { status: 'duplicate', eventId: 'event_human' });
  assert.equal(count(f, 'sarin_wa_inbox'), 1); assert.equal(count(f, 'sarin_wa_receipts'), 2);
  assert.equal(f.sqlite.prepare('SELECT canonical_event_id FROM sarin_wa_receipts WHERE event_id = ?').get('event_alias').canonical_event_id, 'event_human');
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM sarin_wa_peers').get(), prior);
  await rejected(f.store.capture(incoming('other', { eventId: 'event_alias' })), 'event_conflict', 409);
});

test('ID de evento o wamid reutilizado con otro contenido falla sin sobreescribirlo', async t => {
  const f = await setup(t);
  await f.store.capture(incoming());
  for (const event of [incoming('two', { eventId: 'event_one' }), incoming('one', { text: 'Cambió.' }),
    incoming('one', { eventId: 'event_alias', text: 'Cambió.' })]) {
    await rejected(f.store.capture(event), 'event_conflict', 409);
  }
  assert.equal(count(f, 'sarin_wa_receipts'), 1);
  assert.equal(f.sqlite.prepare('SELECT text FROM sarin_wa_inbox').get().text, 'Necesito una tienda café.');
});

test('duplicate exacto se confirma con capacidad llena pero alias nuevo exige lugar para recibo', async t => {
  const f = await setup(t, { maxInboxRows: 1, maxReceipts: 1 });
  await f.store.capture(incoming());
  assert.equal((await f.store.capture(incoming())).status, 'duplicate');
  await rejected(f.store.capture(incoming('one', { eventId: 'event_alias' })), 'ingress_capacity', 429);
  await rejected(f.store.capture(incoming('two')), 'ingress_capacity', 429);
  assert.equal(state(f).inbox_rows, 1); assert.equal(state(f).receipt_rows, 1);
});

test('alias funciona sin espacio para contenido y no prolonga vencimiento', async t => {
  const f = await setup(t, { maxInboxRows: 1 });
  await f.store.capture(incoming()); f.setTime(BASE + 60000);
  assert.equal((await f.store.capture(incoming('one', { eventId: 'event_alias' }))).status, 'duplicate');
  const rows = f.sqlite.prepare('SELECT expires_at FROM sarin_wa_receipts').all();
  assert.deepEqual(rows.map(r => r.expires_at), [BASE + 2 * DAY, BASE + 2 * DAY]);
});

test('límite de bytes UTF-8 es atómico y acepta exactamente el último byte', async t => {
  const baseline = await setup(t); await baseline.store.capture(incoming('one', { text: 'é'.repeat(1200) }));
  const charged = state(baseline).content_bytes;
  const f = await setup(t, { maxBytes: charged });
  await f.store.capture(incoming('one', { text: 'é'.repeat(1200) }));
  assert.equal(state(f).content_bytes, charged);
  await rejected(f.store.capture(incoming('two')), 'ingress_capacity', 429);
  const less = await setup(t, { maxBytes: charged - 1 });
  await rejected(less.store.capture(incoming('one', { text: 'é'.repeat(1200) })), 'ingress_capacity', 429);
  assert.equal(count(less, 'sarin_wa_receipts'), 0);
});

test('cupos de minuto/día por contacto sobreviven a la purga de texto y reinician por reloj UTC', async t => {
  const f = await setup(t, { perMinute: 1, perDay: 2 });
  await f.store.capture(incoming());
  await rejected(f.store.capture(incoming('two')), 'ingress_rate_limit', 429);
  f.setTime(BASE + 60000); await f.store.capture(incoming('two'));
  f.setTime(BASE + 120000); await rejected(f.store.capture(incoming('three')), 'ingress_rate_limit', 429);
  f.setTime(BASE + DAY); await f.store.purge();
  await f.store.capture(incoming('tomorrow', { createdAt: BASE + DAY, sentAt: BASE + DAY }));
  assert.equal(count(f, 'sarin_wa_inbox'), 2);
});

test('cupo global agrupa diferentes contactos sin mezclar su identidad', async t => {
  const f = await setup(t, { globalPerMinute: 2, globalPerDay: 2 });
  await f.store.capture(incoming());
  await f.store.capture(incoming('two', { from: '+573000000003' }));
  await rejected(f.store.capture(incoming('three', { from: '+573000000004' })), 'ingress_rate_limit', 429);
  f.setTime(BASE + 60000);
  await rejected(f.store.capture(incoming('three', { from: '+573000000004' })), 'ingress_rate_limit', 429);
});

test('eco exento de frecuencia pausa el contacto y fechas fuera de orden nunca retroceden', async t => {
  const f = await setup(t, { perMinute: 1, globalPerMinute: 1 });
  await f.store.capture(incoming());
  f.sqlite.exec('UPDATE sarin_wa_peers SET paused = 0');
  await f.store.capture(echo('recent', { sentAt: BASE }));
  await f.store.capture(echo('old', { sentAt: BASE - 5000 }));
  const row = f.sqlite.prepare('SELECT * FROM sarin_wa_peers').get();
  assert.equal(row.paused, 1); assert.equal(row.pause_revision, 2); assert.equal(row.last_human_at, BASE);
  assert.equal(row.last_inbound_at, BASE - 1000);
  assert.equal(f.sqlite.prepare('SELECT text FROM sarin_wa_inbox WHERE kind = ?').get('echo').text, null);
});

test('contactos nuevos quedan acotados y dos números empresariales no comparten identidad', async t => {
  const f = await setup(t, { maxPeers: 2 });
  await f.store.capture(incoming());
  await f.store.capture(incoming('other-business', { to: '+573000000099' }));
  assert.equal(count(f, 'sarin_wa_peers'), 2);
  await rejected(f.store.capture(incoming('third', { from: '+573000000003' })), 'ingress_capacity', 429);
});

test('medio guarda sólo metadatos permitidos y ningún texto de caption', async t => {
  const f = await setup(t);
  const event = incoming('media', { mediaType: 'image' }); delete event.text;
  await f.store.capture(event);
  assert.equal(f.sqlite.prepare('SELECT text FROM sarin_wa_inbox').get().text, null);
  assert.equal(f.sqlite.prepare('SELECT media_type FROM sarin_wa_inbox').get().media_type, 'image');
});

for (const change of [
  { kind: 'status' }, { eventId: '' }, { eventId: 'x'.repeat(257) }, { messageId: 'bad\nPRIVATE' },
  { wamid: '' }, { wabaId: 'bad' }, { from: '573000000001' }, { to: '+012' }, { text: ' ' },
  { text: 'x'.repeat(1201) }, { text: 'bad\u0000' }, { sentAt: NaN }, { createdAt: -1 },
  { createdAt: BASE + 0.5 }, { mediaType: 'BAD' }, { privateExtra: 'PRIVATE' },
]) {
  test('valida nuevamente el evento antes de SQL: ' + Object.keys(change)[0] + '/' + String(Object.values(change)[0]).slice(0, 12), async t => {
    const f = await setup(t);
    await rejected(f.store.capture(incoming('one', change)), 'invalid_event', 400);
    assert.equal(count(f, 'sarin_wa_receipts'), 0);
  });
}

test('evento nuevo fuera de la ventana temporal se descarta sin escribir', async t => {
  const f = await setup(t);
  await rejected(f.store.capture(incoming('old', { createdAt: BASE - 28800001 })), 'stale_event', 409);
  await rejected(f.store.capture(incoming('future', { createdAt: BASE + 300001 })), 'invalid_event', 400);
});

test('purga contenido a 24h conserva tombstone y duplicate no recrea texto', async t => {
  const f = await setup(t); await f.store.capture(incoming());
  f.setTime(BASE + DAY);
  assert.deepEqual(await f.store.purge(), { inbox: 1, receipts: 0, peers: 1, remaining: false });
  assert.equal(state(f).content_bytes, 0);
  assert.equal((await f.store.capture(incoming())).status, 'duplicate');
  assert.equal(count(f, 'sarin_wa_inbox'), 0); assert.equal(count(f, 'sarin_wa_peers'), 0);
  f.setTime(BASE + 2 * DAY);
  assert.deepEqual(await f.store.purge(), { inbox: 0, receipts: 1, peers: 0, remaining: false });
  await rejected(f.store.capture(incoming()), 'stale_event', 409);
});

test('purga tiene lotes acotados y contabilidad consistente al repetir', async t => {
  const f = await setup(t);
  for (let i = 0; i < 3; i++) await f.store.capture(incoming(String(i)));
  f.setTime(BASE + 2 * DAY);
  const one = await f.store.purge({ limit: 1 });
  assert.deepEqual(one, { inbox: 1, receipts: 1, peers: 1, remaining: true });
  assert.equal(state(f).inbox_rows, 2); assert.equal(state(f).receipt_rows, 2);
  await f.store.purge({ limit: 1 }); await f.store.purge({ limit: 1 });
  assert.deepEqual(await f.store.purge({ limit: 1 }), { inbox: 0, receipts: 0, peers: 0, remaining: false });
  assert.equal(state(f).content_bytes, 0);
});

test('purga cuenta filas borradas sin depender de escrituras auxiliares informadas por D1', async t => {
  const f = await setup(t); await f.store.capture(incoming()); f.setTime(BASE + 2 * DAY);
  const store = create({ db: { prepare: f.db.prepare, batch: async statements => {
    const results = await f.db.batch(statements);
    return results.map(row => ({ ...row, meta: { changes: 999 } }));
  } }, now: f.now });
  assert.deepEqual(await store.purge({ limit: 1 }), { inbox: 1, receipts: 1, peers: 1, remaining: false });
  assert.equal(state(f).inbox_rows, 0); assert.equal(state(f).receipt_rows, 0);
});

test('fallo SQL posterior a admisión revierte datos, capacidad y pausa sin filtrar detalle', async t => {
  const f = await setup(t);
  const broken = create({ db: { prepare: f.db.prepare, batch: statements => f.db.batch([...statements,
    f.db.prepare('SELECT PRIVATE_DATABASE_DETAIL FROM missing_table')]) }, now: f.now });
  await rejected(broken.capture(incoming()), 'ingress_unavailable', 503);
  for (const table of ['sarin_wa_receipts', 'sarin_wa_inbox', 'sarin_wa_peers']) assert.equal(count(f, table), 0);
  assert.equal(state(f).content_bytes, 0);
});

test('sin commit confirmado el almacén no devuelve admisión exitosa', async t => {
  const f = await setup(t); let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const store = create({ db: { prepare: f.db.prepare, batch: async statements => { await gate; return f.db.batch(statements); } }, now: f.now });
  let completed = false; const pending = store.capture(incoming()).then(value => { completed = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false); assert.equal(count(f, 'sarin_wa_receipts'), 0);
  finish(); assert.equal((await pending).status, 'captured');
});

test('recuperación exige mantenimiento y drenaje, borra WA y conserva dinero e historial web', async t => {
  const f = await setup(t); await f.store.capture(incoming());
  f.sqlite.prepare('INSERT INTO sarin_counters VALUES (?,?,?)').run('day:synthetic', 123, BASE + 35 * DAY);
  await rejected(f.store.recover({ maintenanceConfirmed: false, requestsDrained: true }), 'maintenance_required', 503);
  assert.equal(count(f, 'sarin_wa_inbox'), 1);
  const result = await f.store.recover({ maintenanceConfirmed: true, requestsDrained: true });
  assert.deepEqual(result, { inbox: 1, receipts: 1, peers: 1, budgetReconciliationRequired: true });
  assert.equal(count(f, 'sarin_wa_inbox'), 0); assert.equal(count(f, 'sarin_wa_receipts'), 0); assert.equal(state(f).content_bytes, 0);
  assert.equal(f.sqlite.prepare('SELECT value FROM sarin_counters').get().value, 123);
  assert.equal(state(f).paused_all, 1);
  await rejected(f.store.capture(incoming()), 'stale_event', 409);
});

test('recover fallido revierte toda la limpieza', async t => {
  const f = await setup(t); await f.store.capture(incoming());
  const broken = create({ db: { prepare: f.db.prepare, batch: statements => f.db.batch([...statements,
    f.db.prepare('SELECT PRIVATE_DATABASE_DETAIL FROM missing_table')]) }, now: f.now });
  await rejected(broken.recover({ maintenanceConfirmed: true, requestsDrained: true }), 'ingress_unavailable', 503);
  assert.equal(count(f, 'sarin_wa_inbox'), 1); assert.equal(state(f).inbox_rows, 1);
});

test('rechaza mensajes antiguos aunque el sobre del proveedor sea reciente', async t => {
  const f = await setup(t);
  await rejected(f.store.capture(incoming('late', { sentAt: BASE - 28800001 })), 'stale_event', 409);
  assert.equal(count(f, 'sarin_wa_receipts'), 0);
});

test('recuperación cubre desfase futuro previo y exige fechas de mensaje y evento posteriores al piso', async t => {
  const f = await setup(t);
  const future = incoming('future', { createdAt: BASE + 300000, sentAt: BASE + 300000 });
  await f.store.capture(future);
  await f.store.recover({ maintenanceConfirmed: true, requestsDrained: true });
  assert.equal(state(f).replay_floor_at, BASE + 300000);
  await rejected(f.store.capture(future), 'stale_event', 409);
  f.setTime(BASE + 300001);
  await rejected(f.store.capture(incoming('repackaged', { createdAt: BASE + 300001 })), 'stale_event', 409);
  await f.store.capture(incoming('after', { createdAt: BASE + 300001, sentAt: BASE + 300001 }));
});

test('recuperación repara contabilidad restaurada discordante antes de borrar', async t => {
  const f = await setup(t); await f.store.capture(incoming());
  f.sqlite.exec('UPDATE sarin_wa_state SET inbox_rows = 0, receipt_rows = 0, content_bytes = 0');
  assert.deepEqual(await f.store.recover({ maintenanceConfirmed: true, requestsDrained: true }),
    { inbox: 1, receipts: 1, peers: 1, budgetReconciliationRequired: true });
  assert.equal(state(f).inbox_rows, 0); assert.equal(state(f).content_bytes, 0);
});

test('alias de entrante no consume cuota y la purga no recrea el canónico por alias', async t => {
  const f = await setup(t, { perMinute: 2 });
  await f.store.capture(incoming());
  await f.store.capture(incoming('one', { eventId: 'event_alias' }));
  await f.store.capture(incoming('two'));
  await rejected(f.store.capture(incoming('three')), 'ingress_rate_limit', 429);
  f.setTime(BASE + 2 * DAY);
  await f.store.purge({ limit: 1 });
  assert.equal(state(f).inbox_rows, 1); assert.equal(state(f).receipt_rows, 2);
});

test('reversión manual aditiva preserva esquema y dinero previos', async t => {
  const f = await setup(t); await f.store.capture(incoming());
  f.sqlite.prepare('INSERT INTO sarin_counters VALUES (?,?,?)').run('day:synthetic', 123, BASE + 35 * DAY);
  f.sqlite.exec(`DROP VIEW sarin_wa_capture; DROP TABLE sarin_wa_inbox;
    DROP TABLE sarin_wa_receipts; DROP TABLE sarin_wa_peers; DROP TABLE sarin_wa_state;`);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name LIKE 'sarin_wa_%'").get().n, 0);
  assert.equal(f.sqlite.prepare('SELECT value FROM sarin_counters').get().value, 123);
  assert.equal(count(f, 'sarin_conversations'), 0);
});

test('límites copiados y configuración inválida no permiten eludir topes', async t => {
  const f = await setup(t); const limits = { maxInboxRows: 1 };
  const store = create({ db: f.db, now: f.now, limits }); limits.maxInboxRows = 10000;
  await store.capture(incoming()); await rejected(store.capture(incoming('two')), 'ingress_capacity', 429);
  for (const limits of [{ maxBytes: 0 }, { maxReceipts: 20001 }, { perMinute: NaN }, { unexpected: 1 }]) {
    assert.throws(() => create({ db: f.db, limits }), error => error.code === 'ingress_config_invalid' && error.status === 503);
  }
  for (const limit of [0, 501, 1.5]) await rejected(store.purge({ limit }), 'invalid_request', 400);
});
