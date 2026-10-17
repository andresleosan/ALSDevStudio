import { LEAD } from './sarin-lead-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { handleSarinSession } from '../../server/sarin/sessions.js';
import { handleSarin } from '../../server/sarin/handler.js';
import { createHistoryStore } from '../../server/sarin/history.js';
import { NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION } from '../../scripts/modules/sarin-consent.js';

const origin = 'https://www.alsdevstudio.com';
const consent = { accepted:true,noticeVersion:NOTICE_VERSION,privacyVersion:PRIVACY_VERSION,termsVersion:TERMS_VERSION };
function post(path, body, cookie, ip='192.0.2.1') {
  return new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
}
function provider(content) {
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(content)},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120}});
}
async function setup(t) {
  const f=await sqliteFixture({history:true});t.after(f.close);
  let at=Date.UTC(2026,9,16,12),calls=[];
  const env={SARIN_ENABLED:'true',SARIN_HISTORY_ENABLED:'true',SARIN_IP_SECRET:'x'.repeat(32),DEEPSEEK_API_KEY:'synthetic-only',SARIN_DB:f.db,
    SARIN_INPUT_PRICE_MICROS:'300000',SARIN_OUTPUT_PRICE_MICROS:'1200000',SARIN_DAILY_BUDGET_MICROS:'1000000',SARIN_MONTHLY_BUDGET_MICROS:'10000000'};
  const options={now:()=>at,fetch:async(_url,init)=>{calls.push(JSON.parse(init.body));return provider({inScope:false});}};
  const store=createHistoryStore({db:f.db,now:options.now});
  async function session(ip, lead=LEAD) {
    const r=await handleSarinSession(post('/api/sarin/session',{consent,lead},null,ip),env,options);assert.equal(r.status,200);
    return {cookie:r.headers.get('Set-Cookie').split(';')[0],...await r.json()};
  }
  const send=(s,message='Una tienda',requestId=crypto.randomUUID())=>handleSarin(post('/api/sarin',{message,requestId},s.cookie),env,options);
  return {...f,env,options,store,calls,session,send,advance:ms=>{at+=ms;}};
}

test('sesión, dos turnos, contexto del servidor y replay usan SQL y cuotas reales',async t=>{
  const f=await setup(t),s=await f.session(),id=crypto.randomUUID();
  const first=await f.send(s,'Una tienda',id);assert.equal(first.status,200);const body=await first.json();
  assert.equal(body.turn,1);assert.equal(body.conversationId,s.conversationId);
  const replay=await f.send(s,'Una tienda',id);assert.equal(replay.status,200);assert.deepEqual(await replay.json(),body);assert.equal(f.calls.length,1);
  const second=await f.send(s,'Vendo café');assert.equal(second.status,200);assert.equal((await second.json()).turn,2);
  assert.equal(f.calls.length,2);assert.deepEqual(f.calls[1].messages.map(item=>item.role),['system','user']);
  assert.equal(JSON.stringify(f.calls).includes(LEAD.email),false,'el contacto administrativo no se envía al proveedor');
  assert.equal(JSON.stringify(body).includes(LEAD.email),false,'la respuesta pública no contiene contacto');
  assert.deepEqual(JSON.parse(f.calls[1].messages[1].content),{message:'Vendo café',history:[{role:'user',content:'Una tienda'},{role:'assistant',content:body.reply}]});
  const detail=await f.store.getConversation(s.conversationId);assert.equal(detail.messages.length,4);assert.equal(detail.consent.noticeVersion,NOTICE_VERSION);
  assert.ok(detail.usage.verifiedMicros>0);assert.equal(detail.usage.retainedMicros,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_turn_reservations').get().n,2);
});

test('clasificación y generación excluyen contacto administrativo de IA, JSON público y logs', async t => {
  const f = await setup(t), logs = [];
  for (const method of ['log','warn','error']) t.mock.method(console, method, (...values) => logs.push(values));
  const lead = { firstName: 'NombreCanario', lastName: 'ApellidoCanario', email: 'lead-canary@example.test' };
  const session = await f.session(undefined, lead);
  f.options.fetch = async (_url, init) => {
    f.calls.push(JSON.parse(init.body));
    return provider(f.calls.length === 1 ? { inScope: true } : { reply: 'Podemos crear una tienda para tu negocio.', service: 'store', examples: [], brief: {} });
  };
  const response = await f.send(session, 'Necesito una tienda para mi negocio');
  assert.equal(response.status, 200); const publicBody = await response.json(); assert.equal(f.calls.length, 2);
  assert.deepEqual((await f.store.getConversation(session.conversationId)).lead, lead);
  for (const value of Object.values(lead)) {
    for (const requestBody of f.calls) assert.equal(JSON.stringify(requestBody).includes(value), false);
    assert.equal(JSON.stringify(publicBody).includes(value), false); assert.equal(JSON.stringify(logs).includes(value), false);
  }
});

test('sesiones aisladas, bloqueo y borrado no permiten consultar con token ajeno',async t=>{
  const f=await setup(t),a=await f.session(),b=await f.session('192.0.2.2'),id=crypto.randomUUID();
  assert.equal((await f.send(a,'Una tienda',id)).status,200);
  assert.equal((await f.send(b,'Otra web',id)).status,200);
  assert.deepEqual(f.calls[1].messages.map(item=>item.role),['system','user']);
  assert.doesNotThrow(()=>JSON.parse(f.calls[1].messages[1].content),'El contexto vacío también se transmite como datos JSON');
  assert.deepEqual(JSON.parse(f.calls[1].messages[1].content),{message:'Otra web',history:[]},'sin mensajes de la otra conversación');
  await f.store.adminAction({id:a.conversationId,action:'block',actor:'owner@example.test'});
  assert.equal((await f.send(a)).status,403);assert.equal(f.calls.length,2);
  await f.store.adminAction({id:a.conversationId,action:'delete',actor:'owner@example.test'});
  assert.equal((await f.send(a)).status,401);assert.equal(f.calls.length,2);
  assert.equal((await f.store.getConversation(b.conversationId)).messages.length,2);
});

test('borrar durante el proveedor impide recrear el historial y conserva el gasto',async t=>{
  const f=await setup(t),s=await f.session();
  f.options.fetch=async()=>{await f.store.adminAction({id:s.conversationId,action:'delete',actor:'owner@example.test'});return provider({inScope:false});};
  assert.equal((await f.send(s)).status,410);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_conversations').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_turns').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_reservations WHERE actual_micros > 0').get().n,1);
});

test('quince turnos y caducidad de sesión se aplican en el servidor',async t=>{
  const f=await setup(t),s=await f.session();
  for(let i=0;i<15;i++){f.advance(61000);assert.equal((await f.send(s)).status,200);}
  const limit=await f.send(s);assert.equal(limit.status,429);assert.equal((await limit.json()).error.code,'turn_limit');assert.equal(f.calls.length,15);
  f.advance(86400000);assert.equal((await f.send(s)).status,401);assert.equal(f.calls.length,15);
});

test('saldo agotado guarda el mensaje admitido y error público sin llamar IA',async t=>{
  const f=await setup(t),s=await f.session();f.env.SARIN_DAILY_BUDGET_MICROS='1';
  const r=await f.send(s);assert.equal(r.status,429);assert.equal(f.calls.length,0);
  const detail=await f.store.getConversation(s.conversationId);assert.equal(detail.messages.length,2);assert.equal(detail.messages[1].status,'error');
  assert.match(detail.messages[1].content,/límite/);assert.equal(detail.usage.reservedMicros,0);
});

test('fallo de vínculo previo a red libera solo la reserva conocida de cero',async t=>{
  const f=await setup(t),s=await f.session();
  f.options.store={...f.store,attachReservation:async()=>{throw new Error('synthetic-private-db');}};
  const r=await f.send(s);assert.equal(r.status,503);assert.equal(f.calls.length,0);assert.doesNotMatch(await r.text(),/synthetic-private/);
  assert.equal(f.sqlite.prepare('SELECT actual_micros FROM sarin_reservations').get().actual_micros,0);
});
