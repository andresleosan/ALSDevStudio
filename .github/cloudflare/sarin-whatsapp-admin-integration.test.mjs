import { WHATSAPP_NOTICE_VERSION } from '../../server/sarin/whatsapp/consent.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { createWhatsAppIngressStore } from '../../server/sarin/whatsapp/ingress-store.js';
import { createWhatsAppWorkStore } from '../../server/sarin/whatsapp/work-store.js';
import { handleWhatsAppAdmin } from '../../server/sarin/whatsapp/admin.js';
import { createWhatsAppHandoffStore } from '../../server/sarin/whatsapp/handoff-store.js';

// Integración real de SQL, triggers, store y proyección HTTP. Ninguna llamada de red.
// La autenticación/CSRF se verifica por separado en sarin-whatsapp-admin.test.mjs.
const BASE=Date.UTC(2026,9,18,12),DAY=86400000;

test('paginación SQLite recorre más de cien contactos sin duplicados ni teléfonos',async t=>{
 const f=await sqliteFixture({whatsapp:true,replies:true});t.after(f.close);
 const insert=f.sqlite.prepare('INSERT INTO sarin_wa_contexts(peer_key,context_id) VALUES(?,?)');
 for(let index=0;index<205;index++)insert.run(index.toString(16).padStart(64,'0'),crypto.randomUUID());
 const store=createWhatsAppWorkStore({db:f.db,now:()=>BASE}),keys=[],sizes=[];let cursor=null;
 do{
  const response=await handleWhatsAppAdmin(new Request('https://als.example.test/api/control-sarin/whatsapp/peers'+(cursor?'?cursor='+encodeURIComponent(cursor):'')),{},
   {admin:{id:'synthetic-owner'},actor:'a'.repeat(64),now:BASE,store});
  assert.equal(response.status,200);const body=await response.json();sizes.push(body.items.length);
  keys.push(...body.items.map(item=>item.peerKey));assert.ok(body.items.every(item=>item.maskedPhone==='***'));
  cursor=body.nextCursor;assert.ok(sizes.length<=3);
 }while(cursor);
 assert.deepEqual(sizes,[100,100,5]);assert.equal(keys.length,205);assert.equal(new Set(keys).size,205);
});
async function setup(t,{phone='+573000000001'}={}){
  const f=await sqliteFixture({whatsapp:true,replies:true});t.after(f.close);
  let at=BASE,sequence=0;
  const now=()=>at,store=createWhatsAppWorkStore({db:f.db,now});
  const ingress=createWhatsAppIngressStore({db:f.db,now});
  async function capture(text='Consulta ficticia inicial',kind='inbound',mediaType='text'){
    at+=1000;sequence++;
    const event={kind,eventId:'input_'+sequence,messageId:'message_'+sequence,wamid:'wamid.'+sequence,
      wabaId:'12345',from:kind==='inbound'?phone:'+573000000002',to:kind==='inbound'?'+573000000002':phone,
      sentAt:at,createdAt:at,mediaType,...(mediaType==='text'?{text}:{})};
    await ingress.capture(event);return event;
  }
  const initial=await capture(),peerKey=f.sqlite.prepare('SELECT peer_key FROM sarin_wa_inbox').get().peer_key;
  await store.setPilotMode({enabled:true,expectedRevision:0,actor:'test'});
  await store.resumePeer({peerKey,expectedRevision:0,actor:'test'});
  async function get(suffix){
    const response=await handleWhatsAppAdmin(new Request('https://als.example.test/api/control-sarin/whatsapp'+suffix),{},
      {admin:{id:'synthetic-owner'},actor:'a'.repeat(64),now:at,store});
    assert.equal(response.status,200,'El store real debe satisfacer el contrato HTTP de Staff');
    return response.json();
  }
  const detail=async()=>(await get('/peers/'+peerKey)).peer;
  const listed=async()=>(await get('/peers')).items.find(peer=>peer.peerKey===peerKey);
  return {...f,store,capture,initial,peerKey,now,setTime:value=>{at=value;},detail,listed};
}
async function notice(f){
  const input=await f.capture('Consulta que solicita el aviso');
  const job=f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id=?').get(input.eventId),token=crypto.randomUUID();
  const claimed=await f.store.claimGeneration({jobId:job.job_id,epoch:job.epoch,token});
  assert.equal(claimed.work.decision,'notice');
  const output=await f.store.createFixedReply({jobId:job.job_id,token,purpose:'notice',text:'Aviso ficticio de la prueba',version:WHATSAPP_NOTICE_VERSION,hash:'b'.repeat(64)});
  await f.store.beginSend({...output,token});
  await f.store.finishSend({...output,token,result:{status:'accepted',providerId:'synthetic_notice'}});
  return output;
}
const delivered=f=>f.store.applyStatus({eventId:'notice_delivery',providerId:'synthetic_notice',status:'delivered',at:f.now()});
async function accepted(f){await notice(f);await f.capture('ACEPTO');await delivered(f);}
async function consentIs(f,status,expiresAt=null){
  assert.deepEqual((await f.listed()).consent,{status,expiresAt});
  assert.deepEqual((await f.detail()).consent,{status,expiresAt});
}

test('SQLite real entrega número vigente sólo en proyección administrativa y actividad durable',async t=>{
  const f=await setup(t),listed=await f.listed(),detail=await f.detail();
  assert.match(listed.maskedPhone,/[*•…]/u);assert.ok(listed.maskedPhone.endsWith('0001'));
  assert.equal(listed.updatedAt,BASE+1000);assert.equal(detail.updatedAt,BASE+1000);
  assert.equal(listed.consent.status,'pending');
  assert.ok(detail.events.some(event=>event.content==='Consulta ficticia inicial' && event.at===BASE+1000 && event.expiresAt===BASE+1000+DAY));
  for(const peer of [listed,detail]){assert.equal(peer.phone,'+573000000001');assert.equal(peer.phoneExpiresAt,BASE+1000+DAY);assert.equal(peer.fullName,null);assert.equal(peer.nameExpiresAt,null);}
  assert.doesNotMatch(JSON.stringify([listed,detail]),/\+573000000002/);
});

test('detalle real conserva entrada y salida vigentes y presenta el eco sin cuerpo',async t=>{
  const f=await setup(t),output=await notice(f);await f.capture('CUERPO PRIVADO DEL ECO','echo');
  const detail=await f.detail(),raw=await f.store.getPeer({peerKey:f.peerKey});
  assert.equal(detail.updatedAt,BASE+3000);assert.equal(detail.paused,true);
  assert.ok(detail.events.some(event=>event.role==='user' && event.content==='Consulta que solicita el aviso'));
  assert.ok(detail.events.some(event=>event.id===output.outboxId && event.role==='assistant' && event.content==='Aviso ficticio de la prueba' && event.at===BASE+2000 && event.expiresAt===BASE+2000+DAY));
  assert.deepEqual(detail.events.find(event=>event.kind==='echo'),{id:'input_3',kind:'echo',at:BASE+3000,expiresAt:BASE+3000+DAY});
  assert.equal(detail.outputs[0].status,'accepted');assert.equal(detail.outputs[0].updatedAt,BASE+2000);
  const saved=raw.outputs.find(item=>item.outbox_id===output.outboxId);
  assert.equal(saved.created_at,BASE+2000);assert.equal(saved.started_at,BASE+2000);assert.equal(saved.expires_at,BASE+2000+DAY);
  assert.equal(saved.reconcile_updated_at,null);assert.doesNotMatch(JSON.stringify([detail,raw]),/CUERPO PRIVADO DEL ECO/);
});

test('detalle expira cada contenido en su fecha y nunca recupera teléfono desde una captura vencida',async t=>{
  const f=await setup(t);await notice(f);
  f.setTime(BASE+1000+DAY);
  const partial=await f.detail();
  assert.ok(!partial.events.some(event=>event.content==='Consulta ficticia inicial'));
  assert.ok(partial.events.some(event=>event.content==='Aviso ficticio de la prueba'));
  assert.equal(partial.phone,'+573000000001');assert.equal(partial.phoneExpiresAt,BASE+2000+DAY);
  f.setTime(BASE+2000+DAY);
  const expired=await f.detail();assert.deepEqual(expired.events,[]);assert.deepEqual(expired.outputs,[]);
  assert.equal((expired.maskedPhone.match(/\d/g)||[]).length,0);
  assert.equal((await f.listed()).maskedPhone,expired.maskedPhone);
  assert.equal(expired.phone,null);assert.equal(expired.phoneExpiresAt,null);assert.equal((await f.listed()).phone,null);
  assert.equal(expired.updatedAt,BASE+2000,'Consultar no inventa actividad en el reloj actual');
});

test('aceptación pendiente sólo pasa a aceptada con prueba de entrega acreditada y después vence',async t=>{
  const f=await setup(t);await notice(f);await consentIs(f,'pending');
  await f.capture('ACEPTO');await consentIs(f,'pending_delivery');
  await delivered(f);await consentIs(f,'accepted',BASE+3000+DAY);
  f.setTime(BASE+3000+DAY);await consentIs(f,'expired',BASE+3000+DAY);
});

test('fechas o identificadores de aceptación sin prueba durable nunca acreditan consentimiento',async t=>{
  const f=await setup(t);
  f.sqlite.prepare('UPDATE sarin_wa_contexts SET consent_expires_at=? WHERE peer_key=?').run(BASE+DAY,f.peerKey);
  await consentIs(f,'pending');
  f.sqlite.prepare('UPDATE sarin_wa_contexts SET accepted_at=?,acceptance_event_id=? WHERE peer_key=?').run(BASE,'missing_proof',f.peerKey);
  await consentIs(f,'pending');
});

test('prueba de consentimiento en conflicto deja de mostrarse aceptada',async t=>{
  const f=await setup(t);await accepted(f);await consentIs(f,'accepted',BASE+3000+DAY);
  f.sqlite.exec('UPDATE sarin_wa_consent_proofs SET conflict=1');await consentIs(f,'pending');
});

for(const [name,text,mediaType] of [['STOP','STOP','text'],['HUMANO','HUMANO','text'],['imagen',undefined,'image']]){
  test(`control efectivo ${name} muestra revocación de aceptación en Staff`,async t=>{
    const f=await setup(t);await accepted(f);await f.capture(text,'inbound',mediaType);
    await consentIs(f,'revoked');assert.equal((await f.detail()).paused,true);
  });
}

test('eco humano pausa sin revocar la aceptación y reactivación mantiene sólo la prueba vigente',async t=>{
  const f=await setup(t);await accepted(f);await f.capture('Respuesta del titular','echo');
  await consentIs(f,'accepted',BASE+3000+DAY);const peer=await f.detail();assert.equal(peer.paused,true);
  await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:peer.revision,actor:'test'});
  await consentIs(f,'accepted',BASE+3000+DAY);assert.equal((await f.detail()).paused,false);
});

test('enmascarado no revela completo un teléfono corto admitido por el transporte',async t=>{
  const f=await setup(t,{phone:'+12'}),peer=await f.listed();
  assert.match(peer.maskedPhone,/[*•…]/u);assert.equal((peer.maskedPhone.match(/\d/g)||[]).length,0);
  assert.equal((await f.detail()).phone,'+12');
  assert.doesNotMatch((await f.store.getPeer({peerKey:f.peerKey})).masked_phone,/\+12/);
});

test('Staff presenta el estado durable del aviso HUMANO sin exponer el destinatario administrativo',async t=>{
  const f=await setup(t);await f.capture('HUMANO');
  assert.deepEqual((await f.detail()).handoff,{state:'pending',updatedAt:f.now()});
  const store=createWhatsAppHandoffStore({db:f.db,now:f.now}),identity={wabaId:'12345',businessPhone:'+573000000002',ownerPhone:'+573000000003'};
  const next=await store.next(identity),permit=await store.beginSend({...identity,alertId:next.alertId,mode:'template'});
  await store.finishSend({alertId:next.alertId,result:{status:'accepted',providerId:'admin_notice'}});
  assert.equal((await f.detail()).handoff.state,'accepted');
  await store.applyStatus({eventId:'admin_delivered',providerId:'admin_notice',externalId:permit.externalId,
    from:identity.businessPhone,to:identity.ownerPhone,wabaId:identity.wabaId,status:'delivered',at:f.now()});
  assert.equal((await f.detail()).handoff.state,'delivered');
  assert.doesNotMatch(JSON.stringify(await f.detail()),/\+573000000003|admin_notice|external_id/);
});

test('Staff marca cancelado un aviso pendiente cuando el administrador reactiva el contacto',async t=>{
  const f=await setup(t);await f.capture('HUMANO');const peer=await f.detail();
  await f.store.resumePeer({peerKey:f.peerKey,expectedRevision:peer.revision,actor:'test'});
  assert.equal((await f.detail()).handoff.state,'cancelled');
});
