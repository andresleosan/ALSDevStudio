import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const root = path.resolve(import.meta.dirname, '../..');
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
  await assert.rejects(subject.requestSarin('a'.repeat(1201), [], {fetchImpl:async () => { calls++; }}));
  await assert.rejects(subject.requestSarin('界'.repeat(1200), Array.from({length:8}, (_,i) => ({role:i%2?'assistant':'user', content:'界'.repeat(1200)})), {fetchImpl:async () => {calls++;}}));
  assert.equal(calls,0);
});

test('transporte ofrece contacto con JSON roto o timeout, sin reintentos y con destino fijo', async () => {
  const api = await load('sarin-api');
  assert.equal(typeof api?.requestSarin,'function');
  await assert.rejects(api.requestSarin('Hola',[],{fetchImpl:async()=>new Response('{roto',{headers:{'content-type':'application/json'}})}),/Andrés/);
  let attempts=0;
  await assert.rejects(api.requestSarin('Hola',[],{timeoutMs:10,fetchImpl:async (url, options)=>{
    attempts++;
    assert.equal(url,'/api/sarin');
    assert.deepEqual(JSON.parse(options.body),{message:'Hola',history:[]});
    return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelado','AbortError')),{once:true}));
  }}),/tardó demasiado/);
  assert.equal(attempts,1);
});

async function pageFor(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(2000);
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(origin);
  return {page,context};
}
async function dismiss(page) { await page.locator('[data-analytics-choice="denied"]').click(); }
async function open(page) { await dismiss(page); await page.locator('#sarin-launcher').click(); }

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
  assert.deepEqual(bodies[0].history,[]);
  await input.fill('otro'); await input.press('Enter');
  await page.locator('[data-sarin-reset]').click();
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

test('quince turnos como máximo, contexto de cuatro pares y ninguna persistencia de mensajes', async () => {
  const {page,context} = await pageFor();
  const payloads=[];
  await page.route('**/api/sarin', route => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({json:{reply:'¿Qué necesitas resolver?',examples:[],brief:{}}});
  });
  await open(page);
  let popups=0; page.on('popup',popup=>{popups++; popup.close();});
  for (let i=0;i<15;i++) {
    await page.locator('#sarin-message').fill(`Mi negocio ${i}`);
    await page.locator('#sarin-form').evaluate(el=>el.requestSubmit());
    await page.waitForFunction(() => document.querySelector('#sarin-form').getAttribute('aria-busy') === 'false');
  }
  assert.equal(payloads.length,15);
  assert.deepEqual(payloads[5].history,[{role:'user',content:'Mi negocio 1'},{role:'assistant',content:'¿Qué necesitas resolver?'},{role:'user',content:'Mi negocio 2'},{role:'assistant',content:'¿Qué necesitas resolver?'},{role:'user',content:'Mi negocio 3'},{role:'assistant',content:'¿Qué necesitas resolver?'},{role:'user',content:'Mi negocio 4'},{role:'assistant',content:'¿Qué necesitas resolver?'}]);
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

test('320/390/680/900/1440, axe, movimiento reducido y contacto sin JavaScript', async () => {
  for (const width of [320,390,680,900,1440]) {
    const {page,context} = await pageFor({viewport:{width,height:900},reducedMotion:'reduce'});
    await open(page);
    const rect = await page.locator('#sarin-chat').boundingBox();
    assert.ok(rect.width <= width && rect.x >= 0);
    assert.equal(await page.locator('#sarin-message').isVisible(),true);
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
