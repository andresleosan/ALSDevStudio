import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const moduleURL = new URL('../../scripts/modules/mascot-scenes.js', import.meta.url);
const fixture = `<!DOCTYPE html><meta charset="utf-8"><link rel="icon" href="data:,">
<style>
body{margin:0;font-family:sans-serif}main{padding:20px}button{position:fixed;top:5px;left:5px}
[data-mascot-scene]{height:210px;margin-top:900px;position:relative;overflow:hidden;border:1px solid #555}
[data-mascot-actor]{position:absolute;right:20px;top:30px;width:80px;height:100px;background:#18455b;opacity:1;transform:none}
[data-mascot-part="flying"],[data-mascot-part="landed"]{position:absolute;inset:0;opacity:1}
[data-mascot-part="flying"],[data-mascot-part="trail"]{opacity:0}
[data-mascot-part="window"]{position:absolute;right:115px;top:40px;width:110px;height:100px;background:#d7eeef;opacity:1}
[data-mascot-part="pointer"]{position:absolute;right:135px;top:80px;opacity:1}
[data-mascot-part="line"]{display:block;height:8px;margin:12px;background:#18455b;opacity:1}
p{max-width:40%;opacity:1}
</style><button id="focus-anchor">Referencia de foco</button><main>
<section data-mascot-scene="flight" data-mascot-state="idle"><p>Contenido permanente</p>
  <div data-mascot-actor><span data-mascot-part="flying">Vuelo</span><span data-mascot-part="landed">Sarin</span></div><span data-mascot-part="trail">Estela</span>
</section>
<section data-mascot-scene="projects" data-mascot-state="idle"><p>Contenido permanente</p>
  <div data-mascot-actor>Sarin</div><div data-mascot-part="window">Proyecto</div><span data-mascot-part="pointer">Puntero</span>
</section>
<section data-mascot-scene="contact" data-mascot-state="idle"><p>Contenido permanente</p>
  <div data-mascot-actor>Sarin</div><div data-mascot-part="window"><span data-mascot-part="line"></span><span data-mascot-part="line"></span><span data-mascot-part="line"></span></div>
</section><div style="height:900px"></div></main>
<script type="module">import * as module from '/module.js';window.initScenes=module.initMascotScenes;window.initScenes?.();</script>`;

let browser;
let base;
const server = http.createServer(async (request, response) => {
  if (request.url === '/module.js') {
    let source;
    try { source = await readFile(moduleURL, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; source = 'export const missingController=true;'; }
    response.writeHead(200, { 'Content-Type': 'text/javascript;charset=utf-8' }).end(source);
  } else {
    const withImage = request.url.includes('image=flight')
      ? fixture.replace('<span data-mascot-part="flying">', '<img src="/delayed.svg" alt=""><span data-mascot-part="flying">') : fixture;
    response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }).end(withImage);
  }
});

before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
});

async function pageFor(options = {}, setup, configure, search = '') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options });
  await context.addInitScript(() => {
    window.sceneErrors = [];
    window.addEventListener('unhandledrejection', event => window.sceneErrors.push(String(event.reason)));
    window.animationCalls = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const result = animate.apply(this, args);
      window.animationCalls.push({ scene: this.closest('[data-mascot-scene]')?.dataset.mascotScene,
        part: this.dataset.mascotPart || 'actor', duration: result.effect.getTiming().duration });
      return result;
    };
  });
  if (setup) await context.addInitScript(setup);
  if (configure) await configure(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => assert.ok(request.url().startsWith(`${base}/`), 'Las pruebas solo utilizan el servidor local'));
  await page.goto(base + search, { waitUntil: search ? 'domcontentloaded' : 'networkidle' });
  return { context, page, errors };
}

const scene = (page, kind) => page.locator(`[data-mascot-scene="${kind}"]`);
async function enter(page, kind) {
  await scene(page, kind).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(kind => document.querySelector(`[data-mascot-scene="${kind}"]`).dataset.mascotState === 'playing', kind,
    { timeout: 1200 }).catch(() => {});
  assert.equal(await scene(page, kind).getAttribute('data-mascot-state'), 'playing');
}
async function finished(page, kind) {
  await page.waitForFunction(kind => document.querySelector(`[data-mascot-scene="${kind}"]`).dataset.mascotState === 'finished', kind,
    { timeout: 3500 });
  assert.equal(await scene(page, kind).evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  assert.equal(await scene(page, kind).evaluate(element => element.classList.contains('is-playing')), false);
}
async function clean(result) {
  assert.deepEqual(result.errors, []);
  assert.deepEqual(await result.page.evaluate(() => window.sceneErrors), []);
  await result.context.close();
}

test('vuelo entra una vez, dura 2–3s, aterriza y mantiene texto y foco', async () => {
  const result = await pageFor();
  const { page } = result;
  assert.equal(await scene(page, 'flight').getAttribute('data-mascot-state'), 'idle');
  assert.equal(await page.evaluate(() => window.animationCalls.length), 0);
  await scene(page, 'flight').evaluate(element => {
    element.style.height = '128px';
    const actor = element.querySelector('[data-mascot-actor]');
    Object.assign(actor.style, { top: 'auto', bottom: '0', height: '118px' });
  });
  await page.locator('#focus-anchor').focus();
  await enter(page, 'flight');
  const timing = await scene(page, 'flight').locator('[data-mascot-actor]').evaluate(element => {
    const effect = element.getAnimations()[0].effect;
    return { duration: effect.getTiming().duration, initialX: new DOMMatrix(effect.getKeyframes()[0].transform).m41,
      width: element.closest('[data-mascot-scene]').clientWidth };
  });
  assert.ok(timing.duration >= 2400 && timing.duration <= 2600);
  assert.ok(Math.abs(timing.initialX + timing.width) < 0.1);
  const headClearance = await scene(page, 'flight').evaluate(element => {
    element.getAnimations({ subtree: true }).forEach(animation => {
      animation.pause(); animation.currentTime = animation.effect.getTiming().duration * .46;
    });
    return element.querySelector('[data-mascot-actor]').getBoundingClientRect().top - element.getBoundingClientRect().top;
  });
  assert.ok(headClearance >= 0, 'La cabeza debe permanecer dentro del slot de vuelo durante el ascenso');
  const poseAt1800 = await scene(page, 'flight').evaluate(element => {
    element.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 1800; });
    return ['flying', 'landed'].map(part => Number(getComputedStyle(element.querySelector(`[data-mascot-part="${part}"]`)).opacity));
  });
  assert.deepEqual(poseAt1800, [1, 0], 'La fase de vuelo debe seguir visible a 1800 ms');
  await scene(page, 'flight').evaluate(element => {
    element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 0; animation.play(); });
  });
  assert.equal(await scene(page, 'flight').locator('p').evaluate(element => getComputedStyle(element).opacity), '1');
  await finished(page, 'flight');
  assert.equal(await scene(page, 'flight').locator('[data-mascot-part="flying"]').evaluate(element => getComputedStyle(element).opacity), '0');
  assert.equal(await scene(page, 'flight').locator('[data-mascot-part="landed"]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'focus-anchor');
  const calls = await page.evaluate(() => window.animationCalls.length);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await scene(page, 'flight').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await page.evaluate(() => window.initScenes());
  assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
  await clean(result);
});

test('presentación y contacto animan sus partes y terminan sin bucles', async () => {
  const result = await pageFor();
  for (const kind of ['projects', 'contact']) {
    await enter(result.page, kind);
    const parts = await result.page.evaluate(kind => window.animationCalls.filter(call => call.scene === kind).map(call => call.part), kind);
    assert.ok(parts.includes('actor') && parts.includes('window'));
    if (kind === 'projects') assert.ok(parts.includes('pointer'));
    else assert.equal(parts.filter(part => part === 'line').length, 3);
    await finished(result.page, kind);
  }
  await clean(result);
});

test('salir del viewport cancela al final y volver no repite', async () => {
  const result = await pageFor();
  await enter(result.page, 'flight');
  const calls = await result.page.evaluate(() => window.animationCalls.length);
  await result.page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await finished(result.page, 'flight');
  await scene(result.page, 'flight').scrollIntoViewIfNeeded();
  await result.page.waitForTimeout(100);
  assert.equal(await result.page.evaluate(() => window.animationCalls.length), calls);
  await clean(result);
});

test('documento oculto cancela sin rechazos ni repetición al regresar', async () => {
  const result = await pageFor();
  await enter(result.page, 'projects');
  const calls = await result.page.evaluate(() => window.animationCalls.length);
  await result.page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await finished(result.page, 'projects');
  await result.page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await result.page.waitForTimeout(100);
  assert.equal(await result.page.evaluate(() => window.animationCalls.length), calls);
  await clean(result);
});

test('una imagen demorada espera assets y solo arranca en viewport visible', async () => {
  let pending;
  const result = await pageFor({}, undefined, context => context.route('**/delayed.svg', route => { pending = route; }), '?image=flight');
  const { page } = result;
  await scene(page, 'flight').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  assert.equal(await scene(page, 'flight').getAttribute('data-mascot-state'), 'idle');
  assert.equal(await page.evaluate(() => window.animationCalls.length), 0);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(100);
  await pending.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16"/></svg>' });
  await page.waitForFunction(() => document.querySelector('img').complete);
  assert.equal(await scene(page, 'flight').getAttribute('data-mascot-state'), 'idle');
  assert.equal(await page.evaluate(() => window.animationCalls.length), 0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await scene(page, 'flight').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.animationCalls.length), 0);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await enter(page, 'flight');
  await finished(page, 'flight');
  await clean(result);
});

test('una imagen fallida termina estática sin consumir una animación vacía', async () => {
  const result = await pageFor({}, undefined, context => context.route('**/delayed.svg', route => route.fulfill({ contentType: 'image/png', body: 'invalid image' })), '?image=flight');
  await scene(result.page, 'flight').scrollIntoViewIfNeeded();
  await result.page.waitForFunction(() => document.querySelector('[data-mascot-scene="flight"]').dataset.mascotState === 'static', null, { timeout: 1200 }).catch(() => {});
  assert.equal(await scene(result.page, 'flight').getAttribute('data-mascot-state'), 'static');
  assert.equal(await result.page.evaluate(() => window.animationCalls.length), 0);
  await clean(result);
});

test('movimiento reducido inicial y dinámico conserva el final estático', async () => {
  const reduced = await pageFor({ reducedMotion: 'reduce' });
  assert.deepEqual(await reduced.page.locator('[data-mascot-scene]').evaluateAll(elements => elements.map(element => element.dataset.mascotState)), ['static', 'static', 'static']);
  assert.equal(await reduced.page.evaluate(() => window.animationCalls.length), 0);
  await clean(reduced);
  const dynamic = await pageFor();
  await enter(dynamic.page, 'contact');
  await dynamic.page.emulateMedia({ reducedMotion: 'reduce' });
  await dynamic.page.waitForFunction(() => document.querySelector('[data-mascot-scene="contact"]').dataset.mascotState === 'static');
  assert.equal(await dynamic.page.evaluate(() => document.getAnimations().length), 0);
  const calls = await dynamic.page.evaluate(() => window.animationCalls.length);
  await dynamic.page.emulateMedia({ reducedMotion: 'no-preference' });
  await dynamic.page.waitForTimeout(100);
  assert.equal(await dynamic.page.evaluate(() => window.animationCalls.length), calls);
  await clean(dynamic);
});

for (const [mode, options, setup] of [
  ['móvil', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ['puntero grueso', { hasTouch: true }],
  ['ahorro de datos', {}, () => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } })],
]) test(`${mode}: anima 2200ms con desplazamiento pequeño`, async () => {
  const result = await pageFor(options, setup);
  await enter(result.page, 'flight');
  const timing = await scene(result.page, 'flight').locator('[data-mascot-actor]').evaluate(element => {
    const effect = element.getAnimations()[0].effect;
    return { duration: effect.getTiming().duration, x: new DOMMatrix(effect.getKeyframes()[0].transform).m41 };
  });
  assert.equal(timing.duration, 2200);
  assert.ok(Math.abs(timing.x) <= 48);
  await finished(result.page, 'flight');
  await clean(result);
});

for (const [name, setup] of [
  ['sin WAAPI', () => { Element.prototype.animate = undefined; }],
  ['sin IntersectionObserver', () => { window.IntersectionObserver = undefined; }],
]) test(`${name}: final visible sin animaciones ni errores`, async () => {
  const result = await pageFor({}, setup);
  assert.deepEqual(await result.page.locator('[data-mascot-scene]').evaluateAll(elements => elements.map(element => element.dataset.mascotState)), ['static', 'static', 'static']);
  assert.equal(await result.page.evaluate(() => window.animationCalls.length), 0);
  assert.equal(await scene(result.page, 'flight').locator('[data-mascot-part="landed"]').evaluate(element => getComputedStyle(element).opacity), '1');
  await clean(result);
});

test('sin JavaScript las escenas y la pose final siguen visibles', async () => {
  const result = await pageFor({ javaScriptEnabled: false });
  assert.equal(await scene(result.page, 'flight').locator('[data-mascot-part="landed"]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await scene(result.page, 'flight').locator('[data-mascot-actor]').evaluate(element => getComputedStyle(element).transform), 'none');
  assert.equal(await result.page.locator('[data-mascot-scene]').count(), 3);
  assert.deepEqual(result.errors, []);
  await result.context.close();
});
