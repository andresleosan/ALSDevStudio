import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {sqliteFixture} from './sarin-sqlite-fixture.mjs';
import {handleWhatsAppIngress} from '../../server/sarin/whatsapp/ingress.js';

const at=Date.parse('2026-10-18T12:00:00.000Z'),secret='synthetic-billing-ingress-key';
const business='+573000000002',peer='+573000000001',wabaId='12345';
let seq=0;
function event(change={}){return {id:'event-'+(++seq),type:'whatsapp.message.updated',apiVersion:'v2',createTime:new Date(at).toISOString(),
 whatsappMessage:{id:'external-provider-message',from:business,to:peer,wabaId,status:'delivered',deliverTime:new Date(at-1000).toISOString(),
 pricingModel:'PMP',pricingType:'regular',pricingCategory:'service',totalPrice:0.0008,currency:'USD',...change}};}
function request(value,valid=true){const body=JSON.stringify(value),stamp=String(at/1000);return new Request('https://local.invalid/api/sarin/whatsapp',{method:'POST',body,
 headers:{'Content-Type':'application/json','YCloud-Signature':`t=${stamp},s=${createHmac('sha256',valid?secret:'wrong-key').update(stamp+'.'+body).digest('hex')}`}});}
async function fixture({billing=true}={}){
 const f=await sqliteFixture({history:true,whatsapp:true,replies:true,extensions:billing});
 if(!billing)for(const name of ['0006_whatsapp_handoff.sql','0007_whatsapp_audio.sql','0008_whatsapp_profiles.sql'])f.sqlite.exec(await readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8'));
 if(billing && !f.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sarin_wa_billing_receipts'").get())f.sqlite.exec(await readFile(new URL('../../migrations/sarin/0009_whatsapp_billing.sql',import.meta.url),'utf8'));
 const env={SARIN_DB:f.db,SARIN_WHATSAPP_INGRESS_ENABLED:'true',SARIN_WHATSAPP_REPLIES_ENABLED:'false',SARIN_WHATSAPP_WEBHOOK_SECRET:secret,
 SARIN_WHATSAPP_BUSINESS_PHONE:business,SARIN_WHATSAPP_WABA_ID:wabaId,SARIN_WHATSAPP_ACCESS_MODE:'public',
 SARIN_WHATSAPP_PUBLIC_SINCE:new Date(at-60000).toISOString(),SARIN_WHATSAPP_CAPTURE_SINCE:new Date(at-60000).toISOString()};
 return {...f,env,send:(value,valid=true)=>handleWhatsAppIngress(request(value,valid),env,{now:()=>at}),
  summary:async()=>{const {createWhatsAppBillingStore}=await import('../../server/sarin/whatsapp/billing.js');return createWhatsAppBillingStore({db:f.db,now:()=>at,businessPhone:business,wabaId}).summary();}};
}

test('facturación cuenta entregas del número aunque no las generó Sarin y respuestas estén apagadas',async()=>{
 const f=await fixture();try{
  const response=await f.send(event());assert.equal(response.status,200);
  const usage=await f.summary();assert.equal(usage.available,true);assert.equal(usage.observedMessages,1);assert.equal(usage.paidMessagesObserved,1);
  assert.deepEqual(usage.amounts,[{currency:'USD',amountMicros:'800'}]);assert.equal(usage.partial,true);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_outbox').get().n,0);
 }finally{f.close();}
});

test('read primero, delivered repetido y sent tardío no duplican cargos ni gratuitos',async()=>{
 const f=await fixture();try{
  for(const status of ['read','delivered','delivered','sent'])assert.equal((await f.send(event({status}))).status,200);
  for(const status of ['delivered','read','delivered'])assert.equal((await f.send(event({id:'free-message',status,pricingType:'free_customer_service',totalPrice:0}))).status,200);
  const usage=await f.summary();assert.equal(usage.observedMessages,2);assert.equal(usage.paidMessagesObserved,1);assert.equal(usage.freeServiceObserved,1);
  assert.deepEqual(usage.amounts,[{currency:'USD',amountMicros:'800'}]);
 }finally{f.close();}
});

test('firma, número y WABA limitan la captura; no se deduce identidad de una correlación inventada',async()=>{
 const f=await fixture();try{
  assert.equal((await f.send(event(),false)).status,401);
  const noFrom=event();delete noFrom.whatsappMessage.from;
  for(const payload of [noFrom,event({from:'+573000000099'}),event({wabaId:'99999'}),event({from:peer,to:business})])assert.equal((await f.send(payload)).status,200);
  assert.equal((await f.summary()).observedMessages,0);
  const optionalWaba=event();delete optionalWaba.whatsappMessage.wabaId;assert.equal((await f.send(optionalWaba)).status,200);
  assert.equal((await f.summary()).observedMessages,1);
 }finally{f.close();}
});

test('faltan precios o son inválidos: estado se confirma sin inventar un cargo cero',async()=>{
 const f=await fixture();try{
  const missing=event();delete missing.whatsappMessage.totalPrice;
  assert.equal((await f.send(missing)).status,200);
  assert.equal((await f.send(event({id:'invalid-price',totalPrice:-9}))).status,200);
  const usage=await f.summary();assert.equal(usage.paidMessagesObserved,0);assert.deepEqual(usage.amounts,[]);
  assert.equal(usage.unknownPricingObserved,2);
 }finally{f.close();}
});

test('accepted, sent y failed no son consumo final',async()=>{
 const f=await fixture();try{
  for(const status of ['accepted','sent','failed'])assert.equal((await f.send(event({id:status,status}))).status,200);
  assert.equal((await f.summary()).observedMessages,0);
 }finally{f.close();}
});

test('schema8 sigue confirmando estados sin activar un registro de cobros incompleto',async()=>{
 const f=await fixture({billing:false});try{
  assert.equal((await f.send(event())).status,200);
  assert.deepEqual(await f.summary(),{available:false,status:'unavailable',partial:true});
 }finally{f.close();}
});

test('status fuera de la captura no se usa como backfill financiero',async()=>{
 const f=await fixture();try{
  for(const createdAt of [at-60001,at+300001]){
   const payload=event();payload.createTime=new Date(createdAt).toISOString();
   assert.equal((await f.send(payload)).status,200);
  }
  assert.equal((await f.summary()).observedMessages,0);
 }finally{f.close();}
});

test('error durable de facturación se oculta y un reenvío firmado registra una sola entrega',async()=>{
 const f=await fixture();try{
  const original=f.db.batch;let fail=true;
  f.db.batch=async statements=>{if(fail && statements.some(s=>s.sql.includes('INSERT INTO sarin_wa_billing_receipts'))){fail=false;throw new Error('private-sql +573000000001 secret');}return original(statements);};
  const payload=event(),first=await f.send(payload);assert.equal(first.status,503);
  assert.deepEqual(await first.json(),{error:{code:'ingress_unavailable'}});
  for(let repeat=0;repeat<2;repeat++)assert.equal((await f.send(payload)).status,200);
  const usage=await f.summary();assert.equal(usage.observedMessages,1);assert.deepEqual(usage.amounts,[{currency:'USD',amountMicros:'800'}]);
 }finally{f.close();}
});
