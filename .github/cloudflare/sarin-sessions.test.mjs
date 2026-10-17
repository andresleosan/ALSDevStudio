import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION } from '../../scripts/modules/sarin-consent.js';
import { LEAD } from './sarin-lead-fixture.mjs';

const load = () => import('../../server/sarin/sessions.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const consent = () => ({accepted:true,noticeVersion:NOTICE_VERSION,privacyVersion:PRIVACY_VERSION,termsVersion:TERMS_VERSION});
const env = () => ({SARIN_ENABLED:'true',SARIN_HISTORY_ENABLED:'true',SARIN_IP_SECRET:'x'.repeat(32),SARIN_DB:{prepare(){},batch(){}}});
const request = (body={consent:consent(),lead:LEAD},headers={},extra={}) => new Request('https://www.alsdevstudio.com/api/sarin/session', {
  method:'POST',headers:{Origin:'https://www.alsdevstudio.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify(body),...extra,
});
const setup = () => {
  const calls=[];
  return {calls,options:{now:()=>Date.UTC(2026,9,16),store:{createSession:async value=>{calls.push(value);return {conversationId:'00000000-0000-4000-8000-000000000001',sessionExpiresAt:Date.UTC(2026,9,17)};}}}};
};

test('nueva sesión admite datos de contacto obligatorios sin devolverlos al visitante', async () => {
  const api = await load(), s = setup();
  const response = await api.handleSarinSession(request({ consent: consent(), lead: LEAD }), env(), s.options);
  assert.equal(response.status, 200); assert.deepEqual(s.calls[0].lead, LEAD);
  assert.equal((await response.text()).includes(LEAD.email), false);
});

for (const lead of [undefined, null, {}, { ...LEAD, firstName: '' }, { ...LEAD, lastName: '<script>' }, { ...LEAD, email: 'invalid' }, { ...LEAD, extra: true }]) {
  test('nueva sesión rechaza contacto ausente o inválido antes de persistir', async () => {
    const api = await load(), s = setup();
    const response = await api.handleSarinSession(request({ consent: consent(), ...(lead === undefined ? {} : { lead }) }), env(), s.options);
    assert.equal(response.status, 400); assert.equal(s.calls.length, 0); assert.equal(response.headers.has('Set-Cookie'), false);
  });
}
test('sesión exige implementación del handler',async()=>assert.equal(typeof (await load()).handleSarinSession,'function'));
test('aceptación explícita produce cookie segura y guarda solo hash del secreto',async()=>{
  const api=await load();const s=setup();const response=await api.handleSarinSession(request(),env(),s.options);
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  const cookie=response.headers.get('Set-Cookie');assert.match(cookie,/^__Host-sarin-session=[a-f0-9]{64};/);for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=86400'])assert.ok(cookie.includes(flag));
  const token=cookie.split(';')[0].split('=')[1];assert.equal(s.calls.length,1);assert.notEqual(s.calls[0].tokenHash,token);assert.match(s.calls[0].tokenHash,/^[a-f0-9]{64}$/);
  assert.equal(s.calls[0].consent.noticeVersion,NOTICE_VERSION);assert.equal(s.calls[0].consent.privacyVersion,PRIVACY_VERSION);assert.equal(s.calls[0].consent.termsVersion,TERMS_VERSION);assert.equal(s.calls[0].consent.method,'checkbox_and_start');assert.match(s.calls[0].consent.noticeHash,/^[a-f0-9]{64}$/);
  assert.equal(s.calls[0].consent.acceptedAt,Date.UTC(2026,9,16));assert.equal(JSON.stringify(s.calls).includes('192.0.2.1'),false);
  const out=await response.json();assert.deepEqual(Object.keys(out).sort(),['conversationId','sessionExpiresAt']);assert.equal(JSON.stringify(out).includes(token),false);
});
for(const body of [{},{consent:{...consent(),accepted:false}},{consent:{...consent(),noticeVersion:'old'}},{consent:{...consent(),termsVersion:'old'}},{consent:{...consent(),extra:true}},{consent:consent(),message:'private-fixture'}])test('rechaza autorización ausente, vieja o campos ajenos antes de crear sesión',async()=>{
  const api=await load(),s=setup();const response=await api.handleSarinSession(request(body),env(),s.options);assert.ok([400,403].includes(response.status));assert.equal(s.calls.length,0);
});
for(const field of ['privacyVersion','termsVersion'])test(`nuevas sesiones rechazan ${field} v1 sin reutilizar aceptación anterior`,async()=>{
  const api=await load(),s=setup();const response=await api.handleSarinSession(request({lead:LEAD,consent:{...consent(),[field]:'2026-10-16-sarin-history-v1'}}),env(),s.options);
  assert.equal(response.status,403);assert.equal(response.headers.has('Set-Cookie'),false);assert.equal(s.calls.length,0);
});
for(const previous of [
  {noticeVersion:'sarin-history-2026-10-16-v1'},
  {noticeVersion:'sarin-history-2026-10-17-v4'},
  {privacyVersion:'2026-10-16-sarin-history-v2'},
  {termsVersion:'2026-10-16-sarin-history-v2'},
])test(`apertura pública exige nueva autorización: rechaza ${Object.keys(previous)[0]} anterior`,async()=>{
  const api=await load(),s=setup();const response=await api.handleSarinSession(request({lead:LEAD,consent:{...consent(),...previous}}),env(),s.options);
  assert.equal(response.status,403);assert.equal(response.headers.has('Set-Cookie'),false);assert.equal(s.calls.length,0);
});
for(const key of Object.keys(env()))test(`sesión cerrada sin ${key}`,async()=>{
  const api=await load(),s=setup(),config=env();delete config[key];assert.equal((await api.handleSarinSession(request(),config,s.options)).status,503);assert.equal(s.calls.length,0);
});
test('origen, formato, tamaño y método rechazan sin persistencia',async()=>{
  const api=await load();for(const [req,status] of [[request(undefined,{Origin:'https://untrusted.invalid'}),403],[request(undefined,{'Content-Type':'text/plain'}),400],[request({lead:LEAD,consent:consent(),extra:'x'.repeat(20000)}),413],[new Request('https://www.alsdevstudio.com/api/sarin/session'),405]]){
    const s=setup();assert.equal((await api.handleSarinSession(req,env(),s.options)).status,status);assert.equal(s.calls.length,0);
  }
});
test('cuota de creación falla sin exponer detalles ni establecer cookie',async()=>{
  const api=await load(),s=setup();s.options.store.createSession=async()=>{throw Object.assign(new Error('private-fixture-db'),{status:429,code:'session_rate_limit'});};
  const response=await api.handleSarinSession(request(),env(),s.options);assert.equal(response.status,429);assert.equal(response.headers.get('Set-Cookie'),null);assert.doesNotMatch(await response.text(),/private-fixture/);
});
test('cookie opaca rechaza duplicados, formatos extraños y no acepta URL como credencial',async()=>{
  const api=await load(),token='a'.repeat(64);assert.equal(api.readSessionToken(new Request('https://www.alsdevstudio.com',{headers:{Cookie:`other=x; __Host-sarin-session=${token}`}})),token);
  for(const header of [`__Host-sarin-session=${token}; __Host-sarin-session=${token}`,'__Host-sarin-session=%00','__Host-sarin-session=short'])assert.throws(()=>api.readSessionToken(new Request('https://www.alsdevstudio.com',{headers:{Cookie:header}})));
  assert.throws(()=>api.readSessionToken(new Request(`https://www.alsdevstudio.com?token=${token}`)));
});
