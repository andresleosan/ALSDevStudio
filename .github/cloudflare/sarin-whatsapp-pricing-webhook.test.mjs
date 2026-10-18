import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readYCloudWebhook} from '../../server/sarin/whatsapp/ycloud-webhook.js';

const at=Date.parse('2026-10-18T12:00:00.000Z'),secret='synthetic-pricing-webhook-only';
const business='+573000000002',peer='+573000000001';
const pricing={pricingModel:'PMP',pricingType:'regular',pricingCategory:'service',totalPrice:0.0008,currency:'USD',deliverTime:'2026-10-18T11:59:59.000Z'};
function event(overrides={}){return {id:'synthetic-event',type:'whatsapp.message.updated',apiVersion:'v2',createTime:new Date(at).toISOString(),whatsappMessage:{id:'synthetic-provider-id',from:business,to:peer,wabaId:'12345',status:'delivered',...pricing,...overrides}};}
function signed(payload,valid=true){const body=JSON.stringify(payload),stamp=String(at/1000);return new Request('https://local.invalid/api/sarin/whatsapp',{method:'POST',body,headers:{'Content-Type':'application/json','YCloud-Signature':`t=${stamp},s=${createHmac('sha256',valid?secret:'different').update(stamp+'.'+body).digest('hex')}`}});}
const read=payload=>readYCloudWebhook(signed(payload),{secret,now:()=>at});

test('precio firmado se normaliza sin cuerpo, nombre ni datos de pago adicionales',async()=>{
 const result=await read(event({text:{body:'PRIVATE_TEXT'},customerProfile:{name:'PRIVATE_NAME'},paymentToken:'PRIVATE_SECRET'}));
 assert.equal(result.kind,'status');assert.deepEqual(result.pricing,{...pricing,deliverTime:at-1000});
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_|paymentToken|customerProfile/);
});

test('precio cero válido se conserva como evidencia, distinto de precio ausente',async()=>{
 const result=await read(event({pricingType:'free_customer_service',totalPrice:0}));
 assert.equal(result.pricing?.totalPrice,0);
 const missing=event();delete missing.whatsappMessage.totalPrice;
 assert.equal((await read(missing)).pricing,undefined);
});

test('precios incompletos o inválidos no invalidan el estado normal del mensaje',async()=>{
 for(const change of [{totalPrice:-1},{totalPrice:'0.0008'},{totalPrice:0.0000001},{totalPrice:1000001},{totalPrice:null},
  {currency:'usd'},{currency:'US'},{currency:'USD\n'},{pricingModel:'CBP'},{pricingType:'new_unknown'},
  {pricingCategory:'new_unknown'},{deliverTime:'2026-02-31T11:59:59.000Z'},{deliverTime:'PRIVATE_INVALID'},
  {deliverTime:null},{pricingType:'free_customer_service',totalPrice:0.0008}]){
  const result=await read(event(change));assert.equal(result.kind,'status');assert.equal(result.status,'delivered');assert.equal(result.pricing,undefined,JSON.stringify(change));
 }
});

test('firma ajena no permite obtener el paquete de facturación',async()=>{
 await assert.rejects(()=>readYCloudWebhook(signed(event(),false),{secret,now:()=>at}),error=>error.code==='invalid_signature');
});
