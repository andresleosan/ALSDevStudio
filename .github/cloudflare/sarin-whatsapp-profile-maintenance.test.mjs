import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {maintenanceFixture} from './sarin-whatsapp-maintenance-fixture.mjs';
import {clearRestoredHistory} from '../../server/sarin/history-recovery.js';
import {runRetention} from '../../workers/sarin-retention/index.js';
import {verifySarinBackup,restoreBackupSql} from './check-sarin-backup.mjs';

const count=(f,table)=>f.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n;
const quotas=f=>Object.fromEntries(['sarin_wa_send_quota','sarin_wa_audio_quota','sarin_counters','sarin_reservations']
 .map(table=>[table,f.sqlite.prepare('SELECT * FROM '+table+' ORDER BY 1').all()]));
async function populated(t){
 const f=await maintenanceFixture(t);await f.notice();await f.accept();
 const claimed=await f.claim(await f.capture('NOMBRE: Perfil Sintético'));
 const out=await f.store.completeProfile(claimed);
 await f.store.beginSend({...out,token:claimed.token});
 await f.store.finishSend({...out,token:claimed.token,result:{status:'accepted',providerId:'synthetic-profile-confirmation'}});
 f.sqlite.exec("INSERT INTO sarin_wa_audio_quota VALUES('2026-10-18','2026-10',3)");
 assert.equal(count(f,'sarin_wa_profiles'),1);return f;
}
function exportSql(f,omit=[]){
 const objects=f.sqlite.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*'").all();
 const quote=value=>f.sqlite.prepare('SELECT quote(?) q').get(value).q;
 return objects.map(object=>object.sql+';').join('\n')+'\n'+objects.filter(object=>object.type==='table'&&!omit.includes(object.name))
  .flatMap(object=>f.sqlite.prepare('SELECT * FROM '+object.name).all()
   .map(row=>'INSERT INTO '+object.name+' VALUES('+Object.values(row).map(quote).join(',')+');')).join('\n');
}
function restored(t,sql){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());sqlite.exec('PRAGMA foreign_keys=OFF');restoreBackupSql(sqlite,sql);
 const db={prepare(sql){return {sql,values:[],bind(...values){return {...this,values};}};},async batch(statements){
  sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(statement=>{const query=sqlite.prepare(statement.sql);
   return {success:true,results:query.columns().length?query.all(...statement.values):(query.run(...statement.values),[])};});
   sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 assert.equal(sqlite.prepare('PRAGMA foreign_keys').get().foreign_keys,0);return {sqlite,db};
}

test('respaldo schema8 preserva perfil real de fixture y sólo devuelve contadores',async t=>{
 const f=await populated(t),sql=exportSql(f),report=await verifySarinBackup(Buffer.from(sql));
 assert.equal(report.verified,true);assert.equal(report.whatsappSchemaVersion,10);
 assert.equal(report.counts.sarin_wa_profiles,1);assert.equal(report.counts.sarin_wa_audio_quota,1);
 assert.doesNotMatch(JSON.stringify(report),/Perfil|Sintético|573000|synthetic-profile/);
 assert.equal(count(f,'sarin_wa_profiles'),1,'Verificar no modifica el origen');
});

test('recuperación schema8 elimina perfil aun sin FK y conserva cuotas consumidas',async t=>{
 const source=await populated(t),f=restored(t,exportSql(source)),before=quotas(f);
 const result=await clearRestoredHistory({db:f.db,now:source.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.equal(result.whatsappProfiles,1);assert.equal(count(f,'sarin_wa_profiles'),0);
 assert.equal(count(f,'sarin_wa_inbox'),0);assert.equal(count(f,'sarin_wa_contexts'),0);
 assert.deepEqual(quotas(f),before);assert.equal(count(f,'sarin_wa_send_closures'),2);
 assert.doesNotMatch(JSON.stringify(result),/Perfil|Sintético|573000/);
});

test('recuperación limpia incluso perfil huérfano de una restauración con FK apagadas',async t=>{
 const source=await populated(t),f=restored(t,exportSql(source,['sarin_wa_contexts','sarin_wa_inbox','sarin_wa_jobs']));
 const before=quotas(f);assert.equal(count(f,'sarin_wa_profiles'),1);
 const result=await clearRestoredHistory({db:f.db,now:source.now,maintenanceConfirmed:true,requestsDrained:true});
 assert.equal(count(f,'sarin_wa_profiles'),0);assert.equal(result.whatsappProfiles,1);assert.deepEqual(quotas(f),before);
});

for(const foreignKeys of [true,false])test('cron schema8 elimina perfil exactamente a24h con FK '+foreignKeys,async t=>{
 const f=await populated(t),expires=f.row('sarin_wa_profiles').expires_at,before=quotas(f),logs=[];
 t.mock.method(console,'log',(...args)=>logs.push(args));
 if(!foreignKeys)f.sqlite.exec('PRAGMA foreign_keys=OFF');
 f.setTime(expires-1);assert.equal((await runRetention({SARIN_RETENTION_ENABLED:'true',SARIN_DB:f.db},{now:f.now})).status,'ok');
 assert.equal(count(f,'sarin_wa_profiles'),1);
 f.setTime(expires);const result=await runRetention({SARIN_RETENTION_ENABLED:'true',SARIN_DB:f.db},{now:f.now});
 assert.equal(result.status,'ok');assert.equal(result.remaining,false);assert.equal(count(f,'sarin_wa_profiles'),0);
 assert.deepEqual(quotas(f),before);assert.doesNotMatch(JSON.stringify(logs),/Perfil|Sintético|573000/);
});

test('borrado de contexto elimina perfil aun con FK apagadas',async t=>{
 const f=await populated(t);f.sqlite.exec('PRAGMA foreign_keys=OFF');
 f.sqlite.prepare('DELETE FROM sarin_wa_contexts WHERE peer_key=?').run(f.peerKey);
 assert.equal(count(f,'sarin_wa_profiles'),0);
});

test('fallo de limpieza del perfil revierte recuperación completa sin mostrar nombre',async t=>{
 const f=await populated(t),before=quotas(f),inbox=count(f,'sarin_wa_inbox');
 f.sqlite.exec("CREATE TRIGGER fail_profile_recovery BEFORE DELETE ON sarin_wa_profiles BEGIN SELECT RAISE(ABORT,'Perfil Sintético'); END");
 await assert.rejects(clearRestoredHistory({db:f.db,now:f.now,maintenanceConfirmed:true,requestsDrained:true}),error=>
  error.message==='sarin_history_recovery_failed' && error.cause===undefined && !JSON.stringify(error).includes('Perfil'));
 assert.equal(count(f,'sarin_wa_profiles'),1);assert.equal(count(f,'sarin_wa_inbox'),inbox);
 assert.deepEqual(quotas(f),before);assert.equal(count(f,'sarin_wa_send_closures'),0);
});
