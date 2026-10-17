import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const conversationId = '00000000-0000-4000-8000-000000000001';
const requestId = '00000000-0000-4000-8000-000000000002';
const lead = {firstName:'María José',lastName:"O'Neill Pérez",email:'maria.contacto@example.test'};
const load = async name => import(`../../scripts/modules/${name}.js`).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
let server, browser, origin;
before(async () => {
  server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const bytes = await readFile(file);
      res.setHeader('Content-Type', ({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
      res.end(bytes);
    } catch { res.writeHead(404).end(); }
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({headless:true});
  await mkdir(path.join(root, 'test-results/sarin'), { recursive:true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

test('resumen permite corregir 1800 caracteres y rechaza exceso sin truncarlo', async () => {
  const subject = await load('sarin-summary');
  assert.equal(typeof subject?.whatsappUrl, 'function', 'Falta resumen revisable');
  assert.equal(new URL(subject.whatsappUrl('á'.repeat(1800))).searchParams.get('text').length, 1800);
  assert.throws(() => subject.whatsappUrl('a'.repeat(1801)), /1800/);
  assert.equal(new URL(subject.whatsappUrl('')).pathname, '/573146432135');
  assert.match(subject.createSummary({messages:[{role:'user',content:'Una tienda de café'}],brief:{},service:'store'}), /Una tienda de café/);
});

test('transporte rechaza HTML, URL ajena, campos extra y bytes excesivos antes del envío', async () => {
  const subject = await load('sarin-api');
  assert.equal(typeof subject?.validateResponse, 'function', 'Falta validación del transporte');
  const good = {reply:'¿Qué necesitas?',examples:[],brief:{}};
  assert.equal(subject.validateResponse(good).reply, good.reply);
  for (const value of [{...good,reply:'<img src=x>'},{...good,extra:true},{...good,examples:[{id:'vigia',title:'Vigia',url:'https://evil.test/',description:'Demo'}]}, {...good,examples:[{id:'desconocido',title:'Vigia',url:'https://vigiaapp.pages.dev/demo/',description:'Demo'}]}]) {
    assert.throws(() => subject.validateResponse(value));
  }
  let calls = 0;
  await assert.rejects(subject.requestSarin('a'.repeat(1201), requestId, {fetchImpl:async () => { calls++; }}));
  await assert.rejects(subject.requestSarin('Hola', [], {fetchImpl:async () => {calls++;}}));
  assert.equal(subject.validateResponse({...good,conversationId,requestId,turn:1,expiresAt:Date.now()+1000}).turn,1);
  assert.throws(()=>subject.validateResponse({...good,turn:16}));
  assert.equal(calls,0);
});

test('transporte ofrece contacto con JSON roto o timeout, sin reintentos y con destino fijo', async () => {
  const api = await load('sarin-api');
  assert.equal(typeof api?.requestSarin,'function');
  await assert.rejects(api.requestSarin('Hola',requestId,{fetchImpl:async()=>new Response('{roto',{headers:{'content-type':'application/json'}})}),/Andrés/);
  let attempts=0;
  await assert.rejects(api.requestSarin('Hola',requestId,{timeoutMs:10,fetchImpl:async (url, options)=>{
    attempts++;
    assert.equal(url,'/api/sarin');
    assert.deepEqual(JSON.parse(options.body),{message:'Hola',requestId});
    assert.equal(options.credentials,'same-origin');
    return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelado','AbortError')),{once:true}));
  }}),/tardó demasiado/);
  assert.equal(attempts,1);
  for (const [status, pattern] of [[409,/curso|ocupad/],[410,/venci|caduc/]]) await assert.rejects(api.requestSarin('Hola',requestId,{fetchImpl:async()=>new Response('{}',{status})}),pattern);
});

test('sesión solo registra autorización cerrada y usa cookie técnica sin exponerla',async()=>{
  const api=await load('sarin-api');
  const consent=await load('sarin-consent');
  assert.equal(typeof api.createSarinSession,'function');
  const value=await api.createSarinSession({lead,fetchImpl:async(url,options)=>{
    assert.equal(url,'/api/sarin/session');
    assert.deepEqual(JSON.parse(options.body),{consent:{accepted:true,noticeVersion:consent.NOTICE_VERSION,privacyVersion:consent.PRIVACY_VERSION,termsVersion:consent.TERMS_VERSION},lead});
    assert.equal(options.credentials,'same-origin');
    return Response.json({conversationId,sessionExpiresAt:Date.now()+86400000});
  }});
  assert.equal(value.conversationId,conversationId);
});

test('lead inválido no provoca fetch ni bootstrap privado',async()=>{
  const api=await load('sarin-api');let calls=0;
  for(const privateTest of [false,true])for(const invalid of [undefined,{...lead,firstName:'   '},{...lead,lastName:''},{...lead,email:'sin-correo'},{...lead,firstName:'a'.repeat(81)}]){
    await assert.rejects(api.createSarinSession({lead:invalid,privateTest,fetchImpl:async()=>{calls++;return Response.json({conversationId,sessionExpiresAt:Date.now()+86400000});}}));
  }
  assert.equal(calls,0);
});

test('prueba privada renueva CSRF y usa solo destinos administrativos sin historial del navegador',async()=>{
  const api=await load('sarin-api');
  const calls=[];let bootstraps=0;
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    if(url==='/api/control-sarin/bootstrap')return Response.json({csrfToken:`synthetic-private-token-${++bootstraps}`,adminEmail:'owner@example.test',purge:{},privateTestEnabled:true});
    if(url==='/api/control-sarin/test/session')return Response.json({conversationId,sessionExpiresAt:Date.now()+86400000});
    if(url==='/api/control-sarin/test/message')return Response.json({reply:'Una landing de prueba.',examples:[],brief:{},conversationId,requestId,turn:1});
    throw new Error(`Destino inesperado: ${url}`);
  };
  const session=await api.createSarinSession({lead,privateTest:true,fetchImpl});
  assert.equal(session.conversationId,conversationId);
  const result=await api.requestSarin('Una landing de prueba',requestId,{privateTest:true,fetchImpl});
  assert.match(result.reply,/landing/);
  assert.deepEqual(calls.map(call=>call.url),['/api/control-sarin/bootstrap','/api/control-sarin/test/session','/api/control-sarin/bootstrap','/api/control-sarin/test/message']);
  for(const call of calls){assert.equal(call.options.credentials,'same-origin');assert.equal(call.options.cache,'no-store');assert.equal(call.options.redirect,'error');}
  assert.equal(calls[1].options.headers['X-Sarin-CSRF'],'synthetic-private-token-1');
  assert.deepEqual(JSON.parse(calls[1].options.body).lead,lead);
  assert.equal(calls[3].options.headers['X-Sarin-CSRF'],'synthetic-private-token-2');
  assert.deepEqual(JSON.parse(calls[3].options.body),{message:'Una landing de prueba',requestId});
});

test('prueba privada falla cerrada ante acceso inválido, flag falso y bootstrap malformado',async()=>{
  const api=await load('sarin-api');
  for(const response of [Response.json({privateTestEnabled:false,csrfToken:'synthetic-private-token',adminEmail:'owner@example.test'}),Response.json({privateTestEnabled:'true',csrfToken:'synthetic-private-token',adminEmail:'owner@example.test'}),Response.json({privateTestEnabled:true,csrfToken:'x',adminEmail:'owner@example.test'}),Response.json({}, {status:401}),new Response('<html>Login</html>',{headers:{'content-type':'text/html'}})]){
    const calls=[];
    await assert.rejects(api.createSarinSession({lead,privateTest:true,fetchImpl:async(url)=>{calls.push(url);return response;}}));
    assert.deepEqual(calls,['/api/control-sarin/bootstrap']);
  }
});

test('timeout privado cancela también bootstrap y nunca inicia un POST',async()=>{
  const api=await load('sarin-api');const calls=[];
  await assert.rejects(api.requestSarin('Prueba ficticia',requestId,{privateTest:true,timeoutMs:10,fetchImpl:async(url,options)=>{
    calls.push(url);
    return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelado','AbortError')),{once:true}));
  }}),/tardó demasiado/);
  assert.deepEqual(calls,['/api/control-sarin/bootstrap']);
});

test('403 privado explica acceso administrativo sin confundirlo con bloqueo del visitante',async()=>{
  const api=await load('sarin-api');
  for(const failBootstrap of [true,false]){
    await assert.rejects(api.createSarinSession({lead,privateTest:true,fetchImpl:async url=>{
      if(!failBootstrap && url.endsWith('/bootstrap'))return Response.json({privateTestEnabled:true,csrfToken:'synthetic-private-token',adminEmail:'owner@example.test',purge:{}});
      return Response.json({error:{code:'forbidden'}},{status:403});
    }}),error=>error.status===403 && /acceso.*prueba privada.*administración/i.test(error.message));
  }
  await assert.rejects(api.checkSarinPrivateTest({fetchImpl:async()=>Response.json({},{status:403})}),/acceso.*prueba privada.*administración/i);
  await assert.rejects(api.createSarinSession({lead,fetchImpl:async()=>Response.json({},{status:403})}),/bloqueada temporalmente/);
});

async function pageFor({enableChat = true, ...options} = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const apiRequests = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  page.setDefaultTimeout(2000);
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  if (enableChat) await page.route(origin + '/', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const html = await readFile(path.join(root, 'index.html'), 'utf8');
    await route.fulfill({contentType:'text/html; charset=utf-8',body:html.replace('data-sarin-enabled="false"','data-sarin-enabled="true"')});
  });
  await page.goto(origin);
  return {page,context,apiRequests};
}
async function dismiss(page) { await page.locator('[data-analytics-choice="denied"]').click(); }
async function open(page) { await dismiss(page); await page.locator('#sarin-launcher').click(); }
async function fillLead(page,value=lead){
  await page.locator('#sarin-first-name').fill(value.firstName);
  await page.locator('#sarin-last-name').fill(value.lastName);
  await page.locator('#sarin-email').fill(value.email);
}
async function authorize(page) {
  await page.route('**/api/sarin/session',route=>route.fulfill({json:{conversationId,sessionExpiresAt:Date.now()+86400000}}));
  await fillLead(page);
  await page.locator('#sarin-consent-checkbox').check();
  await page.locator('[data-sarin-authorize]').click();
  await page.waitForFunction(()=>!document.querySelector('#sarin-message').readOnly);
}

test('datos de contacto obligatorios muestran el primer error y no crean sesión antes de autorizar',async t=>{
  const {page,context,apiRequests}=await pageFor();t.after(()=>context.close());await open(page);
  assert.equal(await page.locator('#sarin-consent input[required]').count(),3);
  assert.equal(await page.locator('#sarin-first-name').getAttribute('autocomplete'),'given-name');
  assert.equal(await page.locator('#sarin-last-name').getAttribute('autocomplete'),'family-name');
  assert.equal(await page.locator('#sarin-email').getAttribute('autocomplete'),'email');
  await page.locator('#sarin-consent-checkbox').check();
  await page.locator('[data-sarin-authorize]').click();
  assert.equal(await page.locator('#sarin-first-name').evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('#sarin-first-name').getAttribute('aria-invalid'),'true');
  assert.match(await page.locator('#sarin-first-name-error').textContent(),/nombre/i);
  await fillLead(page,{...lead,email:'correo-invalido'});await page.locator('[data-sarin-authorize]').click();
  assert.equal(await page.locator('#sarin-email').evaluate(el=>el===document.activeElement),true);
  assert.match(await page.locator('#sarin-email-error').textContent(),/correo/i);
  await fillLead(page);await page.locator('#sarin-consent-checkbox').uncheck();
  await page.locator('#sarin-consent').dispatchEvent('submit');
  assert.deepEqual(apiRequests,[]);
  await page.locator('#sarin-email').blur();await page.locator('#sarin-first-name').focus();
  assert.deepEqual(apiRequests,[],'Escribir, salir del campo y marcar no deben enviar datos');
  await page.locator('[data-sarin-close]').click();await page.locator('#sarin-launcher').click();
  assert.equal(await page.locator('#sarin-first-name').inputValue(),lead.firstName,'Cerrar conserva el borrador sólo en esta vista');
});

test('contacto declarado se envía sólo al crear sesión, sin IA ni persistencia y Nueva exige otro formulario',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const sessions=[],messages=[];
  await page.route('**/api/sarin/session',route=>{sessions.push(route.request().postDataJSON());return route.fulfill({json:{conversationId,sessionExpiresAt:Date.now()+86400000}});});
  await page.route('**/api/sarin',route=>{messages.push(route.request().postDataJSON());return route.fulfill({json:{reply:'Hablemos de tu tienda.',examples:[],brief:{}}});});
  await open(page);await fillLead(page);await page.locator('#sarin-consent-checkbox').check();await page.locator('[data-sarin-authorize]').click();
  await page.waitForFunction(()=>!document.querySelector('#sarin-message').readOnly);
  assert.deepEqual(sessions[0].lead,lead);
  await page.locator('#sarin-message').fill('Quiero una tienda');await page.locator('#sarin-message').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#sarin-log').textContent.includes('Hablemos'));
  assert.deepEqual(Object.keys(messages[0]).sort(),['message','requestId']);
  assert.equal(JSON.stringify(messages).includes(lead.email),false);
  for(const value of Object.values(lead))assert.equal(await page.evaluate(item=>JSON.stringify({...localStorage,...sessionStorage}).includes(item),value),false);
  await page.locator('[data-sarin-reset]').click();
  assert.equal(sessions.length,1,'Nueva conversación no crea ninguna sesión');
  assert.equal(await page.locator('#sarin-first-name').inputValue(),'');
  assert.equal(await page.locator('#sarin-last-name').inputValue(),'');
  assert.equal(await page.locator('#sarin-email').inputValue(),'');
  assert.equal(await page.locator('#sarin-consent-checkbox').isChecked(),false);
  assert.match(await page.locator('#sarin-log').textContent(),/Quiero una tienda/);
  const second={firstName:'Lucía',lastName:'Gómez',email:'segunda.contacto@example.test'};
  await fillLead(page,second);await page.locator('#sarin-consent-checkbox').check();await page.locator('[data-sarin-authorize]').click();
  await page.waitForFunction(()=>!document.querySelector('#sarin-message').readOnly);
  assert.equal(sessions.length,2);assert.deepEqual(sessions[1].lead,second);
  assert.equal(await page.locator('#sarin-log').textContent(),'');assert.equal(messages.length,1);
  await page.reload();await page.locator('#sarin-launcher').click();
  assert.equal(sessions.length,2);assert.equal(await page.locator('#sarin-email').inputValue(),'');
  assert.equal(await page.locator('#sarin-consent-checkbox').isChecked(),false);
});

test('analítica aceptada y resumen manual no incorporan los datos de contacto',{timeout:10000},async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const telemetry=[];let markFinal;
  const vendor=await readFile(path.join(root,'test-results/cloudflare-beacon.min.js'),'utf8');
  await page.route('https://www.alsdevstudio.com/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/api/sarin/session')return route.fulfill({json:{conversationId,sessionExpiresAt:Date.now()+86400000}});
    const file=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
    if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
    try{
      const body=await readFile(file),type=({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)];
      return route.fulfill({contentType:type||'application/octet-stream',body:pathname==='/'?body.toString('utf8').replace('data-sarin-enabled="false"','data-sarin-enabled="true"'):body});
    }catch{return route.fulfill({status:404,body:''});}
  });
  await page.route('https://static.cloudflareinsights.com/beacon.min.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:vendor}));
  await page.route('**/cdn-cgi/rum*',route=>{
    if(route.request().postData()){telemetry.push(route.request().postData());markFinal?.();}
    return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
  });
  await page.goto('https://www.alsdevstudio.com/');
  const first=page.waitForResponse(response=>new URL(response.url()).pathname==='/cdn-cgi/rum'&&response.request().method()==='POST');
  await page.locator('[data-analytics-choice="accepted"]').click();await first;
  await page.locator('#sarin-launcher').click();await fillLead(page);await page.locator('#sarin-consent-checkbox').check();await page.locator('[data-sarin-authorize]').click();
  await page.waitForFunction(()=>!document.querySelector('#sarin-message').readOnly);
  await page.locator('[data-sarin-summary]').click();
  const summary=await page.locator('#sarin-summary-text').inputValue(),whatsapp=await page.locator('#sarin-whatsapp').getAttribute('href');
  const beforeFinal=telemetry.length,final=new Promise(resolve=>{markFinal=resolve;});
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await final;
  assert.ok(beforeFinal>=1 && telemetry.length>beforeFinal,'Se inspecciona también un envío posterior a completar el contacto');
  for(const value of Object.values(lead)){
    assert.equal(telemetry.join('\n').includes(value),false);
    assert.equal(summary.includes(value),false);assert.equal(decodeURIComponent(whatsapp).includes(value),false);
    assert.equal(await page.evaluate(item=>JSON.stringify({...localStorage,...sessionStorage}).includes(item),value),false);
  }
});

test('chat apagado por defecto mantiene contacto visible y no inicia API con clics programáticos', async t => {
  const {page,context,apiRequests} = await pageFor({enableChat:false});
  t.after(() => context.close());
  await dismiss(page);
  await page.evaluate(async () => { await import('/scripts/modules/sarin-chat.js'); });
  assert.equal(await page.locator('#sarin-launcher').isVisible(),false,'El chat público debe permanecer oculto hasta su activación explícita');
  assert.equal(await page.locator('#sarin-chat').isVisible(),false);
  await page.evaluate(() => {
    document.querySelector('#sarin-launcher').click();
    document.querySelector('[data-sarin-service]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const consent = document.querySelector('#sarin-consent-checkbox');
    consent.checked = true;consent.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('[data-sarin-authorize]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    document.querySelector('#sarin-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
  assert.equal(await page.locator('#sarin-chat').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#sarin-launcher').isVisible(),false);
  assert.deepEqual(apiRequests,[]);
  await page.locator('#whatsapp-link').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#whatsapp-link').isVisible(),true);
  assert.match(await page.locator('#whatsapp-link').getAttribute('href'),/^https:\/\/wa\.me\/573146432135/);
});

test('query privada exige bootstrap autorizado antes de mostrar y abrir chat, conserva consentimiento y rutas privadas',{timeout:7000},async t=>{
  const {page,context,apiRequests}=await pageFor({enableChat:false});t.after(()=>context.close());await dismiss(page);
  const requests=[];let release,markStarted;
  const started=new Promise(resolve=>{markStarted=resolve;});let bootstraps=0;
  await page.route('**/api/control-sarin/**',async route=>{
    const request=route.request(),pathname=new URL(request.url()).pathname;
    requests.push({pathname,method:request.method(),headers:request.headers(),body:request.postDataJSON()});
    if(pathname.endsWith('/bootstrap')){
      bootstraps++;if(bootstraps===1){markStarted();await new Promise(resolve=>{release=resolve;});}
      return route.fulfill({json:{privateTestEnabled:true,csrfToken:`synthetic-private-token-${bootstraps}`,adminEmail:'owner@example.test',purge:{}}});
    }
    if(pathname.endsWith('/test/session'))return route.fulfill({json:{conversationId,sessionExpiresAt:Date.now()+86400000}});
    return route.fulfill({json:{reply:'Podemos crear una landing para tu café ficticio.',examples:[],brief:{},conversationId,requestId:request.postDataJSON().requestId,turn:1}});
  });
  await page.goto(`${origin}/?sarin=prueba`);await started;
  assert.equal(await page.locator('#sarin-launcher').isVisible(),false);assert.equal(await page.locator('#sarin-chat').isVisible(),false);
  release();await page.locator('#sarin-chat').waitFor({state:'visible'});
  assert.equal(await page.locator('#sarin-launcher').getAttribute('data-sarin-enabled'),'false');
  assert.match(await page.locator('#sarin-chat').textContent(),/Prueba privada.*datos ficticios/s);
  assert.match(await page.locator('#sarin-chat').textContent(),/panel.*30 días|30 días.*panel/s);
  assert.equal(await page.locator('#sarin-consent-checkbox').isChecked(),false);
  assert.equal(requests.filter(request=>request.method==='POST').length,0);
  await fillLead(page);await page.locator('#sarin-consent-checkbox').check();await page.locator('[data-sarin-authorize]').click();
  await page.waitForFunction(()=>!document.querySelector('#sarin-message').readOnly);
  await page.locator('#sarin-message').fill('Una landing para un café ficticio');await page.locator('#sarin-message').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#sarin-log').textContent.includes('Podemos crear'));
  assert.deepEqual(requests.filter(request=>request.method==='POST').map(request=>request.pathname),['/api/control-sarin/test/session','/api/control-sarin/test/message']);
  assert.deepEqual(requests.find(request=>request.pathname.endsWith('/test/session')).body.lead,lead);
  assert.equal(requests.filter(request=>request.pathname.endsWith('/bootstrap')).length,3);
  assert.equal(requests.filter(request=>request.method==='POST').every(request=>request.headers['x-sarin-csrf']?.startsWith('synthetic-private-token-')),true);
  assert.equal(apiRequests.some(url=>new URL(url).pathname.startsWith('/api/sarin')),false);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('Una landing')),false);
});

test('query privada sin autorización o activación conserva widget oculto y ofrece acceso administrativo',async t=>{
  for(const status of [200,401,403,302]){
    const {page,context,apiRequests}=await pageFor({enableChat:false});t.after(()=>context.close());await dismiss(page);
    await page.route('**/api/control-sarin/bootstrap',route=>route.fulfill({status,headers:status===302?{location:'/control-sarin/'}:{},json:{privateTestEnabled:false,csrfToken:'synthetic-private-token',adminEmail:'owner@example.test',purge:{}}}));
    await page.goto(`${origin}/?sarin=prueba`);
    await page.locator('#sarin-private-access a[href="/control-sarin/"]').waitFor();
    assert.equal(await page.locator('#sarin-launcher').isVisible(),false);assert.equal(await page.locator('#sarin-chat').isVisible(),false);
    assert.equal(apiRequests.length,1);assert.match(apiRequests[0],/\/api\/control-sarin\/bootstrap$/);
    await context.close();
  }
});

test('acceso privado vencido al iniciar no crea conversación y permite volver a administración',async t=>{
  const {page,context}=await pageFor({enableChat:false});t.after(()=>context.close());await dismiss(page);let posts=0;
  await page.route('**/api/control-sarin/**',route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{privateTestEnabled:true,csrfToken:'synthetic-private-token',adminEmail:'owner@example.test',purge:{}}});
    posts++;return route.fulfill({status:401,json:{error:{code:'unauthorized'}}});
  });
  await page.goto(`${origin}/?sarin=prueba`);await page.locator('#sarin-chat').waitFor();
  await fillLead(page);await page.locator('#sarin-consent-checkbox').check();await page.locator('[data-sarin-authorize]').click();
  await page.locator('#sarin-status a[href="/control-sarin/"]').waitFor();
  assert.equal(posts,1);assert.equal(await page.locator('#sarin-message').evaluate(node=>node.readOnly),true);
  assert.equal(await page.locator('#sarin-log').textContent(),'');
});

test('autorización previa sin premarcar, sin POST por servicios ni analítica denegada', async()=>{
  const {page,context}=await pageFor();
  const requests=[];
  await page.route('**/api/sarin**',route=>{requests.push(route.request().url()); return route.fulfill({json:{conversationId,sessionExpiresAt:Date.now()+86400000}});});
  await open(page);
  assert.equal(await page.locator('#sarin-consent-checkbox').isChecked(),false);
  assert.equal(await page.locator('[data-sarin-authorize]').isDisabled(),true);
  assert.equal(await page.locator('#sarin-message').evaluate(el=>el.readOnly),true);
  assert.equal(await page.locator('[data-sarin-service]:disabled').count(),4);
  await page.locator('#sarin-form').dispatchEvent('submit');
  assert.equal(requests.length,0);
  assert.match(await page.locator('#sarin-consent').textContent(),/30 días/);
  const {NOTICE_TEXT}=await load('sarin-consent');
  const informed=await page.locator('#sarin-consent [data-sarin-notice]').allTextContents();
  assert.equal(informed.map(text=>text.replace(/\s+/g,' ').trim()).join(' '),NOTICE_TEXT,'La huella debe incluir todo el aviso, la identidad, la autorización y las alternativas');
  assert.equal(await page.locator('#sarin-consent-text a[href="privacidad.html#sarin"]').textContent(),'DeepSeek');
  assert.equal(await page.locator('.sarin-toolbar a[href="/control-sarin/"]').count(),0);
  assert.equal(await page.locator('footer a[href="/control-sarin/"]').textContent(),'Staff');
  await page.locator('[data-sarin-close]').focus();
  await page.keyboard.press('Tab');await page.keyboard.press('Tab');
  assert.equal(await page.locator('[data-sarin-reset]').evaluate(el=>el===document.activeElement),true);
  assert.match(await page.locator('label[for="sarin-consent-checkbox"]').textContent(),/Autorizo.*acepto los Términos de Sarin/s);
  await authorize(page);
  assert.equal(requests.length,0); // autorización usa el mock específico, nunca inferencia
  assert.match(await page.locator('#sarin-reference').textContent(),new RegExp(conversationId));
  assert.match(await page.locator('#sarin-retention').textContent(),/recargar|recarga/i);
  await context.close();
});

test('diálogo conserva foco, prioriza analítica y no conecta al abrir; cuatro servicios y resumen manual', async () => {
  const {page,context} = await pageFor();
  let requests = 0;
  await page.route('**/api/sarin', route => {requests++; return route.fulfill({json:{reply:'¿Qué vendes?',service:'store',examples:[],brief:{need:'Tienda'}}});});
  assert.equal(await page.locator('#sarin-launcher').count(), 1, 'Falta lanzador Sarin');
  await page.evaluate(() => document.querySelector('#sarin-launcher').click());
  assert.equal(await page.locator('#sarin-chat').evaluate(el => el.open), false);
  await open(page);
  assert.equal(requests,0);
  const closeSize = await page.locator('[data-sarin-close]').boundingBox();
  assert.ok(closeSize.width >= 44 && closeSize.height >= 44, 'Cerrar debe ofrecer al menos 44 × 44 px');
  assert.equal(await page.locator('[data-sarin-service]').count(),4);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#sarin-launcher').evaluate(el => el === document.activeElement),true);
  await page.locator('#sarin-launcher').click();
  await page.evaluate(() => document.querySelector('#analytics-preferences').showModal());
  await page.waitForTimeout(20);
  assert.equal(await page.locator('#sarin-chat').evaluate(el => el.open),false);
  await page.locator('[data-analytics-close]').click();
  await page.waitForTimeout(20);
  assert.equal(await page.locator('#sarin-chat').evaluate(el => el.open),true);
  await page.locator('[data-sarin-summary]').click();
  await page.locator('#sarin-summary-text').fill('Mi negocio');
  assert.equal(new URL(await page.locator('#sarin-whatsapp').getAttribute('href')).searchParams.get('text'),'Mi negocio');
  await page.locator('#sarin-summary-text').fill('x'.repeat(1801));
  assert.equal(await page.locator('#sarin-whatsapp').getAttribute('href'),null);
  await page.locator('#sarin-summary-text').fill('');
  assert.match(await page.locator('#sarin-whatsapp').getAttribute('href'),/573146432135/);
  assert.equal(requests,0);
  await context.close();
});

test('IME, envío único, espera, respuesta segura, reinicio y error con contacto', async () => {
  const {page,context} = await pageFor();
  let calls=0, bodies=[];
  await page.route('**/api/sarin', async route => {
    calls++; bodies.push(route.request().postDataJSON());
    await new Promise(resolve => setTimeout(resolve,150));
    await route.fulfill({json:{reply:'¿Qué vendes?',service:'store',examples:[],brief:{business:'Café'}}}).catch(()=>{});
  });
  await open(page);
  await authorize(page);
  const input = page.locator('#sarin-message');
  await input.fill('Café');
  await input.dispatchEvent('keydown',{key:'Enter',isComposing:true});
  assert.equal(calls,0);
  await input.press('Shift+Enter');
  assert.match(await input.inputValue(),/\n/);
  await input.press('Enter');
  await page.locator('#sarin-form').dispatchEvent('submit');
  await page.waitForTimeout(50);
  assert.equal(calls,1);
  assert.match(await page.locator('#sarin-status').textContent(),/pensando|preparando/i);
  await page.screenshot({path:path.join(root,'test-results/sarin/waiting.png')});
  await page.waitForTimeout(200);
  assert.match(await page.locator('#sarin-log').textContent(),/Qué vendes/);
  await page.screenshot({path:path.join(root,'test-results/sarin/conversation.png')});
  assert.deepEqual(Object.keys(bodies[0]).sort(),['message','requestId']);
  assert.match(bodies[0].requestId,/^[a-f0-9-]{36}$/i);
  await input.fill('otro'); await input.press('Enter');
  await page.locator('[data-sarin-reset]').click();
  await authorize(page);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#sarin-log').textContent(),'');
  await page.route('**/api/sarin', route => route.fulfill({status:503,json:{error:{code:'disabled',message:'No disponible'}}}));
  await input.fill('Hola'); await input.press('Enter');
  await page.waitForTimeout(100);
  assert.match(await page.locator('#sarin-status').textContent(),/contact|Andrés|conectado/i);
  await page.screenshot({path:path.join(root,'test-results/sarin/error.png')});
  assert.equal(await page.locator('#sarin-chat a[href^="https://wa.me/573146432135"]').count() >= 1,true);
  await context.close();
});

test('quince turnos como máximo, contexto solo servidor y ninguna persistencia de mensajes', async () => {
  const {page,context} = await pageFor();
  const payloads=[];
  await page.route('**/api/sarin', route => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({json:{reply:'¿Qué necesitas resolver?',examples:[],brief:{}}});
  });
  await open(page);
  await authorize(page);
  let popups=0; page.on('popup',popup=>{popups++; popup.close();});
  for (let i=0;i<15;i++) {
    await page.locator('#sarin-message').fill(`Mi negocio ${i}`);
    await page.locator('#sarin-form').evaluate(el=>el.requestSubmit());
    await page.waitForFunction(() => document.querySelector('#sarin-form').getAttribute('aria-busy') === 'false');
  }
  assert.equal(payloads.length,15);
  assert.deepEqual(Object.keys(payloads[5]).sort(),['message','requestId']);
  assert.equal(new Set(payloads.map(body=>body.requestId)).size,15);
  await page.locator('#sarin-form').evaluate(el=>el.requestSubmit());
  assert.equal(payloads.length,15);
  assert.match(await page.locator('#sarin-status').textContent(),/15/);
  assert.equal(await page.locator('#sarin-message').evaluate(el=>el.readOnly),true);
  await page.locator('[data-sarin-summary]').click();
  assert.equal(popups,0);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('Mi negocio')),false);
  await page.reload();
  await page.locator('#sarin-launcher').click();
  assert.equal(await page.locator('#sarin-log').textContent(),'');
  await context.close();
});

test('fallar al crear otra sesión conserva la vista y recargar no crea sesiones automáticamente',async()=>{
  const {page,context}=await pageFor();let sessions=0;
  await page.route('**/api/sarin',route=>route.fulfill({json:{reply:'Cuéntame sobre tu café.',examples:[],brief:{}}}));
  await open(page);await authorize(page);
  await page.locator('#sarin-message').fill('Una tienda de café de prueba');await page.locator('#sarin-message').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#sarin-log').textContent.includes('Cuéntame'));
  await page.locator('[data-sarin-summary]').click();
  assert.match(await page.locator('#sarin-summary-text').inputValue(),new RegExp(conversationId));
  await page.locator('[data-sarin-back]').click();
  await page.route('**/api/sarin/session',route=>{sessions++;return route.fulfill({status:503,json:{error:{code:'unavailable'}}});});
  await page.locator('[data-sarin-reset]').click();
  await fillLead(page);await page.locator('#sarin-consent-checkbox').check();await page.locator('[data-sarin-authorize]').click();
  await page.waitForFunction(()=>document.querySelector('#sarin-status').textContent.includes('conectado'));
  assert.equal(sessions,1);assert.match(await page.locator('#sarin-log').textContent(),/Una tienda de café de prueba/);
  await page.reload();await page.locator('#sarin-launcher').click();
  assert.equal(sessions,1);assert.equal(await page.locator('#sarin-log').textContent(),'');
  assert.equal(await page.locator('#sarin-consent-checkbox').isChecked(),false);
  await context.close();
});

test('320/390/680/900/1440, axe, movimiento reducido y contacto sin JavaScript', async () => {
  for (const width of [320,390,680,900,1440]) {
    const {page,context} = await pageFor({viewport:{width,height:width===320?568:900},reducedMotion:'reduce'});
    await open(page);
    const rect = await page.locator('#sarin-chat').boundingBox();
    assert.ok(rect.width <= width && rect.x >= 0);
    assert.equal(await page.locator('.sarin-toolbar').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'La barra no debe desbordar en móvil');
    for(const link of await page.locator('.sarin-toolbar a').all()){
      const target=await link.boundingBox();
      assert.ok(target.height>=44 && target.x>=rect.x && target.x+target.width<=rect.x+rect.width);
    }
    assert.equal(await page.locator('#sarin-message').isVisible(),false);
    assert.equal(await page.locator('#sarin-first-name').isVisible(),true);
    await page.locator('#sarin-consent-checkbox').check();await page.locator('[data-sarin-authorize]').click();
    const focused=await page.locator('#sarin-first-name').boundingBox();
    assert.ok(focused.y>=0 && focused.y+focused.height<=(width===320?568:900),'El campo inválido debe quedar visible');
    await page.addScriptTag({path:path.join(root,'test-results/axe.min.js')});
    const failures = await page.evaluate(async () => (await axe.run(document.querySelector('#sarin-chat'))).violations.map(v=>({id:v.id,impact:v.impact})));
    assert.deepEqual(failures,[]);
    await page.screenshot({path:path.join(root,`test-results/sarin/empty-${width}.png`)});
    await page.locator('[data-sarin-summary]').click();
    await page.screenshot({path:path.join(root,`test-results/sarin/summary-${width}.png`)});
    await context.close();
  }
  const {page,context} = await pageFor({javaScriptEnabled:false});
  assert.equal(await page.locator('noscript a[href^="https://wa.me/573146432135"]').count() >= 1,true);
  assert.equal(await page.locator('#sarin-launcher').isVisible(),false);
  await context.close();
});
