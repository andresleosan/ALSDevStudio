import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {processorFixture,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {createWhatsAppIngressStore} from '../../server/sarin/whatsapp/ingress-store.js';
import {readYCloudWebhook} from '../../server/sarin/whatsapp/ycloud-webhook.js';
import {WHATSAPP_NOTICE,WHATSAPP_NOTICE_VERSION,classifyWhatsAppInput} from '../../server/sarin/whatsapp/consent.js';
const menu=await import('../../server/sarin/whatsapp/menu.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const legacyNumericNotice=(await menu.approvedWhatsAppNotices()).find(notice=>notice.numeric).text;
const UUID='11111111-2222-4333-8444-555555555555';
const canonical={accept:'ACEPTO',human:'HUMANO',stop:'SALIR'};
const context=f=>f.sqlite.prepare('SELECT * FROM sarin_wa_contexts WHERE peer_key=?').get(f.peerKey);
const classification=(f,e)=>f.sqlite.prepare('SELECT classification FROM sarin_wa_control_events WHERE event_id=?').get(e.eventId)?.classification;
function event(f,text,choice) {
 f.setTime(f.now()+1000);const eventId=crypto.randomUUID();
 return {kind:'inbound',eventId,messageId:eventId,wamid:'wamid.'+eventId,wabaId:'12345',from:'+573000000001',to:'+573000000002',sentAt:f.now(),createdAt:f.now(),mediaType:'text',text,...(choice?{choice}:{})};
}
const capture=(f,e,db=f.db)=>createWhatsAppIngressStore({db,now:f.now,repliesEnabled:true}).capture(e);
async function claim(f,e) {
 const job=f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id=?').get(e.eventId);
 assert.ok(job);const own={jobId:job.job_id,epoch:job.epoch,token:crypto.randomUUID()};
 return {...await f.store.claimGeneration(own),...own};
}
async function notice(f,{text=WHATSAPP_NOTICE,send=true,deliver=true}={}) {
 const e=event(f,'Hola');await capture(f,e);const c=await claim(f,e);
 assert.equal(c.work.decision,'notice');
 const out=await f.store.createFixedReply({...c,purpose:'notice',text,version:WHATSAPP_NOTICE_VERSION,hash:createHash('sha256').update(text).digest('hex')});
 const sent={...out,token:c.token},providerId='p_'+crypto.randomUUID();
 if(send){await f.store.beginSend(sent);await f.store.finishSend({...sent,result:{status:'accepted',providerId}});}
 if(send&&deliver)await f.store.applyStatus({eventId:'d_'+crypto.randomUUID(),providerId,status:'delivered',at:f.now()});
 return {...sent,providerId};
}
async function accepted(f) {
 const e=event(f,'ACEPTO');await capture(f,e);assert.ok(context(f).accepted_at);
 await f.store.finishWithoutReply({...await claim(f,e),reason:'ignored'});
}

test('menu IDs round-trip only exact actions and UUID references',()=>{
 assert.equal(typeof menu.createWhatsAppMenuButtons,'function');assert.equal(typeof menu.parseWhatsAppMenuReply,'function');
 assert.deepEqual(menu.createWhatsAppMenuButtons(UUID),[
  {id:'sarin.menu.v1:accept:'+UUID,title:'Aceptar'},
  {id:'sarin.menu.v1:human:'+UUID,title:'Hablar con Andrés'},
  {id:'sarin.menu.v1:stop:'+UUID,title:'Salir'},
 ]);
 assert.deepEqual(menu.parseWhatsAppMenuReply('sarin.menu.v1:accept:'+UUID),{outboxId:UUID,action:'accept'});
 for(const id of ['ACEPTO','sarin.menu.v1:accept:bad','sarin.menu.v2:accept:'+UUID,'sarin.menu.v1:other:'+UUID,' sarin.menu.v1:accept:'+UUID,{},null])assert.equal(menu.parseWhatsAppMenuReply(id),null);
 assert.throws(()=>menu.createWhatsAppMenuButtons('bad'));
});
test('SALIR stops but bare digits are not global commands',()=>{
 assert.equal(classifyWhatsAppInput({mediaType:'text',text:' salir '}),'stop');
 for(const text of ['1','2','3'])assert.equal(classifyWhatsAppInput({mediaType:'text',text}),'text');
 assert.equal(WHATSAPP_NOTICE_VERSION,'whatsapp-service-2026-10-18-v3');assert.ok(WHATSAPP_NOTICE.length<=1024);
});

async function readButton(id,title='ACEPTO') {
 const at=Date.UTC(2026,9,18,12),secret='synthetic-menu-webhook';
 const payload=JSON.stringify({id:'event_menu',type:'whatsapp.inbound_message.received',apiVersion:'v2',createTime:new Date(at).toISOString(),whatsappInboundMessage:{id:'msg_menu',wamid:'wamid.menu',wabaId:'12345',from:'+573000000001',to:'+573000000002',sendTime:new Date(at).toISOString(),type:'interactive',interactive:{type:'button_reply',button_reply:{id,title}},context:{id:'wamid.original',from:'573000000002'}}});
 const ts=String(at/1000),sig=createHmac('sha256',secret).update(ts+'.'+payload).digest('hex');
 return readYCloudWebhook(new Request('https://example.invalid/webhook',{method:'POST',headers:{'Content-Type':'application/json','YCloud-Signature':`t=${ts},s=${sig}`},body:payload}),{secret,now:()=>at});
}
test('signed button uses its ID and never trusts the displayed title',async()=>{
 const e=await readButton('sarin.menu.v1:human:'+UUID,'ACEPTO');
 assert.equal(e.mediaType,'text');assert.equal(e.text,'HUMANO');assert.deepEqual(e.choice,{outboxId:UUID,action:'human'});
 assert.equal(JSON.stringify(e).includes('wamid.original'),false);
});
test('unknown button with accept title is ignored instead of granting a command',async()=>{
 assert.deepEqual(await readButton('unrelated_button','ACEPTO'),{kind:'ignored'});
});

test('current accept button grants one proof and duplicates do not consume sends',async t=>{
 const f=await processorFixture(t),n=await notice(f),e=event(f,'ACEPTO',{outboxId:n.outboxId,action:'accept'});
 await capture(f,e);assert.equal(classification(f,e),'accept');assert.ok(context(f).accepted_at);
 assert.equal(f.sqlite.prepare('SELECT notice_id FROM sarin_wa_consent_proofs').get().notice_id,n.outboxId);
 assert.equal((await capture(f,e)).status,'duplicate');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_consent_proofs').get().n,1);
 assert.equal(latest(f,'sarin_wa_send_quota').consumed,1);
 await assert.rejects(capture(f,{...e,choice:{...e.choice,outboxId:UUID}}),err=>err.code==='event_conflict');
});
test('old menu button cannot accept the new notice or enter an AI job',async t=>{
 const f=await processorFixture(t),old=await notice(f);
 await f.pause();await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:context(f).revision,actor:'test'});
 const current=await notice(f),e=event(f,'ACEPTO',{outboxId:old.outboxId,action:'accept'});await capture(f,e);
 assert.notEqual(current.outboxId,old.outboxId);assert.equal(classification(f,e),'ignore');assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_jobs WHERE event_id=?').get(e.eventId).n,0);
});
test('button from another peer is ignored without changing the owner of the notice',async t=>{
 const f=await processorFixture(t),n=await notice(f),e={...event(f,'HUMANO',{outboxId:n.outboxId,action:'human'}),from:'+573000000099'};
 await capture(f,e);assert.equal(classification(f,e),'ignore');assert.equal(context(f).paused,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,0);
});
test('button before notice begins never becomes consent after later delivery',async t=>{
 const f=await processorFixture(t),n=await notice(f,{send:false}),e=event(f,'ACEPTO',{outboxId:n.outboxId,action:'accept'});
 await capture(f,e);assert.equal(classification(f,e),'ignore');
 await f.store.beginSend(n);await f.store.finishSend({...n,result:{status:'accepted',providerId:n.providerId}});
 await f.store.applyStatus({eventId:'late_delivery',providerId:n.providerId,status:'delivered',at:f.now()});
 assert.equal(context(f).accepted_at,null);assert.equal(context(f).pending_acceptance_event_id,null);
});
test('current button waits for delivery before granting consent',async t=>{
 const f=await processorFixture(t),n=await notice(f,{deliver:false}),e=event(f,'ACEPTO',{outboxId:n.outboxId,action:'accept'});
 await capture(f,e);assert.equal(context(f).accepted_at,null);assert.equal(context(f).pending_acceptance_event_id,e.eventId);
 await f.store.applyStatus({eventId:'later_delivery',providerId:n.providerId,status:'delivered',at:f.now()});assert.ok(context(f).accepted_at);
});
for(const [digit,want] of [['1','accept'],['2','human'],['3','stop']])test('digit '+digit+' acts only in the pending current menu',async t=>{
 const f=await processorFixture(t);await notice(f,{text:legacyNumericNotice});const e=event(f,digit);await capture(f,e);
 assert.equal(classification(f,e),want);assert.equal(context(f).paused,want==='accept'?0:1);
 assert.equal(Boolean(context(f).accepted_at),want==='accept');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,want==='human'?1:0);
 assert.equal(latest(f,'sarin_wa_send_quota').consumed,1);
});
test('digits before any menu remain text and cannot accept',async t=>{
 const f=await processorFixture(t);const e=event(f,'1');await capture(f,e);
 assert.equal(classification(f,e),'text');assert.equal(context(f).accepted_at,null);
 assert.equal((await claim(f,e)).work.decision,'notice');
});
test('digits remain commercial input after acceptance',async t=>{
 const f=await processorFixture(t);await notice(f);await accepted(f);
 for(const digit of ['1','2','3']){const e=event(f,digit);await capture(f,e);assert.equal(classification(f,e),'text');assert.equal(context(f).paused,0);
  const c=await claim(f,e);assert.equal(c.work.decision,'generate');assert.equal(c.work.input,digit);await f.store.finishWithoutReply({...c,reason:'ignored'});}
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,0);
});
for(const action of ['human','stop'])test('valid '+action+' button after acceptance revokes and pauses',async t=>{
 const f=await processorFixture(t),n=await notice(f);await accepted(f);
 const e=event(f,canonical[action],{outboxId:n.outboxId,action});await capture(f,e);
 assert.equal(classification(f,e),action);assert.equal(context(f).paused,1);assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,action==='human'?1:0);
});
test('old v3 notice cannot enable numeric aliases and its explicit acceptance stays valid',async t=>{
 const f=await processorFixture(t);await notice(f,{text:'Aviso v3 anterior sin opciones numéricas'});
 const digit=event(f,'1');await capture(f,digit);assert.equal(classification(f,digit),'text');assert.equal(context(f).accepted_at,null);
 await f.store.finishWithoutReply({...await claim(f,digit),reason:'ignored'});await accepted(f);
 const proof=context(f),e=event(f,'Quiero una tienda');await capture(f,e);const c=await claim(f,e);
 assert.equal(c.work.decision,'generate');assert.equal(context(f).accepted_at,proof.accepted_at);assert.equal(context(f).consent_hash,proof.consent_hash);
});
test('numeric pause rechecks the current notice in its atomic control batch',async t=>{
 const f=await processorFixture(t);await notice(f,{text:legacyNumericNotice});let invalidated=false;
 const db={...f.db,batch:async statements=>{if(!invalidated&&statements.some(s=>s.sql.includes('INSERT INTO sarin_wa_control_events'))){invalidated=true;f.sqlite.prepare('UPDATE sarin_wa_contexts SET consent_notice_id=NULL WHERE peer_key=?').run(f.peerKey);}return f.db.batch(statements);}};
 const e=event(f,'2');await capture(f,e,db);assert.equal(invalidated,true);assert.equal(classification(f,e),'text');assert.equal(context(f).paused,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,0);
});
test('current stop button revokes consent retained by an earlier human echo',async t=>{
 const f=await processorFixture(t),n=await notice(f);await accepted(f);
 const echo={...event(f,'Continúo yo'),kind:'echo',from:'+573000000002',to:'+573000000001'};
 await capture(f,echo);assert.equal(context(f).paused,1);assert.ok(context(f).accepted_at);
 const e=event(f,'SALIR',{outboxId:n.outboxId,action:'stop'});await capture(f,e);
 assert.equal(classification(f,e),'stop');assert.equal(context(f).paused,1);assert.equal(context(f).accepted_at,null);
});
test('accept button rechecks its exact notice at commit time',async t=>{
 const f=await processorFixture(t),n=await notice(f);let invalidated=false;
 const db={...f.db,batch:async statements=>{if(!invalidated&&statements.some(s=>s.sql.includes('INSERT INTO sarin_wa_control_events'))){invalidated=true;f.sqlite.prepare('UPDATE sarin_wa_contexts SET consent_notice_id=NULL WHERE peer_key=?').run(f.peerKey);}return f.db.batch(statements);}};
 const e=event(f,'ACEPTO',{outboxId:n.outboxId,action:'accept'});await capture(f,e,db);
 assert.equal(invalidated,true);assert.equal(classification(f,e),'ignore');assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_jobs WHERE event_id=?').get(e.eventId).n,0);
});
test('choice rejects ambiguous text and unknown private fields',async t=>{
 const f=await processorFixture(t),n=await notice(f);
 for(const choice of [{outboxId:n.outboxId,action:'accept',title:'private'},{outboxId:n.outboxId,action:'unknown'}])await assert.rejects(capture(f,event(f,'ACEPTO',choice)),e=>e.code==='invalid_event');
 await assert.rejects(capture(f,event(f,'HUMANO',{outboxId:n.outboxId,action:'accept'})),e=>e.code==='invalid_event');
});

function fillControls(f) {
 const c=context(f);
 f.sqlite.prepare(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<20000)
  INSERT INTO sarin_wa_control_events(event_id,message_key,event_hash,message_hash,peer_key,context_id,classification,sent_at,observed_at,expires_at,applied)
  SELECT 'cap_'||x,'capmsg_'||x,'synthetic','synthetic',?,?,'ignore',?,?,?,1 FROM n
  LIMIT 20000-(SELECT COUNT(*) FROM sarin_wa_control_events)`).run(f.peerKey,c.context_id,f.now(),f.now(),f.now()+86400000);
}

for(const [digit,want] of [['2','human'],['3','stop']])test('pending digit '+digit+' survives control saturation and retries once',async t=>{
 const f=await processorFixture(t);await notice(f,{text:legacyNumericNotice});fillControls(f);const e=event(f,digit);
 await assert.rejects(capture(f,e),error=>error.code==='ingress_capacity');
 assert.equal(context(f).paused,1);assert.equal(classification(f,e),undefined);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_control_events').get().n,20000);
 f.sqlite.prepare("DELETE FROM sarin_wa_control_events WHERE event_id='cap_1'").run();
 await capture(f,e);assert.equal(classification(f,e),want);assert.equal(context(f).paused,1);assert.equal(context(f).accepted_at,null);
 assert.equal((await capture(f,e)).status,'duplicate');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,want==='human'?1:0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_jobs WHERE event_id=?').get(e.eventId).n,0);
 assert.equal(latest(f,'sarin_wa_send_quota').consumed,1);
});

test('saturated numeric human clears pending acceptance and cannot gain consent on delivery',async t=>{
 const f=await processorFixture(t),n=await notice(f,{text:legacyNumericNotice,deliver:false}),a=event(f,'1');await capture(f,a);
 assert.equal(context(f).pending_acceptance_event_id,a.eventId);fillControls(f);const e=event(f,'2');
 await assert.rejects(capture(f,e),error=>error.code==='ingress_capacity');
 assert.equal(context(f).paused,1);assert.equal(context(f).pending_acceptance_event_id,null);
 await f.store.applyStatus({eventId:'after_capacity_delivery',providerId:n.providerId,status:'delivered',at:f.now()});
 f.sqlite.prepare("DELETE FROM sarin_wa_control_events WHERE event_id='cap_1'").run();await capture(f,e);
 assert.equal(classification(f,e),'human');assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_consent_proofs').get().n,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,1);
});

test('digits after accepted conversation is paused never become menu commands',async t=>{
 const f=await processorFixture(t);await notice(f,{text:legacyNumericNotice});await accepted(f);
 const echo={...event(f,'Continúo yo'),kind:'echo',from:'+573000000002',to:'+573000000001'};await capture(f,echo);
 // Un STOP posterior revoca accepted_at; la prueba conserva que este menú ya se aceptó.
 await capture(f,event(f,'STOP'));assert.equal(context(f).paused,1);assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_consent_proofs').get().n,1);
 for(const digit of ['1','2','3']){const e=event(f,digit);await capture(f,e);assert.equal(classification(f,e),'text');}
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,0);
});

test('numeric acceptance stays blocked while an unaccepted menu is paused',async t=>{
 const f=await processorFixture(t);await notice(f,{text:legacyNumericNotice});await f.pause();const e=event(f,'1');await capture(f,e);
 assert.equal(classification(f,e),'text');assert.equal(context(f).paused,1);assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_consent_proofs').get().n,0);
});

test('new notice without numeric options does not reinterpret bare digits',async t=>{
 const f=await processorFixture(t);await notice(f);
 for(const digit of ['1','2','3']){const e=event(f,digit);await capture(f,e);assert.equal(classification(f,e),'text');}
 assert.equal(context(f).accepted_at,null);assert.equal(context(f).paused,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,0);
});
