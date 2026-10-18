import test from 'node:test';
import assert from 'node:assert/strict';
import {processorFixture,establishConsent,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {createWhatsAppBillingStore} from '../../server/sarin/whatsapp/billing.js';
import {createWhatsAppWorker} from '../../workers/sarin-whatsapp/index.js';

const implementation=await import('../../server/sarin/whatsapp/billing-sync.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const sync=(env,options)=>{assert.equal(typeof implementation.syncWhatsAppBilling,'function','Falta sincronización GET acotada');return implementation.syncWhatsAppBilling(env,options);};
async function fixture(t,{many=false}={}){
 const f=await processorFixture(t);
 if(many){await establishConsent(f,processWhatsAppWork);for(let n=0;n<2;n++){await processWhatsAppWork(await f.capture('Necesito una tienda'),f.env,{store:f.store,now:f.now,fetch:f.fetch});
  const out=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'billing-delivery-'+n,providerId:out.provider_id,status:'delivered',at:f.now()});}}
 else{await processWhatsAppWork(await f.capture(),f.env,{store:f.store,now:f.now,fetch:f.fetch});const out=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'billing-delivery',providerId:out.provider_id,status:'delivered',at:f.now()});}
 f.env.SARIN_WHATSAPP_SEND_ENABLED='false';f.env.SARIN_WHATSAPP_REPLIES_ENABLED='false';f.reset();
 const billing=createWhatsAppBillingStore({db:f.db,now:f.now,businessPhone:f.env.SARIN_WHATSAPP_BUSINESS_PHONE,wabaId:f.env.SARIN_WHATSAPP_WABA_ID});
 const response=(id,change={})=>{const out=f.sqlite.prepare('SELECT * FROM sarin_wa_outbox WHERE provider_id=?').get(id);return {id,status:'read',from:f.env.SARIN_WHATSAPP_BUSINESS_PHONE,to:'+573000000001',wabaId:'12345',externalId:out.external_id,
  pricingModel:'PMP',pricingType:'regular',pricingCategory:'service',totalPrice:0.0008,currency:'USD',deliverTime:new Date(out.delivered_at).toISOString(),...change};};
 return {...f,billing,response};
}

test('sincroniza sólo por GET tras marcador durable y no consume cuotas ni reactiva envíos',async t=>{
 const f=await fixture(t),calls=[],before=f.sqlite.prepare('SELECT * FROM sarin_wa_send_quota').all();
 const fetcher=async(url,init)=>{assert.equal(init.method,'GET');assert.equal(init.body,undefined);assert.equal(init.redirect,'manual');const id=String(url).split('/').at(-1);
  assert.equal((await f.billing.receiptState(id)).state,'unknown');calls.push(id);return Response.json(f.response(id));};
 const result=await sync(f.env,{now:f.now,fetch:fetcher});assert.equal(result.enriched,1);assert.equal(result.unknown,0);
 await sync(f.env,{now:f.now,fetch:fetcher});
 assert.equal(calls.length,1);const summary=await f.billing.summary();assert.equal(summary.paidMessagesObserved,1);assert.deepEqual(summary.amounts,[{currency:'USD',amountMicros:'800'}]);
 assert.equal(summary.source,'ycloud');assert.equal(summary.partial,true);assert.deepEqual(f.sqlite.prepare('SELECT * FROM sarin_wa_send_quota').all(),before);
 assert.equal(latest(f,'sarin_wa_outbox').state,'delivered');
});

test('cron concurrente comparte máximo3/minuto y cada ID se consulta una sola vez',async t=>{
 const f=await fixture(t,{many:true}),calls=[];
 const fetcher=async(url,init)=>{assert.equal(init.method,'GET');const id=String(url).split('/').at(-1);calls.push(id);return Response.json(f.response(id));};
 await Promise.all([sync(f.env,{now:f.now,fetch:fetcher}),sync(f.env,{now:f.now,fetch:fetcher})]);
 assert.equal(calls.length,3);assert.equal(new Set(calls).size,3);
 await sync(f.env,{now:f.now,fetch:fetcher});assert.equal(calls.length,3);
 f.setTime(f.now()+60000);await sync(f.env,{now:f.now,fetch:fetcher});assert.equal(calls.length,4);assert.equal(new Set(calls).size,4);
 assert.equal((await f.billing.summary()).paidMessagesObserved,4);
});

test('precio ausente o identidad insuficiente queda desconocido y no genera otro GET',async t=>{
 for(const change of [{totalPrice:undefined},{from:undefined},{to:undefined},{from:'+573000000099'},{wabaId:'99999'},{id:'provider_other'},{status:'sent'}]){
  const f=await fixture(t);let calls=0;const fetcher=async(url,init)=>{calls++;assert.equal(init.method,'GET');return Response.json(f.response(String(url).split('/').at(-1),change));};
  await sync(f.env,{now:f.now,fetch:fetcher});await sync(f.env,{now:f.now,fetch:fetcher});assert.equal(calls,1);
  const summary=await f.billing.summary();assert.equal(summary.unknownPricingObserved,1);assert.deepEqual(summary.amounts,[]);
 }
});

test('HTTP401 queda desconocido sin reintentos del ID ni información privada',async t=>{
 const f=await fixture(t);let calls=0;const fetcher=async()=>{calls++;return new Response('private-key private-phone',{status:401});};
 const result=await sync(f.env,{now:f.now,fetch:fetcher});await sync(f.env,{now:f.now,fetch:fetcher});assert.equal(calls,1);
 assert.doesNotMatch(JSON.stringify(result),/private-key|private-phone|provider_/);assert.equal((await f.billing.summary()).unknownPricingObserved,1);
});

test('cancelación antes o después del claim impide GET; un claim ya durable no se devuelve',async t=>{
 const f=await fixture(t),controller=new AbortController();controller.abort();
 await sync(f.env,{now:f.now,signal:controller.signal,fetch:()=>assert.fail('GET tras aborto')});
 assert.equal((await f.billing.summary()).observedMessages,0);
 const active=new AbortController(),store={...f.billing,async claimMissing(options){const claims=await f.billing.claimMissing(options);active.abort();return claims;}};
 await sync(f.env,{now:f.now,signal:active.signal,store,fetch:()=>assert.fail('GET tras claim cancelado')});
 assert.equal((await f.billing.summary()).unknownPricingObserved,1);
 await sync(f.env,{now:f.now,fetch:()=>assert.fail('GET repetido')});
});

test('consumer cron incorpora consulta financiera sin requerir envíos habilitados',async t=>{
 const f=await fixture(t);let calls=0;
 const worker=createWhatsAppWorker({store:f.store,now:f.now,fetch:async(url,init)=>{calls++;assert.equal(init.method,'GET');return Response.json(f.response(String(url).split('/').at(-1)));}});
 await worker.scheduled({},f.env);assert.equal(calls,1);assert.equal((await f.billing.summary()).paidMessagesObserved,1);
});
