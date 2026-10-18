import test from 'node:test';
import assert from 'node:assert/strict';
import {processorFixture,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {WHATSAPP_NOTICE,WHATSAPP_NOTICE_VERSION} from '../../server/sarin/whatsapp/consent.js';
const run=(f,hint,fetch=f.fetch)=>processWhatsAppWork(hint,f.env,{store:f.store,now:f.now,fetch});
const posts=f=>f.calls.filter(call=>call.url==='https://api.ycloud.com/v2/whatsapp/messages'&&call.init.method==='POST');

test('aviso vigente envía tres botones una sola vez aunque Queue se repita',async t=>{
 const f=await processorFixture(t),hint=await f.capture('Hola');await Promise.all([run(f,hint),run(f,hint)]);await run(f,hint);
 assert.equal(posts(f).length,1);const body=JSON.parse(posts(f)[0].init.body),outbox=latest(f,'sarin_wa_outbox');
 assert.equal(body.type,'interactive');assert.equal(body.interactive.type,'button');assert.equal(body.interactive.body.text,WHATSAPP_NOTICE);assert.ok(body.interactive.body.text.length<=1024);
 assert.deepEqual(body.interactive.action.buttons.map(button=>button.reply.title),['Aceptar','Hablar con Andrés','Salir']);
 assert.equal(new Set(body.interactive.action.buttons.map(button=>button.reply.id)).size,3);
 assert.ok(body.interactive.action.buttons.every(button=>button.type==='reply'&&button.reply.id.includes(outbox.outbox_id)));
 assert.equal(outbox.purpose,'notice');assert.equal(outbox.version,WHATSAPP_NOTICE_VERSION);assert.equal(outbox.state,'accepted');assert.equal(latest(f,'sarin_wa_send_quota').consumed,1);
});

test('confirmación de aceptación y respuesta comercial incluyen botones propios',async t=>{
 const f=await processorFixture(t);await run(f,await f.capture('Hola'));let out=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'notice_delivered',providerId:out.provider_id,status:'delivered',at:f.now()});f.reset();
 await run(f,await f.capture('ACEPTO'));assert.equal(JSON.parse(posts(f)[0].init.body).type,'interactive');assert.equal(latest(f,'sarin_wa_outbox').purpose,'accepted');
 assert.deepEqual(JSON.parse(posts(f)[0].init.body).interactive.action.buttons.map(b=>b.reply.title),['Hablar con Andrés','Salir']);
 out=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'accepted_delivered',providerId:out.provider_id,status:'delivered',at:f.now()});f.reset();
 await run(f,await f.capture('Quiero una tienda ficticia'));assert.equal(posts(f).length,1);assert.equal(JSON.parse(posts(f)[0].init.body).type,'interactive');assert.equal(latest(f,'sarin_wa_outbox').purpose,'reply');
 const body=JSON.parse(posts(f)[0].init.body),saved=latest(f,'sarin_wa_outbox');assert.equal(body.interactive.body.text,saved.text);
 assert.deepEqual(body.interactive.action.buttons.map(b=>b.reply.id),['sarin.menu.v1:human:'+saved.outbox_id,'sarin.menu.v1:stop:'+saved.outbox_id]);
});

test('aviso guardado con texto anterior conserva texto durable dentro de botones',async t=>{
 const f=await processorFixture(t),hint=await f.capture('Hola'),token=crypto.randomUUID();await f.store.claimGeneration({...hint,token});
 await f.store.createFixedReply({...hint,token,purpose:'notice',text:'Aviso anterior. Escribe ACEPTO.',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)});
 f.setTime(f.now()+120001);await f.store.expireLeases({limit:1});await run(f,hint);
 assert.equal(posts(f).length,1);const body=JSON.parse(posts(f)[0].init.body);assert.equal(body.type,'interactive');assert.equal(body.interactive.body.text,'Aviso anterior. Escribe ACEPTO.');
});

for(const status of [400,500])test(`fallo HTTP ${status} del aviso no genera segundo POST al repetir Queue`,async t=>{
 const f=await processorFixture(t),hint=await f.capture('Hola'),sent=[];
 const fetch=async(url,init)=>{sent.push(JSON.parse(init.body));return new Response('private provider data',{status});};
 await run(f,hint,fetch);await run(f,hint,fetch);assert.equal(sent.length,1);assert.equal(sent[0].type,'interactive');assert.equal(latest(f,'sarin_wa_send_quota').consumed,1);
});

test('timeout real del aviso aborta y no envía versión textual de respaldo',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=await processorFixture(t),hint=await f.capture('Hola');let started,signal;const sent=[],ready=new Promise(resolve=>started=resolve);
 const fetch=async(url,init)=>{sent.push(JSON.parse(init.body));signal=init.signal;started();return new Promise(()=>{});};
 const pending=run(f,hint,fetch);await ready;t.mock.timers.tick(10001);await pending;await run(f,hint,fetch);
 assert.equal(sent.length,1);assert.equal(sent[0].type,'interactive');assert.equal(signal.aborted,true);assert.equal(latest(f,'sarin_wa_outbox').state,'send_uncertain');assert.equal(latest(f,'sarin_wa_send_quota').consumed,1);
});
