import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { createWhatsAppIngressStore } from '../../server/sarin/whatsapp/ingress-store.js';
import { createWhatsAppWorkStore } from '../../server/sarin/whatsapp/work-store.js';
const consent = await import('../../server/sarin/whatsapp/consent.js').catch(e => { if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e; });
const DAY=86400000, BASE=Date.UTC(2026,9,18,12);
const latest=(f,table)=>f.sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid DESC LIMIT 1').get();
async function setup(t) {
  const f=await sqliteFixture({whatsapp:true,replies:true});t.after(f.close);
  let at=BASE,seq=0;
  const store=createWhatsAppWorkStore({db:f.db,now:()=>at});
  const ingress=createWhatsAppIngressStore({db:f.db,now:()=>at});
  const event=(text='Proyecto ficticio',kind='inbound',mediaType='text')=>{at+=1000;seq++;return {kind,eventId:'event_'+seq,messageId:'msg_'+seq,wamid:'wamid.'+seq,wabaId:'12345',from:kind==='inbound'?'+573000000001':'+573000000002',to:kind==='inbound'?'+573000000002':'+573000000001',sentAt:at,createdAt:at,mediaType,...(mediaType==='text'?{text}:{})};};
  const capture=async(text,kind,mediaType)=>{const e=event(text,kind,mediaType);await ingress.capture(e);return e;};
  await capture(); const peerKey=latest(f,'sarin_wa_inbox').peer_key;
  await store.setPilotMode({enabled:true,expectedRevision:0,actor:'test'});
  await store.resumePeer({peerKey,expectedRevision:0,actor:'test'});
  async function claim(e){const j=f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id=?').get(e.eventId),token=crypto.randomUUID();const result=await store.claimGeneration({jobId:j.job_id,epoch:j.epoch,token});return {...result,jobId:j.job_id,token};}
  return {...f,store,ingress,event,capture,claim,peerKey,now:()=>at,setTime:v=>{at=v;}};
}
async function notice(f,{send=true,finish=true}={}){
  assert.ok(consent,'Falta consentimiento del canal');
  const c=await f.claim(await f.capture());assert.equal(c.work.decision,'notice');
  const n=await f.store.createFixedReply({...c,purpose:'notice',text:consent.WHATSAPP_NOTICE,version:consent.WHATSAPP_NOTICE_VERSION,hash:createHash('sha256').update(consent.WHATSAPP_NOTICE).digest('hex')});
  await f.store.recordNotice({peerKey:f.peerKey,outboxId:n.outboxId,version:consent.WHATSAPP_NOTICE_VERSION,hash:createHash('sha256').update(consent.WHATSAPP_NOTICE).digest('hex')});
  if(send)await f.store.beginSend({...n,token:c.token});
  if(send&&finish)await f.store.finishSend({...n,token:c.token,result:{status:'accepted',providerId:'provider_notice'}});
  return {...n,token:c.token};
}
const ctx=f=>latest(f,'sarin_wa_contexts');
const delivery=(f,status='delivered',eventId='delivery')=>f.store.applyStatus({eventId,providerId:'provider_notice',status,at:f.now()});

test('classifies_exact_normalized_controls',()=>{
 assert.equal(typeof consent?.classifyWhatsAppInput,'function');
 for(const [text,want] of [['  acepto\n','accept'],['NO\t ACEPTO','stop'],['STOP','stop'],['parar','stop'],[' humano ','human'],['acepto por favor','text']])assert.equal(consent.classifyWhatsAppInput({mediaType:'text',text}),want);
 assert.equal(consent.classifyWhatsAppInput({mediaType:'image',text:'ACEPTO'}),'media');
});
test('notice_never_calls_ai',async t=>{const f=await setup(t),c=await f.claim(await f.capture('Texto previo privado'));assert.equal(c.work.decision,'notice');assert.equal(c.work.input,'');assert.deepEqual(c.work.history,[]);await assert.rejects(f.store.markInferenceStarted(c),e=>e.code==='work_denied');});
test('accept_before_notice_rejected',async t=>{const f=await setup(t);const n=await notice(f,{send:false});await f.capture('ACEPTO');await f.store.beginSend(n);await f.store.finishSend({...n,result:{status:'accepted',providerId:'provider_notice'}});await delivery(f);assert.equal(ctx(f).accepted_at,null);assert.equal(ctx(f).pending_acceptance_event_id,null);});
test('accept_waits_for_delayed_delivery',async t=>{const f=await setup(t);await notice(f);const e=await f.capture('  acepto ');assert.equal(ctx(f).pending_acceptance_event_id,e.eventId);assert.equal(ctx(f).accepted_at,null);assert.equal((await f.claim(e)).status,'busy');assert.deepEqual(await f.store.listDispatchable(),[]);});
test('late_delivery_reconciles_once',async t=>{const f=await setup(t);await notice(f);const e=await f.capture('ACEPTO');await delivery(f);const a=ctx(f);assert.equal(a.acceptance_event_id,e.eventId);assert.equal(a.accepted_at,e.sentAt);assert.equal(a.consent_expires_at,e.sentAt+DAY);f.setTime(f.now()+1000);await delivery(f,'read','read');await f.store.reconcileConsent({peerKey:f.peerKey});assert.equal(ctx(f).consent_expires_at,a.consent_expires_at);const c=await f.claim(e);assert.equal(c.work.decision,'confirm');assert.equal(c.work.input,'');await assert.rejects(f.store.markInferenceStarted(c));const out=await f.store.createFixedReply({...c,purpose:'accepted',text:consent.WHATSAPP_ACCEPTED,version:consent.WHATSAPP_NOTICE_VERSION,hash:a.consent_hash});await f.store.beginSend({...out,token:c.token});});
test('failed_notice_never_grants_consent',async t=>{const f=await setup(t);await notice(f);await f.capture('ACEPTO');await delivery(f,'failed');await delivery(f,'delivered','late');assert.equal(ctx(f).accepted_at,null);assert.equal(ctx(f).paused,1);});
test('stop_works_while_paused',async t=>{const f=await setup(t);await notice(f);await f.capture('ACEPTO');await delivery(f);await f.store.pausePeer({peerKey:f.peerKey,expectedRevision:ctx(f).revision,actor:'test'});await f.capture('NO\t ACEPTO');assert.equal(ctx(f).accepted_at,null);assert.equal(ctx(f).paused,1);});
test('accept_does_not_resume_human_pause',async t=>{const f=await setup(t);await notice(f);await f.capture('HUMANO');await f.capture('ACEPTO');await delivery(f);assert.equal(ctx(f).paused,1);assert.equal(ctx(f).accepted_at,null);});
test('echo_full_capacity_still_pauses',async t=>{const f=await setup(t);const limited=createWhatsAppIngressStore({db:f.db,now:f.now,limits:{maxInboxRows:1}});const e=f.event('respuesta humana','echo');await assert.rejects(limited.capture(e),e=>e.code==='ingress_capacity');assert.equal(ctx(f).paused,1);const revision=ctx(f).revision;await assert.rejects(limited.capture(e));assert.equal(ctx(f).revision,revision);await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:revision,actor:'test'});await assert.rejects(limited.capture(e));assert.equal(ctx(f).paused,0);});
test('stop_alias_and_normalized_control_never_repause_new_context',async t=>{const f=await setup(t);const e=await f.capture('NO\t ACEPTO');assert.equal(ctx(f).paused,1);await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:ctx(f).revision,actor:'test'});await f.ingress.capture({...e,eventId:'alias_stop'});assert.equal(ctx(f).paused,0);});
test('global_activation_and_expired_notice_allow_fresh_notice',async t=>{const f=await setup(t);await notice(f,{send:false});const old=ctx(f).context_id;await f.store.setPilotMode({enabled:false,expectedRevision:1,actor:'test'});await f.store.setPilotMode({enabled:true,expectedRevision:2,actor:'test'});assert.notEqual(ctx(f).context_id,old);const c=await f.claim(await f.capture());assert.equal(c.work.decision,'notice');});
test('expired_notice_rotates_context_without_replaying_old_content',async t=>{const f=await setup(t);await notice(f);const old=ctx(f).context_id;f.setTime(f.now()+DAY+1);const c=await f.claim(await f.capture());assert.notEqual(ctx(f).context_id,old);assert.equal(c.work.decision,'notice');assert.equal(c.work.input,'');});
test('own_limit_keys_only',async t=>{const f=await setup(t);assert.throws(()=>createWhatsAppWorkStore({db:f.db,limits:{toString:1}}),e=>e.code==='work_config_invalid');});

test('first_accept_gets_notice_but_repeated_accept_never_authorizes_ai',async t=>{const f=await setup(t);const first=await f.claim(await f.capture('ACEPTO'));assert.equal(first.work.decision,'notice');await f.store.finishWithoutReply({...first,reason:'ignored'});await notice(f);const e=await f.capture('ACEPTO');await delivery(f);const c=await f.claim(e);await f.store.finishWithoutReply({...c,reason:'ignored'});const again=await f.claim(await f.capture('ACEPTO'));assert.equal(again.work.decision,'ignore');await assert.rejects(f.store.markInferenceStarted(again),e=>e.code==='work_denied');});
test('pending_consent_never_releases_intervening_text_to_ai',async t=>{const f=await setup(t);await notice(f);const e=await f.capture('ACEPTO'),pre=await f.capture('Texto mientras esperaba entrega');f.setTime(f.now()+1000);await delivery(f);const c=await f.claim(e);await f.store.finishWithoutReply({...c,reason:'ignored'});const early=await f.claim(pre);assert.equal(early.work.input,'');assert.notEqual(early.work.decision,'generate');await assert.rejects(f.store.markInferenceStarted(early));});
test('resume_after_echo_preserves_unrevoked_consent_without_old_history',async t=>{const f=await setup(t);await notice(f);await f.capture('ACEPTO');await delivery(f);const prior=ctx(f);await f.capture('Respuesta del titular','echo');await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:ctx(f).revision,actor:'test'});assert.equal(ctx(f).consent_expires_at,prior.consent_expires_at);assert.notEqual(ctx(f).context_id,prior.context_id);const next=await f.claim(await f.capture());assert.equal(next.work.decision,'generate');assert.deepEqual(next.work.history,[]);});
test('notice_and_evidence_are_atomic_even_without_record_call',async t=>{const f=await setup(t);const c=await f.claim(await f.capture());const n=await f.store.createFixedReply({...c,purpose:'notice',text:consent.WHATSAPP_NOTICE,version:consent.WHATSAPP_NOTICE_VERSION,hash:createHash('sha256').update(consent.WHATSAPP_NOTICE).digest('hex')});assert.equal(ctx(f).consent_notice_id,n.outboxId);});

test('capture_trigger_requires_observed_input_before_admitting_work',async t=>{const f=await setup(t);const i=latest(f,'sarin_wa_inbox');f.sqlite.prepare(`INSERT INTO sarin_wa_inbox(event_id,peer_key,kind,state,message_id,wamid,waba_id,business_phone,peer_phone,media_type,text,created_at,sent_at,received_at,expires_at,stored_bytes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('unobserved',f.peerKey,'inbound','captured','unobserved','wamid.unobserved',i.waba_id,i.business_phone,i.peer_phone,'text','HUMANO',f.now()+1,f.now()+1,f.now()+1,f.now()+DAY,100);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_jobs').get().n,0);});

test('future_provider_timestamp_does_not_authorize_preconsent_capture',async t=>{const f=await setup(t);await notice(f);const early=f.event('Texto anterior');early.sentAt+=120000;await f.ingress.capture(early);await f.capture('ACEPTO');await delivery(f);const work=await f.claim(early);assert.equal(work.work.input,'');await assert.rejects(f.store.markInferenceStarted(work));});

test('accept_after_expiry_requires_fresh_notice',async t=>{const f=await setup(t);await notice(f);await f.capture('ACEPTO');await delivery(f);f.setTime(f.now()+DAY+1);const next=await f.claim(await f.capture('ACEPTO'));assert.equal(next.status,'claimed');assert.equal(next.work.decision,'notice');assert.equal(ctx(f).accepted_at,null);});
