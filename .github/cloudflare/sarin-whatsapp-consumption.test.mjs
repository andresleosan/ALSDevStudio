import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {sqliteFixture} from './sarin-sqlite-fixture.mjs';
import {handleSarinAdmin} from '../../server/sarin/admin.js';
import {createWhatsAppBillingStore} from '../../server/sarin/whatsapp/billing.js';

const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const publicJwk={...pair.publicKey.export({format:'jwk'}),kid:'billing-admin-fixture',alg:'RS256',use:'sig'};
const at=Date.now(),path='/api/control-sarin/whatsapp/consumption';
const env={SARIN_ADMIN_ENABLED:'true',SARIN_FIREBASE_API_KEY:'billing-fixture-public-key',SARIN_FIREBASE_PROJECT_ID:'alsdevstudio',
 SARIN_ADMIN_UID:'billing-owner',SARIN_ADMIN_EMAIL:'owner@example.test',SARIN_ADMIN_CSRF_SECRET:'billing-fixture-csrf-secret-with-32-characters',
 SARIN_WHATSAPP_BUSINESS_PHONE:'+573000000002',SARIN_WHATSAPP_WABA_ID:'12345'};
function jwt(overrides={}){const t=Math.floor(at/1000),claims={iss:'https://securetoken.google.com/alsdevstudio',aud:'alsdevstudio',exp:t+600,iat:t-5,nbf:t-5,
 auth_time:t-5,email:'owner@example.test',email_verified:true,sub:'billing-owner',firebase:{sign_in_provider:'google.com'},...overrides};
 const input=Buffer.from(JSON.stringify({alg:'RS256',kid:publicJwk.kid})).toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url');
 return input+'.'+sign('RSA-SHA256',Buffer.from(input),pair.privateKey).toString('base64url');}
function request({token=jwt(),suffix='',method='GET'}={}){return new Request('https://local.invalid'+path+suffix,{method,headers:token?{Cookie:'__Host-sarin_admin='+token}:{}});}
async function authFetch(url){if(String(url)==='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')return Response.json({keys:[publicJwk]},{headers:{'Cache-Control':'public, max-age=300'}});
 assert.equal(String(url),'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=billing-fixture-public-key','sin red real');
 return Response.json({users:[{localId:'billing-owner',email:'owner@example.test',emailVerified:true,disabled:false,providerUserInfo:[{providerId:'google.com',email:'owner@example.test'}]}]});}
const options={now:()=>at,authFetch};

test('consumo autentica propietario antes de leer datos y no expone detalles privados',async()=>{
 const db={prepare(){assert.fail('D1 antes de autenticación');},batch(){assert.fail('D1 antes de autenticación');}};
 for(const token of [null,'bad.jwt.token',jwt({sub:'other-owner'}),jwt({email:'other@example.test'})]){
  const response=await handleSarinAdmin(request({token}),{...env,SARIN_DB:db},options);
  assert.equal(response.status,403);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.doesNotMatch(await response.text(),/SELECT|billing-owner|fixture-key/);
 }
});

test('consumo autenticado antes de schema9 informa indisponibilidad sin inventar gasto cero',async()=>{
 const f=await sqliteFixture({history:true,whatsapp:true,replies:true,extensions:false});
 for(const name of ['0006_whatsapp_handoff.sql','0007_whatsapp_audio.sql','0008_whatsapp_profiles.sql'])f.sqlite.exec(await readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8'));
 try{const response=await handleSarinAdmin(request(),{...env,SARIN_DB:f.db},options);
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{consumption:{available:false,status:'unavailable',partial:true}});
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 }finally{f.close();}
});

test('consumo rechaza filtros y métodos ajenos sin leer cuentas',async()=>{
 const db={prepare(){assert.fail('no debe consultar D1');},batch(){assert.fail('no debe consultar D1');}};
 const queried=await handleSarinAdmin(request({suffix:'?phone=%2B573000000003'}),{...env,SARIN_DB:db},options);assert.equal(queried.status,400);
 const mutated=await handleSarinAdmin(request({method:'PUT'}),{...env,SARIN_DB:db},options);assert.equal(mutated.status,405);
});

test('consumo schema9 muestra sólo agregados observados y separa monedas, gratuidad y precios desconocidos',async()=>{
 const f=await sqliteFixture({history:true,whatsapp:true,replies:true});
 try{
  const store=createWhatsAppBillingStore({db:f.db,now:()=>at,businessPhone:env.SARIN_WHATSAPP_BUSINESS_PHONE,wabaId:env.SARIN_WHATSAPP_WABA_ID});
  const base={status:'delivered',createdAt:at,from:env.SARIN_WHATSAPP_BUSINESS_PHONE,to:'+573000000001',wabaId:env.SARIN_WHATSAPP_WABA_ID};
  const price={pricingModel:'PMP',pricingType:'regular',pricingCategory:'service',totalPrice:0.0008,currency:'USD',deliverTime:at-1000};
  await store.observe({...base,messageId:'private-provider-id-usd',pricing:price});
  await store.observe({...base,messageId:'private-provider-id-eur',pricing:{...price,currency:'EUR',totalPrice:0.002}});
  await store.observe({...base,messageId:'private-provider-id-free',pricing:{...price,pricingType:'free_customer_service',totalPrice:0}});
  await store.observe({...base,messageId:'private-provider-id-unknown'});
  const response=await handleSarinAdmin(request(),{...env,SARIN_DB:f.db},options),body=await response.text();
  assert.equal(response.status,200);assert.doesNotMatch(body,/private-provider-id|\+57300000000|scope_key|receipt_key|wabaId/);
  const {consumption}=JSON.parse(body);assert.deepEqual(consumption,{available:true,status:'observed',source:'ycloud',month:new Date(at).toISOString().slice(0,7),
   groupingTimezone:'UTC',quotaTimezone:null,coverageStart:at,partial:true,freeServiceAllowance:1000,
   observedMessages:4,freeServiceObserved:1,freeEntryObserved:0,paidMessagesObserved:2,unknownPricingObserved:1,conflictingMessagesObserved:0,
   amounts:[{currency:'EUR',amountMicros:'2000'},{currency:'USD',amountMicros:'800'}],storageLimited:false,precisionDegraded:true});
  assert.equal(response.headers.get('Cache-Control'),'no-store');
 }finally{f.close();}
});

test('consumo sin observaciones y fallos D1 no se confunden con una factura de cero',async()=>{
 const f=await sqliteFixture({history:true,whatsapp:true,replies:true});
 try{
  const response=await handleSarinAdmin(request(),{...env,SARIN_DB:f.db},options),{consumption}=await response.json();
  assert.equal(response.status,200);assert.equal(consumption.status,'empty');assert.equal(consumption.partial,true);assert.deepEqual(consumption.amounts,[]);
  assert.equal(consumption.groupingTimezone,'UTC');assert.equal(consumption.quotaTimezone,null);
 }finally{f.close();}
 const db={prepare(){throw new Error('private-query +573000000001 credential-value');},async batch(){assert.fail('prepare debe fallar');}};
 const failed=await handleSarinAdmin(request(),{...env,SARIN_DB:db},options);assert.equal(failed.status,503);
 assert.doesNotMatch(await failed.text(),/private-query|573000000001|credential-value/);
 assert.equal(failed.headers.get('Cache-Control'),'no-store');
});
