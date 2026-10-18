import test from 'node:test';
import assert from 'node:assert/strict';
import {processorFixture,establishConsent,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {createWhatsAppWorker} from '../../workers/sarin-whatsapp/index.js';
import {SarinError} from '../../server/sarin/policy.js';
const CANARY='CONTENIDO_PRIVADO_NO_REGISTRAR';
const envelope=content=>Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(content)},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120}});
async function prepared(t){const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);const hint=await f.capture('Necesito una tienda ficticia '+CANARY);return {...f,hint};}
const run=(f,fetch,store=f.store)=>processWhatsAppWork(f.hint,f.env,{store,now:f.now,fetch});
const reservations=f=>f.sqlite.prepare('SELECT stage,actual_micros FROM sarin_reservations ORDER BY rowid').all().map(r=>({...r}));
for(const stage of ['classification','generation'])test('conserva invalid_output y diagnóstico cerrado de '+stage+' sin enviar ni reintentar',async t=>{
 const f=await prepared(t),before=f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_outbox').get().n;
 const fetch=async(url,init)=>{const response=await f.fetch(url,init),generation=JSON.parse(init.body).max_tokens===512;
  return generation===(stage==='generation')?envelope(generation?{reply:'Puedo orientar tu tienda.',service:'store',examples:[],brief:{need:'DATO_INVENTADO'}}:{inScope:'sí'}):response;};
 const result=await run(f,fetch);assert.deepEqual(result.inferenceFailure,{stage,code:'invalid_output',diagnostic:stage==='generation'?'brief_not_literal':'clasif_contract'});
 assert.equal(latest(f,'sarin_wa_jobs').outcome,'invalid_output');assert.equal(latest(f,'sarin_wa_contexts').paused,1);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_outbox').get().n,before);assert.equal(f.calls.filter(c=>c.url.includes('ycloud')).length,0);
 const rows=reservations(f);assert.equal(rows.length,stage==='generation'?2:1);assert.equal(rows.at(-1).actual_micros,null);if(stage==='generation')assert.equal(rows[0].actual_micros,54);
 const calls=f.calls.length;await run(f,fetch);assert.equal(f.calls.length,calls);assert.equal(JSON.stringify(result).includes(CANARY),false);
});
test('timeout propio de DeepSeek se conserva como deadline aun sin aborto global',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=await prepared(t);let enter;const ready=new Promise(resolve=>{enter=resolve;});
 const pending=run(f,async(url,init)=>{if(JSON.parse(init.body).max_tokens===512){enter();return new Promise(()=>{});}return f.fetch(url,init);});
 await ready;t.mock.timers.tick(20001);const result=await pending;
 assert.deepEqual(result.inferenceFailure,{stage:'generation',code:'deadline'});assert.equal(latest(f,'sarin_wa_jobs').outcome,'deadline');assert.equal(reservations(f).at(-1).actual_micros,null);
});
test('fallo tras settle se identifica como persistencia sin inventar un error del proveedor',async t=>{
 const f=await prepared(t),store={...f.store,completeGeneration:async()=>{throw Error(CANARY);}};
 const result=await run(f,f.fetch,store);assert.deepEqual(result.inferenceFailure,{stage:'persistence',code:'provider_unavailable'});
 assert.deepEqual(reservations(f).map(r=>r.actual_micros),[54,54]);assert.equal(f.calls.filter(c=>c.url.includes('ycloud')).length,0);
});
test('worker registra sólo campos cerrados y acepta duplicados sin nuevas llamadas',async t=>{
 const f=await prepared(t),logs=[],events=[];t.mock.method(console,'warn',value=>logs.push(JSON.parse(value)));
 const failure=new SarinError(502,'provider_rejected');failure.message=CANARY;failure.diagnostic={toString(){throw Error('No convertir');}};
 const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:async(url,init)=>{if(JSON.parse(init.body).max_tokens===512)throw failure;return f.fetch(url,init);}});
 const message={body:f.hint,attempts:1,ack:()=>events.push('ack'),retry:()=>events.push('retry')};await worker.queue({messages:[message]},f.env);await worker.queue({messages:[message]},f.env);
 assert.deepEqual(logs,[{event:'sarin_whatsapp_inference_failed',stage:'generation',code:'provider_rejected'}]);assert.deepEqual(events,['ack','ack']);assert.equal(latest(f,'sarin_wa_jobs').outcome,'provider_rejected');
 assert.equal(JSON.stringify(logs).includes(CANARY),false);assert.equal(JSON.stringify(logs).includes(f.hint.jobId),false);
});
test('logger fallido no produce retry ni cambia liquidación y pausa',async t=>{
 const f=await prepared(t),events=[];let attempts=0;t.mock.method(console,'warn',()=>{attempts++;throw Error(CANARY);});
 const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:async(url,init)=>JSON.parse(init.body).max_tokens===512?envelope({reply:'No válido',examples:[],brief:{need:'INVENTADO'}}):f.fetch(url,init)});
 await worker.queue({messages:[{body:f.hint,attempts:1,ack:()=>events.push('ack'),retry:()=>events.push('retry')}]},f.env);
 assert.equal(attempts,1);assert.deepEqual(events,['ack']);assert.equal(latest(f,'sarin_wa_contexts').paused,1);assert.equal(reservations(f).at(-1).actual_micros,null);
});
