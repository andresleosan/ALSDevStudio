import test from 'node:test';
import assert from 'node:assert/strict';
import {sqliteFixture} from './sarin-sqlite-fixture.mjs';
import {createWhatsAppBillingStore} from '../../server/sarin/whatsapp/billing.js';
import {processorFixture,establishConsent,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
const AT=Date.parse('2026-10-18T14:00:00Z'),PHONE='+573052778047',TO='+573001111111',WABA='123456789';
async function fixture(t){const f=await sqliteFixture({history:true,whatsapp:true,replies:true});t.after(()=>f.close());let at=AT;
 const store=createWhatsAppBillingStore({db:f.db,now:()=>at,businessPhone:PHONE,wabaId:WABA});
 const add=(n,patch={})=>{const row={alert_id:String(n).padStart(32,'0'),event_id:'event-'+n,peer_key:'peer-'+n,context_id:'context-'+n,peer_revision:0,epoch:'epoch',
  state:'delivered',external_id:'external-'+n,provider_id:'message-'+n,waba_id:WABA,business_phone:PHONE,owner_phone:TO,mode:'text',started_at:AT-2000,delivered_at:AT-1000,
  conflict:0,created_at:AT-3000,expires_at:AT-3000+3600000,receipt_expires_at:AT-3000+86400000,...patch};
 const keys=Object.keys(row);f.sqlite.prepare('INSERT INTO sarin_wa_handoff('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...Object.values(row));};
 return {...f,store,add,setTime:value=>{at=value;}};}
test('reclama una vez antes del GET y marca costo desconocido sin revelar referencias en ledger',async t=>{const f=await fixture(t);f.add(1);
 assert.equal(typeof f.store.claimMissing,'function');const claims=await f.store.claimMissing({limit:1});assert.deepEqual(claims,[{messageId:'message-1',from:PHONE,to:TO,wabaId:WABA,externalId:'external-1',status:'delivered',deliveredAt:AT-1000}]);
 assert.deepEqual(await f.store.receiptState('message-1'),{state:'unknown'});assert.deepEqual(await f.store.claimMissing({limit:1}),[]);
 const summary=await f.store.summary();assert.equal(summary.source,'ycloud');assert.equal(summary.unknownPricingObserved,1);assert.equal(summary.precisionDegraded,true);assert.deepEqual(summary.amounts,[]);
 const ledger=JSON.stringify(f.sqlite.prepare('SELECT * FROM sarin_wa_billing_receipts').all());for(const secret of [PHONE,TO,'message-1','external-1'])assert.equal(ledger.includes(secret),false);
});
test('presupuesto durable de tres GET por minuto resiste concurrencia y reloj hacia atrás',async t=>{const f=await fixture(t);for(let i=1;i<=5;i++)f.add(i);
 const runs=await Promise.all(Array.from({length:6},()=>f.store.claimMissing({limit:1})));assert.equal(runs.flat().length,3);assert.equal(new Set(runs.flat().map(r=>r.messageId)).size,3);
 assert.deepEqual(await f.store.claimMissing({limit:1}),[]);f.setTime(AT-1000);assert.deepEqual(await f.store.claimMissing({limit:1}),[]);
 f.setTime(AT+60000);assert.equal((await f.store.claimMissing({limit:3})).length,2);
});
test('no reclama precios ya recibidos y un webhook posterior completa el marcador unknown',async t=>{const f=await fixture(t);f.add(1);f.add(2);
 const event={messageId:'message-1',status:'read',createdAt:AT,from:PHONE,wabaId:WABA,pricing:{pricingModel:'PMP',pricingType:'regular',pricingCategory:'marketing',totalPrice:0.01,currency:'USD',deliverTime:AT-1000}};
 assert.equal((await f.store.observe(event)).verified,true);assert.deepEqual(await f.store.receiptState('message-1'),{state:'verified'});
 const claims=await f.store.claimMissing({limit:1});assert.equal(claims[0].messageId,'message-2');assert.equal((await f.store.observe({...event,messageId:'message-2'})).verified,true);
 assert.deepEqual(await f.store.receiptState('message-2'),{state:'verified'});assert.equal((await f.store.summary()).paidMessagesObserved,2);
});
test('omite envíos no finales, identidad incompleta, conflictos y recibos vencidos',async t=>{const f=await fixture(t);
 const invalid=[{state:'accepted'},{waba_id:'9'},{business_phone:'+573001234567'},{owner_phone:null},{external_id:''},{started_at:null},{delivered_at:null},{conflict:1},{created_at:AT-86400001,expires_at:AT-86400001+3600000,receipt_expires_at:AT-1}];
 invalid.forEach((patch,i)=>f.add(i+1,patch));assert.deepEqual(await f.store.claimMissing({limit:3}),[]);
 assert.deepEqual(await f.store.receiptState('absent'),{state:'missing'});assert.equal((await f.store.summary()).observedMessages,0);
});
test('reclama mensajes entregados desde outbox con identidad durable aunque atención esté pausada',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);await f.pause();
 const store=createWhatsAppBillingStore({db:f.db,now:f.now,businessPhone:'+573000000002',wabaId:'12345'}),claims=await store.claimMissing({limit:1});
 assert.equal(claims.length,1);assert.equal(claims[0].from,'+573000000002');assert.equal(claims[0].to,'+573000000001');assert.equal(claims[0].status,'delivered');
 const next=await store.claimMissing({limit:1});assert.equal(next.length,1);assert.notEqual(next[0].messageId,claims[0].messageId);
 assert.deepEqual(await store.claimMissing({limit:1}),[]);
});
test('revalida fuente al commit y nunca reserva GET si el inbox desaparece entre lectura e inserción',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);let changed=false,maxBindings=0;
 const db={...f.db,async batch(statements){maxBindings=Math.max(maxBindings,...statements.map(s=>s.values.length));
  if(!changed&&statements.some(s=>s.sql.includes('INSERT INTO sarin_wa_billing_receipts'))){changed=true;f.sqlite.exec('DELETE FROM sarin_wa_inbox');}
  return f.db.batch(statements);}};
 const store=createWhatsAppBillingStore({db,now:f.now,businessPhone:'+573000000002',wabaId:'12345'});
 assert.deepEqual(await store.claimMissing({limit:1}),[]);assert.equal(changed,true);assert.equal(latest(f,'sarin_wa_billing_scopes').lookup_count,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_billing_receipts').get().n,0);assert.ok(maxBindings<=50);
});
