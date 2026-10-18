import test from 'node:test';
import assert from 'node:assert/strict';
import {processorFixture,establishConsent,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {detectWhatsAppSchema} from '../../server/sarin/whatsapp/work-schema.js';
import {WHATSAPP_ACCEPTED} from '../../server/sarin/whatsapp/consent.js';
import {createWhatsAppWorkStore} from '../../server/sarin/whatsapp/work-store.js';
const profile=await import('../../server/sarin/whatsapp/profile.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const parse=text=>{assert.equal(typeof profile.parseWhatsAppProfileInput,'function');return profile.parseWhatsAppProfileInput(text);};
const run=(f,job,store=f.store)=>processWhatsAppWork(job,f.env,{store,now:f.now,fetch:f.fetch});
const aiCalls=f=>f.calls.filter(call=>call.url.includes('deepseek'));
const posts=f=>f.calls.filter(call=>call.url.includes('ycloud'));
function installed(f){assert.ok(f.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='sarin_wa_profiles'").get(),'Falta tabla temporal de perfiles');}
const saved=f=>{installed(f);return f.sqlite.prepare('SELECT * FROM sarin_wa_profiles WHERE peer_key=?').get(f.peerKey);};
const delivered=async f=>{const out=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'delivery_'+crypto.randomUUID(),providerId:out.provider_id,status:'delivered',at:f.now()});};

test('nombre explícito normaliza Unicode y conserva nombres compuestos sin inferir apellidos',()=>{
 assert.deepEqual(parse(' nombre:  Ana Mari\u0301a  O’Neill-Pérez '),{kind:'valid',fullName:'Ana María O’Neill-Pérez'});
 assert.deepEqual(parse('NOMBRE:李 小龍'),{kind:'valid',fullName:'李 小龍'});
 assert.deepEqual(parse('Necesito una tienda'),{kind:'none'});
 assert.deepEqual(parse('HUMANO'),{kind:'none'});
 assert.deepEqual(parse('STOP'),{kind:'none'});
 assert.deepEqual(parse('ACEPTO'),{kind:'none'});
 for(const text of ['NOMBRE: Ana','NOMBRE: Ana 123','NOMBRE: <Ana> Pérez','NOMBRE: Ana\nPérez','NOMBRE: Ana\u202e Pérez','NOMBRE: '+('A'.repeat(80))+' '+('B'.repeat(80))])assert.deepEqual(parse(text),{kind:'invalid'});
 assert.equal(parse('NOMBRE: '+('A'.repeat(79))+' '+('B'.repeat(80))).kind,'valid');
 assert.match(WHATSAPP_ACCEPTED,/NOMBRE:/);
});

test('perfil explícito después de aceptar guarda fuente exacta y confirma sin DeepSeek',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);const job=await f.capture('Nombre: Ana María Pérez');
 f.setTime(f.now()+30000);f.reset();
 assert.equal((await run(f,job)).status,'accepted');assert.equal(aiCalls(f).length,0);assert.equal(posts(f).length,1);
 const p=saved(f),source=latest(f,'sarin_wa_inbox');
 assert.equal(p.full_name,'Ana María Pérez');assert.equal(p.peer_key,f.peerKey);assert.equal(p.source_event_id,source.event_id);
 assert.equal(p.created_at,source.received_at);assert.equal(p.expires_at,source.expires_at);assert.equal(p.stored_bytes,Buffer.byteLength(p.full_name));
 assert.equal(latest(f,'sarin_wa_jobs').inference_started_at,null);
 const view=await f.store.getPeer({peerKey:f.peerKey});assert.equal(view.full_name,p.full_name);assert.equal(view.name_expires_at,p.expires_at);
 assert.equal(view.phone,'+573000000001');assert.equal(view.phone_expires_at,source.expires_at);
 await run(f,job);assert.equal(posts(f).length,1);assert.equal(aiCalls(f).length,0);
 assert.ok(f.counts.bindings<=50);t.diagnostic('perfil '+JSON.stringify(f.counts));
});

test('antes de aceptar el nombre sólo provoca el aviso y no crea ficha',async t=>{
 const f=await processorFixture(t),job=await f.capture('NOMBRE: Ana Pérez');await run(f,job);
 assert.equal(latest(f,'sarin_wa_outbox').purpose,'notice');assert.equal(aiCalls(f).length,0);assert.equal(saved(f),undefined);
});

test('nombre inválido pide formato escrito sin guardar ni consultar IA',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);const job=await f.capture('NOMBRE: Ana <Pérez>');await run(f,job);
 assert.equal(aiCalls(f).length,0);assert.equal(saved(f),undefined);assert.equal(posts(f).length,1);
 assert.match(JSON.parse(posts(f)[0].init.body).text.body,/NOMBRE:/);
 assert.equal(latest(f,'sarin_wa_jobs').inference_started_at,null);
});

test('nombre no es requisito y no pasa al historial comercial posterior',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);await run(f,await f.capture('NOMBRE: Ana Pérez'));await delivered(f);f.reset();
 await run(f,await f.capture('Necesito una tienda'));assert.equal(aiCalls(f).length,2);
 assert.equal(JSON.stringify(aiCalls(f)).includes('Ana Pérez'),false);
});

test('captura de perfil vuelve a verificar pausa dentro del commit',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);const job=await f.capture('NOMBRE: Ana Pérez');
 let paused=false;
 const db={...f.db,batch:async statements=>{if(!paused&&statements.some(s=>s.sql.includes('INSERT INTO sarin_wa_profiles'))){paused=true;await f.pause();}return f.db.batch(statements);}};
 const store=createWhatsAppWorkStore({db,now:f.now});
 await run(f,job,store);assert.equal(posts(f).length,0);assert.equal(aiCalls(f).length,0);assert.equal(saved(f),undefined);
 assert.equal(paused,true);
 await run(f,job);assert.equal(saved(f),undefined);assert.equal(posts(f).length,0);
});

test('pausa entre guardar perfil y enviar cancela confirmación y conserva contacto',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);const job=await f.capture('NOMBRE: Ana Pérez');
 const store={...f.store,beginSend:async input=>{await f.pause();return f.store.beginSend(input);}};
 await run(f,job,store);assert.equal(posts(f).length,0);assert.equal(aiCalls(f).length,0);assert.equal((await f.store.getPeer({peerKey:f.peerKey})).full_name,'Ana Pérez');
 await run(f,job);assert.equal(posts(f).length,0);
});

test('reactivar otro contexto conserva contacto vigente sin repetir su trabajo',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);const job=await f.capture('NOMBRE: Ana Pérez');await run(f,job);const original=saved(f);f.reset();
 await f.pause();let c=latest(f,'sarin_wa_contexts');assert.notEqual(c.context_id,original.context_id);
 assert.equal((await f.store.getPeer({peerKey:f.peerKey})).full_name,'Ana Pérez');
 await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:c.revision,actor:'test'});c=latest(f,'sarin_wa_contexts');
 assert.notEqual(c.context_id,original.context_id);assert.equal((await f.store.getPeer({peerKey:f.peerKey})).full_name,'Ana Pérez');
 await run(f,job);assert.equal(posts(f).length,0);assert.equal(aiCalls(f).length,0);assert.deepEqual(saved(f),original);
 f.setTime(original.expires_at);assert.equal((await f.store.getPeer({peerKey:f.peerKey})).full_name,null);
});

test('perfil y teléfono vencidos desaparecen de las proyecciones sin esperar cron',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);await run(f,await f.capture('NOMBRE: Ana Pérez'));
 const p=saved(f);f.setTime(p.expires_at);const view=await f.store.getPeer({peerKey:f.peerKey});
 assert.equal(view.full_name,null);assert.equal(view.name_expires_at,null);assert.equal(view.phone,null);assert.equal(view.phone_expires_at,null);
 const row=(await f.store.listPeers()).peers.find(row=>row.peer_key===f.peerKey);assert.equal(row.full_name,null);assert.equal(row.phone,null);
});

test('nuevo nombre reemplaza perfil sin extender TTL del mensaje viejo',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);await run(f,await f.capture('NOMBRE: Ana Pérez'));const old=saved(f);await delivered(f);
 await run(f,await f.capture('NOMBRE: Ana López'));const current=saved(f);assert.equal(current.full_name,'Ana López');assert.notEqual(current.source_event_id,old.source_event_id);
 f.sqlite.prepare('DELETE FROM sarin_wa_inbox WHERE event_id=?').run(old.source_event_id);assert.equal(saved(f).full_name,'Ana López');
 f.sqlite.exec('PRAGMA foreign_keys=OFF');f.sqlite.prepare('DELETE FROM sarin_wa_inbox WHERE event_id=?').run(current.source_event_id);assert.equal(saved(f),undefined);
});

test('cuota agotada revierte perfil y confirmación juntos',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);f.sqlite.prepare('UPDATE sarin_wa_send_quota SET consumed=20').run();
 await run(f,await f.capture('NOMBRE: Ana Pérez'));assert.equal(posts(f).length,0);assert.equal(aiCalls(f).length,0);assert.equal(saved(f),undefined);
});

test('schema 8 detecta perfil y rechaza un guard de integridad ausente',async t=>{
 const f=await processorFixture(t);assert.equal(await detectWhatsAppSchema({db:f.db,repliesEnabled:true}),8);
 f.sqlite.exec('DROP TRIGGER sarin_wa_profile_validate_insert');await assert.rejects(detectWhatsAppSchema({db:f.db,repliesEnabled:true}),/wa_schema_invalid/);
});

test('perfil ready se recupera sin recapturar nombre ni iniciar IA',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);const job=await f.capture('NOMBRE: Ana Pérez'),own={...job,token:crypto.randomUUID()};
 assert.equal((await f.store.claimGeneration(own)).work.decision,'profile');await f.store.completeProfile(own);const original=saved(f);
 f.setTime(f.now()+120001);await f.store.expireLeases({limit:1});f.reset();await run(f,job);
 assert.equal(posts(f).length,1);assert.equal(aiCalls(f).length,0);assert.deepEqual(saved(f),original);
});

for(const command of ['HUMANO','STOP'])test(command+' conserva prioridad sin pedir un nombre',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);await run(f,await f.capture(command));
 assert.equal(posts(f).length,0);assert.equal(aiCalls(f).length,0);assert.equal(saved(f),undefined);assert.equal(latest(f,'sarin_wa_contexts').paused,1);
});

test('aceptación vencida no permite capturar el nombre',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);f.setTime(f.now()+86400001);await run(f,await f.capture('NOMBRE: Ana Pérez'));
 assert.equal(saved(f),undefined);assert.equal(aiCalls(f).length,0);assert.equal(latest(f,'sarin_wa_outbox').purpose,'notice');
});

test('perfil limita filas y bytes y enlaza la identidad y TTL de su fuente',async t=>{
 const f=await processorFixture(t);await establishConsent(f,processWhatsAppWork);await run(f,await f.capture('NOMBRE: Ana Pérez'));await delivered(f);const p=saved(f);
 assert.throws(()=>f.sqlite.prepare('UPDATE sarin_wa_profiles SET expires_at=expires_at+1 WHERE peer_key=?').run(f.peerKey),/WA_WORK_DENIED|CHECK/);
 assert.throws(()=>f.sqlite.prepare('UPDATE sarin_wa_profiles SET stored_bytes=640 WHERE peer_key=?').run(f.peerKey),/CHECK/);
 assert.throws(()=>f.sqlite.prepare('UPDATE sarin_wa_profiles SET full_name=?,stored_bytes=? WHERE peer_key=?').run('A'.repeat(641),641,f.peerKey),/CHECK/);
 const source=f.sqlite.prepare('SELECT * FROM sarin_wa_inbox WHERE event_id=?').get(p.source_event_id);
 const columns=Object.keys(source),insertInbox=f.sqlite.prepare('INSERT INTO sarin_wa_inbox('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')');
 const insertContext=f.sqlite.prepare('INSERT INTO sarin_wa_contexts(peer_key,context_id) VALUES(?,?)');
 const insertJob=f.sqlite.prepare('INSERT INTO sarin_wa_jobs(job_id,event_id,peer_key,epoch,context_id,peer_revision,created_at,expires_at) VALUES(?,?,?,?,?,0,?,?)');
 const insertProfile=f.sqlite.prepare('INSERT INTO sarin_wa_profiles(peer_key,context_id,source_event_id,full_name,stored_bytes,created_at,expires_at) VALUES(?,?,?,?,?,?,?)');
 function seed(index){const peer='capacity_peer_'+index,context='capacity_context_'+index,event='capacity_event_'+index;
  insertContext.run(peer,context);insertInbox.run(...columns.map(key=>({event_id:event,peer_key:peer}[key]??source[key])));
  insertJob.run('capacity_job_'+index,event,peer,'synthetic',context,p.created_at,p.expires_at);
  return [peer,context,event,p.full_name,p.stored_bytes,p.created_at,p.expires_at];}
 f.sqlite.exec('BEGIN');try{for(let i=0;i<999;i++)insertProfile.run(...seed(i));f.sqlite.exec('COMMIT');}catch(error){f.sqlite.exec('ROLLBACK');throw error;}
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_profiles').get().n,1000);
 assert.throws(()=>insertProfile.run(...seed(999)),/WA_WORK_CAPACITY/);
 await run(f,await f.capture('NOMBRE: Ana López'));assert.equal(saved(f).full_name,'Ana López');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_profiles').get().n,1000);
 const wrong=seed(1000);assert.throws(()=>insertProfile.run(wrong[0],wrong[1],p.source_event_id,p.full_name,p.stored_bytes,p.created_at,p.expires_at),/WA_WORK_DENIED/);
});
