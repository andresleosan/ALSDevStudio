import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const id='00000000-0000-4000-8000-000000000001';
const now=Date.now();
const summary={id,createdAt:now-3600000,updatedAt:now,expiresAt:now+86400000,service:'store',turns:1,reviewedAt:null,blockedUntil:null,status:'completed',outOfScopeCount:2,errorCount:1,usage:{reservedMicros:1200,verifiedMicros:700,retainedMicros:500}};
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
async function pageFor(options={}){
  const context=await browser.newContext(options),page=await context.newPage();
  page.setDefaultTimeout(2500);
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  return {page,context};
}
async function mock(page,{items=[summary],purge={lastRunAt:now,lastSuccessAt:now,lastErrorAt:null,status:'ok',remaining:false},status=200}={}){
  const requests=[];
  await page.route('**/api/control-sarin/**',async route=>{
    const req=route.request(),url=new URL(req.url());requests.push({url,method:req.method(),body:req.postDataJSON(),headers:req.headers()});
    if(status!==200)return route.fulfill({status,json:{error:{code:'forbidden'}}});
    if(url.pathname.endsWith('/bootstrap'))return route.fulfill({json:{csrfToken:'synthetic-csrf-token',adminEmail:'operador@example.test',purge}});
    if(req.method()==='POST')return route.fulfill({json:{ok:true}});
    return route.fulfill({json:url.pathname.endsWith('/conversations')?{items,nextCursor:null}:detail});
  });
  await page.goto(`${origin}/control-sarin/`);
  return requests;
}

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
  const {page,context}=await pageFor();let release;
  await page.route('**/api/control-sarin/bootstrap',async route=>{await new Promise(resolve=>{release=resolve;});await route.abort();});
  await page.goto(`${origin}/control-sarin/`);
  assert.match(await page.locator('#admin-status').textContent(),/acceso|cargando|verificando/i);
  release();await page.waitForFunction(()=>document.querySelector('#admin-retry').hidden===false);
  assert.match(await page.locator('#admin-status').textContent(),/conectar/i);await context.close();
});

test('paginación añade conversaciones y una acción con acceso vencido retira el detalle',async()=>{
  const {page,context}=await pageFor();await mock(page);
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
  await page.locator('[data-admin-action="review"]').click();await page.locator('#admin-retry').waitFor();
  assert.equal(await page.locator('#admin-workspace').isVisible(),false);
  assert.equal(await page.locator('#admin-detail').textContent(),'Elige una conversación para ver sus mensajes.');
  await page.locator('#admin-retry').click();await page.locator('#admin-workspace').waitFor();await page.locator('[data-conversation-id]').first().waitFor();
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
  await page.locator('#admin-retry').waitFor();await page.waitForTimeout(30);
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
  }
  const {page,context}=await pageFor({javaScriptEnabled:false});await page.goto(`${origin}/control-sarin/`);
  assert.equal(await page.locator('noscript a[href^="mailto:"]').count(),1);await context.close();
});
