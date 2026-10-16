import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';

const implementation = await import('../../server/sarin/quota.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const BASE = Date.UTC(2026, 9, 16, 12);
const IDENTITY = 'a'.repeat(64);
const LIMITS = { perMinute: 10, perDay: 50, dailyMicros: 1000000, monthlyMicros: 10000000 };
async function setup(t, overrides = {}) {
  assert.ok(implementation, 'Falta implementar cuotas persistentes');
  const fixture = await sqliteFixture();
  t.after(fixture.close);
  let clock = BASE;
  return { ...fixture, setTime: value => { clock = value; },
    quota: implementation.createQuota({ db: fixture.db, identity: IDENTITY, now: () => clock, limits: { ...LIMITS, ...overrides } }),
    another: (limits = {}) => implementation.createQuota({ db: fixture.db, identity: IDENTITY, now: () => clock, limits: { ...LIMITS, ...overrides, ...limits } }),
  };
}
const reserve = (quota, id, amountMicros = 100, stage = 'classification') => quota.reserve({ id, stage, amountMicros });
const rejection = status => error => error instanceof implementation.QuotaError && error.status === status;

test('HMAC estable en el día, separado por IP, secreto y día, sin IP cruda', async () => {
  assert.ok(implementation, 'Falta implementar HMAC');
  const hash = await implementation.pseudonymizeIp('203.0.113.1', 'x'.repeat(32), BASE);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, await implementation.pseudonymizeIp('203.0.113.1', 'x'.repeat(32), BASE + 1000));
  for (const [ip, secret, time] of [['203.0.113.2', 'x'.repeat(32), BASE], ['203.0.113.1', 'y'.repeat(32), BASE], ['203.0.113.1', 'x'.repeat(32), BASE + 86400000]]) {
    assert.notEqual(hash, await implementation.pseudonymizeIp(ip, secret, time));
  }
  await assert.rejects(() => implementation.pseudonymizeIp('203.0.113.1', 'short', BASE), rejection(503));
});

test('solo clasificación cuenta frecuencia; reserva duplicada es idempotente', async t => {
  const { quota } = await setup(t, { perMinute: 1 });
  assert.deepEqual(await reserve(quota, 'first', 500), { id: 'first', reservedMicros: 500 });
  assert.deepEqual(await reserve(quota, 'first', 500), { id: 'first', reservedMicros: 500 });
  await reserve(quota, 'second', 100, 'generation');
  await assert.rejects(() => reserve(quota, 'third'), rejection(429));
});

test('ventanas UTC por minuto y día bloquean y se renuevan', async t => {
  const { quota, setTime } = await setup(t, { perMinute: 1, perDay: 2 });
  await reserve(quota, 'a');
  await assert.rejects(() => reserve(quota, 'b'), rejection(429));
  setTime(BASE + 60000);
  await reserve(quota, 'b');
  setTime(BASE + 120000);
  await assert.rejects(() => reserve(quota, 'c'), rejection(429));
  setTime(BASE + 86400000);
  await reserve(quota, 'c');
});

for (const key of ['dailyMicros', 'monthlyMicros']) {
  test(`presupuesto ${key} atómico entre peticiones concurrentes`, async t => {
    const { quota, another } = await setup(t, { [key]: 100 });
    const results = await Promise.allSettled([reserve(quota, 'a', 70), reserve(another(), 'b', 70)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && rejection(429)(result.reason)).length, 1);
    await reserve(quota, 'c', 30, 'generation');
    await assert.rejects(() => reserve(quota, 'd', 1, 'generation'), rejection(429));
  });
}

test('presupuesto mensual conserva gasto al cambiar de día', async t => {
  const { quota, setTime } = await setup(t, { dailyMicros: 100, monthlyMicros: 150 });
  await reserve(quota, 'a', 100);
  setTime(BASE + 86400000);
  await assert.rejects(() => reserve(quota, 'b', 51), rejection(429));
  await reserve(quota, 'b', 50);
});

test('liquidaciones simultáneas devuelven la diferencia exactamente una vez', async t => {
  const { quota, another } = await setup(t, { dailyMicros: 100 });
  await reserve(quota, 'a', 100);
  await Promise.all([quota.settle('a', 30), another().settle('a', 30)]);
  await reserve(quota, 'b', 70, 'generation');
  await assert.rejects(() => reserve(quota, 'c', 1, 'generation'), rejection(429));
});

test('uso inválido o resultado incierto conserva toda la reserva', async t => {
  const { quota } = await setup(t, { dailyMicros: 100 });
  await reserve(quota, 'timeout', 100);
  for (const value of [-1, 1.5, NaN, undefined, '10']) {
    await assert.rejects(() => quota.settle('timeout', value), rejection(503));
  }
  await assert.rejects(() => reserve(quota, 'retry', 1, 'generation'), rejection(429));
});

test('uso excesivo bloquea globalmente de forma persistente', async t => {
  const { quota, another } = await setup(t);
  await reserve(quota, 'a', 100);
  await assert.rejects(() => quota.settle('a', 101), rejection(503));
  await assert.rejects(() => reserve(another(), 'b'), rejection(503));
});

test('uso entero excesivo por encima del máximo de configuración también bloquea', async t => {
  const { quota, another } = await setup(t);
  await reserve(quota, 'a', 100);
  await assert.rejects(() => quota.settle('a', 10000000001), rejection(503));
  await assert.rejects(() => reserve(another(), 'b'), rejection(503));
});

test('bloqueo explícito afecta instancias futuras', async t => {
  const { quota, another } = await setup(t);
  await quota.block();
  await assert.rejects(() => reserve(another(), 'b'), rejection(503));
});

test('rechazo presupuestario revierte frecuencia y cualquier contador parcial', async t => {
  const { quota, another } = await setup(t, { perMinute: 1, dailyMicros: 100, monthlyMicros: 10 });
  await assert.rejects(() => reserve(quota, 'a', 11), rejection(429));
  await reserve(another(), 'b', 10);
});

test('configuración, identidad, importes y binding inválidos fallan cerrado', async t => {
  const { db, quota } = await setup(t);
  for (const [key, value] of [['perMinute', 0], ['perDay', Infinity], ['dailyMicros', -1], ['monthlyMicros', Number.MAX_SAFE_INTEGER]]) {
    assert.throws(() => implementation.createQuota({ db, identity: IDENTITY, limits: { ...LIMITS, [key]: value } }), rejection(503));
  }
  assert.throws(() => implementation.createQuota({ db: null, identity: IDENTITY, limits: LIMITS }), rejection(503));
  assert.throws(() => implementation.createQuota({ db, identity: '203.0.113.1', limits: LIMITS }), rejection(503));
  for (const amount of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER]) await assert.rejects(() => reserve(quota, 'a', amount), rejection(503));
  await assert.rejects(() => reserve(quota, 'a', 10, 'anything'), rejection(503));
  const unavailable = implementation.createQuota({ db: { prepare: () => { throw new Error('private database details'); }, batch() {} }, identity: IDENTITY, limits: LIMITS });
  await assert.rejects(() => reserve(unavailable, 'a'), error => rejection(503)(error) && !error.message.includes('private'));
});

test('reservas caducadas no liberan saldo actual; purga no almacena mensajes ni identidad en reservas', async t => {
  const { quota, sqlite, setTime } = await setup(t);
  await reserve(quota, 'a');
  const reservation = sqlite.prepare('SELECT * FROM sarin_reservations').get();
  assert.ok(!JSON.stringify(reservation).includes(IDENTITY));
  setTime(BASE + 36 * 86400000);
  await reserve(quota, 'b');
  await assert.rejects(() => quota.settle('a', 0), rejection(503));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_reservations').get().n, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_counters WHERE expires_at <= ?').get(BASE + 36 * 86400000).n, 0);
});

test('un error SQL después de insertar revierte reserva, frecuencia y presupuesto', async t => {
  const { db, quota, sqlite } = await setup(t, { perMinute: 1, dailyMicros: 100 });
  const broken = implementation.createQuota({ db: {
    prepare: db.prepare,
    batch: statements => db.batch([...statements, db.prepare('INSERT INTO missing_table VALUES (1)').bind()]),
  }, identity: IDENTITY, now: () => BASE, limits: { ...LIMITS, perMinute: 1, dailyMicros: 100 } });
  await assert.rejects(() => reserve(broken, 'a', 100), rejection(503));
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_reservations').get().n, 0);
  await reserve(quota, 'b', 100);
});

test('fallo durante liquidación no libera reserva ni duplica devolución al repetir', async t => {
  const { db, quota } = await setup(t, { dailyMicros: 100 });
  await reserve(quota, 'a', 100);
  const broken = implementation.createQuota({ db: {
    prepare: db.prepare,
    batch: statements => db.batch([...statements, db.prepare('SELECT * FROM missing_table').bind()]),
  }, identity: IDENTITY, now: () => BASE, limits: LIMITS });
  await assert.rejects(() => broken.settle('a', 30), rejection(503));
  await assert.rejects(() => reserve(quota, 'b', 1, 'generation'), rejection(429));
  await quota.settle('a', 30);
  await reserve(quota, 'c', 70, 'generation');
});

test('reutilizar id con importe o etapa diferente falla sin alterar la reserva', async t => {
  const { quota } = await setup(t, { dailyMicros: 100 });
  await reserve(quota, 'a', 100);
  await assert.rejects(() => reserve(quota, 'a', 1), rejection(503));
  await assert.rejects(() => reserve(quota, 'a', 100, 'generation'), rejection(503));
  await quota.settle('a', 30);
  await reserve(quota, 'b', 70, 'generation');
});

test('purga acotada ignora caducidad lógica aunque queden registros por eliminar', async t => {
  const { quota, sqlite } = await setup(t);
  const insert = sqlite.prepare('INSERT INTO sarin_counters(key, value, expires_at) VALUES (?, 50, ?)');
  for (let index = 0; index < 205; index++) insert.run(`old:${index}`, BASE - 1000);
  insert.run(`ip:${IDENTITY}:day:2026-10-16`, BASE - 1);
  await reserve(quota, 'a');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_counters WHERE expires_at <= ?').get(BASE).n, 105);
});

test('rollback documentado elimina solo objetos Sarin y permite migrar otra vez', async t => {
  const { sqlite } = await setup(t);
  sqlite.exec('CREATE TABLE unrelated(id INTEGER PRIMARY KEY); INSERT INTO unrelated VALUES (7)');
  const documentation = await readFile(new URL('../../migrations/sarin/README.md', import.meta.url), 'utf8');
  const rollback = documentation.match(/```sql\r?\n([\s\S]*?)```/)[1];
  sqlite.exec(`BEGIN IMMEDIATE; ${rollback} COMMIT;`);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'sarin_%'").get().n, 0);
  assert.equal(sqlite.prepare('SELECT id FROM unrelated').get().id, 7);
  sqlite.exec(await readFile(new URL('../../migrations/sarin/0001_usage.sql', import.meta.url), 'utf8'));
  assert.equal(sqlite.prepare('SELECT blocked FROM sarin_state').get().blocked, 0);
});
