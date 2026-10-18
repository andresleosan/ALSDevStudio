import test from 'node:test';
import assert from 'node:assert/strict';
import {createYCloudClient} from '../../server/sarin/whatsapp/ycloud-client.js';

const at=Date.parse('2026-10-18T12:00:00Z'),from='+573000000002',to='+573000000001',id='provider_billing_1';
const expected={from,to,wabaId:'12345',externalId:'sarin-billing-fixture'};
const payload={id,status:'read',...expected,pricingModel:'PMP',pricingType:'regular',pricingCategory:'service',totalPrice:0.0008,currency:'USD',deliverTime:new Date(at-1000).toISOString()};
function setup(value=payload){const calls=[];return {calls,client:createYCloudClient({apiKey:'synthetic-key',businessPhone:from,
 fetcher:async(url,init)=>{calls.push({url,init});return Response.json(value);}})};}

test('GET opcional devuelve precio validado y descarta cuerpo, nombre y datos ajenos',async()=>{
 const f=setup({...payload,text:{body:'private-message'},contact:{name:'Private Name'},paymentDetails:'private-payment'});
 const result=await f.client.getMessage({id,expected,includePricing:true,observedAt:at});
 assert.deepEqual(result.pricing,{pricingModel:'PMP',pricingType:'regular',pricingCategory:'service',totalPrice:0.0008,currency:'USD',deliverTime:at-1000});
 assert.doesNotMatch(JSON.stringify(result),/private-|Private Name/);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.method,'GET');assert.equal(f.calls[0].init.body,undefined);
 assert.equal(f.calls[0].init.redirect,'manual');assert.equal(f.calls[0].url,'https://api.ycloud.com/v2/whatsapp/messages/'+id);
});

test('sin solicitar precios conserva contrato de reconciliación; precio inválido nunca se vuelve cero',async()=>{
 const f=setup();assert.equal((await f.client.getMessage({id,expected})).pricing,undefined);
 for(const change of [{totalPrice:undefined},{totalPrice:-1},{currency:'usd'},{deliverTime:new Date(at+300001).toISOString()},{pricingType:'free_customer_service',totalPrice:0.0008},{pricingType:'regular',pricingCategory:'referral_conversion',totalPrice:0}]){
  const item=setup({...payload,...change});const result=await item.client.getMessage({id,expected,includePricing:true,observedAt:at});
  assert.equal(result.status,'read');assert.equal(result.pricing,undefined);assert.equal(item.calls.length,1);
 }
});

test('GET de precios mantiene identidad cerrada y valida su reloj antes de consultar',async()=>{
 for(const change of [{id:'other-id'},{from:'+573000000099'},{to:'+573000000099'},{wabaId:'99999'},{externalId:'other-outbox'}]){
  const f=setup({...payload,...change});await assert.rejects(f.client.getMessage({id,expected,includePricing:true,observedAt:at}),{code:'identity_conflict'});assert.equal(f.calls.length,1);
 }
 for(const observedAt of [-1,NaN,Infinity,at+0.5,'now']){
  const f=setup();await assert.rejects(f.client.getMessage({id,expected,includePricing:true,observedAt}),{code:'invalid_request'});assert.equal(f.calls.length,0);
 }
});
