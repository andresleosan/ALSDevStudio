import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { processorFixture, latest } from './sarin-whatsapp-processor-fixture.mjs';
const missing = error => { if (error.code === 'ERR_MODULE_NOT_FOUND') return {}; throw error; };
const storeModule = await import('../../server/sarin/whatsapp/handoff-store.js').catch(missing);
const processorModule = await import('../../server/sarin/whatsapp/handoff-processor.js').catch(missing);
const ddl = await readFile(new URL('../../migrations/sarin/0006_whatsapp_handoff.sql', import.meta.url), 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
const owner = '+573000000003';
async function fixture(t) {
  assert.equal(typeof storeModule.createWhatsAppHandoffStore, 'function', 'falta el almacén de avisos');
  const f = await processorFixture(t); assert.notEqual(ddl, '', 'falta migración de avisos');
  if (!f.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE name='sarin_wa_handoff'").get()) f.sqlite.exec(ddl);
  const env = { ...f.env, SARIN_WHATSAPP_HANDOFF_ENABLED: 'true', SARIN_WHATSAPP_OWNER_PHONE: owner,
    SARIN_WHATSAPP_HANDOFF_TEMPLATE: 'als_atencion_humana_v1', SARIN_WHATSAPP_HANDOFF_TEMPLATE_LANGUAGE: 'es' };
  const store = storeModule.createWhatsAppHandoffStore({ db: f.db, now: f.now });
  const identity = { wabaId: '12345', businessPhone: '+573000000002', ownerPhone: owner };
  const event = async (text = 'HUMANO', from = '+573000000001', overrides = {}) => {
    const at = f.now() + 1000; f.setTime(at);
    const e = { kind: 'inbound', eventId: 'handoff_' + at, messageId: 'in_' + at, wamid: 'wamid.' + at,
      wabaId: identity.wabaId, from, to: identity.businessPhone, sentAt: at, createdAt: at, mediaType: 'text', text, ...overrides };
    const { createWhatsAppIngressStore } = await import('../../server/sarin/whatsapp/ingress-store.js');
    await createWhatsAppIngressStore({ db: f.db, now: f.now, repliesEnabled: true, publicMode: true }).capture(e);
    return e;
  };
  const run = (overrides = {}) => processorModule.processWhatsAppHandoff(env, { now: f.now, fetch: f.fetch, ...overrides });
  return { ...f, env, handoff: store, identity, event, run,
    alert: () => latest(f, 'sarin_wa_handoff') };
}

test('HUMANO sin ACEPTO crea solicitud durable y conserva pausa antes del envío', async t => {
  const f = await fixture(t); await f.event();
  const a = f.alert(); assert.equal(a.state, 'queued'); assert.equal(a.peer_key, f.peerKey);
  assert.equal(a.expires_at, a.created_at + 3600000); assert.equal(a.receipt_expires_at, a.created_at + 86400000);
  assert.equal(latest(f, 'sarin_wa_contexts').paused, 1); assert.equal(latest(f, 'sarin_wa_contexts').accepted_at, null);
  assert.equal(f.calls.length, 0);
});

test('reintentos del webhook y HUMANO repetido producen un aviso por contexto', async t => {
  const f = await fixture(t); const e = await f.event();
  await f.store.observeControl({ event: e }); await f.event();
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n, 1);
  const context = f.sqlite.prepare('SELECT * FROM sarin_wa_contexts WHERE peer_key=?').get(f.peerKey);
  assert.equal(f.alert().peer_revision, context.revision);
  assert.equal((await f.handoff.next(f.identity)).alertId, f.alert().alert_id);
});

test('STOP, medios y eco no crean avisos HUMANO', async t => {
  const f = await fixture(t); await f.event('STOP');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n, 0);
});

test('fuera de ventana se envía plantilla al dueño y nunca contenido del cliente', async t => {
  const f = await fixture(t); await f.event();
  assert.equal((await f.run()).status, 'accepted'); assert.equal(f.calls.length, 1);
  const body = JSON.parse(f.calls[0].init.body);
  assert.equal(body.type, 'template'); assert.equal(body.to, owner); assert.equal(body.from, f.identity.businessPhone);
  assert.equal(body.template.components[0].parameters[0].text, '*** 0001');
  assert.match(body.template.components[0].parameters[1].text, /#whatsapp=[a-f0-9]{64}$/);
  assert.equal(f.alert().state, 'accepted'); assert.equal(f.alert().owner_phone, owner);
  assert.equal(f.sqlite.prepare('SELECT consumed FROM sarin_wa_send_quota').get().consumed, 1);
  await f.run(); assert.equal(f.calls.length, 1);
});

test('ventana del dueño abierta permite texto, sin usar la ventana del solicitante', async t => {
  const f = await fixture(t); await f.event('Hola', owner); await f.event();
  await f.run(); assert.equal(JSON.parse(f.calls[0].init.body).type, 'text');
});

test('el dueño puede probar HUMANO en su conversación sin supresión ni bucle', async t => {
  const f = await fixture(t); await f.event('HUMANO', owner); await f.run();
  assert.equal(f.calls.length, 1); assert.equal(JSON.parse(f.calls[0].init.body).to, owner);
  assert.equal(JSON.parse(f.calls[0].init.body).type, 'text');
});

test('sin plantilla y ventana cerrada espera sin gastar ni enviar', async t => {
  const f = await fixture(t); delete f.env.SARIN_WHATSAPP_HANDOFF_TEMPLATE; await f.event();
  assert.equal((await f.run()).status, 'waiting_template'); assert.equal(f.alert().state, 'waiting_template');
  assert.equal(f.calls.length, 0); assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_send_quota').get().n, 0);
});

test('cierre de ventana entre lectura y permiso impide un texto administrativo', async t => {
  const f = await fixture(t); await f.event('Hola', owner); await f.event();
  const a = await f.handoff.next(f.identity); assert.equal(a.ownerWindowOpen, true);
  f.sqlite.prepare('UPDATE sarin_wa_inbox SET sent_at=? WHERE peer_phone=?').run(f.now() - 86400000, owner);
  await assert.rejects(f.handoff.beginSend({ ...f.identity, alertId: a.alertId, mode: 'text' }), error => error.code === 'handoff_denied');
  assert.equal(f.alert().started_at, null);
});

test('reactivar el contacto antes del permiso invalida el aviso pendiente', async t => {
  const f = await fixture(t); await f.event();
  const a = await f.handoff.next(f.identity), c = f.sqlite.prepare('SELECT * FROM sarin_wa_contexts WHERE peer_key=?').get(f.peerKey);
  await f.store.resumePeer({ peerKey: f.peerKey, expectedRevision: c.revision, actor: 'test' });
  await assert.rejects(f.handoff.beginSend({ ...f.identity, alertId: a.alertId, mode: 'template' }), error => error.code === 'handoff_denied');
  assert.equal(f.alert().started_at, null); assert.equal((await f.run()).status, 'idle');
});

test('la cuota compartida de 20 intentos diarios bloquea avisos adicionales', async t => {
  const f = await fixture(t); await f.event();
  f.sqlite.prepare('INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed) VALUES(?,?,20)').run('2026-10-18', '2026-10');
  assert.equal((await f.run()).status, 'limited'); assert.equal(f.calls.length, 0); assert.equal(f.alert().started_at, null);
});

test('la cuota mensual y los cierres de restore impiden comenzar otro POST', async t => {
  const f = await fixture(t); await f.event();
  for (let i = 1; i <= 5; i++) f.sqlite.prepare('INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed) VALUES(?,?,20)').run('2026-10-' + String(i).padStart(2, '0'), '2026-10');
  assert.equal((await f.run()).status, 'limited'); assert.equal(f.calls.length, 0);
});

test('dos consumidores no pueden consumir dos cuotas ni enviar dos veces', async t => {
  const f = await fixture(t); await f.event();
  await Promise.all([f.run(), f.run()]); assert.equal(f.calls.length, 1);
  assert.equal(f.sqlite.prepare('SELECT consumed FROM sarin_wa_send_quota').get().consumed, 1);
});

test('resultado de red incierto conserva intento consumido y no reintenta', async t => {
  const f = await fixture(t); await f.event(); let calls = 0;
  const fetcher = async () => { calls++; throw new Error('private-detail'); };
  assert.equal((await f.run({ fetch: fetcher })).status, 'uncertain'); assert.equal(f.alert().state, 'uncertain');
  await f.run({ fetch: fetcher }); assert.equal(calls, 1);
});

test('webhook tardío puede confirmar la entrega y repetirlo no cambia el recibo', async t => {
  const f = await fixture(t); await f.event(); await f.run(); const a = f.alert();
  const observation = { eventId: 'delivery1', providerId: a.provider_id, externalId: a.external_id,
    wabaId: f.identity.wabaId, from: f.identity.businessPhone, to: owner, status: 'delivered', at: f.now() };
  await f.handoff.applyStatus(observation); await f.handoff.applyStatus(observation);
  assert.equal(f.alert().state, 'delivered'); assert.equal(f.alert().delivered_at, f.now());
  await f.handoff.applyStatus({ ...observation, eventId: 'late_sent', status: 'sent' });
  assert.equal(f.alert().state, 'delivered');
});

test('status de otro destinatario nunca confirma el aviso', async t => {
  const f = await fixture(t); await f.event(); await f.run(); const a = f.alert();
  await f.handoff.applyStatus({ eventId: 'wrong', providerId: a.provider_id, externalId: a.external_id,
    to: '+573000000009', status: 'delivered', at: f.now() });
  assert.equal(f.alert().delivered_at, null);
});

test('sin bandera, API key o destinatario válido no hay transporte', async t => {
  const f = await fixture(t); await f.event();
  for (const key of ['SARIN_WHATSAPP_HANDOFF_ENABLED','SARIN_WHATSAPP_SEND_ENABLED','SARIN_WHATSAPP_API_KEY','SARIN_WHATSAPP_OWNER_PHONE']) {
    const value = f.env[key]; delete f.env[key]; assert.equal((await f.run()).status, 'disabled'); f.env[key] = value;
  }
  assert.equal(f.calls.length, 0);
});

test('purga acotada elimina recibos y restore cancela avisos no iniciados', async t => {
  const f = await fixture(t); await f.event();
  await f.db.batch(storeModule.getWhatsAppHandoffRecoveryStatements({ db: f.db, at: f.now() }));
  assert.equal(f.alert().state, 'cancelled'); await f.run(); assert.equal(f.calls.length, 0);
  f.setTime(f.now() + 86400001);
  const result = await storeModule.purgeWhatsAppHandoff({ db: f.db, now: f.now, limit: 1 });
  assert.equal(result.deleted, 1); assert.equal(result.remaining, false);
});

test('aviso con captura de otro WABA o negocio queda cerrado', async t => {
  const f = await fixture(t); await f.event(); f.env.SARIN_WHATSAPP_WABA_ID = '67890';
  assert.equal((await f.run()).status, 'idle'); assert.equal(f.calls.length, 0);
});

test('primer mensaje HUMANO de un contacto nuevo solicita atención sin consentimiento previo', async t => {
  const f = await fixture(t); await f.event('HUMANO', '+573000000008');
  await f.run(); assert.equal(f.calls.length, 1);
  assert.equal(JSON.parse(f.calls[0].init.body).template.components[0].parameters[0].text, '*** 0008');
});

test('solicitud repetida se actualiza incluso con el almacén de avisos lleno', async t => {
  const f = await fixture(t); await f.event();
  const a = f.alert();
  const insert = f.sqlite.prepare(`INSERT INTO sarin_wa_handoff(alert_id,event_id,peer_key,context_id,peer_revision,epoch,
    external_id,created_at,expires_at,receipt_expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)`);
  for (let i = 1; i < 1000; i++) insert.run(String(i).padStart(32, '0'), 'event-fill-' + i,
    'b'.repeat(64), 'context-fill-' + i, 0, a.epoch, 'external-fill-' + i, a.created_at, a.expires_at, a.receipt_expires_at);
  await f.event();
  const next = await f.handoff.next(f.identity); assert.equal(next?.alertId, a.alert_id);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n, 1000);
});

test('cuotas reservadas por respuestas normales cuentan antes de avisar al dueño', async t => {
  const f = await fixture(t); await f.event();
  f.sqlite.prepare('INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed,reserved) VALUES(?,?,19,1)').run('2026-10-18', '2026-10');
  assert.equal((await f.run()).status, 'limited'); assert.equal(f.calls.length, 0);
});

test('restore con cupo vacío conserva su cierre y deniega nuevos avisos', async t => {
  const f = await fixture(t); await f.event();
  f.sqlite.prepare(`INSERT INTO sarin_wa_send_closures(scope,period_key,closed_at,period_end_at,reason)
    VALUES('day','2026-10-18',?,?,'restore')`).run(f.now(), Date.UTC(2026,9,19));
  assert.equal((await f.run()).status, 'limited'); assert.equal(f.calls.length, 0);
});

test('después de una hora no se inicia la notificación aunque el contacto siga pausado', async t => {
  const f = await fixture(t); await f.event(); f.setTime(f.now() + 3600000);
  assert.equal((await f.run()).status, 'idle'); assert.equal(f.calls.length, 0);
});

test('crash posterior al permiso no permite repetir POST y purga lo marca incierto', async t => {
  const f = await fixture(t); await f.event(); const a = await f.handoff.next(f.identity);
  await f.handoff.beginSend({ ...f.identity, alertId: a.alertId, mode: 'template' });
  assert.equal((await f.run()).status, 'idle'); assert.equal(f.calls.length, 0);
  f.setTime(f.now() + 60001); await storeModule.purgeWhatsAppHandoff({ db: f.db, now: f.now });
  assert.equal(f.alert().state, 'uncertain');
});

test('status con externalId puede llegar antes de la respuesta POST', async t => {
  const f = await fixture(t); await f.event(); const a = await f.handoff.next(f.identity);
  const permit = await f.handoff.beginSend({ ...f.identity, alertId: a.alertId, mode: 'template' });
  await f.handoff.applyStatus({ eventId: 'early', providerId: 'early_provider', externalId: permit.externalId,
    wabaId: f.identity.wabaId, from: f.identity.businessPhone, to: owner, status: 'delivered', at: f.now() });
  await f.handoff.finishSend({ alertId: a.alertId, result: { status: 'accepted', providerId: 'early_provider' } });
  assert.equal(f.alert().state, 'delivered'); assert.equal(f.alert().provider_id, 'early_provider');
});

test('destinatario y sender persistidos no cambian al editar configuración después del envío', async t => {
  const f = await fixture(t); await f.event(); await f.run();
  f.env.SARIN_WHATSAPP_OWNER_PHONE = '+573000000009'; await f.run();
  assert.equal(f.calls.length, 1); assert.equal(f.alert().owner_phone, owner);
});

test('createdAt anterior a la activación no envía aviso aunque el contacto ya estuviera pausado', async t => {
  const f = await fixture(t); const before = f.now() - 1000; await f.pause();
  await f.event('HUMANO', '+573000000001', { createdAt: before });
  assert.equal((await f.run()).status, 'idle'); assert.equal(f.calls.length, 0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_send_quota').get().n, 0);
});

test('teléfono corto se oculta completamente y el panel identifica el chat por clave opaca', async t => {
  const f = await fixture(t); await f.event('HUMANO', '+12');
  assert.equal((await f.run()).status, 'accepted');
  const text = JSON.stringify(JSON.parse(f.calls[0].init.body).template.components);
  assert.doesNotMatch(text, /\+12/); assert.match(text, /\*\*\*/);
});

test('eco de un aviso identificado no pausa la conversación activa del dueño', async t => {
  const f = await fixture(t); await f.event('Hola', owner); await f.event();
  await f.run({ fetch: async () => Response.json({ id: 'own_alert', status: 'accepted', wamid: 'wamid.admin-alert' }) });
  const ownerKey=f.sqlite.prepare('SELECT peer_key FROM sarin_wa_inbox WHERE peer_phone=? LIMIT 1').get(owner).peer_key;
  const before=f.sqlite.prepare('SELECT * FROM sarin_wa_contexts WHERE peer_key=?').get(ownerKey);
  assert.equal(before.paused,0);
  await f.event(undefined, f.identity.businessPhone, { kind:'echo', from:f.identity.businessPhone, to:owner,
    wamid:'wamid.admin-alert',text:'AVISO ADMINISTRATIVO PRIVADO' });
  const after=f.sqlite.prepare('SELECT * FROM sarin_wa_contexts WHERE peer_key=?').get(ownerKey);
  assert.equal(after.paused,0);assert.equal(after.revision,before.revision);
  const raw=await f.store.getPeer({peerKey:ownerKey});assert.doesNotMatch(JSON.stringify(raw),/AVISO ADMINISTRATIVO PRIVADO/);
});

test('eco humano diferente al aviso sí pausa al dueño', async t => {
  const f = await fixture(t); await f.event('Hola', owner); await f.event();
  await f.run({ fetch: async () => Response.json({ id: 'own_alert', status: 'accepted', wamid: 'wamid.admin-alert' }) });
  const ownerKey=f.sqlite.prepare('SELECT peer_key FROM sarin_wa_inbox WHERE peer_phone=? LIMIT 1').get(owner).peer_key;
  await f.event(undefined, f.identity.businessPhone, { kind:'echo', from:f.identity.businessPhone, to:owner,
    wamid:'wamid.real-human',text:'Respuesta humana' });
  assert.equal(f.sqlite.prepare('SELECT paused FROM sarin_wa_contexts WHERE peer_key=?').get(ownerKey).paused,1);
});

test('HUMANO retrasado más de una hora no renueva su oportunidad de aviso', async t => {
  const f = await fixture(t); f.setTime(f.now() + 3 * 3600000);
  const original=f.now() - 2 * 3600000;
  await f.event('HUMANO','+573000000001',{sentAt:original,createdAt:original});
  assert.equal(f.alert().created_at,original);assert.equal((await f.run()).status,'idle');assert.equal(f.calls.length,0);
});

test('cancelar cron antes de comenzar no consume ni envía aviso', async t => {
  const f=await fixture(t);await f.event();const controller=new AbortController();controller.abort();
  assert.equal((await f.run({signal:controller.signal})).status,'cancelled');assert.equal(f.calls.length,0);
  assert.equal(f.alert().started_at,null);
});

test('cancelar mientras D1 lee impide iniciar el permiso de envío', async t => {
  const f=await fixture(t);await f.event();const controller=new AbortController();
  const store={...f.handoff,next:async identity=>{const result=await f.handoff.next(identity);controller.abort();return result;}};
  assert.equal((await f.run({store,signal:controller.signal})).status,'cancelled');assert.equal(f.calls.length,0);
  assert.equal(f.alert().started_at,null);
});

test('cancelar tras el permiso durable nunca inicia POST ni devuelve el intento', async t => {
  const f=await fixture(t);await f.event();const controller=new AbortController();
  const store={...f.handoff,beginSend:async input=>{const result=await f.handoff.beginSend(input);controller.abort();return result;}};
  assert.equal((await f.run({store,signal:controller.signal})).status,'uncertain');assert.equal(f.calls.length,0);
  assert.equal(f.alert().state,'uncertain');assert.equal(f.sqlite.prepare('SELECT consumed FROM sarin_wa_send_quota').get().consumed,1);
});

test('purga remaining contempla estados vencidos más allá del límite del lote', async t => {
  const f=await fixture(t);await f.event();await f.event('HUMANO','+573000000008');await f.event('HUMANO','+573000000009');
  f.setTime(f.now()+3600000);
  const first=await storeModule.purgeWhatsAppHandoff({db:f.db,now:f.now,limit:1});assert.equal(first.remaining,true);
  await storeModule.purgeWhatsAppHandoff({db:f.db,now:f.now,limit:1});
  const last=await storeModule.purgeWhatsAppHandoff({db:f.db,now:f.now,limit:1});assert.equal(last.remaining,false);
});
