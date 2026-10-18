import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {processorFixture,establishConsent,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {createWhatsAppIngressStore} from '../../server/sarin/whatsapp/ingress-store.js';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {WHATSAPP_NOTICE_VERSION,WHATSAPP_NOTICE} from '../../server/sarin/whatsapp/consent.js';
import * as menu from '../../server/sarin/whatsapp/menu.js';
const sha=text=>createHash('sha256').update(text).digest('hex');
const run=(f,hint)=>processWhatsAppWork(hint,f.env,{store:f.store,now:f.now,fetch:f.fetch});
const posts=f=>f.calls.filter(call=>call.url.includes('ycloud'));
const context=f=>latest(f,'sarin_wa_contexts');
const classification=(f,eventId)=>f.sqlite.prepare('SELECT classification FROM sarin_wa_control_events WHERE event_id=?').get(eventId)?.classification;
async function choice(f,outbox,action,patch={}){
 f.setTime(f.now()+1000);const eventId=crypto.randomUUID();
 const e={kind:'inbound',eventId,messageId:eventId,wamid:'wamid.'+eventId,wabaId:'12345',from:'+573000000001',to:'+573000000002',sentAt:f.now(),createdAt:f.now(),mediaType:'text',text:{accept:'ACEPTO',human:'HUMANO',stop:'SALIR'}[action],choice:{outboxId:outbox.outbox_id,action},...patch};
 const captured=await createWhatsAppIngressStore({db:f.db,now:f.now,repliesEnabled:true}).capture(e);return {e,captured};
}
async function reply(f,{begin=true,text='Respuesta sintética'}={}){
 await establishConsent(f,processWhatsAppWork);const hint=await f.capture('Necesito una tienda'),own={...hint,token:crypto.randomUUID()};
 await f.store.claimGeneration(own);await f.store.markInferenceStarted(own);const output=await f.store.completeGeneration({...own,reply:text,outcome:'completed'});
 if(begin){await f.store.beginSend({...output,token:own.token});await f.store.finishSend({...output,token:own.token,result:{status:'accepted',providerId:'reply_'+crypto.randomUUID()}});}
 return {outbox:latest(f,'sarin_wa_outbox'),hint,own};
}
async function customNotice(f,text,hash=sha(text)){
 const hint=await f.capture('Hola'),own={...hint,token:crypto.randomUUID()};await f.store.claimGeneration(own);
 const out=await f.store.createFixedReply({...own,purpose:'notice',text,version:WHATSAPP_NOTICE_VERSION,hash});
 await f.store.beginSend({...out,token:own.token});const providerId='notice_'+crypto.randomUUID();await f.store.finishSend({...out,token:own.token,result:{status:'accepted',providerId}});
 await f.store.applyStatus({eventId:'delivery_'+crypto.randomUUID(),providerId,status:'delivered',at:f.now()});return latest(f,'sarin_wa_outbox');
}

test('menús posteriores al aviso ofrecen únicamente atención humana y salida',()=>{
 const id='11111111-2222-4333-8444-555555555555';
 for(const purpose of ['accepted','reply'])assert.deepEqual(menu.createWhatsAppMenuButtons(id,purpose).map(b=>b.title),['Hablar con Andrés','Salir']);
 assert.deepEqual(menu.createWhatsAppMenuButtons(id,'notice').map(b=>b.title),['Aceptar','Hablar con Andrés','Salir']);
});
for(const purpose of ['accepted','reply'])for(const action of ['human','stop'])test(action+' actúa desde '+purpose+' y su duplicado no repite aviso',async t=>{
 const f=await processorFixture(t);let outbox;if(purpose==='accepted'){await establishConsent(f,processWhatsAppWork);outbox=latest(f,'sarin_wa_outbox');}else({outbox}=await reply(f));
 const {e}=await choice(f,outbox,action);assert.equal(classification(f,e.eventId),action);assert.equal(context(f).paused,1);assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,action==='human'?1:0);
 assert.equal((await createWhatsAppIngressStore({db:f.db,now:f.now,repliesEnabled:true}).capture(e)).status,'duplicate');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,action==='human'?1:0);
});
for(const purpose of ['accepted','reply'])test('accept forjado contra '+purpose+' nunca se clasifica como aceptación',async t=>{
 const f=await processorFixture(t);let outbox;if(purpose==='accepted'){await establishConsent(f,processWhatsAppWork);outbox=latest(f,'sarin_wa_outbox');}else({outbox}=await reply(f));
 const proof=context(f).acceptance_event_id,{e}=await choice(f,outbox,'accept');assert.equal(classification(f,e.eventId),'ignore');assert.equal(context(f).acceptance_event_id,proof);
});
for(const invalid of ['other_peer','other_context','other_epoch','not_started','expired','conflict','rejected','source_identity'])test('botón de respuesta rechaza '+invalid,async t=>{
 const f=await processorFixture(t),{outbox}=await reply(f,{begin:invalid!=='not_started'});let patch={};
 if(invalid==='other_peer')patch={from:'+573000000099'};
 if(invalid==='other_context')await f.pause();
 if(invalid==='other_epoch')f.sqlite.prepare("UPDATE sarin_wa_outbox SET epoch='another_epoch' WHERE outbox_id=?").run(outbox.outbox_id);
 if(invalid==='expired')f.setTime(outbox.expires_at);
 if(invalid==='conflict')f.sqlite.prepare('UPDATE sarin_wa_outbox SET conflict=1 WHERE outbox_id=?').run(outbox.outbox_id);
 if(invalid==='rejected')f.sqlite.prepare("UPDATE sarin_wa_outbox SET state='rejected' WHERE outbox_id=?").run(outbox.outbox_id);
 if(invalid==='source_identity')f.sqlite.prepare("UPDATE sarin_wa_inbox SET waba_id='999' WHERE event_id=(SELECT event_id FROM sarin_wa_jobs WHERE job_id=?)").run(outbox.job_id);
 const {e}=await choice(f,outbox,'human',patch);assert.equal(classification(f,e.eventId),'ignore');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,0);
});
test('Salir de la respuesta sigue revocando después de intervención humana',async t=>{
 const f=await processorFixture(t),{outbox}=await reply(f);
 await choice(f,outbox,'stop',{kind:'echo',from:'+573000000002',to:'+573000000001',choice:undefined,text:'Continúo yo'});
 assert.equal(context(f).paused,1);assert.ok(context(f).accepted_at);
 const {e}=await choice(f,outbox,'stop');assert.equal(classification(f,e.eventId),'stop');assert.equal(context(f).accepted_at,null);
});
test('allowlist de avisos conserva texto v3 aprobado pero rechaza aviso inventado o alterado',async t=>{
 assert.equal(typeof menu.approvedWhatsAppNotices,'function');const variants=await menu.approvedWhatsAppNotices();assert.equal(variants.length,3);
 for(const variant of variants){assert.equal(sha(variant.text),variant.hash);const f=await processorFixture(t),outbox=await customNotice(f,variant.text,variant.hash),{e}=await choice(f,outbox,'accept');assert.equal(classification(f,e.eventId),'accept');assert.ok(context(f).accepted_at);}
 for(const hash of [sha('Aviso desconocido'),sha(WHATSAPP_NOTICE)]){const f=await processorFixture(t),outbox=await customNotice(f,'Aviso desconocido',hash),{e}=await choice(f,outbox,'accept');assert.equal(classification(f,e.eventId),'ignore');assert.equal(context(f).accepted_at,null);}
});
test('respuesta larga se limita antes de persistir sin cortar grafemas y se envía idéntica',async t=>{
 const f=await processorFixture(t),text='a'.repeat(1010)+'👨‍👩‍👧‍👦'.repeat(15),{outbox,hint}=await reply(f,{begin:false,text});
 assert.ok(outbox.text.length<=1024);assert.equal(outbox.text,'a'.repeat(1010)+'👨‍👩‍👧‍👦…');
 assert.equal(outbox.stored_bytes,Buffer.byteLength(outbox.text));f.setTime(f.now()+120001);await f.store.expireLeases({limit:1});f.reset();await run(f,hint);
 const body=JSON.parse(posts(f)[0].init.body);assert.equal(body.interactive.body.text,outbox.text);assert.equal(posts(f).length,1);
});
test('ready legacy largo se adapta atómicamente antes de enviar y conserva cuota una vez',async t=>{
 const f=await processorFixture(t),{outbox,hint}=await reply(f,{begin:false}),text='😀'.repeat(550),bytes=Buffer.byteLength(text);
 f.sqlite.prepare('UPDATE sarin_wa_outbox SET text=?,stored_bytes=? WHERE outbox_id=?').run(text,bytes,outbox.outbox_id);f.sqlite.prepare('UPDATE sarin_wa_jobs SET reserved_bytes=? WHERE job_id=?').run(bytes,outbox.job_id);
 f.setTime(f.now()+120001);await f.store.expireLeases({limit:1});f.reset();await run(f,hint);await run(f,hint);
 assert.equal(posts(f).length,1);const saved=latest(f,'sarin_wa_outbox'),body=JSON.parse(posts(f)[0].init.body);
 assert.equal(saved.text,'😀'.repeat(511)+'…');assert.equal(body.interactive.body.text,saved.text);assert.equal(saved.stored_bytes,Buffer.byteLength(saved.text));assert.equal(latest(f,'sarin_wa_jobs').reserved_bytes,saved.stored_bytes);
});

for(const action of ['human','stop'])test(action+' funciona desde respuesta con envío incierto sin repetir envío',async t=>{
 const f=await processorFixture(t),{outbox,own}=await reply(f,{begin:false});
 const permit={outboxId:outbox.outbox_id,jobId:outbox.job_id,token:own.token};await f.store.beginSend(permit);await f.store.finishSend({...permit,result:{status:'uncertain'}});
 assert.equal(latest(f,'sarin_wa_outbox').state,'send_uncertain');assert.equal(context(f).paused,1);f.reset();
 const {e}=await choice(f,outbox,action);assert.equal(classification(f,e.eventId),action);assert.equal(context(f).paused,1);assert.equal(context(f).accepted_at,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,action==='human'?1:0);
 await createWhatsAppIngressStore({db:f.db,now:f.now,repliesEnabled:true}).capture(e);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_handoff').get().n,action==='human'?1:0);assert.equal(posts(f).length,0);
});
test('accept no obtiene permiso desde aviso con envío incierto',async t=>{
 const f=await processorFixture(t),hint=await f.capture('Hola'),own={...hint,token:crypto.randomUUID()};await f.store.claimGeneration(own);
 const out=await f.store.createFixedReply({...own,purpose:'notice',text:WHATSAPP_NOTICE,version:WHATSAPP_NOTICE_VERSION,hash:sha(WHATSAPP_NOTICE)});
 await f.store.beginSend({...out,token:own.token});await f.store.finishSend({...out,token:own.token,result:{status:'uncertain'}});
 // Aísla la guarda de estado: una pausa adicional no debe ser lo que rechaza accept.
 f.sqlite.exec('UPDATE sarin_wa_contexts SET paused=0');
 const outbox=latest(f,'sarin_wa_outbox'),{e}=await choice(f,outbox,'accept');assert.equal(classification(f,e.eventId),'ignore');
 assert.equal(context(f).accepted_at,null);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_consent_proofs').get().n,0);
});
