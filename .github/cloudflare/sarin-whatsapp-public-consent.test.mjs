import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { createWhatsAppIngressStore } from '../../server/sarin/whatsapp/ingress-store.js';
import { createWhatsAppWorkStore } from '../../server/sarin/whatsapp/work-store.js';
import { WHATSAPP_NOTICE, WHATSAPP_NOTICE_VERSION } from '../../server/sarin/whatsapp/consent.js';

const noticeHash = createHash('sha256').update(WHATSAPP_NOTICE).digest('hex');
const context = f => f.sqlite.prepare('SELECT * FROM sarin_wa_contexts ORDER BY rowid DESC LIMIT 1').get();

async function fixture(t, { publicMode = false } = {}) {
  const f = await sqliteFixture({ whatsapp: true, replies: true });
  t.after(f.close);
  let at = Date.UTC(2026, 9, 18, 12), sequence = 0;
  const now = () => at;
  const store = createWhatsAppWorkStore({ db: f.db, now });
  const ingress = createWhatsAppIngressStore({ db: f.db, now, publicMode, repliesEnabled: true });
  await store.setPilotMode({ enabled: true, expectedRevision: 0, actor: 'test' });
  const event = (text = 'Hola') => {
    at += 1000; sequence++;
    return { kind: 'inbound', eventId: 'public_event_' + sequence, messageId: 'public_message_' + sequence,
      wamid: 'wamid.public.' + sequence, wabaId: '12345', from: '+573000000001', to: '+573000000002',
      sentAt: at, createdAt: at, mediaType: 'text', text };
  };
  const capture = async text => { const e = event(text); await ingress.capture(e); return e; };
  const claim = async e => {
    const job = f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id=?').get(e.eventId);
    assert.ok(job, 'Un mensaje admitido debe tener trabajo persistido');
    const own = { jobId: job.job_id, epoch: job.epoch, token: crypto.randomUUID() };
    return { ...own, ...await store.claimGeneration(own) };
  };
  const resume = async () => {
    const c = context(f);
    await store.resumePeer({ peerKey: c.peer_key, expectedRevision: c.revision, actor: 'test' });
  };
  return { ...f, store, ingress, now, event, capture, claim, resume };
}

async function activeFixture(t) {
  const f = await fixture(t);
  await f.capture(); await f.resume();
  return f;
}

async function deliveredNotice(f) {
  const claim = await f.claim(await f.capture());
  assert.equal(claim.work.decision, 'notice');
  const out = await f.store.createFixedReply({ ...claim, purpose: 'notice', text: WHATSAPP_NOTICE,
    version: WHATSAPP_NOTICE_VERSION, hash: noticeHash });
  await f.store.beginSend({ ...out, token: claim.token });
  await f.store.finishSend({ ...out, token: claim.token, result: { status: 'accepted', providerId: 'public_notice' } });
  await f.store.applyStatus({ eventId: 'public_notice_delivered', providerId: 'public_notice', status: 'delivered', at: f.now() });
}

async function acceptedConsent(f) {
  await deliveredNotice(f);
  const acceptance = await f.capture('ACEPTO');
  assert.ok(context(f).accepted_at, 'El aviso actual entregado y ACEPTO deben producir evidencia durable');
  return acceptance;
}

// Representa una base de datos creada por la versión anterior sin desactivar sus triggers.
// La evidencia es inmutable: se restaura la fila histórica completa, no se modifica en el lugar.
function restorePilotVersion(f) {
  const proof = f.sqlite.prepare('SELECT * FROM sarin_wa_consent_proofs').get();
  assert.ok(proof);
  f.sqlite.exec('BEGIN');
  try {
    f.sqlite.prepare('DELETE FROM sarin_wa_consent_proofs WHERE acceptance_event_id=?').run(proof.acceptance_event_id);
    f.sqlite.prepare('UPDATE sarin_wa_outbox SET version=? WHERE outbox_id=?').run('whatsapp-pilot-v1', proof.notice_id);
    f.sqlite.prepare('UPDATE sarin_wa_contexts SET consent_version=? WHERE peer_key=?').run('whatsapp-pilot-v1', proof.peer_key);
    proof.version = 'whatsapp-pilot-v1';
    const keys = Object.keys(proof);
    f.sqlite.prepare(`INSERT INTO sarin_wa_consent_proofs(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`)
      .run(...keys.map(key => proof[key]));
    f.sqlite.exec('COMMIT');
  } catch (error) { f.sqlite.exec('ROLLBACK'); throw error; }
}

function fillControlReceipts(f, total) {
  const peer = context(f);
  const used = f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_control_events').get().count;
  f.sqlite.prepare(`WITH RECURSIVE receipts(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM receipts WHERE n<?)
    INSERT INTO sarin_wa_control_events(event_id,message_key,event_hash,message_hash,peer_key,context_id,
      applied,classification,sent_at,observed_at,expires_at)
    SELECT 'bounded_event_'||n,'bounded_message_'||n,?,?,?, ?,1,'text',?,?,? FROM receipts`)
    .run(total - used, 'a'.repeat(64), 'b'.repeat(64), peer.peer_key, peer.context_id,
      f.now() - 1000, f.now() - 1000, f.now() + 86400000);
}

for (const text of ['Hola', 'ACEPTO']) test('el primer ' + text + ' inicia sólo el aviso con autoStart', async t => {
  const f = await fixture(t), event = f.event(text);
  await f.store.observeControl({ event, autoStart: true });
  assert.equal(context(f).paused, 0);
  await f.ingress.capture(event);
  const claim = await f.claim(event);
  assert.equal(claim.work.decision, 'notice');
  assert.equal(claim.work.input, '');
  assert.deepEqual(claim.work.history, []);
  await assert.rejects(f.store.markInferenceStarted(claim), error => error.code === 'work_denied');
});

test('publicMode entrega el primer Hola al aviso sin reactivación administrativa', async t => {
  const f = await fixture(t, { publicMode: true });
  const event = await f.capture('Hola');
  assert.equal(context(f).paused, 0);
  const claim = await f.claim(event);
  assert.equal(claim.work.decision, 'notice');
  assert.equal(context(f).accepted_at, null);
});

for (const repliesEnabled of [undefined, false]) test('publicMode no autoactiva sin respuestas explícitamente habilitadas: ' + repliesEnabled, async t => {
  const f = await fixture(t);
  const ingress = createWhatsAppIngressStore({ db: f.db, now: f.now, publicMode: true, repliesEnabled });
  await ingress.capture(f.event('Hola'));
  assert.equal(context(f).paused, 1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_jobs').get().count, 0);
});

test('un mensaje previo a ACEPTO nunca se entrega a inferencia', async t => {
  const f = await activeFixture(t);
  await deliveredNotice(f);
  const claim = await f.claim(await f.capture('Necesito una tienda con mis productos'));
  assert.notEqual(claim.work.decision, 'generate');
  assert.equal(claim.work.input, '');
  assert.deepEqual(claim.work.history, []);
  await assert.rejects(f.store.markInferenceStarted(claim), error => error.code === 'work_denied');
});

for (const control of ['HUMANO', 'STOP']) test('autoStart no retira una pausa existente por ' + control, async t => {
  const f = await activeFixture(t);
  await f.capture(control);
  const before = context(f), event = f.event('Hola');
  assert.equal(before.paused, 1);
  await f.store.observeControl({ event, autoStart: true });
  await f.ingress.capture(event);
  assert.equal(context(f).paused, 1);
  assert.equal(context(f).context_id, before.context_id);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_jobs WHERE event_id=?').get(event.eventId).count, 0);
});

test('un trabajo reclamado con prueba v1 no puede iniciar inferencia tras actualizar el aviso', async t => {
  const f = await activeFixture(t), acceptance = await acceptedConsent(f);
  const confirmation = await f.claim(acceptance);
  await f.store.finishWithoutReply({ ...confirmation, reason: 'ignored' });
  const claim = await f.claim(await f.capture('Necesito una tienda'));
  assert.equal(claim.work.decision, 'generate');
  restorePilotVersion(f);
  await assert.rejects(f.store.markInferenceStarted(claim), error => error.code === 'work_denied');
  assert.equal(f.sqlite.prepare('SELECT inference_started_at FROM sarin_wa_jobs WHERE job_id=?').get(claim.jobId).inference_started_at, null);
});

test('una aceptación de aviso v1 no permite crear la confirmación del aviso comercial', async t => {
  const f = await activeFixture(t), acceptance = await acceptedConsent(f);
  const claim = await f.claim(acceptance);
  assert.equal(claim.work.decision, 'confirm');
  restorePilotVersion(f);
  await assert.rejects(f.store.createFixedReply({ ...claim, purpose: 'accepted', text: 'Gracias por aceptar',
    version: WHATSAPP_NOTICE_VERSION, hash: noticeHash }), error => error.code === 'work_denied');
});

test('un mensaje nuevo con consentimiento v1 exige el aviso comercial y otro ACEPTO', async t => {
  const f = await activeFixture(t), acceptance = await acceptedConsent(f);
  const confirmation = await f.claim(acceptance);
  await f.store.finishWithoutReply({ ...confirmation, reason: 'ignored' });
  const previousContext = context(f).context_id;
  restorePilotVersion(f);
  const claim = await f.claim(await f.capture('Hola'));
  assert.equal(claim.work.decision, 'notice');
  assert.notEqual(context(f).context_id, previousContext);
  assert.equal(context(f).accepted_at, null);
  assert.equal(claim.work.input, '');
  assert.deepEqual(claim.work.history, []);
  await assert.rejects(f.store.markInferenceStarted(claim), error => error.code === 'work_denied');
  const out = await f.store.createFixedReply({ ...claim, purpose: 'notice', text: WHATSAPP_NOTICE,
    version: WHATSAPP_NOTICE_VERSION, hash: noticeHash });
  const notice = f.sqlite.prepare('SELECT version FROM sarin_wa_outbox WHERE outbox_id=?').get(out.outboxId);
  assert.equal(notice.version, WHATSAPP_NOTICE_VERSION);
});

test('el contexto 1001 se rechaza sin crecer las tablas de control', async t => {
  const f = await fixture(t);
  f.sqlite.exec(`WITH RECURSIVE peers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM peers WHERE n<1000)
    INSERT INTO sarin_wa_contexts(peer_key,context_id) SELECT 'bounded_peer_'||n,'bounded_context_'||n FROM peers`);
  await assert.rejects(f.store.observeControl({ event: f.event('Hola'), autoStart: true }),
    error => error.code === 'work_capacity');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_contexts').get().count, 1000);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_control_events').get().count, 0);
});

test('STOP pausa un contacto existente incluso con 20000 recibos de control', async t => {
  const f = await activeFixture(t);
  fillControlReceipts(f, 20000);
  await assert.rejects(f.store.observeControl({ event: f.event('STOP'), autoStart: true }),
    error => error.code === 'work_capacity' && error.status === 429);
  assert.equal(context(f).paused, 1);
  assert.ok(f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_control_events').get().count <= 20000);
});

test('un aviso v1 preparado no se envía y su reserva se libera al pedir el aviso vigente', async t => {
  const f = await activeFixture(t), claim = await f.claim(await f.capture());
  const out = await f.store.createFixedReply({ ...claim, purpose: 'notice', text: WHATSAPP_NOTICE,
    version: WHATSAPP_NOTICE_VERSION, hash: noticeHash });
  f.sqlite.prepare('UPDATE sarin_wa_outbox SET version=? WHERE outbox_id=?').run('whatsapp-pilot-v1', out.outboxId);
  f.sqlite.prepare('UPDATE sarin_wa_contexts SET consent_version=?').run('whatsapp-pilot-v1');
  await assert.rejects(f.store.beginSend({ ...out, token: claim.token }), error => error.code === 'work_denied');
  assert.deepEqual({ ...f.sqlite.prepare('SELECT consumed,reserved FROM sarin_wa_send_quota').get() }, { consumed: 0, reserved: 1 });
  const fresh = await f.capture('Hola');
  assert.equal(f.sqlite.prepare('SELECT state FROM sarin_wa_outbox WHERE outbox_id=?').get(out.outboxId).state, 'cancelled');
  assert.deepEqual({ ...f.sqlite.prepare('SELECT consumed,reserved FROM sarin_wa_send_quota').get() }, { consumed: 0, reserved: 0 });
  const next = await f.claim(fresh);
  assert.equal(next.work.decision, 'notice');
  await f.store.createFixedReply({ ...next, purpose: 'notice', text: WHATSAPP_NOTICE,
    version: WHATSAPP_NOTICE_VERSION, hash: noticeHash });
  await f.ingress.capture(fresh);
  assert.deepEqual({ ...f.sqlite.prepare('SELECT consumed,reserved FROM sarin_wa_send_quota').get() }, { consumed: 0, reserved: 1 });
});

test('autoStart nunca activa un contacto nuevo por el eco de un mensaje humano', async t => {
  const f = await fixture(t), original = f.event('Respuesta de Andrés');
  const event = { ...original, kind: 'echo', from: original.to, to: original.from };
  await f.store.observeControl({ event, autoStart: true });
  await f.ingress.capture(event);
  assert.equal(context(f).paused, 1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_jobs').get().count, 0);
});

test('STOP sigue pausando si otro evento consume el último recibo entre la lectura y el commit', async t => {
  const f = await activeFixture(t);
  fillControlReceipts(f, 19999);
  let interleaved = false;
  const db = { prepare: f.db.prepare, async batch(statements) {
    if (!interleaved && statements.some(statement => statement.sql.includes('(SELECT COUNT(*) FROM sarin_wa_control_events)<20000'))) {
      interleaved = true;
      f.sqlite.exec(`INSERT INTO sarin_wa_control_events
        SELECT 'last_slot_event','last_slot_message',event_hash,message_hash,peer_key,context_id,
          applied,classification,sent_at,observed_at,expires_at FROM sarin_wa_control_events LIMIT 1`);
    }
    return f.db.batch(statements);
  } };
  const store = createWhatsAppWorkStore({ db, now: f.now });
  await assert.rejects(store.observeControl({ event: f.event('STOP'), autoStart: true }),
    error => error.code === 'work_capacity');
  assert.equal(interleaved, true);
  assert.equal(context(f).paused, 1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM sarin_wa_control_events').get().count, 20000);
});
