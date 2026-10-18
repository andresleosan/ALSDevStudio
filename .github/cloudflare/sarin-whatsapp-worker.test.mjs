import test from 'node:test';
import assert from 'node:assert/strict';
const impl=await import('../../workers/sarin-whatsapp/index.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('consumer_has_no_public_fetch_and_acks_invalid_payload',async()=>{assert.equal(typeof impl.default?.queue,'function','Falta consumidor');assert.equal(impl.default.fetch,undefined);let ack=0,retry=0;await impl.default.queue({messages:[{body:{jobId:'bad',epoch:'bad',text:'forbidden'},attempts:1,ack:()=>ack++,retry:()=>retry++}]},{});assert.equal(ack,1);assert.equal(retry,0);});
const createWhatsAppWorker=(options)=>{assert.equal(typeof impl.createWhatsAppWorker,'function','Falta factoría interna del consumidor');return impl.createWhatsAppWorker(options);};
import {processorFixture,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
test('scheduled_lookup_runs_while_sending_disabled_without_reactivation',async t=>{const f=await processorFixture(t);await processWhatsAppWork(await f.capture(),f.env,{store:f.store,now:f.now,fetch:f.fetch});f.env.SARIN_WHATSAPP_REPLIES_ENABLED='false';f.env.SARIN_WHATSAPP_SEND_ENABLED='false';f.reset();const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:async(url,init)=>{f.counts.fetch++;assert.equal(init.method,'GET');assert.match(url,/\/provider_1$/);return Response.json({id:'provider_1',status:'delivered'});}});await worker.scheduled({},f.env);assert.equal(latest(f,'sarin_wa_outbox').state,'delivered');assert.equal(latest(f,'sarin_wa_pilot').enabled,0);assert.equal(latest(f,'sarin_wa_outbox').reconcile_attempts,1);t.diagnostic('scheduled lookup disabled '+JSON.stringify(f.counts));});
test('scheduled_missing_lookup_config_does_not_claim',async t=>{const f=await processorFixture(t);await processWhatsAppWork(await f.capture(),f.env,{store:f.store,now:f.now,fetch:f.fetch});delete f.env.SARIN_WHATSAPP_API_KEY;await createWhatsAppWorker({store:f.store,now:f.now,fetch:()=>{throw Error('unexpected');}}).scheduled({},f.env);assert.equal(latest(f,'sarin_wa_outbox').reconcile_attempts,0);});
test('queue_complete_invocation_metrics_and_duplicate_ack',async t=>{const f=await processorFixture(t),hint=await f.capture(),worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:f.fetch});let ack=0,retry=0;const m={body:hint,attempts:1,ack:()=>ack++,retry:()=>retry++};f.reset();await worker.queue({messages:[m]},f.env);t.diagnostic('queue notice '+JSON.stringify(f.counts));f.reset();await worker.queue({messages:[m]},f.env);t.diagnostic('queue duplicate '+JSON.stringify(f.counts));assert.equal(ack,2);assert.equal(retry,0);assert.equal(f.calls.length,0);});
test('queue_retries_only_three_times_before_external_markers',async()=>{let ack=0,retry=0;const db={prepare:()=>{throw Error('unavailable');},batch:async()=>[]};for(const attempts of [1,2,3,4])await impl.default.queue({messages:[{body:{jobId:crypto.randomUUID(),epoch:crypto.randomUUID()},attempts,ack:()=>ack++,retry:()=>retry++}]},{SARIN_DB:db});assert.equal(ack,1);assert.equal(retry,3);});

import {createHmac} from 'node:crypto';
import {onRequest} from '../../functions/api/sarin/whatsapp.js';
test('pages_waitUntil_only_notifies_after_durable_capture_and_publish_failure_keeps_ack',async t=>{
 const f=await processorFixture(t),at=f.now()+2000; t.mock.timers.enable({apis:['Date'],now:at});
 const env={...f.env,SARIN_WHATSAPP_INGRESS_ENABLED:'true',SARIN_WHATSAPP_WEBHOOK_SECRET:'synthetic-webhook',SARIN_WHATSAPP_CAPTURE_SINCE:new Date(at-1000).toISOString()};
 const body=JSON.stringify({id:'pages_event',type:'whatsapp.inbound_message.received',apiVersion:'v2',createTime:new Date(at).toISOString(),whatsappInboundMessage:{id:'pages_message',wamid:'wamid.pages',wabaId:'12345',from:'+573000000001',to:'+573000000002',sendTime:new Date(at).toISOString(),type:'text',text:{body:'Pregunta ficticia'}}});
 const timestamp=String(at/1000),signature=createHmac('sha256',env.SARIN_WHATSAPP_WEBHOOK_SECRET).update(timestamp+'.'+body).digest('hex'),promises=[];
 env.SARIN_WHATSAPP_QUEUE={send:async hint=>{assert.equal(f.sqlite.prepare('SELECT state FROM sarin_wa_jobs WHERE job_id=?').get(hint.jobId).state,'queued');assert.deepEqual(Object.keys(hint).sort(),['epoch','jobId']);throw Error('offline');}};
 const response=await onRequest({request:new Request('https://www.alsdevstudio.com/api/sarin/whatsapp',{method:'POST',headers:{'Content-Type':'application/json','YCloud-Signature':`t=${timestamp},s=${signature}`},body}),env,waitUntil:p=>promises.push(p)});
 assert.equal(response.status,200);assert.equal(promises.length,1);await Promise.all(promises);assert.equal(latest(f,'sarin_wa_jobs').state,'queued');assert.equal(f.calls.length,0);
});
test('full_queue_confirm_generation_and_scheduled_maximum_measurements',async t=>{
 const f=await processorFixture(t),worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:f.fetch});
 for(const [label,text] of [['notice','Hola'],['confirm','ACEPTO'],['generation','Necesito una tienda']]){const body=await f.capture(text);f.reset();await worker.queue({messages:[{body,attempts:1,ack(){},retry(){assert.fail('unexpected retry');}}]},f.env);t.diagnostic('full queue '+label+' '+JSON.stringify(f.counts));const o=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'metric_'+label,providerId:o.provider_id,status:'delivered',at:f.now()});}
 const j=await f.capture(),token=crypto.randomUUID();await f.store.claimGeneration({...j,token});f.setTime(f.now()+120001);f.reset();await worker.scheduled({},f.env);t.diagnostic('scheduled expired safe claim + dispatch '+JSON.stringify(f.counts));assert.equal(f.counts.queue,1);assert.equal(f.counts.fetch,0);
});
test('queue_failure_path_resource_measurements',async t=>{
 for(const scenario of ['pause_classification','ambiguous_post','storage_retry']){
  const f=await processorFixture(t);
  if(scenario==='pause_classification'){
   await processWhatsAppWork(await f.capture(),f.env,{store:f.store,now:f.now,fetch:f.fetch});let o=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'n',providerId:o.provider_id,status:'delivered',at:f.now()});
   await processWhatsAppWork(await f.capture('ACEPTO'),f.env,{store:f.store,now:f.now,fetch:f.fetch});o=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'a',providerId:o.provider_id,status:'delivered',at:f.now()});
  }
  const body=await f.capture(),events=[];f.reset();
  const worker=createWhatsAppWorker({store:scenario==='storage_retry'?{...f.store,claimSend:async()=>{throw Error('synthetic storage');}}:f.store,now:f.now,fetch:async(...args)=>{
   if(scenario==='ambiguous_post'){f.counts.fetch++;throw Error('synthetic timeout');}
   const response=await f.fetch(...args);if(scenario==='pause_classification')await f.pause();return response;
  }});
  await worker.queue({messages:[{body,attempts:1,ack(){events.push('ack');},retry(){events.push('retry');}}]},f.env);
  assert.deepEqual(events,[scenario==='storage_retry'?'retry':'ack']);t.diagnostic('queue '+scenario+' '+JSON.stringify(f.counts));
 }
});
