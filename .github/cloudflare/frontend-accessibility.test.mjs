import assert from 'node:assert/strict';
import {test,before,after} from 'node:test';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '../capturas/node_modules/playwright/index.mjs';

const root=path.resolve(import.meta.dirname,'../..');
let server,browser,origin;
before(async()=>{
  server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{const bytes=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
  }).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true});await mkdir(path.join(root,'test-results/sarin-remote'),{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve));});
async function pageFor({setup,...options}={}){
  const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1280,height:900},...options});const page=await context.newPage();page.setDefaultTimeout(2500);
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  if(setup)await page.addInitScript(setup);
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:15000});await page.locator('[data-analytics-choice="denied"]').click();return {page,context};
}

test('etiquetas visibles del portafolio y paginación coinciden con sus nombres accesibles',async t=>{
  for(const width of [320,640,1280]){
    const {page,context}=await pageFor({viewport:{width,height:900}});t.after(()=>context.close());
    await page.addScriptTag({path:path.join(root,'test-results/axe.min.js')});
    const violations=await page.evaluate(async()=>(await axe.run()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
    assert.deepEqual(violations,[],`axe ${width}px`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(root,`test-results/sarin-remote/a11y-corregida-${width}.png`),fullPage:true});
    await context.close();
  }
});

test('paginación por teclado conserva foco al reemplazar controles y filtrar no lo roba',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());
  await page.locator('.pagination-number').nth(1).focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.pagination-number[aria-current="page"]').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.pagination-number').nth(2).evaluate(el=>el===document.activeElement),true);
  const filter=page.locator('[data-filter="web"]');await filter.focus();await page.keyboard.press('Enter');
  assert.equal(await filter.evaluate(el=>el===document.activeElement),true);
});

test('pausa del carrusel persiste tras recargar, permite avance manual y reanuda por teclado',async t=>{
  const {page,context}=await pageFor({reducedMotion:'no-preference'});t.after(()=>context.close());
  const toggle=page.locator('[data-hero-autoplay-toggle]');await toggle.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('als:hero-autoplay-paused:v1')),null);
  await toggle.focus();await page.keyboard.press('Space');
  assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
  assert.match(await toggle.getAttribute('aria-label'),/Reanudar/);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('als:hero-autoplay-paused:v1')),'true');
  await page.locator('.hero-actions a').focus();await page.mouse.move(5,890);
  const first=await page.locator('.hero-slide.is-active').getAttribute('id');await page.waitForTimeout(3200);
  assert.equal(await page.locator('.hero-slide.is-active').getAttribute('id'),first);
  await page.locator('[data-hero-step="1"]').click();assert.notEqual(await page.locator('.hero-slide.is-active').getAttribute('id'),first);
  await page.reload();await toggle.waitFor({state:'visible'});assert.match(await toggle.getAttribute('aria-label'),/Reanudar/);
  await toggle.focus();await page.keyboard.press('Space');await page.locator('.hero-actions a').focus();await page.mouse.move(5,890);
  const resumed=await page.locator('.hero-slide.is-active').getAttribute('id');await page.waitForTimeout(3200);
  assert.notEqual(await page.locator('.hero-slide.is-active').getAttribute('id'),resumed);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('als:hero-autoplay-paused:v1')),'false');
});

test('movimiento reducido conserva navegación manual y el control normal cabe a 320 px',async t=>{
  const {page,context}=await pageFor({viewport:{width:320,height:900},setup:()=>{window.DeviceOrientationEvent={requestPermission:async()=> 'denied'};}});t.after(()=>context.close());
  const toggle=page.locator('[data-hero-autoplay-toggle]');assert.equal(await toggle.isVisible(),false);
  const first=await page.locator('.hero-slide.is-active').getAttribute('id');await page.locator('[data-hero-step="1"]').click();
  assert.notEqual(await page.locator('.hero-slide.is-active').getAttribute('id'),first);
  await page.emulateMedia({reducedMotion:'no-preference'});await toggle.waitFor({state:'visible'});
  await page.locator('[data-hero-motion]').waitFor({state:'visible'});
  const fits=await page.locator('.hero-card-footer').evaluate(el=>el.scrollWidth<=el.clientWidth);assert.equal(fits,true);
  for(const button of await page.locator('.hero-carousel-controls button:visible').all()){
    const rect=await button.boundingBox();assert.ok(rect.width>=24 && rect.height>=24 && rect.x>=0 && rect.x+rect.width<=320);
  }
  await page.locator('.hero-card').screenshot({path:path.join(root,'test-results/sarin-remote/a11y-carrusel-320.png'),animations:'disabled'});
});

test('pageshow restaura la preferencia borrada al salir sin anular movimiento reducido',async t=>{
  const {page,context}=await pageFor({reducedMotion:'no-preference'});t.after(()=>context.close());
  const toggle=page.locator('[data-hero-autoplay-toggle]');await toggle.click();assert.match(await toggle.getAttribute('aria-label'),/Reanudar/);
  await page.emulateMedia({reducedMotion:'reduce'});
  // Una restauración desde bfcache conserva este documento y su estado en memoria.
  // El reset de cookies.html elimina esta clave mientras la página está ausente.
  await page.evaluate(()=>{sessionStorage.removeItem('als:hero-autoplay-paused:v1');window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  assert.match(await toggle.getAttribute('aria-label'),/^Pausar/);
  assert.equal(await toggle.isVisible(),false);
  await page.emulateMedia({reducedMotion:'no-preference'});await toggle.waitFor({state:'visible'});
  assert.match(await toggle.getAttribute('aria-label'),/^Pausar/);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('als:hero-autoplay-paused:v1')),null);
});

test('Sarin aparece cuarto y Dialon séptimo al paginar sin perder los otros proyectos',async t=>{
  const expected=['laparada','tecnifullgas','bpt-jersey','sarinbotsaas','multiogar','siliconesolutions','dialon','mundocelular','hachi-greciaspa','pintumaster','coctelsops','ledgerharbour','field-hours','jobsitejedi','mercadointeligente','donacionesvenezuela','thecococlub','vigia','hampton-estates','semancontrol'];
  for(const width of [320,1440]){
    const {page,context}=await pageFor({viewport:{width,height:900}});t.after(()=>context.close());
    await page.locator('.pagination-number').first().waitFor();
    assert.deepEqual(await page.locator('.project-card').evaluateAll(cards=>cards.map(card=>card.dataset.projectKey)),expected);
    assert.deepEqual(await page.locator('.project-card:not(.is-hidden)').evaluateAll(cards=>cards.map(card=>card.dataset.projectKey)),['laparada','tecnifullgas','bpt-jersey','sarinbotsaas']);
    assert.equal(await page.locator('.pagination-number').count(),5);
    // Recorrer las tarjetas carga sus imágenes lazy antes de la captura completa.
    for(const image of await page.locator('.project-card:not(.is-hidden) img').all()){
      await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());
    }
    await page.locator('#proyectos').screenshot({path:path.join(root,`test-results/sarin-remote/orden-proyectos-pagina1-${width}.png`),animations:'disabled'});
    await page.locator('.pagination-next').click();
    assert.deepEqual(await page.locator('.project-card:not(.is-hidden)').evaluateAll(cards=>cards.map(card=>card.dataset.projectKey)),['multiogar','siliconesolutions','dialon','mundocelular']);
    assert.equal(await page.locator('[data-project-key="thecococlub"].project-card').getAttribute('href'),'https://thecococlub.vercel.app');
    assert.equal(await page.locator('[data-project-key="hampton-estates"].project-card').getAttribute('href'),'https://hamptonestatesjersey.pages.dev/');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    for(const image of await page.locator('.project-card:not(.is-hidden) img').all()){
      await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());
    }
    await page.locator('#proyectos').screenshot({path:path.join(root,`test-results/sarin-remote/orden-proyectos-pagina2-${width}.png`),animations:'disabled'});
  }
});

test('el carrusel conserva número, imagen y enlace de Sarin cuarto y Dialon séptimo',async t=>{
  const {page,context}=await pageFor();t.after(()=>context.close());
  for(let step=0;step<3;step++)await page.locator('[data-hero-step="1"]').click();
  assert.equal(await page.locator('.hero-slide.is-active').getAttribute('data-project-key'),'sarinbotsaas');
  assert.equal(await page.locator('#hero-slide-current').innerText(),'04');
  assert.equal(await page.locator('#hero-project-link').getAttribute('href'),'https://sarinbotsaas.pages.dev/');
  assert.match(await page.locator('.hero-slide.is-active img').getAttribute('src'),/sarinbotsaas\.jpg/);
  for(let step=0;step<3;step++)await page.locator('[data-hero-step="1"]').click();
  assert.equal(await page.locator('.hero-slide.is-active').getAttribute('data-project-key'),'dialon');
  assert.equal(await page.locator('#hero-slide-current').innerText(),'07');
  assert.equal(await page.locator('#hero-project-link').getAttribute('href'),'https://dialon.pages.dev/');
  assert.match(await page.locator('.hero-slide.is-active img').getAttribute('src'),/dialon\.jpg/);
  const ids=await page.locator('.hero-slide').evaluateAll(slides=>slides.map(slide=>slide.id));
  assert.deepEqual(ids,Array.from({length:20},(_,index)=>`hero-slide-${index+1}`));
});

test('correo de contacto y derechos sigue disponible sin JavaScript con exclusión explícita de ofuscación',async t=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});t.after(()=>context.close());
  const page=await context.newPage();let protectedLinks=0;
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  // El servidor local no transforma correos como Cloudflare. Comprobamos el
  // enlace sin JavaScript y sus marcadores; la respuesta del edge se revisa tras publicar.
  for(const pathname of ['/','/privacidad.html','/terminos.html','/cookies.html']){
    await page.goto(origin+pathname,{waitUntil:'domcontentloaded',timeout:15000});
    const visible=page.locator('a[href="mailto:alsdevstudio@alsdevstudio.com"]:visible');
    assert.ok(await visible.count()>=1,pathname);
    await visible.first().scrollIntoViewIfNeeded();assert.equal(await visible.first().isVisible(),true);
    const links=await page.locator('a[href^="mailto:"]').evaluateAll(anchors=>anchors.map(anchor=>({href:anchor.getAttribute('href'),before:anchor.previousSibling?.nodeType===8?anchor.previousSibling.textContent:null,after:anchor.nextSibling?.nodeType===8?anchor.nextSibling.textContent:null})));
    for(const link of links){assert.equal(link.href,'mailto:alsdevstudio@alsdevstudio.com');assert.equal(link.before,'email_off',pathname);assert.equal(link.after,'/email_off',pathname);protectedLinks++;}
  }
  assert.equal(protectedLinks,7);
});
