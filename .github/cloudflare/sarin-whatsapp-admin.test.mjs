import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';

// Claves efímeras y datos sintéticos: nunca contacta Google ni una cuenta real.
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=fixture-firebase-public-key';
const env = () => ({
  SARIN_ADMIN_ENABLED: 'true', SARIN_FIREBASE_API_KEY: 'fixture-firebase-public-key',
  SARIN_FIREBASE_PROJECT_ID: 'alsdevstudio', SARIN_ADMIN_UID: 'fixture-owner', SARIN_ADMIN_EMAIL: 'owner@example.test',
  SARIN_ADMIN_CSRF_SECRET: 'fixture-csrf-secret-with-at-least-32-characters', SARIN_DB: { prepare() {} },
});
const id = '89a256b7-53ac-49ce-8ab8-4645c22952ff';
function jwt(overrides = {}, { alg = 'RS256', kid = 'fixture-key', key = pair.privateKey } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: 'https://securetoken.google.com/alsdevstudio', aud: 'alsdevstudio', exp: now + 600, iat: now - 5, nbf: now - 5,
    auth_time: now - 5, email: 'owner@example.test', email_verified: true, sub: 'fixture-owner', firebase: { sign_in_provider: 'google.com' }, ...overrides };
  for (const name of Object.keys(claims)) if (claims[name] === undefined) delete claims[name];
  const input = `${Buffer.from(JSON.stringify({ alg, kid })).toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
}
function request(path = '/api/control-sarin/bootstrap', { token = jwt(), headers = {}, method = 'GET', body, origin = 'https://alsdevstudio.com' } = {}) {
  const combined = new Headers(headers);
  if (token) combined.set('Cookie', [combined.get('Cookie'), `__Host-sarin_admin=${token}`].filter(Boolean).join('; '));
  return new Request(`${origin}${path}`, { method, headers: combined, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
}
const account = (overrides = {}) => ({ localId: 'fixture-owner', email: 'owner@example.test', emailVerified: true,
  disabled: false, providerUserInfo: [{ providerId: 'google.com', email: 'owner@example.test' }], ...overrides });
function googleFetch({ user = account(), lookup } = {}) {
  return async (url, options) => {
    const address = String(url);
    if (address === JWKS_URL) return Response.json({ keys: [publicJwk] }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    assert.equal(address, LOOKUP_URL, 'ninguna red remota');
    assert.equal(options.method, 'POST');
    const value = JSON.parse(options.body);
    assert.equal(typeof value.idToken, 'string');
    return lookup ? lookup(options) : Response.json({ users: [user] });
  };
}
async function fixture(run) {
  const original = globalThis.fetch;
  const fetched = [];
  const authFetch = googleFetch();
  globalThis.fetch = async (...args) => { fetched.push(String(args[0])); return authFetch(...args); };
  try { return await run(fetched); } finally { globalThis.fetch = original; }
}
const moduleUnderTest=()=>import('../../server/sarin/admin.js');
const peerKey='a'.repeat(64),outboxId='89a256b7-53ac-49ce-8ab8-4645c22952ff';
const base='/api/control-sarin/whatsapp';
const at=Date.now();
const row={peer_key:peerKey,masked_phone:'+57 ••• ••• 0001',paused:1,revision:4,updated_at:at,consent_status:'pending',consent_expires_at:at+3600000,peer_phone:'+573000000001',provider_id:'PRIVATE_PROVIDER_ID',secret:'PRIVATE_SECRET'};
function waFixture(overrides={}){
  const calls=[];const wrap=(name,fn)=>async value=>{calls.push([name,value]);return fn(value);};
  const value={calls,
    getPilot:wrap('pilot',()=>({enabled:1,revision:2,activation_at:at,epoch:'PRIVATE_EPOCH'})),
    getSendClosure:wrap('closure',()=>({closed:false,closures:[]})),
    listPeers:wrap('list',()=>({peers:[row],cursor:null})),
    getPeer:wrap('peer',()=>({...row,events:[{event_id:'input-1',kind:'inbound',media_type:'text',text:'<img onerror=alert(1)> Consulta ficticia',sent_at:at,expires_at:at+3600000},{event_id:'echo-1',kind:'echo',media_type:'text',text:'PRIVATE_ECHO',sent_at:at,expires_at:at+3600000},{event_id:'old',kind:'inbound',text:'EXPIRED_TEXT',sent_at:at-86400000,expires_at:at-1}],outputs:[{outbox_id:outboxId,purpose:'reply',state:'send_uncertain',text:'Respuesta ficticia',created_at:at,started_at:at,expires_at:at+3600000,reconcile_available:1,reconcile_state:'idle',reconcile_attempts:0,reconcile_next_at:null,provider_id:'PRIVATE_PROVIDER_ID'}]})),
    pausePeer:wrap('pause',()=>({revision:5,paused:true})),resumePeer:wrap('resume',()=>({revision:5,paused:false})),
    setPilotMode:wrap('mode',()=>({revision:3})),
    requestReconciliation:wrap('reconcile',()=>({status:'pending',attempts:1,nextAt:at+60000,providerId:'PRIVATE_PROVIDER_ID'}))
  };return Object.assign(value,overrides);
}
async function setup(store=waFixture(),config=env()){
  const {handleSarinAdmin}=await moduleUnderTest();const now=()=>at;
  const bootstrap=await handleSarinAdmin(request(),config,{store:{getPurgeStatus:async()=>({status:'ok'})},now});assert.equal(bootstrap.status,200);const {csrfToken}=await bootstrap.json();
  const send=(suffix,body,extra={})=>handleSarinAdmin(request(base+suffix,{method:'POST',body,headers:{Origin:'https://alsdevstudio.com','Content-Type':'application/json','X-Sarin-CSRF':csrfToken,...extra.headers},...Object.fromEntries(Object.entries(extra).filter(([key])=>key!=='headers'))}),config,{whatsappStore:store,now});
  const get=suffix=>handleSarinAdmin(request(base+suffix),config,{whatsappStore:store,now});
  return {store,send,get,handleSarinAdmin,config,csrfToken,now};
}

test('anonymous_cannot_read_whatsapp autentica antes de acceder al store',async()=>fixture(async()=>{
  const {handleSarinAdmin}=await moduleUnderTest();const store=waFixture();
  for(const suffix of ['/peers',`/peers/${peerKey}`]){const response=await handleSarinAdmin(request(base+suffix,{token:null}),env(),{whatsappStore:store});assert.equal(response.status,403);assert.equal(response.headers.get('Cache-Control'),'no-store');}assert.deepEqual(store.calls,[]);
}));

test('wrong_origin_or_csrf_cannot_resume protege todas las mutaciones WhatsApp',async()=>fixture(async()=>{
  const f=await setup();for(const [path,body] of [[`/peers/${peerKey}/action`,{action:'resume',revision:4}],['/pilot',{enabled:true,revision:2}],[`/outbox/${outboxId}/reconcile`,{}]]){
    for(const headers of [{Origin:'https://evil.example'},{Origin:''},{'X-Sarin-CSRF':'invalid'},{'X-Sarin-CSRF':''}])assert.equal((await f.send(path,body,{headers})).status,403);
  }assert.deepEqual(f.store.calls,[]);
}));

test('lista y detalle proyectan campos acotados, enmascarados y sin eco/contenido vencido',async()=>fixture(async()=>{
  const f=await setup();let response=await f.get('/peers');assert.equal(response.status,200);let data=await response.json();assert.equal(data.items[0].maskedPhone,'+57 ••• ••• 0001');assert.equal(data.items[0].consent.status,'pending','fecha futura sola no acredita consentimiento');assert.deepEqual(data.pilot,{enabled:true,revision:2,updatedAt:at,recoveryBlockedUntil:null,repliesEnabled:false});
  response=await f.get(`/peers/${peerKey}`);assert.equal(response.status,200);data=await response.json();assert.equal(data.peer.events.find(e=>e.kind==='echo').content,undefined);assert.ok(data.peer.events.some(e=>e.role==='assistant'&&e.content==='Respuesta ficticia'));assert.ok(data.peer.events.some(e=>e.content==='<img onerror=alert(1)> Consulta ficticia'));assert.equal(data.peer.outputs[0].canReconcile,true);
  assert.doesNotMatch(JSON.stringify(data),/PRIVATE_|EXPIRED_TEXT|573000000001/);assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
}));

test('acciones revisionadas delegan control existente y actor hash sin destinatario ni historial web',async()=>fixture(async()=>{
  const f=await setup();for(const action of ['pause','resume']){const response=await f.send(`/peers/${peerKey}/action`,{action,revision:4});assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});}
  for(const [name,value] of f.store.calls){assert.ok(['pause','resume'].includes(name));assert.deepEqual(Object.keys(value).sort(),['actor','expectedRevision','peerKey']);assert.equal(value.expectedRevision,4);assert.equal(value.peerKey,peerKey);assert.match(value.actor,/^[a-f0-9]{64}$/);}
}));

test('stale_revision_returns_409 sin repetir ni filtrar error privado',async()=>fixture(async()=>{
  let calls=0;const f=await setup(waFixture({resumePeer:async()=>{calls++;throw Object.assign(Error('SQL PRIVATE_SECRET'),{status:409,code:'work_conflict'});}}));const response=await f.send(`/peers/${peerKey}/action`,{action:'resume',revision:3});assert.equal(response.status,409);assert.equal((await response.json()).error.code,'work_conflict');assert.equal(calls,1);
}));

test('api_cannot_choose_recipient rechaza claves extra, arrays, revisiones y acciones inválidas',async()=>fixture(async()=>{
  const f=await setup();for(const body of [{action:'resume',revision:4,to:'+573000000001'},{action:'resume',revision:4,text:'enviar'},{action:'resume',revision:4,providerId:'override'},{action:'send',revision:4},{action:'resume',revision:-1},{action:'resume',revision:'4'},{action:'resume',revision:1.2},[],null,{}])assert.equal((await f.send(`/peers/${peerKey}/action`,body)).status,400);
  for(const body of [{providerId:'override'},{to:'+573000000001'},{outboxId},[]])assert.equal((await f.send(`/outbox/${outboxId}/reconcile`,body)).status,400);
  assert.deepEqual(f.store.calls,[]);
}));

test('límites JSON, query, codificación, método y rutas fallan antes del store',async()=>fixture(async()=>{
  const f=await setup();const actionPath=`/peers/${peerKey}/action`;
  for(const [body,headers,status] of [['{',{},400],['x'.repeat(257),{},413],[{}, {'Content-Encoding':'gzip'},400],[{}, {'Content-Type':'text/plain'},400],[{}, {'Content-Length':'999'},413]])assert.equal((await f.send(actionPath,body,{headers})).status,status);
  assert.equal((await f.send('/pilot?enabled=true',{enabled:true,revision:2})).status,400);assert.equal((await f.get('/peers?phone=anything')).status,400);assert.equal((await f.get('/outbox/arbitrary/reconcile')).status,405);assert.equal((await f.get('/unknown')).status,404);
  assert.equal((await f.send(`/peers/${peerKey}/action`,{}, {method:'DELETE'})).status,405);assert.deepEqual(f.store.calls,[]);
}));

test('Activar piloto exige flag Pages explícita; apagar permanece disponible sin ella',async()=>fixture(async()=>{
  const off=await setup();assert.equal((await off.send('/pilot',{enabled:true,revision:2})).status,503);assert.deepEqual(off.store.calls,[]);assert.equal((await off.send('/pilot',{enabled:false,revision:2})).status,200);
  const f=await setup(waFixture(),{...env(),SARIN_WHATSAPP_REPLIES_ENABLED:'true'});assert.equal((await f.send('/pilot',{enabled:true,revision:2})).status,200);const [[name,value]]=f.store.calls;assert.equal(name,'mode');assert.equal(value.enabled,true);assert.equal(value.expectedRevision,2);assert.doesNotMatch(JSON.stringify(value),/consent|replay|quota/);
}));

test('cierres de restauración sólo se proyectan; no modifican cupos ni permiten abrirlos',async()=>fixture(async()=>{
  const f=await setup(waFixture({getSendClosure:async()=>({closed:true,closures:[{scope:'day',period_key:'2026-10-18',period_end_at:at+3600000},{scope:'month',period_key:'2026-10',period_end_at:at+7200000}]})}));const response=await f.get('/peers');assert.equal(response.status,200);assert.equal((await response.json()).pilot.recoveryBlockedUntil,at+7200000);
  assert.equal((await f.send('/pilot',{enabled:false,revision:2,resetQuota:true})).status,400);
}));

test('reconcile sólo solicita ID existente, retorna202 y no consulta proveedor',async()=>fixture(async fetched=>{
  const f=await setup();const response=await f.send(`/outbox/${outboxId}/reconcile`,{});assert.equal(response.status,202);assert.deepEqual(await response.json(),{status:'pending',attempts:1,nextAt:at+60000});const [[name,value]]=f.store.calls;assert.equal(name,'reconcile');assert.equal(value.outboxId,outboxId);assert.deepEqual(Object.keys(value).sort(),['actor','outboxId']);assert.ok(fetched.every(url=>url===JWKS_URL||url===LOOKUP_URL));
  f.store.requestReconciliation=async()=>{throw Object.assign(Error('private provider text'),{status:409,code:'work_denied'});};assert.equal((await f.send(`/outbox/${outboxId}/reconcile`,{})).status,409);
}));

test('ausente y fallo inesperado devuelven errores acotados sin SQL ni secretos',async()=>fixture(async()=>{
  const f=await setup(waFixture({getPeer:async()=>null}));assert.equal((await f.get(`/peers/${peerKey}`)).status,404);
  f.store.getPeer=async()=>{throw Error('SQL PRIVATE_SECRET');};const response=await f.get(`/peers/${peerKey}`);assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/SQL|PRIVATE_SECRET/);
}));
