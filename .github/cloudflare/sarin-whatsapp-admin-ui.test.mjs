import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const id='00000000-0000-4000-8000-000000000001';
const now=Date.now();
const lead={firstName:'María José',lastName:"O'Neill Pérez",email:'maria.contacto@example.test'};
const summary={id,lead,createdAt:now-3600000,updatedAt:now,expiresAt:now+86400000,service:'store',turns:1,reviewedAt:null,blockedUntil:null,status:'completed',outOfScopeCount:2,errorCount:1,usage:{reservedMicros:1200,verifiedMicros:700,retainedMicros:500}};
const detail={...summary,messages:[{id:'m1',turn:1,role:'user',content:'<img src=x onerror="window.pwned=true"> Café de prueba',at:now-1000,status:'accepted'},{id:'m2',turn:1,role:'assistant',content:'Una tienda para tu café.',at:now,status:'completed'}],events:[{id:'e1',kind:'out_of_scope',at:now,count:2}],consent:{acceptedAt:now-3600000,noticeVersion:'sarin-history-2026-10-16-v1',privacyVersion:'2026-10-16-sarin-history-v1',termsVersion:'2026-10-16-sarin-history-v1',method:'checkbox_and_start'}};
let server,browser,origin;
before(async()=>{
  server=createServer(async(req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,`.${pathname.endsWith('/')?`${pathname}index.html`:pathname}`);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try {const bytes=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
  }).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true});
  await mkdir(path.join(root,'test-results/sarin-admin'),{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve));});
async function pageFor(options={},authOptions={}){
  const context=await browser.newContext(options),page=await context.newPage();
  page.setDefaultTimeout(2500);
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const authRequests=[];
  await page.route('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:'export const initializeApp=(options,name)=>({options,name});'}));
  await page.route('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js',route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:`
    let token='synthetic-firebase-id-token-initial',callback=()=>{};
    const user={getIdToken:async()=>token};
    let auth={currentUser:${authOptions.signedOut?'null':'user'},authStateReady:async()=>{}};
    export const browserSessionPersistence={type:'SESSION'},inMemoryPersistence={type:'NONE'},browserPopupRedirectResolver={};
    export const initializeAuth=(app,options)=>{if(options.persistence[0]!==browserSessionPersistence||options.persistence[1]!==inMemoryPersistence)throw Error('Persistence');return auth;};
    export const onIdTokenChanged=(value,cb)=>{callback=cb;queueMicrotask(()=>cb(value.currentUser));return()=>{};};
    export class GoogleAuthProvider{setCustomParameters(value){if(value.prompt!=='select_account')throw Error('Account selection');}}
    export const signInWithPopup=async()=>{${authOptions.popupError?"throw Object.assign(Error('private-sdk-error'),{code:'auth/popup-closed-by-user'});":"auth.currentUser=user;callback(user);return{user};"}};
    export const signOut=async()=>{auth.currentUser=null;callback(null);};
    export const refreshForTest=()=>{token='synthetic-firebase-id-token-refreshed';callback(user);};
  `}));
  await page.route('**/api/control-sarin/auth/**',route=>{
    const req=route.request(),name=new URL(req.url()).pathname.split('/').at(-1);
    authRequests.push({name,method:req.method(),body:req.postDataJSON()});
    return route.fulfill({json:name==='config'?{firebase:{apiKey:'synthetic-public-key',projectId:'alsdevstudio',authDomain:'alsdevstudio.firebaseapp.com'}}:{ok:true}});
  });
  return {page,context,authRequests};
}
const peerKey='peer-synthetic-1';
const peer={peerKey,maskedPhone:'+57 ••• ••• 0142',revision:7,paused:true,updatedAt:now,consent:{status:'pending',expiresAt:null}};
const waDetail={...peer,requiresFreshMessage:true,events:[{id:'input-1',kind:'message',role:'user',content:'<img src=x onerror="window.pwned=true"> Proyecto ficticio',at:now,expiresAt:now+24000},{id:'echo-1',kind:'echo',content:'CUERPO PRIVADO DEL ECO',at:now,expiresAt:now+24000}],outputs:[{id:'output-1',status:'send_uncertain',updatedAt:now,canReconcile:true,reconciliation:{status:'idle',attempts:0,nextAt:null}},{id:'output-2',status:'send_uncertain',updatedAt:now,canReconcile:false,reconciliation:{status:'exhausted',attempts:3,nextAt:null}}]};
async function mock(page,{conflict=false,delayDetail=false,failPoll=false,waitReady=true,initialEnabled=true,repliesEnabled=true,recoveryBlockedUntil=null}={}){
  const requests=[];let revision=7,paused=true,enabled=initialEnabled,pilotRevision=3;let release;
  await page.addInitScript(()=>{let visibility='visible';Object.defineProperty(document,'visibilityState',{get:()=>visibility});window.setTestVisibility=value=>{visibility=value;document.dispatchEvent(new Event('visibilitychange'));};});
  await page.route('**/api/control-sarin/**',async route=>{
    const req=route.request(),url=new URL(req.url());if(url.pathname.includes('/auth/'))return route.fallback();
    requests.push({url,method:req.method(),body:req.postDataJSON(),headers:req.headers()});
    const path=url.pathname.replace('/api/control-sarin/','');
    if(path==='bootstrap')return route.fulfill({json:{csrfToken:'synthetic-csrf-token',adminEmail:'operador@example.test',purge:{status:'ok',lastSuccessAt:now}}});
    if(path.startsWith('conversations'))return route.fulfill({json:path==='conversations'?{items:[],nextCursor:null}:detail});
    if(path==='whatsapp/peers' && req.method()==='GET'){
      if(failPoll && requests.filter(r=>r.url.pathname.endsWith('/whatsapp/peers')).length>2)return route.fulfill({status:503,json:{error:{code:'unavailable'}}});
      return route.fulfill({json:{pilot:{enabled,revision:pilotRevision,updatedAt:now,repliesEnabled,recoveryBlockedUntil},items:[{...peer,revision,paused}]}});
    }
    if(path===`whatsapp/peers/${peerKey}` && req.method()==='GET'){
      if(delayDetail)await new Promise(resolve=>{release=resolve;});
      return route.fulfill({json:{peer:{...waDetail,revision,paused}}}).catch(()=>{});
    }
    if(path===`whatsapp/peers/${peerKey}/action` && req.method()==='POST'){
      if(conflict){revision=8;paused=false;return route.fulfill({status:409,json:{error:{code:'stale_revision'}}});}
      revision++;paused=req.postDataJSON().action==='pause';return route.fulfill({json:{ok:true}});
    }
    if(path==='whatsapp/pilot' && req.method()==='POST'){enabled=req.postDataJSON().enabled;pilotRevision++;return route.fulfill({json:{ok:true}});}
    if(path==='whatsapp/outbox/output-1/reconcile' && req.method()==='POST')return route.fulfill({status:202,json:{status:'pending',attempts:0,nextAt:now+60000}});
    throw Error(`Ruta inesperada: ${req.method()} ${path}`);
  });
  await page.goto(`${origin}/control-sarin/`);if(waitReady)await page.locator('#admin-workspace').waitFor();
  return {requests,release:()=>release?.()};
}
const waRequests=requests=>requests.filter(r=>r.url.pathname.includes('/whatsapp/'));
const open=async page=>{await page.getByRole('button',{name:'WhatsApp',exact:true}).click();await page.locator('[data-wa-peer]').click();await page.locator('#wa-detail-title').waitFor();};

test('html_in_message_is_text y uncertain_has_no_resend_action; lista enmascarada, eco sin cuerpo y consultas acotadas',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const {requests}=await mock(page);
  assert.equal(waRequests(requests).length,0,'la sección web no consulta WhatsApp');await open(page);
  assert.match(await page.locator('#wa-list').innerText(),/•••/);assert.equal(await page.locator('#wa-detail img').count(),0);
  assert.match(await page.locator('#wa-detail').innerText(),/<img src=x/);assert.match(await page.locator('#wa-detail').innerText(),/Respuesta desde el celular/);
  assert.doesNotMatch(await page.locator('#wa-detail').innerText(),/CUERPO PRIVADO|Reenviar/);
  assert.match(await page.locator('#wa-detail').innerText(),/Aceptación pendiente/);
  assert.equal(await page.getByRole('button',{name:'Consultar estado',exact:true}).count(),1);
  await page.getByRole('button',{name:'Consultar estado',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wa-status').textContent.includes('Consulta pendiente'));
  const request=requests.find(r=>r.url.pathname.endsWith('/reconcile'));assert.deepEqual(request.body,{});assert.equal(request.headers['x-sarin-csrf'],'synthetic-csrf-token');
  assert.match(await page.locator('#wa-status').innerText(),/no envía/);
});

test('stale_revision_returns_409 refresca y no repite; resume usa revisión y exige mensaje nuevo',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const {requests}=await mock(page,{conflict:true});await open(page);
  await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wa-status').textContent.includes('otra operación'));
  const posts=waRequests(requests).filter(r=>r.method==='POST');assert.equal(posts.length,1);assert.deepEqual(posts[0].body,{action:'resume',revision:7});
  assert.equal(await page.getByRole('button',{name:'Pausar Sarin',exact:true}).count(),1);
});

test('acciones envían únicamente revisión/acción o piloto; resume_requires_fresh_message visible',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const {requests}=await mock(page);await open(page);
  await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wa-status').textContent.includes('mensaje nuevo'));
  assert.match(await page.locator('#wa-detail').innerText(),/mensaje nuevo/);
  await page.getByRole('button',{name:'Pausar Sarin',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wa-status').textContent.includes('Sarin pausado'));
  await page.getByRole('button',{name:'Apagar piloto',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wa-pilot').textContent.includes('Piloto apagado'));
  assert.deepEqual(waRequests(requests).filter(r=>r.method==='POST').map(r=>r.body),[{action:'resume',revision:7},{action:'pause',revision:8},{enabled:false,revision:3}]);
});

test('hidden_tab_stops_polling a 5000ms; sección, sesión y respuesta tardía se invalidan',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());await page.clock.install();const {requests}=await mock(page);await open(page);
  const count=()=>waRequests(requests).filter(r=>r.method==='GET').length;const initial=count();
  await page.clock.runFor(4999);assert.equal(count(),initial);await page.clock.runFor(1);await page.waitForTimeout(50);assert.equal(count(),initial+2);
  await page.evaluate(()=>window.setTestVisibility('hidden'));const hidden=count();await page.clock.runFor(15000);assert.equal(count(),hidden);
  await page.evaluate(()=>window.setTestVisibility('visible'));await page.waitForTimeout(50);assert.equal(count(),hidden+2);
  await page.getByRole('button',{name:'Conversaciones web',exact:true}).click();const web=count();await page.clock.runFor(15000);assert.equal(count(),web);
  await page.getByRole('button',{name:'WhatsApp',exact:true}).click();await page.waitForTimeout(50);await page.locator('#admin-logout').click();await page.locator('#admin-login').waitFor();const logout=count();await page.clock.runFor(15000);assert.equal(count(),logout);assert.equal(await page.locator('#wa-list').innerText(),'');assert.equal(await page.locator('#wa-detail').innerText(),'');
});

test('respuesta demorada no repuebla el panel después de salir',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const control=await mock(page,{delayDetail:true});await page.getByRole('button',{name:'WhatsApp',exact:true}).click();await page.locator('[data-wa-peer]').click();
  await page.getByRole('button',{name:'Conversaciones web',exact:true}).click();control.release();await page.waitForTimeout(100);assert.equal(await page.locator('#wa-detail-title').count(),0);
});

test('contenido vencido se retira aun si falla polling',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());await page.clock.install();await mock(page,{failPoll:true});await open(page);
  await page.clock.runFor(25000);assert.equal(await page.locator('#wa-detail .admin-message-content').count(),0);
});

test('escritorio, móvil, reflujo y teclado mantienen foco y controles visibles sin desborde',async t=>{
  for(const viewport of [{width:1440,height:900},{width:1280,height:900},{width:900,height:900},{width:768,height:900},{width:680,height:900},{width:320,height:900},{width:720,height:450}]){
    const {page,context}=await pageFor({viewport,reducedMotion:'reduce'});t.after(()=>context.close());await mock(page);await open(page);
    assert.equal(await page.locator('#wa-detail-title').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(root,`test-results/sarin-admin/whatsapp-overview-${viewport.width}.png`),fullPage:true});
    await page.waitForFunction(()=>!document.querySelector('[data-wa-focus="peer"]').disabled);
    await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).focus();assert.equal(await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).evaluate(el=>el===document.activeElement),true,`foco a ${viewport.width}px`);
    await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'Consultar estado',exact:true}).evaluate(el=>el===document.activeElement),true);
    for(const button of await page.locator('#wa-panel button:visible').all())assert.ok((await button.boundingBox()).height>=44);
    if([1440,320].includes(viewport.width)){
      await page.addScriptTag({path:path.join(root,'test-results/axe.min.js')});
      const failures=await page.evaluate(async()=>(await axe.run(document.querySelector('#wa-panel'))).violations.map(value=>({id:value.id,impact:value.impact})));
      assert.deepEqual(failures,[],`accesibilidad a ${viewport.width}px`);
    }
    await page.screenshot({path:path.join(root,`test-results/sarin-admin/whatsapp-${viewport.width}.png`),fullPage:true});await context.close();
  }
});

test('mutación interrumpida no se reenvía y una respuesta tardía no repuebla datos tras logout',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const {requests}=await mock(page);await open(page);
  let release,posts=0;await page.route(`**/api/control-sarin/whatsapp/peers/${peerKey}/action`,async route=>{posts++;await new Promise(resolve=>{release=resolve;});return route.fulfill({json:{ok:true}}).catch(()=>{});});
  await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wa-status').textContent.includes('Aplicando'));
  await page.evaluate(()=>window.setTestVisibility('hidden'));await page.evaluate(()=>window.setTestVisibility('visible'));release?.();await page.waitForTimeout(100);assert.equal(posts,1);
  assert.match(await page.locator('#wa-status').innerText(),/No pudimos confirmar/);
  let releaseDetail;await page.route(`**/api/control-sarin/whatsapp/peers/${peerKey}`,async route=>{await new Promise(resolve=>{releaseDetail=resolve;});return route.fulfill({json:{peer:waDetail}}).catch(()=>{});});
  await page.evaluate(()=>window.setTestVisibility('hidden'));await page.evaluate(()=>window.setTestVisibility('visible'));await page.waitForTimeout(50);await page.locator('#admin-logout').click();await page.locator('#admin-login').waitFor();releaseDetail?.();await page.waitForTimeout(100);
  assert.equal(await page.locator('#wa-detail').innerText(),'');assert.equal(await page.locator('#wa-list').innerText(),'');assert.equal(posts,1);assert.ok(waRequests(requests).length>0);
});

test('aceptado y enviado no prometen entrega; consulta pendiente o agotada no permite reiniciarla',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());await mock(page);
  await page.route(`**/api/control-sarin/whatsapp/peers/${peerKey}`,route=>route.fulfill({json:{peer:{...waDetail,consent:{status:'pending_delivery'},outputs:[{id:'output-a',status:'accepted',updatedAt:now,canReconcile:true,reconciliation:{status:'pending',attempts:1,nextAt:now+60000}},{id:'output-b',status:'sent',updatedAt:now,canReconcile:true,reconciliation:{status:'exhausted',attempts:3,nextAt:null}},{id:'output-c',status:'inference_uncertain',updatedAt:now,canReconcile:false,reconciliation:{status:'idle',attempts:0,nextAt:null}}]}}}));
  await open(page);assert.match(await page.locator('#wa-detail').innerText(),/entrega pendiente/);assert.match(await page.locator('#wa-detail').innerText(),/entrega sin confirmar/);assert.match(await page.locator('#wa-detail').innerText(),/Esperando confirmar la entrega del aviso/);
  assert.equal(await page.getByRole('button',{name:'Consultar estado',exact:true}).count(),0);assert.doesNotMatch(await page.locator('#wa-detail').innerText(),/Reenviar/);
});

test('anonymous_cannot_read_whatsapp: sin bootstrap autorizado no hay solicitudes ni controles privados',async t=>{
  const {page,context}=await pageFor({},{signedOut:true});t.after(()=>context.close());const {requests}=await mock(page,{waitReady:false});await page.locator('#admin-google-login').waitFor();
  assert.equal(waRequests(requests).length,0);assert.equal(await page.locator('#wa-panel').isVisible(),false);
});

test('polling no solapa lecturas lentas ni mueve foco del control; el detalle permite scroll por teclado',async t=>{
  const {page,context}=await pageFor({viewport:{width:1440,height:900}});t.after(()=>context.close());await page.clock.install();const {requests}=await mock(page);await open(page);
  await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).focus();await page.clock.runFor(5000);await page.waitForTimeout(100);
  assert.equal(await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('#wa-detail').getAttribute('tabindex'),'0');await page.locator('#wa-detail').focus();await page.keyboard.press('End');await page.clock.runFor(300);await page.waitForFunction(()=>document.querySelector('#wa-detail').scrollTop>0);
  let release,slowReads=0;await page.route('**/api/control-sarin/whatsapp/peers',async route=>{slowReads++;await new Promise(resolve=>{release=resolve;});return route.fulfill({json:{pilot:{enabled:true,revision:3,updatedAt:now},items:[peer]}}).catch(()=>{});});
  await page.clock.runFor(5000);await page.waitForTimeout(50);const before=waRequests(requests).length;await page.clock.runFor(10000);assert.equal(waRequests(requests).length,before);assert.equal(slowReads,1);release?.();
});

test('aceptación vence en pantalla aunque no haya otra respuesta del servidor',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());await page.clock.install();await mock(page);
  const expiresAt=await page.evaluate(()=>Date.now()+3000);
  await page.route(`**/api/control-sarin/whatsapp/peers/${peerKey}`,route=>route.fulfill({json:{peer:{...waDetail,consent:{status:'accepted',expiresAt}}}}));
  await open(page);assert.match(await page.locator('#wa-detail').innerText(),/Aceptación vigente/);await page.clock.runFor(3001);assert.doesNotMatch(await page.locator('#wa-detail').innerText(),/Aceptación vigente/);assert.match(await page.locator('#wa-detail').innerText(),/Aceptación vencida/);
});

test('409 con recarga fallida no afirma actualización ni habilita otra mutación con estado viejo',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const {requests}=await mock(page,{conflict:true});await open(page);
  await page.route('**/api/control-sarin/whatsapp/peers',route=>route.fulfill({status:503,json:{error:{code:'unavailable'}}}));
  await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wa-status').textContent.includes('otra operación'));
  assert.doesNotMatch(await page.locator('#wa-status').innerText(),/Actualizamos/);assert.match(await page.locator('#wa-status').innerText(),/estado actual/);
  assert.equal(await page.getByRole('button',{name:'Reactivar Sarin',exact:true}).isDisabled(),true);assert.equal(waRequests(requests).filter(r=>r.method==='POST').length,1);
});

test('Activar piloto usa revisión y no afirma disponibilidad; cierres de restauración permanecen visibles',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const {requests}=await mock(page,{initialEnabled:false,recoveryBlockedUntil:now+86400000});
  await page.getByRole('button',{name:'WhatsApp',exact:true}).click();await page.getByRole('button',{name:'Activar piloto',exact:true}).click();await page.getByRole('button',{name:'Apagar piloto',exact:true}).waitFor();
  assert.deepEqual(waRequests(requests).filter(r=>r.method==='POST').map(r=>r.body),[{enabled:true,revision:3}]);assert.match(await page.locator('#wa-pilot').innerText(),/Envíos bloqueados tras restaurar datos/);assert.match(await page.locator('#wa-pilot').innerText(),/no garantiza/);
  assert.equal(await page.getByRole('button',{name:/restablecer|devolver cupos|abrir cierre/i}).count(),0);
});

test('Activar piloto permanece deshabilitado sin permiso del entorno; no emite POST',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());const {requests}=await mock(page,{initialEnabled:false,repliesEnabled:false});await page.getByRole('button',{name:'WhatsApp',exact:true}).click();
  await page.getByRole('button',{name:'Activar piloto',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Activar piloto',exact:true}).isDisabled(),true);assert.match(await page.locator('#wa-pilot').innerText(),/Respuestas deshabilitadas/);assert.equal(waRequests(requests).filter(r=>r.method==='POST').length,0);
});
