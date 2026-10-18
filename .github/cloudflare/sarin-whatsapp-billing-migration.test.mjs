import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sqliteFixture} from './sarin-sqlite-fixture.mjs';
import {createWhatsAppBillingStore} from '../../server/sarin/whatsapp/billing.js';
import {detectWhatsAppSchema} from '../../server/sarin/whatsapp/work-schema.js';
import {verifySarinBackup} from './check-sarin-backup.mjs';
const AT=Date.UTC(2026,9,18,14),PHONE='+573000000002',WABA='12345';
const readMigration=name=>readFile(new URL('../../migrations/sarin/'+name,import.meta.url),'utf8');
function exported(f){const objects=f.sqlite.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*'").all();
 const quote=value=>f.sqlite.prepare('SELECT quote(?) q').get(value).q;return objects.map(o=>o.sql+';').join('\n')+'\n'+objects.filter(o=>o.type==='table')
 .flatMap(o=>f.sqlite.prepare('SELECT * FROM '+o.name).all().map(row=>'INSERT INTO '+o.name+' VALUES('+Object.values(row).map(quote).join(',')+');')).join('\n');}

test('código nuevo conserva captura y backup9; migración10 no habilita de nuevo recibos históricos ambiguos',async t=>{
 const f=await sqliteFixture({history:true,whatsapp:true,replies:true,extensions:false});t.after(f.close);
 for(const name of ['0006_whatsapp_handoff.sql','0007_whatsapp_audio.sql','0008_whatsapp_profiles.sql','0009_whatsapp_billing.sql'])f.sqlite.exec(await readMigration(name));
 const store=createWhatsAppBillingStore({db:f.db,now:()=>AT,businessPhone:PHONE,wabaId:WABA});
 const event={messageId:'legacy-unknown',status:'delivered',createdAt:AT,from:PHONE,wabaId:WABA};
 await store.observe(event);assert.equal((await store.summary()).unknownPricingObserved,1);assert.deepEqual(await store.claimMissing(),[]);
 assert.equal(await detectWhatsAppSchema({db:f.db}),9);assert.equal((await verifySarinBackup(Buffer.from(exported(f)))).whatsappSchemaVersion,9);
 f.sqlite.exec(await readMigration('0010_whatsapp_billing_lookup.sql'));
 assert.equal(f.sqlite.prepare('SELECT lookup_attempted FROM sarin_wa_billing_receipts').get().lookup_attempted,1);
 await store.observe({...event,status:'read'});assert.equal(f.sqlite.prepare('SELECT lookup_attempted FROM sarin_wa_billing_receipts').get().lookup_attempted,1);
 await store.observe({...event,messageId:'new-unknown'});
 assert.deepEqual(f.sqlite.prepare('SELECT lookup_attempted FROM sarin_wa_billing_receipts ORDER BY rowid').all().map(r=>r.lookup_attempted),[1,0]);
 assert.equal(await detectWhatsAppSchema({db:f.db}),10);const report=await verifySarinBackup(Buffer.from(exported(f)));
 assert.equal(report.whatsappSchemaVersion,10);assert.equal(report.counts.sarin_wa_billing_receipts,2);
 assert.throws(()=>f.sqlite.exec('UPDATE sarin_wa_billing_receipts SET lookup_attempted=2'),/constraint/i);
 f.sqlite.exec('DROP INDEX sarin_wa_billing_receipts_lookup');await assert.rejects(detectWhatsAppSchema({db:f.db}),/wa_schema_invalid/);
});
