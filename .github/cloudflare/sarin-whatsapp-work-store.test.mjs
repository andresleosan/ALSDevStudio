import { WHATSAPP_NOTICE_VERSION } from '../../server/sarin/whatsapp/consent.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { createWhatsAppIngressStore } from '../../server/sarin/whatsapp/ingress-store.js';
const implementation = await import('../../server/sarin/whatsapp/work-store.js').catch(e => {
  if (e.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw e;
});
const BASE = Date.UTC(2026, 9, 18, 12), DAY = 86400000;
const uid = () => crypto.randomUUID();
async function setup(t, limits = {}) {
  assert.equal(typeof implementation?.createWhatsAppWorkStore, 'function', 'Falta el contrato durable');
  const f = await sqliteFixture({ whatsapp: true, replies: true }); t.after(f.close);
  let at = BASE, sequence = 0;
  const now = () => at;
  const store = implementation.createWhatsAppWorkStore({ db: f.db, now, limits });
  const ingress = createWhatsAppIngressStore({ db: f.db, now });
  async function capture(text = 'Proyecto ficticio', peer = '+573000000001') {
    at += 1000; const id = String(++sequence);
    await ingress.capture({ kind: 'inbound', eventId: 'event_' + id, messageId: 'message_' + id,
      wamid: 'wamid.' + id, wabaId: '12345', from: peer, to: '+573000000002',
      createdAt: at, sentAt: at, mediaType: 'text', text });
    return f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id = ?').get('event_' + id);
  }
  await capture();
  const peerKey = f.sqlite.prepare('SELECT peer_key FROM sarin_wa_inbox').get().peer_key;
  const pilot = await store.setPilotMode({ enabled: true, expectedRevision: 0, actor: 'admin_test' });
  await store.resumePeer({ peerKey, expectedRevision: 0, actor: 'admin_test' });
  return { ...f, store, ingress, now, setTime: value => { at = value; }, capture, peerKey, epoch: pilot.epoch };
}
const row = (f, table) => f.sqlite.prepare('SELECT * FROM ' + table + ' ORDER BY rowid DESC LIMIT 1').get();
const denied = promise => assert.rejects(promise, e => ['work_denied','work_capacity','work_quota','work_conflict','invalid_request'].includes(e.code) && e.message === e.code && !e.cause);
async function claim(f, job) {
  const token = uid();
  assert.equal((await f.store.claimGeneration({ jobId: job.job_id, epoch: job.epoch, token })).status, 'claimed');
  return { jobId: job.job_id, token };
}
async function notice(f, job) {
  const own = await claim(f, job);
  const { outboxId } = await f.store.createFixedReply({ ...own, purpose: 'notice', text: 'Aviso ficticio', version:WHATSAPP_NOTICE_VERSION, hash: 'a'.repeat(64) });
  return { ...own, outboxId };
}
// Consentimiento sintético ya acreditado: Task 2 reemplazará esta preparación
// con el recorrido real ACEPTO/aviso/confirmación.
async function consent(f) {
  const j = await f.capture(); const n = await notice(f, j);
  await f.store.beginSend(n);
  await f.store.finishSend({ ...n, result: { status: 'accepted', providerId: 'provider_notice' } });
  await f.store.applyStatus({ eventId: 'delivery_notice', providerId: 'provider_notice', status: 'delivered', at: f.now() });
  const acceptance=await f.capture('ACEPTO');
  const accepted=await claim(f,acceptance);
  await f.store.finishWithoutReply({...accepted,reason:'ignored'});
}
test('capture_and_job_are_atomic', async t => {
  const f = await setup(t); assert.equal(row(f,'sarin_wa_jobs'), undefined);
  const j = await f.capture(); assert.ok(j.job_id); assert.equal(j.state,'queued');
  assert.deepEqual(await f.store.admitJob({eventId:j.event_id,epoch:j.epoch}),{status:'existing',jobId:j.job_id});
  const before = f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_inbox').get().n;
  f.sqlite.exec("CREATE TRIGGER fail_job BEFORE INSERT ON sarin_wa_jobs BEGIN SELECT RAISE(ABORT,'synthetic'); END");
  await assert.rejects(f.capture());
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_inbox').get().n,before);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_receipts').get().n,before);
});
test('concurrent_claim_has_one_owner', async t => {
  const f = await setup(t), a = await f.capture(), b = await f.capture();
  const results = await Promise.all([a,b].map(j => f.store.claimGeneration({jobId:j.job_id,epoch:j.epoch,token:uid()})));
  assert.deepEqual(results.map(r=>r.status).sort(),['busy','claimed']);
});
test('old_activation_never_claims', async t => {
  const f = await setup(t), j = await f.capture();
  await f.store.setPilotMode({enabled:false,expectedRevision:1,actor:'admin_test'});
  await f.store.setPilotMode({enabled:true,expectedRevision:2,actor:'admin_test'});
  assert.equal((await f.store.claimGeneration({jobId:j.job_id,epoch:j.epoch,token:uid()})).status,'terminal');
});
test('ready_send_recovers_without_generation', async t => {
  const f = await setup(t); await consent(f); const j = await f.capture(), own = await claim(f,j);
  await f.store.markInferenceStarted(own); await f.store.attachReservation({...own,reservationId:uid()});
  const out = await f.store.completeGeneration({...own,reply:'Respuesta ficticia',outcome:'answered'});
  f.setTime(f.now()+120001); await f.store.expireLeases({limit:10});
  assert.equal((await f.store.claimGeneration({...own,epoch:j.epoch})).status,'terminal');
  const token=uid(); assert.equal((await f.store.claimSend({jobId:j.job_id,epoch:j.epoch,token})).status,'claimed');
  const permit=await f.store.beginSend({...out,token}); assert.equal(permit.text,'Respuesta ficticia');
  await denied(f.store.beginSend({...out,token}));
});
test('started_inference_never_reclaims', async t => {
  const f = await setup(t); await consent(f); const j=await f.capture(),own=await claim(f,j);
  await f.store.markInferenceStarted(own); f.setTime(f.now()+120001); await f.store.expireLeases({limit:10});
  assert.equal(row(f,'sarin_wa_jobs').state,'inference_uncertain');
  assert.equal((await f.store.claimGeneration({...own,epoch:j.epoch})).status,'terminal');
  await denied(f.store.completeGeneration({...own,reply:'Tarde',outcome:'answered'}));
});
test('sending_never_returns_ready', async t => {
  const f=await setup(t),j=await f.capture(),n=await notice(f,j); await f.store.beginSend(n);
  f.setTime(f.now()+120001); await f.store.expireLeases({limit:10});
  assert.equal(row(f,'sarin_wa_outbox').state,'send_uncertain');
  assert.deepEqual(await f.store.listDispatchable({limit:10}),[]);
  await denied(f.store.beginSend(n));
});
test('quota_twentieth_and_hundredth_are_atomic', async t => {
  for (const [dayUsed,monthUsed] of [[19,19],[0,99]]) {
    const f=await setup(t);
    f.sqlite.prepare('INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed,reserved) VALUES(?,?,?,0)').run('2026-10-18','2026-10',dayUsed);
    for(let remaining=monthUsed-dayUsed,d=17;remaining>0;d--) {
      const used=Math.min(20,remaining); remaining-=used;
      f.sqlite.prepare('INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed,reserved) VALUES(?,?,?,0)').run('2026-10-'+d,'2026-10',used);
    }
    const j=await f.capture(),n=await notice(f,j); await f.store.beginSend(n);
    await f.store.finishSend({...n,result:{status:'accepted',providerId:uid()}});
    await f.store.applyStatus({eventId:uid(),externalId:row(f,'sarin_wa_outbox').external_id,status:'delivered',at:f.now()});
    await f.store.pausePeer({peerKey:f.peerKey,expectedRevision:1,actor:'admin_test'});
    await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:2,actor:'admin_test'});
    const next=await f.capture(),own=await claim(f,next);
    await denied(f.store.createFixedReply({...own,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'b'.repeat(64)}));
    assert.equal(f.sqlite.prepare('SELECT SUM(consumed) n FROM sarin_wa_send_quota').get().n,monthUsed+1);
  }
});
test('outbox_capacity_is_reserved_before_ai', async t => {
  const f=await setup(t,{maxOutboxBytes:4799}); await consent(f);
  const j=await f.capture(),own=await claim(f,j); await denied(f.store.markInferenceStarted(own));
  assert.equal(row(f,'sarin_wa_jobs').inference_started_at,null);
  assert.equal(f.sqlite.prepare('SELECT SUM(reserved) n FROM sarin_wa_send_quota').get().n,0);
});
test('permission_and_validation_fail_closed', async t => {
  const f=await setup(t),j=await f.capture(),own=await claim(f,j);
  await denied(f.store.markInferenceStarted(own));
  await denied(f.store.createFixedReply({...own,purpose:'notice',text:'x'.repeat(1201),version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)}));
  await f.store.pausePeer({peerKey:f.peerKey,expectedRevision:1,actor:'admin_test'});
  await denied(f.store.createFixedReply({...own,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)}));
  await denied(f.store.resumePeer({peerKey:f.peerKey,expectedRevision:1,actor:'admin_test'}));
});
test('deferred_work_waits_for_durable_condition',async t=>{
  const f=await setup(t),j=await f.capture(),own=await claim(f,j);
  await f.store.deferWork({...own,reason:'waiting_consent'});
  assert.deepEqual(await f.store.listDispatchable({limit:10}),[]);
  assert.equal((await f.store.claimGeneration({...own,epoch:j.epoch})).status,'busy');
});
test('new_activation_cancels_old_owner_without_replaying',async t=>{
  const f=await setup(t),old=await f.capture(); await claim(f,old);
  await f.store.setPilotMode({enabled:false,expectedRevision:1,actor:'admin_test'});
  await f.store.setPilotMode({enabled:true,expectedRevision:2,actor:'admin_test'});
  const fresh=await f.capture(); assert.equal((await f.store.claimGeneration({jobId:fresh.job_id,epoch:fresh.epoch,token:uid()})).status,'claimed');
});
test('commercial_core_can_attach_each_phase_reservation',async t=>{
  const f=await setup(t);await consent(f);const j=await f.capture(),own=await claim(f,j);
  await f.store.markInferenceStarted(own);
  await f.store.attachReservation({...own,reservationId:uid()});
  await f.store.attachReservation({...own,reservationId:uid()});
  const out=await f.store.completeGeneration({...own,reply:'Proyecto ficticio',outcome:'completed'});assert.ok(out.outboxId);
});
test('quota_reservation_contenders_have_one_winner',async t=>{
  const f=await setup(t);await f.capture('Inicial','+573000000003');
  const second=f.sqlite.prepare('SELECT peer_key FROM sarin_wa_contexts WHERE peer_key<>?').get(f.peerKey).peer_key;
  await f.store.resumePeer({peerKey:second,expectedRevision:0,actor:'admin_test'});
  const a=await f.capture(),b=await f.capture('Proyecto','+573000000003');
  const owners=[await claim(f,a),await claim(f,b)];
  f.sqlite.prepare('INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed,reserved) VALUES(?,?,19,0)').run('2026-10-18','2026-10');
  const results=await Promise.allSettled(owners.map(own=>f.store.createFixedReply({...own,purpose:'notice',text:'Aviso',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(f.sqlite.prepare('SELECT reserved FROM sarin_wa_send_quota').get().reserved,1);
});
test('atomic_generation_rollback_keeps_reservation_and_never_half_outbox',async t=>{
  const f=await setup(t);await consent(f);const j=await f.capture(),own=await claim(f,j);await f.store.markInferenceStarted(own);
  f.sqlite.exec("CREATE TRIGGER synthetic_fail BEFORE UPDATE OF state ON sarin_wa_jobs WHEN NEW.state='ready' BEGIN SELECT RAISE(ABORT,'PRIVATE'); END");
  await assert.rejects(f.store.completeGeneration({...own,reply:'Ficticio',outcome:'answered'}),e=>e.code==='work_unavailable'&&e.message==='work_unavailable');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_outbox WHERE job_id=?').get(j.job_id).n,0);
  assert.equal(row(f,'sarin_wa_jobs').state,'inference_started');
  assert.equal(row(f,'sarin_wa_jobs').reserved_bytes,4800);
});
test('database_rejects_started_phase_reversal',async t=>{
  const f=await setup(t),j=await f.capture(),n=await notice(f,j);await f.store.beginSend(n);
  assert.throws(()=>f.sqlite.prepare("UPDATE sarin_wa_outbox SET state='ready' WHERE outbox_id=?").run(n.outboxId));
  assert.throws(()=>f.sqlite.prepare("UPDATE sarin_wa_jobs SET state='queued' WHERE job_id=?").run(j.job_id));
});
test('late_status_is_monotone_and_duplicate_is_inert',async t=>{
  const f=await setup(t),j=await f.capture(),n=await notice(f,j),permit=await f.store.beginSend(n);
  assert.equal((await f.store.applyStatus({eventId:'first',externalId:permit.externalId,providerId:'remote_1',status:'delivered',at:f.now()})).status,'applied');
  await f.store.finishSend({...n,result:{status:'accepted',providerId:'remote_1'}});
  await f.store.applyStatus({eventId:'second',providerId:'remote_1',status:'sent',at:f.now()});
  assert.equal(row(f,'sarin_wa_outbox').state,'delivered');
  assert.equal((await f.store.applyStatus({eventId:'first',providerId:'remote_1',status:'failed',at:f.now()})).status,'duplicate');
  assert.equal(row(f,'sarin_wa_outbox').conflict,0);
});
test('pause_blocks_next_inference_phase_and_final_send',async t=>{
  const f=await setup(t);await consent(f);const j=await f.capture(),own=await claim(f,j);await f.store.markInferenceStarted(own);
  await f.store.pausePeer({peerKey:f.peerKey,expectedRevision:1,actor:'admin_test'});
  await denied(f.store.attachReservation({...own,reservationId:uid()}));
  await denied(f.store.completeGeneration({...own,reply:'Ficticio',outcome:'answered'}));
});
test('delivered_before_crash_releases_owner_on_lease_expiry',async t=>{
  const f=await setup(t),j=await f.capture(),n=await notice(f,j),p=await f.store.beginSend(n);
  await f.store.applyStatus({eventId:'delivery',externalId:p.externalId,status:'delivered',at:f.now()});
  f.setTime(f.now()+120001);await f.store.expireLeases({limit:10});
  assert.equal(row(f,'sarin_wa_jobs').state,'completed');
  assert.equal(row(f,'sarin_wa_outbox').state,'delivered');
});
test('four_mebibyte_reservation_limit_is_global',async t=>{
  const f=await setup(t);await consent(f);const j=await f.capture(),own=await claim(f,j);
  const insert=f.sqlite.prepare(`INSERT INTO sarin_wa_jobs(job_id,event_id,peer_key,epoch,context_id,peer_revision,state,reserved_bytes,created_at,expires_at)
    VALUES(?,?,?,?,?,0,'completed',4800,?,?)`);
  for(let n=0;n<873;n++)insert.run(uid(),'synthetic_'+n,'opaque_peer',f.epoch,uid(),f.now(),f.now()+DAY);
  await denied(f.store.markInferenceStarted(own));
  assert.equal(row(f,'sarin_wa_send_quota').reserved,0);
});
test('expired_content_never_sends_and_admin_detail_hides_it',async t=>{
  const f=await setup(t),j=await f.capture(),n=await notice(f,j);f.setTime(f.now()+DAY);
  await denied(f.store.beginSend(n));const detail=await f.store.getPeer({peerKey:f.peerKey});
  assert.deepEqual(detail.events,[]);assert.deepEqual(detail.outputs,[]);
  assert.deepEqual(await f.store.listDispatchable({limit:10}),[]);
});
test('finish_and_failure_are_terminal_without_reclaim',async t=>{
  const f=await setup(t),j=await f.capture(),own=await claim(f,j);
  await f.store.finishWithoutReply({...own,reason:'ignored'});
  assert.equal((await f.store.claimGeneration({...own,epoch:j.epoch})).status,'terminal');
  const next=await f.capture(),another=await claim(f,next);
  await f.store.failInference({...another,code:'provider_unavailable',started:false});
  assert.equal(row(f,'sarin_wa_jobs').state,'failed');
  assert.equal((await f.store.getPeer({peerKey:f.peerKey})).paused,1);
});
test('deferred_head_does_not_redispatch_its_followers',async t=>{
  const f=await setup(t),j=await f.capture(),own=await claim(f,j);
  await f.store.deferWork({...own,reason:'waiting_consent'});await f.capture();
  assert.deepEqual(await f.store.listDispatchable({limit:10}),[]);
});
test('pause_releases_capacity_when_no_output_was_created',async t=>{
  const f=await setup(t);await consent(f);const j=await f.capture(),own=await claim(f,j);await f.store.markInferenceStarted(own);
  await f.store.pausePeer({peerKey:f.peerKey,expectedRevision:1,actor:'admin_test'});
  assert.equal(row(f,'sarin_wa_jobs').reserved_bytes,0);
});
test('old_lease_cleanup_cannot_pause_a_new_context',async t=>{
  const f=await setup(t);await consent(f);const j=await f.capture(),own=await claim(f,j);await f.store.markInferenceStarted(own);
  f.setTime(f.now()+120001);let intervened=false;
  const db={prepare:f.db.prepare,batch:async statements=>{
    const result=await f.db.batch(statements);
    if(!intervened&&statements[0].sql.startsWith('SELECT job_id FROM sarin_wa_jobs')){
      intervened=true;await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:1,actor:'admin_test'});
    }
    return result;
  }};
  await implementation.createWhatsAppWorkStore({db,now:f.now}).expireLeases({limit:10});
  assert.equal((await f.store.getPeer({peerKey:f.peerKey})).paused,0);
});
test('old_delivery_failure_cannot_pause_a_new_context',async t=>{
  const f=await setup(t),j=await f.capture(),n=await notice(f,j),p=await f.store.beginSend(n);
  await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:1,actor:'admin_test'});
  await f.store.applyStatus({eventId:'old_failure',externalId:p.externalId,status:'failed',at:f.now()});
  assert.equal((await f.store.getPeer({peerKey:f.peerKey})).paused,0);
});
test('content_expiry_before_lease_closes_started_send_conservatively',async t=>{
  const f=await setup(t),j=await f.capture();
  f.setTime(j.expires_at-30000);
  const n=await notice(f,j);await f.store.beginSend(n);
  assert.ok(row(f,'sarin_wa_jobs').lease_until>j.expires_at);
  f.setTime(j.expires_at+1);
  assert.deepEqual(await f.store.expireLeases({limit:10}),{processed:1});
  assert.equal(row(f,'sarin_wa_outbox').state,'send_uncertain');
  assert.equal((await f.store.getPeer({peerKey:f.peerKey})).paused,1);
  const closed=row(f,'sarin_wa_jobs');
  assert.equal(closed.state,'completed');assert.equal(closed.token,null);assert.equal(closed.lease_until,null);
  assert.equal(row(f,'sarin_wa_send_quota').consumed,1);
  await denied(f.store.beginSend(n));
  f.setTime(f.now()+120000);
  assert.deepEqual(await f.store.expireLeases({limit:10}),{processed:0});
  assert.equal(row(f,'sarin_wa_outbox').state,'send_uncertain');
  assert.deepEqual(await f.store.listDispatchable({limit:10}),[]);
});
test('content_expiry_before_lease_preserves_confirmed_delivery',async t=>{
  const f=await setup(t),j=await f.capture();f.setTime(j.expires_at-30000);
  const n=await notice(f,j),p=await f.store.beginSend(n);
  await f.store.applyStatus({eventId:'ttl_delivery',externalId:p.externalId,status:'delivered',at:f.now()});
  const deliveredAt=row(f,'sarin_wa_outbox').delivered_at;
  f.setTime(j.expires_at+1);await f.store.expireLeases({limit:10});
  assert.equal(row(f,'sarin_wa_outbox').state,'delivered');
  assert.equal(row(f,'sarin_wa_outbox').delivered_at,deliveredAt);
  assert.equal(row(f,'sarin_wa_jobs').state,'completed');
  assert.equal((await f.store.getPeer({peerKey:f.peerKey})).paused,0);
});
