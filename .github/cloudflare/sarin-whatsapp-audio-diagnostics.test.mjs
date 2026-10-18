import test from 'node:test';
import assert from 'node:assert/strict';
import {processorFixture,establishConsent,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {createWhatsAppIngressStore} from '../../server/sarin/whatsapp/ingress-store.js';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {createWhatsAppWorker} from '../../workers/sarin-whatsapp/index.js';

async function captureAudio(f) {
 f.setTime(f.now()+1000);const eventId=crypto.randomUUID();
 await createWhatsAppIngressStore({db:f.db,now:f.now,repliesEnabled:true}).capture({kind:'inbound',eventId,messageId:eventId,wamid:'wamid.'+eventId,wabaId:'12345',from:'+573000000001',to:'+573000000002',sentAt:f.now(),createdAt:f.now(),mediaType:'audio',
  audio:{id:'123456',link:'https://api.ycloud.com/v2/whatsapp/media/download/123456?sig=private-fixture',sha256:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',mimeType:'audio/ogg'}});
 const job=f.sqlite.prepare('SELECT job_id,epoch FROM sarin_wa_jobs WHERE event_id=?').get(eventId);
 return {jobId:job.job_id,epoch:job.epoch};
}
const message=(body,events)=>({body,attempts:1,ack:()=>events.push('ack'),retry:()=>events.push('retry')});

test('audio failure exposes only a fixed diagnostic and preserves one fallback send',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);
 const warnings=[];t.mock.method(console,'warn',(...args)=>warnings.push(args));
 const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:f.fetch,transcribeAudio:async()=>({ok:false,reason:'invalid_audio'})});
 const hint=await captureAudio(f),events=[];
 await worker.queue({messages:[message(hint,events)]},f.env);
 await worker.queue({messages:[message(hint,events)]},f.env);
 assert.deepEqual(warnings,[['{"event":"sarin_whatsapp_audio_failed","reason":"invalid_audio"}']]);
 assert.deepEqual(events,['ack','ack']);
 assert.equal(latest(f,'sarin_wa_audio').state,'failed');
 assert.equal(latest(f,'sarin_wa_audio').descriptor,null);
 assert.equal(latest(f,'sarin_wa_jobs').state,'completed');
 assert.equal(latest(f,'sarin_wa_outbox').state,'accepted');
 assert.equal(latest(f,'sarin_wa_send_quota').consumed,3);
 assert.equal(f.calls.length,1);
 assert.match(latest(f,'sarin_wa_outbox').text,/texto|HUMANO/);
});

test('unrecognized audio reason is replaced without logging or coercing private data',async t=>{
 for(const reason of ['https://example.invalid/private?phone=573000000001',{toString(){throw Error('must not coerce');}}]) {
  const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);
  const warnings=[];const mock=t.mock.method(console,'warn',(...args)=>warnings.push(args));
  const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:f.fetch,transcribeAudio:async()=>({ok:false,reason})});
  const events=[];await worker.queue({messages:[message(await captureAudio(f),events)]},f.env);
  assert.deepEqual(warnings,[['{"event":"sarin_whatsapp_audio_failed","reason":"unknown"}']]);
  assert.deepEqual(events,['ack']);assert.equal(latest(f,'sarin_wa_outbox').state,'accepted');
  mock.mock.restore();
 }
});

test('throwing diagnostic logger cannot turn the completed fallback into a queue retry',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);let attempts=0;
 t.mock.method(console,'warn',()=>{attempts++;throw Error('synthetic logging failure');});
 const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:f.fetch,transcribeAudio:async()=>({ok:false,reason:'download_failed'})});
 const events=[];await worker.queue({messages:[message(await captureAudio(f),events)]},f.env);
 assert.equal(attempts,1);assert.deepEqual(events,['ack']);
 assert.equal(latest(f,'sarin_wa_outbox').state,'accepted');
 assert.equal(latest(f,'sarin_wa_send_quota').consumed,3);assert.equal(f.calls.length,1);
});

test('successful transcription does not emit a failure diagnostic',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);
 const warnings=[];t.mock.method(console,'warn',(...args)=>warnings.push(args));
 const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:f.fetch,transcribeAudio:async({beforeInference})=>{assert.equal(await beforeInference(),true);return {ok:true,text:'Necesito una tienda ficticia',durationSeconds:4};}});
 const events=[];await worker.queue({messages:[message(await captureAudio(f),events)]},f.env);
 assert.deepEqual(warnings,[]);assert.deepEqual(events,['ack']);
 assert.equal(latest(f,'sarin_wa_audio').state,'transcribed');assert.equal(latest(f,'sarin_wa_outbox').state,'accepted');
});
