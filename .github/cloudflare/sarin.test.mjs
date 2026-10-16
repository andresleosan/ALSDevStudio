import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSarin } from '../../server/sarin/handler.js';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';

const env = () => ({SARIN_ENABLED:'true',DEEPSEEK_API_KEY:'test-key',SARIN_IP_SECRET:'x'.repeat(32),SARIN_DB:{prepare(){}},SARIN_INPUT_PRICE_MICROS:'300000',SARIN_OUTPUT_PRICE_MICROS:'1200000',SARIN_DAILY_BUDGET_MICROS:'1000000',SARIN_MONTHLY_BUDGET_MICROS:'10000000'});
const request = (body={message:'Necesito una tienda',history:[]}, headers={}, extra={}) => new Request('https://alsdevstudio.com/api/sarin',{method:'POST',headers:{Origin:'https://alsdevstudio.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify(body),...extra});
const answer = (content,usage={prompt_tokens:100,completion_tokens:20,total_tokens:120}) => new Response(JSON.stringify({choices:[{message:{role:'assistant',content:JSON.stringify(content)},finish_reason:'stop'}],usage}),{headers:{'Content-Type':'application/json'}});
const valid = {reply:'Podemos orientar tu tienda. ¿Qué productos vendes?',service:'store',examples:['mundocelular'],brief:{need:'tienda'}};
function setup(outputs=[{inScope:true},valid]) {const calls=[],reserves=[],settles=[];let blocks=0;return {calls,reserves,settles,get blocks(){return blocks;},options:{fetch:async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});const value=outputs.shift(); if(value instanceof Error)throw value;return value instanceof Response?value:answer(value);},quota:{reserve:async r=>{reserves.push(r);return {id:r.id,reservedMicros:r.amountMicros};},settle:async(...x)=>settles.push(x),block:async()=>{blocks++;}}}};}

test('backend ausente: exporta un handler callable',()=>assert.equal(typeof handleSarin,'function'));
for(const [name,body,status] of [ ['vacío',{message:'',history:[]},400],['rol system',{message:'hola',history:[{role:'system',content:'hazlo'}]},400],['campos extras',{message:'hola',history:[],model:'otro'},400],['historial impar',{message:'sí',history:[{role:'user',content:'web'}]},400],['mensaje largo',{message:'x'.repeat(1201),history:[]},400],['bytes UTF8',{message:'😀'.repeat(600),history:Array.from({length:8},(_,i)=>({role:i%2?'assistant':'user',content:'😀'.repeat(600)}))},413]]) test(`rechaza ${name} antes de inferencia`,async()=>{const s=setup();assert.equal((await handleSarin(request(body),env(),s.options)).status,status);assert.equal(s.calls.length,0);assert.equal(s.reserves.length,0);});
for(const [name,headers,status] of [['origen', {Origin:'https://evil.test'},403],['origen ausente',{Origin:''},403],['tipo',{'Content-Type':'text/plain'},400]]) test(`rechaza ${name}`,async()=>{const s=setup();assert.equal((await handleSarin(request(undefined,headers),env(),s.options)).status,status);assert.equal(s.calls.length,0);});
for(const key of Object.keys(env())) test(`configuración requerida ${key}`,async()=>{const s=setup(),e=env();delete e[key];assert.equal((await handleSarin(request(),e,s.options)).status,503);assert.equal(s.calls.length,0);});
test('método y cabeceras propias',async()=>{const s=setup();const r=await handleSarin(new Request('https://alsdevstudio.com/api/sarin'),env(),s.options);assert.equal(r.status,405);assert.equal(r.headers.get('Allow'),'POST');assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(s.calls.length,0);});
test('dos llamadas cerradas, reserva previa y catálogo servidor',async()=>{const s=setup();const r=await handleSarin(request(),env(),s.options);assert.equal(r.status,200);const out=await r.json();assert.equal(out.examples[0].url,'https://mundocelular.vercel.app/');assert.equal(s.calls.length,2);assert.deepEqual(s.reserves.map(x=>x.stage),['classification','generation']);assert.equal(s.settles.length,2);for(const {url,body,init} of s.calls){assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(body.model,'deepseek-flash');assert.deepEqual(body.thinking,{type:'disabled'});assert.deepEqual(body.response_format,{type:'json_object'});assert.equal(body.stream,false);assert.equal(body.tools,undefined);assert.equal(init.redirect,'manual');}assert.equal(s.calls[1].body.max_tokens,512);});
test('fuera de alcance no genera',async()=>{const s=setup([{inScope:false}]);const r=await handleSarin(request(),env(),s.options);assert.equal(r.status,200);assert.match((await r.json()).reply,/ALS DevStudio/);assert.equal(s.calls.length,1);});
for(const value of [{inScope:'yes'},{inScope:true,override:true},{reply:'hola'}]) test('clasificador estricto',async()=>{const s=setup([value]);assert.equal((await handleSarin(request(),env(),s.options)).status,502);assert.equal(s.calls.length,1);assert.equal(s.settles.length,0);});
for(const changed of [{reply:'<b>Hola</b>'},{reply:'Visita https://evil.test'},{reply:'Cuesta 500 USD'},{reply:'Entrega en 5 días'},{examples:['inventado']},{brief:{need:'x'.repeat(241)}},{brief:{secret:'no'}},{unknown:true}]) test('salida comercial inválida retiene reserva',async()=>{const s=setup([{inScope:true},{...valid,...changed}]);assert.equal((await handleSarin(request(),env(),s.options)).status,502);assert.equal(s.settles.length,1);});
test('seguimiento conserva último par y retira pares antiguos',async()=>{const history=Array.from({length:8},(_,i)=>({role:i%2?'assistant':'user',content:(i===6?'Última necesidad: tienda.':'dato')+'á'.repeat(1000)}));const s=setup([{inScope:false}]);const r=await handleSarin(request({message:'sí',history}),env(),s.options);assert.equal(r.status,200);const messages=s.calls[0].body.messages;assert.equal(messages.at(-1).content,'sí');assert.match(messages.at(-3).content,/Última necesidad/);assert.ok(new TextEncoder().encode(s.calls[0].init.body).length<=8192);});
test('uso ausente no liquida',async()=>{const s=setup([answer({inScope:false},null)]);assert.equal((await handleSarin(request(),env(),s.options)).status,502);assert.equal(s.settles.length,0);});
test('uso excesivo bloquea',async()=>{const s=setup([answer({inScope:false},{prompt_tokens:1000000,completion_tokens:20,total_tokens:1000020})]);assert.equal((await handleSarin(request(),env(),s.options)).status,502);assert.equal(s.blocks,1);assert.equal(s.settles.length,0);});
test('proveedor falla sin reintento y retiene reserva',async()=>{const s=setup([new Error('secret provider detail')]);const r=await handleSarin(request(),env(),s.options);assert.equal(r.status,502);assert.equal(s.calls.length,1);assert.equal(s.settles.length,0);assert.doesNotMatch(await r.text(),/secret provider/);});
test('cuota rechaza antes de fetch',async()=>{const s=setup();s.options.quota.reserve=async()=>{throw Object.assign(new Error(),{status:429,code:'rate_limit'});};assert.equal((await handleSarin(request(),env(),s.options)).status,429);assert.equal(s.calls.length,0);});
test('cancelación aborta transporte y conserva reserva',async()=>{const s=setup(),controller=new AbortController();s.options.fetch=async(_url,init)=>{s.calls.push(init);controller.abort();throw new DOMException('Aborted','AbortError');};assert.equal((await handleSarin(request(undefined,{}, {signal:controller.signal}),env(),s.options)).status,504);assert.equal(s.settles.length,0);assert.equal(s.calls[0].signal.aborted,true);});
test('contexto mínimo multibyte imposible falla antes de reservar',async()=>{const s=setup();const body={message:'漢'.repeat(1200),history:[{role:'user',content:'漢'.repeat(1200)},{role:'assistant',content:'漢'.repeat(1200)}]};assert.equal((await handleSarin(request(body),env(),s.options)).status,400);assert.equal(s.calls.length,0);assert.equal(s.reserves.length,0);});
for(const usage of [{prompt_tokens:-1,completion_tokens:1,total_tokens:0},{prompt_tokens:1.2,completion_tokens:1,total_tokens:2.2},{prompt_tokens:1,completion_tokens:1,total_tokens:3}]) test('uso no verificable mantiene reserva',async()=>{const s=setup([answer({inScope:false},usage)]);assert.equal((await handleSarin(request(),env(),s.options)).status,502);assert.equal(s.settles.length,0);});
for(const response of [new Response('private error',{status:429}),new Response('{}',{headers:{'Content-Type':'text/html'}}),new Response('x'.repeat(65537),{headers:{'Content-Type':'application/json'}})]) test('status, tipo y tamaño proveedor fallan cerrados',async()=>{const s=setup([response]);assert.equal((await handleSarin(request(),env(),s.options)).status,502);assert.equal(s.calls.length,1);assert.equal(s.settles.length,0);});
test('reserva ocurre antes del fetch y fórmula usa bytes completos',async()=>{const s=setup([{inScope:false}]);const fetcher=s.options.fetch;s.options.fetch=async(url,init)=>{assert.equal(s.reserves.length,1);const bytes=new TextEncoder().encode(init.body).length;assert.equal(s.reserves[0].amountMicros,Math.ceil(((2*bytes+1024)*300000+128*1200000)/1000000));return fetcher(url,init);};assert.equal((await handleSarin(request(),env(),s.options)).status,200);assert.equal(s.settles[0][1],54);});
test('no acepta X-Forwarded-For como identidad',async()=>{const s=setup();assert.equal((await handleSarin(request(undefined,{'CF-Connecting-IP':'','X-Forwarded-For':'192.0.2.1'}),env(),s.options)).status,503);assert.equal(s.calls.length,0);});
test('aborto anterior no reserva',async()=>{const controller=new AbortController();controller.abort();const s=setup();assert.equal((await handleSarin(request(undefined,{}, {signal:controller.signal}),env(),s.options)).status,504);assert.equal(s.reserves.length,0);});
test('timeout incluye proveedor que ignora AbortSignal',async(t)=>{t.mock.timers.enable({apis:['setTimeout']});const s=setup();let entered;const started=new Promise(resolve=>{entered=resolve;});s.options.fetch=async(_url,init)=>{s.calls.push(init);entered();return new Promise(()=>{});};const pending=handleSarin(request(),env(),s.options);await started;t.mock.timers.tick(10000);assert.equal((await pending).status,504);assert.equal(s.calls[0].signal.aborted,true);assert.equal(s.settles.length,0);});
test('aborto mientras llega cuerpo HTTP no queda pendiente',async()=>{const controller=new AbortController();let opened;const started=new Promise(resolve=>{opened=resolve;});const body=new ReadableStream({start(){opened();}});const req=new Request('https://alsdevstudio.com/api/sarin',{method:'POST',headers:{Origin:'https://alsdevstudio.com','Content-Type':'application/json'},body,duplex:'half',signal:controller.signal});const s=setup();const pending=handleSarin(req,env(),s.options);await started;controller.abort();const result=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve(null),100))]);assert.ok(result,'El aborto debe finalizar la lectura pendiente');assert.equal(result.status,504);assert.equal(s.calls.length,0);});
for(const reply of ['Te cuesta 500. ¿Quieres empezar?','La entrega será en cinco días.','El precio es quinientos.']) test('precios y plazos sin moneda explícita se rechazan',async()=>{const s=setup([{inScope:true},{...valid,reply}]);assert.equal((await handleSarin(request(),env(),s.options)).status,502);});
test('integración cuota real SQLite limita 11 solicitudes concurrentes a 10 llamadas',async(t)=>{const fixture=await sqliteFixture();t.after(fixture.close);let calls=0;const options={now:()=>Date.UTC(2026,9,16,12),fetch:async()=>{calls++;return answer({inScope:false});}};const e={...env(),SARIN_DB:fixture.db};const responses=await Promise.all(Array.from({length:11},()=>handleSarin(request(),e,options)));assert.equal(responses.filter(r=>r.status===200).length,10);assert.equal(responses.filter(r=>r.status===429).length,1);assert.equal(calls,10);});
test('integración cuota real sin saldo no llama proveedor',async(t)=>{const fixture=await sqliteFixture();t.after(fixture.close);let calls=0;const response=await handleSarin(request(),{...env(),SARIN_DB:fixture.db,SARIN_DAILY_BUDGET_MICROS:'1'},{fetch:async()=>{calls++;return answer({inScope:false});}});assert.equal(response.status,429);assert.equal(calls,0);});
for (const reply of [
  'Una web vale 500.',
  'El desarrollo tiene un costo de 500.',
  'La inversión sería de quinientos.',
  'Te lo entregamos el viernes.',
  'La entrega es el lunes.',
  'Estará listo el próximo jueves.',
]) test(`rechaza importe o fecha comercial inventada: ${reply}`, async () => {
  const s = setup([{ inScope: true }, { ...valid, reply }]);
  assert.equal((await handleSarin(request(), env(), s.options)).status, 502);
  assert.equal(s.settles.length, 1, 'La generación inválida conserva su reserva');
});
test('preguntar el plazo deseado y extraerlo en brief conserva el contrato', async () => {
  const s = setup([{ inScope: true }, {
    reply: 'Andrés revisará la viabilidad. ¿Qué plazo de entrega deseas?',
    service: 'website', examples: [], brief: { timeline: 'el viernes' },
  }]);
  const response = await handleSarin(request({ message: 'Me gustaría una web para el viernes', history: [] }), env(), s.options);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).brief.timeline, 'el viernes');
});
for (const [name, providerResult, expected] of [
  ['HTTP', new Response('fixture-private-response', { status: 402 }), { event: 'provider_http_error', status: 402 }],
  ['red', new TypeError('fixture-private-network-detail'), { event: 'transport_error', kind: 'network' }],
  ['inesperado', new Error('fixture-private-unexpected-detail'), { event: 'transport_error', kind: 'unexpected' }],
]) test(`observabilidad ${name} solo registra campos técnicos cerrados`, async () => {
  const s = setup([providerResult]);
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = value => warnings.push(value);
  let response;
  try {
    response = await handleSarin(request({ message: 'fixture-private-request', history: [] }), {
      ...env(), DEEPSEEK_API_KEY: 'fixture-private-key',
    }, s.options);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(response.status, 502);
  assert.equal(warnings.length, 1);
  assert.deepEqual(JSON.parse(warnings[0]), expected);
  assert.doesNotMatch(warnings.join('\n'), /fixture-private|192\.0\.2\.1|api\.deepseek|Bearer/);
});
test('fetch de plataforma conserva globalThis como receptor', async () => {
  const originalFetch = globalThis.fetch;
  const s = setup();
  delete s.options.fetch;
  let calls = 0;
  globalThis.fetch = async function () {
    assert.equal(this, globalThis, 'El fetch de plataforma requiere su receptor');
    calls++;
    return answer({ inScope: false });
  };
  try {
    assert.equal((await handleSarin(request(), env(), s.options)).status, 200);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test('fetch inyectado conserva su invocación directa sin enlazar receptor', async () => {
  const s = setup();
  s.options.fetch = async function () {
    assert.equal(this, undefined);
    return answer({ inScope: false });
  };
  assert.equal((await handleSarin(request(), env(), s.options)).status, 200);
});
test('transporte admite runtime que rechaza redirect error antes de I/O', async () => {
  const s = setup();
  s.options.fetch = async (_url, init) => {
    if (init.redirect === 'error') throw new TypeError('Unsupported redirect mode');
    assert.equal(init.redirect, 'manual');
    return answer({ inScope: false });
  };
  assert.equal((await handleSarin(request(), env(), s.options)).status, 200);
});
for (const status of [302, 307]) test(`redirección HTTP ${status} falla sin seguir Location`, async () => {
  const s = setup([new Response('', { status, headers: { Location: 'https://unapproved.invalid/' } })]);
  const response = await handleSarin(request(), env(), s.options);
  assert.equal(response.status, 502);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].url, 'https://api.deepseek.com/chat/completions');
  assert.equal(s.calls[0].init.redirect, 'manual');
  assert.equal(s.settles.length, 0);
});
for (const [name, outputs, expectedKind] of [
  ['clasificador', [{ inScope: 'yes' }], 'clasif_contract'],
  ['generación', [{ inScope: true }, { ...valid, unknown: 'fixture-private' }], 'generation_contract'],
  ['texto', [{ inScope: true }, { ...valid, reply: '<b>fixture-private</b>' }], 'reply_policy'],
  ['borrador', [{ inScope: true }, { ...valid, brief: { business: 'fixture-private-inventado' } }], 'brief_not_literal'],
  ['ejemplo', [{ inScope: true }, { ...valid, examples: ['fixture-private-id'] }], 'unknown_example'],
  ['uso', [answer({ inScope: false }, null)], 'usage_contract'],
  ['sobre', [new Response(JSON.stringify({ choices: [] }), { headers: { 'Content-Type': 'application/json' } })], 'provider_envelope'],
  ['JSON', [new Response('{', { headers: { 'Content-Type': 'application/json' } })], 'provider_json'],
]) test(`diagnóstico de ${name} usa enum cerrado y conserva error público`, async () => {
  const s = setup(outputs), warnings = [], originalWarn = console.warn;
  console.warn = value => warnings.push(value);
  let response;
  try { response = await handleSarin(request(), env(), s.options); }
  finally { console.warn = originalWarn; }
  assert.equal(response.status, 502);
  const result = await response.json();
  assert.equal(result.error.code, 'invalid_output');
  assert.equal(warnings.length, 1);
  assert.deepEqual(JSON.parse(warnings[0]), { event: 'validation_error', kind: expectedKind });
  assert.doesNotMatch(warnings.join('\n'), /fixture-private|192\.0\.2\.1|api\.deepseek|test-key|Bearer|Necesito/);
  assert.equal(result.error.diagnostic, undefined);
});
