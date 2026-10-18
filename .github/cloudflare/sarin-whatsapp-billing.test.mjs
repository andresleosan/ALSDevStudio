import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { verifySarinBackup } from './check-sarin-backup.mjs';
import { clearRestoredHistory } from '../../server/sarin/history-recovery.js';
import { detectWhatsAppSchema } from '../../server/sarin/whatsapp/work-schema.js';
import { runRetention } from '../../workers/sarin-retention/index.js';

const AT=Date.parse('2026-10-18T14:00:00Z'),PHONE='+573052778047',WABA='123456789';
let billing;
try { billing=await import('../../server/sarin/whatsapp/billing.js'); } catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
async function fixture(t){const f=await sqliteFixture({history:true,whatsapp:true,replies:true});t.after(()=>f.close());
 if(!f.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE name='sarin_wa_billing_receipts'").get())f.sqlite.exec(await readFile(new URL('../../migrations/sarin/0009_whatsapp_billing.sql',import.meta.url),'utf8'));
 return {...f,store:billing.createWhatsAppBillingStore({db:f.db,now:()=>AT,businessPhone:PHONE,wabaId:WABA})};}
const event=(id='message-1',price={})=>({kind:'status',eventId:'event-'+id,messageId:id,status:'delivered',createdAt:AT,from:PHONE,wabaId:WABA,
 pricing:{pricingModel:'PMP',pricingType:'regular',pricingCategory:'marketing',totalPrice:0.0008,currency:'USD',deliverTime:AT-1000,...price}});

test('expone registro y resumen de cargos observados',()=>{assert.equal(typeof billing?.createWhatsAppBillingStore,'function');});
test('deduplica delivered/read y orden inverso; suma microunidades sin mezclar monedas',async t=>{if(!billing)return t.skip();const f=await fixture(t);
 await f.store.observe({...event(),status:'read'});await f.store.observe(event());await f.store.observe({...event(),eventId:'duplicate'});
 await f.store.observe(event('message-2',{totalPrice:0.01,currency:'COP'}));const s=await f.store.summary();
 assert.equal(s.observedMessages,2);assert.equal(s.paidMessagesObserved,2);assert.deepEqual(s.amounts,[{currency:'COP',amountMicros:'10000'},{currency:'USD',amountMicros:'800'}]);
 assert.equal(s.partial,true);assert.equal(s.groupingTimezone,'UTC');assert.equal(s.quotaTimezone,null);assert.equal(s.coverageStart,AT);
 const raw=JSON.stringify(f.sqlite.prepare('SELECT * FROM sarin_wa_billing_receipts').all());for(const value of [PHONE,WABA,'message-1','event-message-1'])assert.equal(raw.includes(value),false);
});
test('sólo estados finales del negocio; WABA ausente permitido, distinto rechazado',async t=>{if(!billing)return t.skip();const f=await fixture(t);
 for(const status of ['accepted','sent','failed'])await f.store.observe({...event(status),status});
 for(const change of [{from:'+573001111111'},{wabaId:'9876'},{from:undefined}])await f.store.observe({...event(),...change});
 assert.equal((await f.store.summary()).observedMessages,0);await f.store.observe({...event(),wabaId:undefined});assert.equal((await f.store.summary()).observedMessages,1);
});
test('gratuitos de servicio y entrada se separan, desconocido nunca se convierte en cero',async t=>{if(!billing)return t.skip();const f=await fixture(t);
 await f.store.observe(event('service',{pricingType:'free_customer_service',pricingCategory:'service',totalPrice:0}));
 await f.store.observe(event('entry',{pricingType:'free_entry_point',pricingCategory:'referral_conversion',totalPrice:0}));
 await f.store.observe({...event('unknown'),pricing:undefined});const s=await f.store.summary();
 assert.equal(s.freeServiceObserved,1);assert.equal(s.freeEntryObserved,1);assert.equal(s.unknownPricingObserved,1);assert.equal(s.paidMessagesObserved,0);assert.deepEqual(s.amounts,[]);
 assert.equal('remaining' in s,false);assert.equal(s.freeServiceAllowance,1000);
});
test('recibo incompleto puede completarse; dos precios finales contradictorios quedan excluidos',async t=>{if(!billing)return t.skip();const f=await fixture(t);
 await f.store.observe({...event(),pricing:undefined});await f.store.observe(event());assert.equal((await f.store.summary()).paidMessagesObserved,1);
 await f.store.observe(event('message-1',{totalPrice:0.001}));await f.store.observe(event());const s=await f.store.summary();
 assert.equal(s.observedMessages,1);assert.equal(s.conflictingMessagesObserved,1);assert.equal(s.unknownPricingObserved,1);assert.deepEqual(s.amounts,[]);
});
test('valida precios completos, combinaciones gratuitas, precisión y fechas',async t=>{if(!billing)return t.skip();const f=await fixture(t);
 const invalid=[{totalPrice:-1},{totalPrice:0.0000001},{totalPrice:Infinity},{totalPrice:1000001},{currency:'usd'},{pricingModel:'CBP'},
 {pricingType:'other'},{pricingCategory:'other'},{pricingType:'free_customer_service',totalPrice:0.1},{deliverTime:AT+600000}];
 for(let i=0;i<invalid.length;i++)await f.store.observe(event('bad-'+i,invalid[i]));const s=await f.store.summary();assert.equal(s.unknownPricingObserved,invalid.length);assert.deepEqual(s.amounts,[]);
});
test('agrupa por fecha de entrega UTC, conserva cobertura y caduca en trece meses calendario',async t=>{if(!billing)return t.skip();const f=await fixture(t);
 const delivered=Date.parse('2026-09-30T23:59:59Z');await f.store.observe(event('past',{deliverTime:delivered}));assert.equal((await f.store.summary()).observedMessages,0);
 const receipt=f.sqlite.prepare('SELECT * FROM sarin_wa_billing_receipts').get();assert.equal(receipt.month_key,'2026-09');
 const expires=Date.parse('2027-10-30T23:59:59Z');assert.equal(receipt.expires_at,expires);
 assert.equal((await billing.purgeWhatsAppBilling({db:f.db,now:()=>expires-1})).deleted,0);
 assert.equal((await billing.purgeWhatsAppBilling({db:f.db,now:()=>expires})).deleted,1);
 assert.equal((await f.store.summary()).coverageStart,AT);
});
test('sin schema9 permanece no disponible y no toca estados previos',async t=>{if(!billing)return t.skip();const f=await sqliteFixture({history:true,whatsapp:true,replies:true,extensions:false});t.after(()=>f.close());
 const store=billing.createWhatsAppBillingStore({db:f.db,now:()=>AT,businessPhone:PHONE,wabaId:WABA});assert.equal((await store.summary()).available,false);assert.equal((await store.observe(event())).available,false);
});
function exported(f){const objects=f.sqlite.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*'").all();
 const quote=v=>f.sqlite.prepare('SELECT quote(?) q').get(v).q;return objects.map(o=>o.sql+';').join('\n')+'\n'+objects.filter(o=>o.type==='table')
 .flatMap(o=>f.sqlite.prepare('SELECT * FROM '+o.name).all().map(row=>'INSERT INTO '+o.name+' VALUES('+Object.values(row).map(quote).join(',')+');')).join('\n');}
test('capacidad transaccional, duplicado al límite, suma grande exacta y purga acotada',async t=>{const f=await fixture(t);await f.store.observe(event());
 assert.equal(f.sqlite.prepare('SELECT receipt_rows FROM sarin_wa_billing_scopes').get().receipt_rows,1);
 f.sqlite.exec(`WITH RECURSIVE n(x) AS(SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<99999)
 INSERT INTO sarin_wa_billing_receipts(receipt_key,scope_key,month_key,delivered_at,quality,pricing_type,category,amount_micros,currency,first_seen,last_seen,expires_at)
 SELECT printf('%064x',n.x),r.scope_key,r.month_key,r.delivered_at,1,'regular','marketing',1000000000000,'USD',r.first_seen,r.last_seen,r.expires_at
 FROM n CROSS JOIN (SELECT * FROM sarin_wa_billing_receipts LIMIT 1) r`);
 const s=await f.store.summary();assert.equal(s.observedMessages,100000);assert.deepEqual(s.amounts,[{currency:'USD',amountMicros:'99999000000000800'}]);
 assert.equal((await f.store.observe(event('overflow'))).recorded,false);assert.equal((await f.store.summary()).storageLimited,true);
 await f.store.observe(event());assert.equal(f.sqlite.prepare('SELECT receipt_rows FROM sarin_wa_billing_scopes').get().receipt_rows,100000);
 const expires=f.sqlite.prepare('SELECT expires_at FROM sarin_wa_billing_receipts LIMIT 1').get().expires_at;
 assert.deepEqual(await billing.purgeWhatsAppBilling({db:f.db,now:()=>expires,limit:500}),{deleted:500,remaining:true});
 assert.equal(f.sqlite.prepare('SELECT receipt_rows FROM sarin_wa_billing_scopes').get().receipt_rows,99500);
});
test('schema10 se verifica en backup y recuperación de historia conserva recibos y cobertura parcial',async t=>{const f=await fixture(t);await f.store.observe(event());
 assert.equal(await detectWhatsAppSchema({db:f.db}),10);const before=await f.store.summary();
 const report=await verifySarinBackup(Buffer.from(exported(f)));assert.equal(report.whatsappSchemaVersion,10);assert.equal(report.counts.sarin_wa_billing_receipts,1);
 f.sqlite.exec('PRAGMA foreign_keys=OFF');await clearRestoredHistory({db:f.db,now:()=>AT,maintenanceConfirmed:true,requestsDrained:true});
 assert.deepEqual(await f.store.summary(),before);assert.equal((await f.store.summary()).partial,true);
});
test('backup rechaza contadores de capacidad incoherentes y rollback aditivo vuelve a8',async t=>{const f=await fixture(t);await f.store.observe(event());
 f.sqlite.exec('UPDATE sarin_wa_billing_scopes SET receipt_rows=0');await assert.rejects(verifySarinBackup(Buffer.from(exported(f))));
 f.sqlite.exec('DROP TABLE sarin_wa_billing_receipts; DROP TABLE sarin_wa_billing_scopes;');assert.equal(await detectWhatsAppSchema({db:f.db}),8);
});
test('fecha de entrega contradictoria entre meses degrada precisión sin sumar ni mover el cargo',async t=>{const f=await fixture(t);
 await f.store.observe(event('conflict-month',{deliverTime:Date.parse('2026-09-30T23:59:59Z')}));await f.store.observe(event('conflict-month'));
 const s=await f.store.summary();assert.equal(s.precisionDegraded,true);assert.equal(s.paidMessagesObserved,0);assert.deepEqual(s.amounts,[]);
});
test('cron schema10 conserva recibos antes del TTL y los purga exactamente al vencer sin PII en logs',async t=>{const f=await fixture(t);await f.store.observe(event());
 const expires=f.sqlite.prepare('SELECT expires_at FROM sarin_wa_billing_receipts').get().expires_at,logs=[];t.mock.method(console,'log',(...args)=>logs.push(args));
 const env={SARIN_RETENTION_ENABLED:'true',SARIN_DB:f.db};
 assert.equal((await runRetention(env,{now:()=>expires-1})).whatsappBillingReceipts,0);
 const result=await runRetention(env,{now:()=>expires});assert.equal(result.whatsappBillingReceipts,1);assert.equal(result.remaining,false);
 assert.equal(f.sqlite.prepare('SELECT receipt_rows FROM sarin_wa_billing_scopes').get().receipt_rows,0);
 assert.equal(JSON.stringify(logs).includes(PHONE),false);assert.equal(JSON.stringify(logs).includes('message-1'),false);
});
