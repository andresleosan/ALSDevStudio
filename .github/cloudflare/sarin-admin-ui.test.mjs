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
async function mock(page,{items=[summary],purge={lastRunAt:now,lastSuccessAt:now,lastErrorAt:null,status:'ok',remaining:false},status=200,privateTestEnabled=false}={}){
  const requests=[];
  await page.route('**/api/control-sarin/**',async route=>{
    if(new URL(route.request().url()).pathname.includes('/auth/'))return route.fallback();
    const req=route.request(),url=new URL(req.url());requests.push({url,method:req.method(),body:req.postDataJSON(),headers:req.headers()});
    if(status!==200)return route.fulfill({status,json:{error:{code:'forbidden'}}});
    if(url.pathname.endsWith('/bootstrap'))return route.fulfill({json:{csrfToken:'synthetic-csrf-token',adminEmail:'operador@example.test',purge,privateTestEnabled}});
    if(req.method()==='POST')return route.fulfill({json:{ok:true}});
    return route.fulfill({json:url.pathname.endsWith('/conversations')?{items,nextCursor:null}:detail});
  });
  await page.goto(`${origin}/control-sarin/`);
  return requests;
}

test('el acceso agrupa título, estado y Google en un bloque compacto centrado',async t=>{
  for(const width of [1440,900,320]){
    const {page,context}=await pageFor({viewport:{width,height:900},reducedMotion:'reduce'},{signedOut:true});t.after(()=>context.close());
    const requests=await mock(page);await page.locator('#admin-google-login').waitFor();
    const login=await page.locator('#admin-login').boundingBox();
    assert.ok(Math.abs(login.x+login.width/2-width/2)<=2,`acceso centrado a ${width}px`);
    const panel=page.locator('.admin-access'),bounds=await panel.boundingBox();
    assert.ok(bounds.width<=560 && bounds.width>=Math.min(480,width-32),`ancho compacto a ${width}px`);
    for(const selector of ['h1','#admin-status','#admin-google-login']){
      const box=await panel.locator(selector).boundingBox();
      assert.ok(box.x>=bounds.x && box.x+box.width<=bounds.x+bounds.width && box.y>=bounds.y && box.y+box.height<=bounds.y+bounds.height,`${selector} dentro del acceso`);
    }
    assert.equal(await page.locator('#admin-purge').isVisible(),false);
    assert.equal(requests.length,0,'sin historial antes de autenticar');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(root,`test-results/sarin-admin/access-centered-${width}.png`),fullPage:true});
    await context.close();
  }
});

test('la bandeja distribuye lista, mensajes y contexto sin adelantar los datos a la lectura',async t=>{
  for(const width of [1440,1280,900,768,680,320]){
    const {page,context}=await pageFor({viewport:{width,height:900},reducedMotion:'reduce'});t.after(()=>context.close());
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const requests=await mock(page);await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
    const timeline=await page.locator('.admin-timeline').boundingBox(),contact=await page.locator('.admin-contact').boundingBox();
    if(width>=1280)assert.ok(contact.x>=timeline.x+timeline.width,`contexto lateral a ${width}px`);
    else assert.ok(contact.y>=timeline.y+timeline.height,`mensajes antes del contexto a ${width}px`);
    const list=await page.locator('.admin-conversations').boundingBox(),transcript=await page.locator('.admin-transcript').boundingBox();
    if(width>680)assert.ok(transcript.x>=list.x+list.width,`lista izquierda a ${width}px`);
    else{
      assert.ok(transcript.y>=list.y+list.height,`pila móvil a ${width}px`);
      const title=await page.locator('#admin-detail-title').boundingBox();assert.ok(title.y>=0 && title.y<900,'foco del detalle visible tras seleccionar');
    }
    assert.equal(await page.locator('#admin-detail-title').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#admin-count').textContent(),'1 cargadas');
    assert.equal(requests.filter(req=>req.url.pathname.endsWith('/conversations')).length,1,'un listado, sin precargas N+1');
    assert.equal(requests.filter(req=>req.url.pathname.endsWith('/'+id)).length,1,'un detalle al seleccionar');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    for(const control of await page.locator('button:visible,input:visible,select:visible').all())assert.ok((await control.boundingBox()).height>=44,'controles de al menos 44px');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(root,`test-results/sarin-admin/inbox-layout-${width}.png`),fullPage:true});
    await context.close();
  }
});

test('contexto y transcript largos permiten desplazamiento y acciones por teclado sin alargar el escritorio',async t=>{
  const {page,context}=await pageFor({viewport:{width:1440,height:900},reducedMotion:'reduce'});t.after(()=>context.close());
  await mock(page);await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true,'bandeja y pie dentro del escritorio');
  const aside=page.locator('.admin-context');
  assert.equal(await aside.getAttribute('tabindex'),'0','contexto desbordado accesible por teclado');
  assert.equal(await page.locator('.admin-transcript').getAttribute('tabindex'),null,'sin foco extra si todos los mensajes caben');
  await aside.focus();await page.keyboard.press('End');
  await page.waitForFunction(()=>{const region=document.querySelector('.admin-context');return region.scrollTop>=region.scrollHeight-region.clientHeight-1;});
  for(const selector of ['[data-admin-action="review"]','[data-admin-action="block"]','[data-admin-action="delete"]','.admin-consent summary']){
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(selector).evaluate(el=>el===document.activeElement),true);
    await page.waitForFunction(value=>{const control=document.querySelector(value).getBoundingClientRect(),pane=document.querySelector('.admin-context').getBoundingClientRect();return control.y>=pane.y && control.bottom<=pane.bottom;},selector);
    const pane=await aside.boundingBox(),control=await page.locator(selector).boundingBox();
    assert.ok(control.y>=pane.y && control.y+control.height<=pane.y+pane.height,`${selector}: foco visible dentro del contexto ${JSON.stringify({pane,control})}`);
  }
  await page.keyboard.press('Enter');assert.equal(await page.locator('.admin-consent').getAttribute('open'),'');
  await page.locator('.admin-consent dd').last().scrollIntoViewIfNeeded();
  const last=await page.locator('.admin-consent dd').last().boundingBox(),pane=await aside.boundingBox();
  assert.ok(last.y>=pane.y && last.y+last.height<=pane.y+pane.height,'autorización completa alcanzable');
  await page.route(`**/api/control-sarin/conversations/${id}`,route=>route.fulfill({json:{...detail,turns:16,messages:Array.from({length:32},(_,index)=>({...detail.messages[index%2],id:`synthetic-${index}`,turn:Math.floor(index/2)+1,content:`Mensaje ficticio ${index+1}.\n${'Contenido de prueba. '.repeat(12)}`}))}}));
  await page.locator('[data-conversation-id]').first().click();
  await page.waitForFunction(()=>document.querySelectorAll('.admin-message').length===32);
  const transcript=page.locator('.admin-transcript');assert.equal(await transcript.getAttribute('tabindex'),'0');
  await transcript.focus();await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('.admin-transcript').scrollTop>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
  await page.screenshot({path:path.join(root,'test-results/sarin-admin/inbox-long-keyboard-1440.png')});
  await page.setViewportSize({width:900,height:900});
  await page.waitForFunction(()=>!document.querySelector('.admin-transcript').hasAttribute('tabindex') && !document.querySelector('.admin-context').hasAttribute('tabindex'));
});

test('una o varias tarjetas conservan altura natural al crecer la ventana de la bandeja',async t=>{
  for(const amount of [1,3]){
    const {page,context}=await pageFor({viewport:{width:1440,height:900},reducedMotion:'reduce'});t.after(()=>context.close());
    await mock(page,{items:Array.from({length:amount},(_,index)=>({...summary,id:`00000000-0000-4000-8000-00000000000${index+1}`}))});
    const cards=page.locator('[data-conversation-id]');await cards.last().waitFor();await page.evaluate(()=>document.fonts.ready);
    const before=await cards.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
    await page.setViewportSize({width:1440,height:1200});
    const after=await cards.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
    assert.equal(after.length,amount);
    assert.ok(after.every((height,index)=>Math.abs(height-before[index])<=1),`${amount} tarjetas no se estiran al aumentar la ventana: ${before} → ${after}`);
    await context.close();
  }
});

test('reflujo equivalente a zoom 200% mantiene mensajes, contexto y foco visibles',async t=>{
  const {page,context}=await pageFor({viewport:{width:720,height:450},deviceScaleFactor:2,reducedMotion:'reduce'});t.after(()=>context.close());
  await mock(page);await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
  const title=await page.locator('#admin-detail-title').boundingBox();
  assert.ok(title.y>=0 && title.y+title.height<=450,'foco visible al seleccionar en una ventana ampliada');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('.admin-context').getAttribute('tabindex'),null,'contexto usa scroll natural con el ancho reducido');
  await page.locator('[data-admin-action="delete"]').focus();
  assert.equal(await page.locator('[data-admin-action="delete"]').evaluate(el=>el===document.activeElement),true);
  await page.screenshot({path:path.join(root,'test-results/sarin-admin/inbox-reflow-200.png'),fullPage:true});
});

test('el foco de las conversaciones no queda recortado por su región desplazable',async t=>{
  const {page,context}=await pageFor({viewport:{width:1440,height:900}});t.after(()=>context.close());await mock(page);
  const button=page.locator('[data-conversation-id]').first();await button.focus();
  const bounds=await button.boundingBox(),clip=await page.locator('#admin-list').boundingBox();
  const outset=await button.evaluate(node=>{const style=getComputedStyle(node);return Math.max(0,parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset));});
  assert.ok(outset>0,'foco visible');
  assert.ok(bounds.x-outset>=clip.x && bounds.y-outset>=clip.y && bounds.x+bounds.width+outset<=clip.x+clip.width,'anillo de foco completo dentro de la región');
});

test('el observador no conserva regiones privadas retiradas al cambiar conversación o salir',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());
  await page.addInitScript(()=>{
    const Original=window.ResizeObserver;
    window.ResizeObserver=class extends Original{
      constructor(callback){super(callback);this.targets=new Set();window.observedAdminRegions=this.targets;}
      observe(target,options){super.observe(target,options);this.targets.add(target);}
      unobserve(target){super.unobserve(target);this.targets.delete(target);}
      disconnect(){super.disconnect();this.targets.clear();}
    };
  });
  await mock(page);await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
  await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
  assert.equal(await page.evaluate(()=>[...window.observedAdminRegions].filter(node=>!node.isConnected).length),0);
  await page.locator('#admin-logout').click();await page.locator('#admin-google-login').waitFor();
  assert.equal(await page.evaluate(()=>[...window.observedAdminRegions].filter(node=>!node.isConnected).length),0,'ninguna región privada retirada sigue observada al salir');
});

test('contacto seguro aparece en lista y detalle como declaración no verificada, sin datos heredados inventados',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());await mock(page);
  await page.locator('[data-conversation-id]').first().waitFor();
  assert.match(await page.locator('#admin-list').textContent(),/María José O'Neill Pérez/);
  assert.match(await page.locator('#admin-list').textContent(),/maria\.contacto@example\.test/);
  await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
  assert.match(await page.locator('#admin-detail').textContent(),/Correo no verificado/i);
  assert.match(await page.locator('#admin-detail').textContent(),/maria\.contacto@example\.test/);
  await page.route(`**/api/control-sarin/conversations/${id}`,route=>route.fulfill({json:{...detail,lead:null}}));
  await page.route('**/api/control-sarin/conversations?*',route=>route.fulfill({json:{items:[{...summary,lead:null}],nextCursor:null}}));
  await page.locator('#admin-filters').evaluate(form=>form.requestSubmit());await page.locator('[data-conversation-id]').first().click();
  await page.waitForFunction(()=>document.querySelector('#admin-detail').textContent.includes('Sin datos de contacto'));
  assert.match(await page.locator('#admin-list').textContent(),/Sin datos de contacto/);
  assert.equal(await page.evaluate(value=>JSON.stringify({...localStorage,...sessionStorage}).includes(value),lead.email),false);
});

test('contacto HTML nunca se interpreta y salir elimina también nombre y correo',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());await mock(page,{items:[{...summary,lead:{...lead,firstName:'<img src=x onerror="window.pwned=true">'}}]});
  await page.locator('[data-conversation-id]').first().waitFor();
  assert.equal(await page.locator('#admin-list img').count(),0);
  assert.match(await page.locator('#admin-list').textContent(),/Sin datos de contacto/);
  assert.equal(await page.evaluate(()=>window.pwned),undefined);
  await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
  await page.locator('#admin-logout').click();await page.locator('#admin-google-login').waitFor();
  assert.equal(await page.locator('#admin-list').textContent(),'');
  assert.doesNotMatch(await page.locator('#admin-detail').textContent(),/maria\.contacto|María José/);
});

test('contacto con nombres y correo extensos conserva lectura móvil, intermedia y lateral',async t=>{
  for(const width of [320,900,1440]){
    const {page,context}=await pageFor({viewport:{width,height:width===320?568:900},reducedMotion:'reduce'});t.after(()=>context.close());
    const longLead={firstName:'Á'.repeat(80),lastName:'Ñ'.repeat(80),email:`${'l'.repeat(64)}@${'d'.repeat(63)}.${'e'.repeat(63)}.${'f'.repeat(61)}`};
    await mock(page,{items:[{...summary,lead:longLead}]});
    await page.route(`**/api/control-sarin/conversations/${id}`,route=>route.fulfill({json:{...detail,lead:longLead}}));
    await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('.admin-contact-email').textContent(),longLead.email);
    assert.match(await page.locator('.admin-contact').textContent(),new RegExp(longLead.email.replaceAll('.','\\.')));
    await page.screenshot({path:path.join(root,`test-results/sarin-admin/contact-long-${width}.png`),fullPage:true});
    await context.close();
  }
});

test('pantalla de Staff sin sesión no consulta historial y permite acceder con Google',async()=>{
  const {page,context,authRequests}=await pageFor({}, {signedOut:true});
  try{
    const requests=await mock(page);
    await page.locator('#admin-google-login').waitFor();
    assert.equal(await page.locator('#admin-workspace').isVisible(),false);
    assert.equal(requests.length,0,'ningún dato privado antes de autenticar');
    await page.locator('#admin-google-login').click();
    await page.locator('[data-conversation-id]').first().waitFor();
    assert.equal(authRequests.filter(r=>r.name==='session').length,1,'un único intercambio deduplicado');
    const exchange=authRequests.find(r=>r.name==='session');
    assert.equal(exchange.method,'POST');
    assert.deepEqual(Object.keys(exchange.body),['idToken']);
    assert.equal(await page.locator('#admin-logout').isVisible(),true);
  }finally{await context.close();}
});

test('cancelar Google mantiene el panel cerrado y no revela errores internos',async()=>{
  const {page,context,authRequests}=await pageFor({}, {signedOut:true,popupError:true});
  try{
    const requests=await mock(page);await page.locator('#admin-google-login').waitFor();
    await page.locator('#admin-google-login').click();
    await page.waitForFunction(()=>document.querySelector('#admin-status').textContent.includes('No pudimos completar'));
    assert.equal(await page.locator('#admin-workspace').isVisible(),false);
    assert.equal(requests.length,0);assert.equal(authRequests.some(r=>r.name==='session'),false);
    assert.doesNotMatch(await page.locator('body').textContent(),/private-sdk-error|auth\/popup-closed/);
    assert.equal(await page.locator('#admin-google-login').isEnabled(),true);
  }finally{await context.close();}
});

test('renovación de token actualiza cookie una vez y salir vacía todos los datos visibles',async()=>{
  const {page,context,authRequests}=await pageFor();
  try{
    const requests=await mock(page);await page.locator('[data-conversation-id]').first().click();
    await page.locator('#admin-detail-title').waitFor();
    await page.evaluate(async()=>{const sdk=await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js');sdk.refreshForTest();});
    await page.waitForFunction(()=>document.querySelector('#admin-workspace').hidden===false);
    await page.locator('#admin-filters').evaluate(form=>form.requestSubmit());
    await page.waitForFunction(()=>document.querySelector('#admin-list').getAttribute('aria-busy')==='false');
    assert.equal(authRequests.filter(r=>r.name==='session').length,2,'inicial y renovación, sin intercambio por cada GET');
    await page.locator('#admin-logout').click();await page.locator('#admin-google-login').waitFor();
    assert.equal(await page.locator('#admin-workspace').isVisible(),false);
    assert.equal(await page.locator('[data-conversation-id]').count(),0);
    assert.doesNotMatch(await page.locator('#admin-detail').textContent(),/Café de prueba/);
    assert.equal(authRequests.filter(r=>r.name==='logout').length,1);
    const before=requests.length;await page.waitForTimeout(50);assert.equal(requests.length,before);
    assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('Café de prueba')),false);
  }finally{await context.close();}
});

test('respuesta privada tardía tras salir no vuelve a mostrar conversaciones',async()=>{
  const {page,context}=await pageFor();let release;
  try{
    await mock(page);await page.locator('[data-conversation-id]').first().waitFor();
    const started=new Promise(resolve=>{
      page.route('**/api/control-sarin/conversations?*',async route=>{resolve();await new Promise(done=>{release=done;});await route.fulfill({json:{items:[summary],nextCursor:null}}).catch(()=>{});});
    });
    await page.locator('#admin-filters').evaluate(form=>form.requestSubmit());await started;
    await page.locator('#admin-logout').click();await page.locator('#admin-google-login').waitFor();release();
    await page.waitForTimeout(50);
    assert.equal(await page.locator('#admin-workspace').isVisible(),false);
    assert.equal(await page.locator('[data-conversation-id]').count(),0);
  }finally{release?.();await context.close();}
});

test('panel privado carga lista/detalle cronológico como texto, señales y autorización',async()=>{
  const {page,context}=await pageFor();const requests=await mock(page);
  await page.locator('[data-conversation-id]').first().click();
  await page.locator('#admin-detail-title').waitFor();
  assert.match(await page.locator('h1').textContent(),/Administración de Sarin/);
  assert.match(await page.locator('#admin-detail').textContent(),/Café de prueba/);
  assert.equal(await page.locator('#admin-detail img').count(),0);
  assert.equal(await page.evaluate(()=>window.pwned),undefined);
  const text=await page.locator('#admin-detail').textContent();
  assert.ok(text.indexOf('Café de prueba')<text.indexOf('Una tienda para tu café.'));
  assert.match(text,/verificado/i);assert.match(text,/retenid/i);assert.match(text,/30 días|vence/i);
  assert.match(text,/sarin-history-2026-10-16-v1/);
  assert.equal(requests.some(req=>req.url.pathname==='/api/sarin'),false);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('Café de prueba')),false);
  await context.close();
});

test('enlace para probar en la web aparece solo tras bootstrap con permiso privado explícito',async t=>{
  for(const privateTestEnabled of [false,true,'true']){
    const {page,context}=await pageFor();t.after(()=>context.close());await mock(page,{privateTestEnabled});
    await page.locator('[data-conversation-id]').first().waitFor();
    assert.equal(await page.locator('#admin-test-sarin').isVisible(),privateTestEnabled===true);
    if(privateTestEnabled===true){assert.equal(await page.locator('#admin-test-sarin').getAttribute('href'),'/?sarin=prueba');assert.match(await page.locator('#admin-test-sarin').textContent(),/Probar Sarin/);}
    await context.close();
  }
});

test('filtros fecha Colombia y acciones CSRF, borrar exige confirmación explícita',async()=>{
  const {page,context}=await pageFor();const requests=await mock(page);
  await page.locator('#admin-from').fill('2026-10-01');await page.locator('#admin-to').fill('2026-10-16');
  await page.locator('#admin-service').selectOption('store');await page.locator('#admin-state').selectOption('reviewed');
  await page.locator('#admin-filters').evaluate(form=>form.requestSubmit());
  await page.waitForTimeout(50);
  const list=requests.filter(req=>req.url.pathname.endsWith('/conversations')).at(-1);
  assert.equal(list.url.searchParams.get('from'),String(Date.parse('2026-10-01T00:00:00-05:00')));
  assert.equal(list.url.searchParams.get('to'),String(Date.parse('2026-10-16T23:59:59.999-05:00')));
  assert.equal(list.url.searchParams.get('service'),'store');assert.equal(list.url.searchParams.get('state'),'reviewed');
  await page.locator('[data-conversation-id]').first().click();
  await page.locator('[data-admin-action="review"]').click();
  await page.waitForTimeout(50);
  const action=requests.find(req=>req.method==='POST');
  assert.deepEqual(action.body,{action:'review'});assert.equal(action.headers['x-sarin-csrf'],'synthetic-csrf-token');
  await page.locator('[data-admin-action="delete"]').click();
  assert.equal(requests.filter(req=>req.method==='POST').length,1);
  assert.equal(await page.locator('#admin-delete-confirm').isVisible(),true);
  await page.locator('[data-admin-cancel-delete]').click();
  assert.equal(await page.locator('[data-admin-action="delete"]').evaluate(el=>el===document.activeElement),true);
  await page.locator('[data-admin-action="delete"]').click();await page.locator('[data-admin-confirm-delete]').click();
  await page.waitForTimeout(50);
  assert.deepEqual(requests.filter(req=>req.method==='POST').at(-1).body,{action:'delete'});
  await context.close();
});

test('acceso vencido, limpieza atrasada y lista vacía muestran estados honestos',async()=>{
  for(const code of [401,403]){
    const {page,context}=await pageFor();await mock(page,{status:code});
    await page.waitForFunction(()=>/acceso|sesión/i.test(document.querySelector('#admin-status').textContent));
    assert.equal(await page.locator('[data-admin-action]').count(),0);await context.close();
  }
  const {page,context}=await pageFor();await mock(page,{items:[],purge:{lastRunAt:now-14400000,lastSuccessAt:now-14400000,lastErrorAt:null,status:'error',remaining:true}});
  await page.waitForFunction(()=>document.querySelector('#admin-list').textContent.includes('No hay conversaciones'));
  assert.match(await page.locator('#admin-purge').textContent(),/atras|fall|pendiente/i);
  await page.screenshot({path:path.join(root,'test-results/sarin-admin/empty.png')});await context.close();
});

test('espera y error de red permiten reintentar sin mostrar una autenticación ficticia',async()=>{
  const {page,context}=await pageFor();let release,markStarted;
  const started=new Promise(resolve=>{markStarted=resolve;});
  await page.route('**/api/control-sarin/bootstrap',async route=>{await new Promise(resolve=>{release=resolve;markStarted();});await route.abort();});
  await page.goto(`${origin}/control-sarin/`);
  await started;
  assert.match(await page.locator('#admin-status').textContent(),/acceso|cargando|verificando/i);
  assert.equal(await page.locator('#admin-workspace').isVisible(),false,'el SDK no abre el espacio antes del bootstrap autorizado');
  assert.equal(await page.locator('#admin-purge').isVisible(),false,'sin estado operativo antes de verificar permisos');
  assert.equal(await page.locator('#admin-identity').textContent(),'Acceso privado');
  release();await page.waitForFunction(()=>document.querySelector('#admin-retry').hidden===false);
  assert.match(await page.locator('#admin-status').textContent(),/conectar/i);await context.close();
});

test('paginación añade conversaciones y una acción con acceso vencido retira el detalle',async()=>{
  const {page,context}=await pageFor();await mock(page);
  await page.locator('[data-conversation-id]').first().waitFor();
  const nextId='00000000-0000-4000-8000-000000000003',cursors=[];
  await page.route('**/api/control-sarin/conversations?*',route=>{
    const cursor=new URL(route.request().url()).searchParams.get('cursor');cursors.push(cursor);
    return route.fulfill({json:{items:[cursor?{...summary,id:nextId}:summary],nextCursor:cursor?null:'synthetic_cursor'}});
  });
  await page.reload();await page.locator('#admin-more').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-conversation-id]').length===2);
  assert.deepEqual(cursors,[null,'synthetic_cursor']);
  assert.equal(await page.locator('#admin-more').isVisible(),false);
  await page.locator(`[data-conversation-id="${id}"]`).click();await page.locator('#admin-detail-title').waitFor();
  await page.route(`**/api/control-sarin/conversations/${id}`,route=>route.request().method()==='POST'?route.fulfill({status:403,json:{error:{code:'csrf_rejected'}}}):route.fulfill({json:detail}));
  await page.locator('[data-admin-action="review"]').click();await page.locator('#admin-google-login').waitFor();
  assert.equal(await page.locator('#admin-workspace').isVisible(),false);
  assert.equal(await page.locator('#admin-detail').textContent(),'Elige una conversación para ver sus mensajes.');
  await page.locator('#admin-google-login').click();await page.locator('#admin-workspace').waitFor();await page.locator('[data-conversation-id]').first().waitFor();
  await context.close();
});

test('valores de catálogo desconocidos usan texto cerrado y eventos administrativos legibles',async()=>{
  const {page,context}=await pageFor();await mock(page);
  await page.route(`**/api/control-sarin/conversations/${id}`,route=>route.fulfill({json:{...detail,service:'constructor',status:'__proto__',events:[{id:'e1',kind:'block',at:now,count:1},{id:'e2',kind:'unblock',at:now+1,count:1},{id:'e3',kind:'review',at:now+2,count:1}]}}));
  await page.locator('[data-conversation-id]').first().click();await page.locator('#admin-detail-title').waitFor();
  assert.equal(await page.locator('#admin-detail-title').textContent(),'Conversación con Sarin');
  assert.match(await page.locator('#admin-detail').textContent(),/Estado no disponible/);
  const events=await page.locator('.admin-event').allTextContents();
  assert.match(events[0],/Sesión bloqueada/);assert.match(events[1],/Sesión desbloqueada/);assert.match(events[2],/Revisión administrativa/);
  await context.close();
});

test('teclado recorre filtros, abre detalle y cancela borrado sin perder foco',async()=>{
  const {page,context}=await pageFor();await mock(page);await page.locator('[data-conversation-id]').first().waitFor();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.admin-skip').evaluate(el=>el===document.activeElement),true);
  await page.locator('#admin-from').focus();
  for(const selector of ['#admin-to','#admin-service','#admin-state','#admin-filters button','[data-conversation-id]']){
    // Los campos de fecha nativos ofrecen focos internos para día, mes y año.
    for(let step=0;step<6;step++){
      await page.keyboard.press('Tab');
      if(await page.locator(selector).first().evaluate(el=>el===document.activeElement))break;
    }
    assert.equal(await page.locator(selector).first().evaluate(el=>el===document.activeElement),true,selector);
  }
  await page.keyboard.press('Enter');await page.locator('#admin-detail-title').waitFor();
  await page.locator('[data-admin-action="delete"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-admin-cancel-delete]').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('[data-admin-confirm-delete]').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-admin-action="delete"]').evaluate(el=>el===document.activeElement),true);
  await context.close();
});

test('el vencimiento al refrescar después de una acción mantiene el aviso de acceso',async()=>{
  const {page,context}=await pageFor();await mock(page);let changed=false;
  await page.route('**/api/control-sarin/conversations?*',route=>changed?route.fulfill({status:403,json:{error:{code:'forbidden'}}}):route.fulfill({json:{items:[summary],nextCursor:null}}));
  await page.route(`**/api/control-sarin/conversations/${id}`,route=>{
    if(route.request().method()==='POST'){changed=true;return route.fulfill({json:{ok:true}});}
    return route.fulfill({json:detail});
  });
  await page.locator('[data-conversation-id]').first().click();await page.locator('[data-admin-action="review"]').click();
  await page.locator('#admin-google-login').waitFor();await page.waitForTimeout(30);
  assert.match(await page.locator('#admin-status').textContent(),/acceso/i);
  assert.equal(await page.locator('#admin-workspace').isVisible(),false);await context.close();
});

test('un rango inválido durante la carga no deja el listado ni la paginación bloqueados',async()=>{
  const {page,context}=await pageFor();await mock(page);await page.locator('[data-conversation-id]').first().waitFor();
  let release,markStarted,requests=0;
  const started=new Promise(resolve=>{markStarted=resolve;});
  await page.route('**/api/control-sarin/conversations?*',async route=>{
    requests++;
    if(requests===1){
      markStarted();await new Promise(done=>{release=done;});
      await route.fulfill({json:{items:[summary],nextCursor:'pending_cursor'}}).catch(()=>{});
    }else await route.fulfill({json:{items:[],nextCursor:null}});
  });
  await page.locator('#admin-filters').evaluate(form=>form.requestSubmit());await started;
  assert.equal(await page.locator('#admin-list').getAttribute('aria-busy'),'true');
  assert.equal(await page.locator('#admin-more').isDisabled(),true);
  await page.locator('#admin-from').fill('2026-10-16');await page.locator('#admin-to').fill('2026-10-01');
  await page.locator('#admin-filters').evaluate(form=>form.requestSubmit());
  assert.match(await page.locator('#admin-status').textContent(),/fecha inicial/);
  assert.equal(requests,1,'El rango inválido no inicia otro listado');
  release();
  await page.waitForFunction(()=>document.querySelector('#admin-list').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#admin-more').isDisabled(),false);
  await page.locator('#admin-to').fill('2026-10-16');
  await page.locator('#admin-more').click();
  await page.waitForFunction(()=>document.querySelector('#admin-more').hidden===true);
  assert.equal(requests,2,'La paginación vuelve a estar disponible tras terminar la petición pendiente');
  await context.close();
});

test('cinco anchos, foco teclado, axe, movimiento reducido y contacto sin JS',async()=>{
  for(const width of [320,390,680,900,1440]){
    const {page,context}=await pageFor({viewport:{width,height:1000},reducedMotion:'reduce'});await mock(page);
    await page.locator('[data-conversation-id]').first().click();
    assert.equal(await page.locator('#admin-detail-title').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.addScriptTag({path:path.join(root,'test-results/axe.min.js')});
    const violations=await page.evaluate(async()=>(await axe.run()).violations.map(v=>({id:v.id,impact:v.impact})));
    assert.deepEqual(violations,[]);
    await page.screenshot({path:path.join(root,`test-results/sarin-admin/detail-${width}.png`),fullPage:true});await context.close();
    const loggedOut=await pageFor({viewport:{width,height:1000},reducedMotion:'reduce'},{signedOut:true});await mock(loggedOut.page);
    await loggedOut.page.locator('#admin-google-login').waitFor();
    assert.equal(await loggedOut.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await loggedOut.page.addScriptTag({path:path.join(root,'test-results/axe.min.js')});
    assert.deepEqual(await loggedOut.page.evaluate(async()=>(await axe.run()).violations.map(v=>({id:v.id,impact:v.impact}))),[]);
    await loggedOut.page.locator('#admin-google-login').focus();
    assert.equal(await loggedOut.page.locator('#admin-google-login').evaluate(el=>el===document.activeElement),true);
    await loggedOut.page.screenshot({path:path.join(root,`test-results/sarin-admin/login-${width}.png`),fullPage:true});await loggedOut.context.close();
  }
  const {page,context}=await pageFor({javaScriptEnabled:false});await page.goto(`${origin}/control-sarin/`);
  assert.equal(await page.locator('noscript a[href^="mailto:"]').count(),1);await context.close();
});
