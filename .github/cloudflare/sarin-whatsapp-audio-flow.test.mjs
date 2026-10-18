import test from 'node:test';
import assert from 'node:assert/strict';
import {processorFixture,establishConsent,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {createWhatsAppIngressStore} from '../../server/sarin/whatsapp/ingress-store.js';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {classifyWhatsAppInput} from '../../server/sarin/whatsapp/consent.js';

const descriptor={id:'123456',link:'https://api.ycloud.com/v2/whatsapp/media/download/123456?sig=test&payload=test',sha256:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',mimeType:'audio/ogg'};
async function audio(f, changes={}) {
 f.setTime(f.now()+1000);const eventId=crypto.randomUUID();
 await createWhatsAppIngressStore({db:f.db,now:f.now,repliesEnabled:true}).capture({kind:'inbound',eventId,messageId:eventId,wamid:'wamid.'+eventId,wabaId:'12345',from:'+573000000001',to:'+573000000002',sentAt:f.now(),createdAt:f.now(),mediaType:'audio',audio:descriptor,...changes});
 const j=f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id=?').get(eventId);
 return {jobId:j?.job_id,epoch:j?.epoch};
}
test('audio se distingue de adjuntos; nunca constituye ACEPTO',()=>{
 assert.equal(classifyWhatsAppInput({mediaType:'audio',text:'ACEPTO'}),'audio');
});
test('audio sin consentimiento produce aviso sin descargar ni transcribir',async t=>{
 const f=await processorFixture(t);let called=0;
 const hint=await audio(f);
 assert.ok(hint.jobId);
 await processWhatsAppWork(hint,f.env,{now:f.now,fetch:f.fetch,transcribeAudio:async()=>{called++;throw Error('no');}});
 assert.equal(called,0);assert.equal(latest(f,'sarin_wa_outbox').purpose,'notice');
 assert.equal(latest(f,'sarin_wa_audio').descriptor,null);
 assert.equal(latest(f,'sarin_wa_contexts').paused,0);
});
test('audio aceptado se transcribe una vez y llega como texto a DeepSeek',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);let called=0;
 const hint=await audio(f);
 const options={now:f.now,fetch:f.fetch,transcribeAudio:async({beforeInference})=>{called++;assert.equal(await beforeInference(),true);return {ok:true,text:'Necesito una tienda ficticia',durationSeconds:4};}};
 const result=await processWhatsAppWork(hint,f.env,options);
 assert.equal(result.status,'accepted',JSON.stringify({audio:latest(f,'sarin_wa_audio'),job:latest(f,'sarin_wa_jobs'),calls:f.calls.map(c=>c.url)}));
 await processWhatsAppWork(hint,f.env,options);assert.equal(called,1);
 const row=latest(f,'sarin_wa_audio');assert.equal(row.state,'transcribed');assert.equal(row.transcript,'Necesito una tienda ficticia');assert.equal(row.descriptor,null);
 assert.equal(f.calls.filter(c=>c.url.includes('deepseek')).length,2);
 assert.match(f.calls.find(c=>c.url.includes('deepseek')).init.body,/Necesito una tienda ficticia/);
});
test('pausa durante descarga impide inferencia y salida de audio',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);let permitted;
 await processWhatsAppWork(await audio(f),f.env,{now:f.now,fetch:f.fetch,transcribeAudio:async({beforeInference})=>{await f.pause();permitted=await beforeInference();return {ok:false,reason:'permission_revoked'};}});
 assert.equal(permitted,false);assert.equal(f.calls.length,0);
});
test('formato no compatible devuelve petición de texto sin DeepSeek',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);
 assert.equal((await processWhatsAppWork(await audio(f),f.env,{now:f.now,fetch:f.fetch,transcribeAudio:async()=>({ok:false,reason:'unsupported_format'})})).status,'accepted');
 assert.equal(f.calls.filter(c=>c.url.includes('deepseek')).length,0);assert.match(latest(f,'sarin_wa_outbox').text,/texto|HUMANO/);
});
