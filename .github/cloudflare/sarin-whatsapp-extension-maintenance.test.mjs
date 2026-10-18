import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceFixture,DAY } from './sarin-whatsapp-maintenance-fixture.mjs';
import { clearRestoredHistory } from '../../server/sarin/history-recovery.js';
import { runRetention } from '../../workers/sarin-retention/index.js';
import { createWhatsAppHandoffStore } from '../../server/sarin/whatsapp/handoff-store.js';
import { createWhatsAppWorkStore } from '../../server/sarin/whatsapp/work-store.js';
import { purgeWhatsAppAudioQuota } from '../../server/sarin/whatsapp/audio-maintenance.js';
import { verifySarinBackup,restoreBackupSql } from './check-sarin-backup.mjs';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';

const descriptor={id:'123456',link:'https://api.ycloud.com/v2/whatsapp/media/download/123456?sig=test&payload=test',sha256:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',mimeType:'audio/ogg'};
const identity={wabaId:'12345',businessPhone:'+573000000002',ownerPhone:'+573000000003'};
const count=(f,name)=>f.sqlite.prepare('SELECT COUNT(*) n FROM '+name).get().n;
const quotas=f=>Object.fromEntries(['sarin_wa_audio_quota','sarin_wa_send_quota'].map(name=>[name,f.sqlite.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]));
async function startAudio(f){
 await f.notice();await f.accept();f.setTime(f.now()+1000);
 const event={kind:'inbound',eventId:'maintenance_audio',messageId:'maintenance_audio',wamid:'wamid.maintenance_audio',
  wabaId:identity.wabaId,from:'+573000000001',to:identity.businessPhone,sentAt:f.now(),createdAt:f.now(),mediaType:'audio',audio:descriptor};
 await f.ingress.capture(event);const claimed=await f.claim(event);await f.store.markInferenceStarted(claimed);await f.store.beginAudioInference(claimed);return claimed;
}
async function startHandoff(f){
 await f.capture('HUMANO');const handoff=createWhatsAppHandoffStore({db:f.db,now:f.now}),row=await handoff.next(identity);
 assert.ok(row);await handoff.beginSend({...identity,alertId:row.alertId,mode:'template'});return {handoff,row};
}

test('restaurar v7 cancela avisos y elimina audio iniciado sin devolver consumos ni reutilizar trabajo',async t=>{
 const source=await maintenanceFixture(t),claimed=await startAudio(source),{row}=await startHandoff(source);
 const objects=source.sqlite.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*'").all();
 const quote=value=>source.sqlite.prepare('SELECT quote(?) q').get(value).q;
 const sql=objects.map(object=>object.sql+';').join('\n')+'\n'+objects.filter(object=>object.type==='table')
  .flatMap(object=>source.sqlite.prepare('SELECT * FROM '+object.name).all().map(value=>'INSERT INTO '+object.name+' VALUES('+Object.values(value).map(quote).join(',')+');')).join('\n');
 const report=await verifySarinBackup(Buffer.from(sql));assert.equal(report.counts.sarin_wa_audio,1);assert.equal(report.counts.sarin_wa_handoff,1);
 assert.doesNotMatch(JSON.stringify(report),/api.ycloud|573000|maintenance_audio/);
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());restoreBackupSql(sqlite,sql);
 // Este restore deja foreign_keys apagado: el trigger de inbox también debe purgar el audio.
 const db={prepare(sql){return {sql,values:[],bind(...values){return {...this,values};}};},async batch(statements){sqlite.exec('BEGIN IMMEDIATE');
  try{const rows=statements.map(statement=>{const query=sqlite.prepare(statement.sql);return {success:true,results:query.columns().length?query.all(...statement.values):(query.run(...statement.values),[])};});sqlite.exec('COMMIT');return rows;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const f={...source,db,sqlite,row:name=>sqlite.prepare('SELECT * FROM '+name+' ORDER BY rowid DESC LIMIT 1').get(),store:createWhatsAppWorkStore({db,now:source.now})};
 const handoff=createWhatsAppHandoffStore({db,now:f.now});
 const consumed=quotas(f),epoch=f.row('sarin_wa_pilot').epoch;
 const result=await clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.equal(count(f,'sarin_wa_audio'),0);assert.equal(count(f,'sarin_wa_inbox'),0);assert.equal(count(f,'sarin_wa_jobs'),0);
 assert.equal(f.row('sarin_wa_handoff').state,'uncertain');assert.notEqual(f.row('sarin_wa_pilot').epoch,epoch);
 assert.equal(f.row('sarin_wa_pilot').enabled,0);assert.equal(f.row('sarin_state').blocked,1);
 assert.equal(result.whatsappAudio,1);assert.equal(result.whatsappHandoff,1);
 assert.deepEqual(quotas(f),consumed);assert.equal(count(f,'sarin_wa_send_closures'),2);
 assert.equal((await f.store.claimGeneration({...claimed,token:crypto.randomUUID()})).status,'terminal');
 await assert.rejects(f.store.beginAudioInference(claimed));assert.equal(await handoff.next(identity),null);
 await assert.rejects(handoff.beginSend({...identity,alertId:row.alertId,mode:'template'}));
});

test('cron v7 purga audio con entrada, avisos vencidos y sólo cuotas de audio de meses cerrados',async t=>{
 const f=await maintenanceFixture(t);t.mock.method(console,'log',()=>{});await startAudio(f);await startHandoff(f);
 f.sqlite.exec("INSERT INTO sarin_wa_audio_quota VALUES('2026-09-30','2026-09',3)");
 const before=quotas(f);f.setTime(f.now()+DAY);
 const result=await runRetention({SARIN_RETENTION_ENABLED:'true',SARIN_DB:f.db},{now:f.now});
 assert.equal(result.status,'ok');assert.equal(count(f,'sarin_wa_audio'),0);assert.equal(count(f,'sarin_wa_jobs'),0);
 assert.equal(count(f,'sarin_wa_handoff'),0);assert.equal(result.whatsappHandoff,1);assert.equal(result.whatsappAudioQuota,1);
 assert.equal(result.remaining,false);
 assert.deepEqual(f.sqlite.prepare('SELECT * FROM sarin_wa_audio_quota').all(),before.sarin_wa_audio_quota.filter(row=>row.month_key==='2026-10'));
 assert.deepEqual(f.sqlite.prepare('SELECT * FROM sarin_wa_send_quota').all(),before.sarin_wa_send_quota);
});

test('fallo de recuperación v7 revierte también aviso, audio, cierres y cuotas',async t=>{
 const f=await maintenanceFixture(t);await startAudio(f);await startHandoff(f);
 const names=['sarin_wa_audio','sarin_wa_handoff','sarin_wa_audio_quota','sarin_wa_send_quota','sarin_wa_send_closures','sarin_wa_pilot'];
 const before=Object.fromEntries(names.map(name=>[name,f.sqlite.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]));
 f.sqlite.exec("CREATE TRIGGER fail_audio_recovery BEFORE DELETE ON sarin_wa_audio BEGIN SELECT RAISE(ABORT,'synthetic'); END");
 await assert.rejects(clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true}),/sarin_history_recovery_failed/);
 for(const name of names)assert.deepEqual(f.sqlite.prepare('SELECT * FROM '+name+' ORDER BY 1').all(),before[name],name);
});

test('purga de cuotas de audio es acotada e informa pendientes sin tocar mes activo',async t=>{
 const f=await maintenanceFixture(t);
 const insert=f.sqlite.prepare('INSERT INTO sarin_wa_audio_quota VALUES(?,?,1)');
 for(let index=0;index<101;index++){const day=new Date(Date.UTC(2026,0,1)+index*DAY).toISOString().slice(0,10);insert.run(day,day.slice(0,7));}
 insert.run('2026-10-18','2026-10');
 const first=await purgeWhatsAppAudioQuota({db:f.db,now:f.now,limit:100});assert.deepEqual(first,{deleted:100,remaining:true});
 assert.deepEqual(await purgeWhatsAppAudioQuota({db:f.db,now:f.now,limit:100}),{deleted:1,remaining:false});
 assert.deepEqual(f.sqlite.prepare('SELECT * FROM sarin_wa_audio_quota').all(),[{day_key:'2026-10-18',month_key:'2026-10',consumed:1}].map(row=>Object.assign(Object.create(null),row)));
});

for(const version of [5,6])test('cron y recuperación conservan compatibilidad con esquema '+version,async t=>{
 const f=await sqliteFixture({history:true,whatsapp:true,replies:true,extensions:false});t.after(f.close);t.mock.method(console,'log',()=>{});
 if(version===6)f.sqlite.exec(await readFile(new URL('../../migrations/sarin/0006_whatsapp_handoff.sql',import.meta.url),'utf8'));
 const now=()=>Date.UTC(2026,9,18,12);
 const purged=await runRetention({SARIN_RETENTION_ENABLED:'true',SARIN_DB:f.db},{now});assert.equal(purged.status,'ok');
 await clearRestoredHistory({db:f.db,now,maintenanceConfirmed:true,requestsDrained:true});
 assert.equal(count(f,'sarin_wa_send_closures'),2);assert.equal(f.sqlite.prepare('SELECT enabled FROM sarin_wa_pilot').get().enabled,0);
});
