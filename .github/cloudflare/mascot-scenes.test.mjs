import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const moduleURL = new URL('../../scripts/modules/mascot-scenes.js', import.meta.url);
const projectCopy = 'Sitios publicados y productos en desarrollo. Abre cada proyecto para conocer su diseño y funcionalidad.';
const fixture = `<!DOCTYPE html><meta charset="utf-8"><link rel="icon" href="data:,">
<style>
body{margin:0;font-family:sans-serif}main{padding:20px}#focus-anchor{position:fixed;top:5px;left:5px}
[data-mascot-toggle]{position:fixed;top:5px;right:5px}
[data-mascot-scene]{height:210px;margin-top:900px;position:relative;overflow:hidden;border:1px solid #555}
[data-mascot-actor]{position:absolute;right:20px;top:30px;width:80px;height:100px;background:#18455b;opacity:1;transform:none}
[data-mascot-part="flying"],[data-mascot-part="landed"]{position:absolute;inset:0;opacity:1}
[data-mascot-part="flying"],[data-mascot-part="trail"]{opacity:0}
[data-mascot-part="typing-a"],[data-mascot-part="typing-b"]{position:absolute;inset:0}
[data-mascot-part="typing-b"]{opacity:0}
[data-mascot-copy-typed]{position:absolute;inset:0;pointer-events:none}
.is-typing [data-mascot-copy-full]{opacity:0}
[data-mascot-part="window"]{position:absolute;right:115px;top:40px;width:110px;height:100px;background:#d7eeef;opacity:1}
[data-mascot-part="pointer"]{position:absolute;right:135px;top:80px;opacity:1}
[data-mascot-part="line"]{display:block;height:8px;margin:12px;background:#18455b;opacity:1}
p{max-width:40%;opacity:1}
</style><button id="focus-anchor">Referencia de foco</button><main>
<section id="sarin-flight" data-mascot-scene="flight" data-mascot-state="idle" aria-hidden="true"><p>Contenido permanente</p>
  <div data-mascot-actor><span data-mascot-part="flying">Vuelo</span><span data-mascot-part="landed">Sarin</span></div><span data-mascot-part="trail">Estela</span>
</section>
<button type="button" data-mascot-toggle="sarin-flight" aria-controls="sarin-flight" aria-label="Pausar vuelo" hidden>Pausar vuelo</button>
<section data-mascot-scene="projects" data-mascot-state="idle">
  <div data-mascot-actor aria-hidden="true"><span data-mascot-part="typing-a">Laptop A</span><span data-mascot-part="typing-b">Laptop B</span></div>
  <p id="sarin-project-copy" data-mascot-part="window"><span data-mascot-copy-full>${projectCopy}</span><span data-mascot-copy-typed aria-hidden="true"></span></p>
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
    let html = request.url.includes('image=flight')
      ? fixture.replace('<span data-mascot-part="flying">', '<img src="/delayed.svg" alt=""><span data-mascot-part="flying">') : fixture;
    if (request.url.includes('without=toggle')) html = html.replace(/<button type="button" data-mascot-toggle=.*?<\/button>/, '');
    response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }).end(html);
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
    window.pendingSceneFrames = new Set();
    const requestFrame = window.requestAnimationFrame;
    const cancelFrame = window.cancelAnimationFrame;
    window.requestAnimationFrame = function (callback) {
      const id = requestFrame.call(this, time => { window.pendingSceneFrames.delete(id); callback(time); });
      window.pendingSceneFrames.add(id);
      return id;
    };
    window.cancelAnimationFrame = function (id) {
      window.pendingSceneFrames.delete(id);
      cancelFrame.call(this, id);
    };
    window.animationCalls = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const result = animate.apply(this, args);
      window.animationCalls.push({ scene: this.closest('[data-mascot-scene]')?.dataset.mascotScene,
        part: this.dataset.mascotPart || 'actor', ...result.effect.getTiming() });
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
const toggle = page => page.locator('[data-mascot-toggle="sarin-flight"]');
const flightTimes = page => scene(page, 'flight').evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
async function state(page, kind, expected) {
  await page.waitForFunction(({ kind, expected }) => document.querySelector(`[data-mascot-scene="${kind}"]`).dataset.mascotState === expected,
    { kind, expected }, { timeout: 3500 });
}
async function pausedFlight(page) {
  await state(page, 'flight', 'paused');
  // pause() se resuelve en el siguiente frame del navegador, sin consumir .ready del módulo.
  await page.waitForFunction(() => document.querySelector('[data-mascot-scene="flight"]').getAnimations({ subtree: true })
    .every(animation => animation.playState === 'paused' && !animation.pending));
}
async function hidden(page, value) {
  await page.evaluate(value => {
    if (value) Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    else delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  }, value);
}
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
  assert.equal(await result.page.evaluate(() => window.pendingSceneFrames.size), 0, 'No deben quedar frames programados al finalizar/cancelar escritura');
  await result.context.close();
}

test('vuelo repite un ciclo real con pausa central y conserva contenido y foco', async () => {
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
    return { ...effect.getTiming(), frames: effect.getKeyframes().map(frame => ({ offset: frame.offset,
      x: new DOMMatrix(frame.transform).m41 })) };
  });
  assert.equal(timing.iterations, Infinity);
  assert.equal(timing.duration, 4400);
  assert.equal(timing.frames.find(frame => frame.offset === .34).x, timing.frames.find(frame => frame.offset === .53).x);
  const samples = await scene(page, 'flight').evaluate(element => {
    const actor = element.querySelector('[data-mascot-actor]');
    const animations = element.getAnimations({ subtree: true });
    animations.forEach(animation => { animation.pause(); animation.currentTime = 1600; });
    const x1 = new DOMMatrix(getComputedStyle(actor).transform).m41;
    const headClearance = actor.getBoundingClientRect().top - element.getBoundingClientRect().top;
    animations.forEach(animation => { animation.currentTime = 2200; });
    const x2 = new DOMMatrix(getComputedStyle(actor).transform).m41;
    const pose = ['flying', 'landed'].map(part => getComputedStyle(element.querySelector(`[data-mascot-part="${part}"]`)).opacity);
    animations.forEach(animation => { animation.currentTime = 4600; animation.play(); });
    return { x1, x2, headClearance, pose, nextX: new DOMMatrix(getComputedStyle(actor).transform).m41 };
  });
  assert.ok(Math.abs(samples.x1 - samples.x2) < .1, 'El actor sostiene la posición central durante la pausa del ciclo');
  assert.ok(samples.headClearance >= 0, 'La cabeza cabe en el slot de vuelo');
  assert.deepEqual(samples.pose, ['1', '0']);
  assert.ok(samples.nextX < samples.x1, 'El segundo ciclo vuelve al lado izquierdo');
  assert.equal(await scene(page, 'flight').locator('p').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await toggle(page).isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'focus-anchor');
  const calls = await page.evaluate(() => window.animationCalls.length);
  await page.evaluate(() => window.initScenes());
  assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await finished(page, 'flight');
  assert.equal(await toggle(page).isVisible(), false);
  await clean(result);
});

test('proyectos escribe la copia accesible completa con dos frames; contacto permanece finito', async () => {
  const result = await pageFor();
  for (const kind of ['projects', 'contact']) {
    await enter(result.page, kind);
    const parts = await result.page.evaluate(kind => window.animationCalls.filter(call => call.scene === kind).map(call => call.part), kind);
    assert.ok(parts.includes('actor'));
    if (kind === 'projects') {
      assert.ok(parts.includes('typing-a') && parts.includes('typing-b'));
      assert.equal(await scene(result.page, kind).getAttribute('aria-hidden'), null);
      assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
      assert.equal(await result.page.locator('[data-mascot-copy-full]').getAttribute('aria-hidden'), null);
      assert.equal(await result.page.locator('[data-mascot-copy-typed]').getAttribute('aria-hidden'), 'true');
      await scene(result.page, kind).evaluate(element => {
        const animation = element.querySelector('[data-mascot-actor]').getAnimations()[0];
        animation.pause(); animation.currentTime = 1500;
      });
      await result.page.waitForFunction(() => document.querySelector('[data-mascot-copy-typed]').textContent.length > 0);
      const typed = await result.page.locator('[data-mascot-copy-typed]').textContent();
      assert.ok(typed.length < projectCopy.length && projectCopy.startsWith(typed));
      assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
      const frames = await scene(result.page, kind).evaluate(element => {
        const parts = ['typing-a', 'typing-b'].map(name => element.querySelector(`[data-mascot-part="${name}"]`));
        const samples = [];
        for (const time of [70, 210]) {
          parts.forEach(part => { const animation = part.getAnimations()[0]; animation.pause(); animation.currentTime = 240 + time; });
          samples.push(parts.map(part => getComputedStyle(part).opacity));
        }
        element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 2800; animation.play(); });
        return samples;
      });
      assert.deepEqual(frames, [['1', '0'], ['0', '1']]);
    } else assert.ok(parts.includes('window') && parts.filter(part => part === 'line').length === 3);
    await finished(result.page, kind);
    if (kind === 'projects') {
      assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
      assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
      assert.equal(await result.page.locator('#sarin-project-copy').evaluate(element => element.classList.contains('is-typing')), false);
    }
  }
  await clean(result);
});

test('salir del viewport pausa la fase del vuelo y volver reanuda los mismos efectos', async () => {
  const result = await pageFor();
  await enter(result.page, 'flight');
  const calls = await result.page.evaluate(() => window.animationCalls.length);
  await result.page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await pausedFlight(result.page);
  const phase = await flightTimes(result.page);
  await result.page.waitForTimeout(120);
  assert.deepEqual(await flightTimes(result.page), phase);
  await enter(result.page, 'flight');
  await result.page.waitForTimeout(70);
  assert.ok((await flightTimes(result.page))[0] > phase[0]);
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
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
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
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
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
  await enter(dynamic.page, 'flight');
  await dynamic.page.emulateMedia({ reducedMotion: 'reduce' });
  await state(dynamic.page, 'flight', 'static');
  assert.equal(await toggle(dynamic.page).isVisible(), false);
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
]) test(`${mode}: repite 3600ms con desplazamiento corto de 28px`, async () => {
  const result = await pageFor(options, setup);
  await enter(result.page, 'flight');
  const timing = await scene(result.page, 'flight').locator('[data-mascot-actor]').evaluate(element => {
    const effect = element.getAnimations()[0].effect;
    return { duration: effect.getTiming().duration, x: new DOMMatrix(effect.getKeyframes()[0].transform).m41 };
  });
  assert.equal(timing.duration, 3600);
  assert.equal(timing.x, -28);
  await result.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
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
  assert.equal(await toggle(result.page).isVisible(), false);
  await clean(result);
});

test('sin JavaScript las escenas y la pose final siguen visibles', async () => {
  const result = await pageFor({ javaScriptEnabled: false });
  assert.equal(await scene(result.page, 'flight').locator('[data-mascot-part="landed"]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await scene(result.page, 'flight').locator('[data-mascot-actor]').evaluate(element => getComputedStyle(element).transform), 'none');
  assert.equal(await result.page.locator('[data-mascot-scene]').count(), 3);
  assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await toggle(result.page).isVisible(), false);
  assert.deepEqual(result.errors, []);
  await result.context.close();
});

test('pausa manual conserva fase y foco, sobrevive hidden/viewport y reanuda por teclado', async () => {
  const result = await pageFor();
  const { page } = result;
  await enter(page, 'flight');
  await toggle(page).focus();
  await page.keyboard.press('Space');
  await pausedFlight(page);
  assert.equal(await toggle(page).textContent(), 'Reanudar vuelo');
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Reanudar vuelo');
  assert.equal(await toggle(page).evaluate(element => document.activeElement === element), true);
  const phase = await flightTimes(page);
  await page.waitForTimeout(120);
  assert.deepEqual(await flightTimes(page), phase);
  await hidden(page, true); await hidden(page, false);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(80);
  await scene(page, 'flight').scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  assert.equal(await scene(page, 'flight').getAttribute('data-mascot-state'), 'paused');
  assert.deepEqual(await flightTimes(page), phase);
  await toggle(page).focus(); await page.keyboard.press('Enter');
  await state(page, 'flight', 'playing');
  assert.equal(await toggle(page).textContent(), 'Pausar vuelo');
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Pausar vuelo');
  assert.equal(await toggle(page).evaluate(element => document.activeElement === element), true);
  await clean(result);
});

test('hidden pausa el vuelo conservando fase y visible lo reanuda sin crear efectos', async () => {
  const result = await pageFor();
  await enter(result.page, 'flight');
  const calls = await result.page.evaluate(() => window.animationCalls.length);
  await hidden(result.page, true);
  await pausedFlight(result.page);
  const phase = await flightTimes(result.page);
  await result.page.waitForTimeout(120);
  assert.deepEqual(await flightTimes(result.page), phase);
  await hidden(result.page, false);
  await state(result.page, 'flight', 'playing');
  await result.page.waitForTimeout(70);
  assert.ok((await flightTimes(result.page))[0] > phase[0]);
  assert.equal(await result.page.evaluate(() => window.animationCalls.length), calls);
  await clean(result);
});

test('sin botón de pausa el vuelo permanece estático y contacto funciona', async () => {
  const result = await pageFor({}, undefined, undefined, '?without=toggle');
  assert.equal(await scene(result.page, 'flight').getAttribute('data-mascot-state'), 'static');
  assert.equal(await scene(result.page, 'flight').evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  await enter(result.page, 'contact');
  await finished(result.page, 'contact');
  await clean(result);
});

test('sin requestAnimationFrame proyectos muestra copia completa sin escritura', async () => {
  const result = await pageFor({}, () => { window.requestAnimationFrame = undefined; });
  assert.equal(await scene(result.page, 'projects').getAttribute('data-mascot-state'), 'static', 'El fallback por API ausente debe ser síncrono al inicializar');
  await scene(result.page, 'projects').scrollIntoViewIfNeeded();
  await result.page.waitForTimeout(100);
  assert.equal(await scene(result.page, 'projects').getAttribute('data-mascot-state'), 'static');
  assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  await clean(result);
});

test('salir de proyectos cancela escritura y pagehide libera un vuelo ya pausado', async () => {
  const result = await pageFor();
  const { page } = result;
  await enter(page, 'projects');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await finished(page, 'projects');
  assert.equal(await page.locator('[data-mascot-copy-typed]').textContent(), '');
  const calls = await page.evaluate(() => window.animationCalls.length);
  await scene(page, 'projects').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
  await enter(page, 'flight');
  await toggle(page).click();
  await pausedFlight(page);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await finished(page, 'flight');
  assert.equal(await toggle(page).isVisible(), false);
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
  assert.equal(await page.locator('[data-mascot-copy-typed]').textContent(), '');
  await clean(result);
});

test('resize termina escritura y muestra la copia completa sin repetir', async () => {
  const result = await pageFor();
  await enter(result.page, 'projects');
  const calls = await result.page.evaluate(() => window.animationCalls.length);
  await result.page.setViewportSize({ width: 900, height: 720 });
  await finished(result.page, 'projects');
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await result.page.evaluate(() => window.animationCalls.length), calls);
  await clean(result);
});

test('resize recalcula el vuelo compacto conservando la fase y la pausa del usuario', async () => {
  const result = await pageFor();
  const { page } = result;
  await enter(page, 'flight');
  await toggle(page).click();
  await pausedFlight(page);
  const calls = await page.evaluate(() => window.animationCalls.length);
  const before = await scene(page, 'flight').locator('[data-mascot-actor]').evaluate(element => element.getAnimations()[0].currentTime / 4400);
  await page.setViewportSize({ width: 390, height: 720 });
  await page.waitForFunction(() => document.querySelector('[data-mascot-scene="flight"] [data-mascot-actor]').getAnimations()[0].effect.getTiming().duration === 3600);
  const after = await scene(page, 'flight').locator('[data-mascot-actor]').evaluate(element => {
    const animation = element.getAnimations()[0];
    return { phase: animation.currentTime / 3600, playState: animation.playState,
      xs: animation.effect.getKeyframes().map(frame => new DOMMatrix(frame.transform).m41) };
  });
  assert.ok(Math.abs(before - after.phase) < .001);
  assert.equal(after.playState, 'paused');
  assert.ok(after.xs.every(x => Math.abs(x) <= 28));
  assert.equal(await toggle(page).textContent(), 'Reanudar vuelo');
  assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
  await clean(result);
});

test('reduced motion durante la escritura limpia el overlay y el frame pendiente', async () => {
  const result = await pageFor();
  await enter(result.page, 'projects');
  await result.page.waitForFunction(() => document.querySelector('[data-mascot-copy-typed]').textContent.length > 0);
  await result.page.emulateMedia({ reducedMotion: 'reduce' });
  await state(result.page, 'projects', 'static');
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await result.page.evaluate(() => document.getAnimations().length), 0);
  await clean(result);
});

test('un fallo parcial de WAAPI revierte efectos, copia y control al final estático', async () => {
  const result = await pageFor({}, () => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.dataset.mascotPart === 'typing-b' || this.dataset.mascotPart === 'landed') throw new Error('WAAPI parcial');
      return animate.apply(this, args);
    };
  });
  for (const kind of ['flight', 'projects']) {
    await scene(result.page, kind).scrollIntoViewIfNeeded();
    await state(result.page, kind, 'static');
    assert.equal(await scene(result.page, kind).evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  }
  assert.equal(await toggle(result.page).isVisible(), false);
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  await clean(result);
});

test('tecleo mantiene fijo el cuerpo de Sarin y usa un reloj neutral de 3000ms', async () => {
  const result = await pageFor();
  await enter(result.page, 'projects');
  const clock = await scene(result.page, 'projects').locator('[data-mascot-actor]').evaluate(element => {
    const effect = element.getAnimations()[0].effect;
    return { duration: effect.getTiming().duration, frames: effect.getKeyframes().map(frame => new DOMMatrix(frame.transform).isIdentity) };
  });
  assert.equal(clock.duration, 3000);
  assert.ok(clock.frames.every(Boolean), 'Durante el tecleo solo cambian las manos, no la posición del cuerpo');
  await hidden(result.page, true);
  await finished(result.page, 'projects');
  await clean(result);
});

for (const value of ['NaN', 'null']) test(`reloj de escritura inválido (${value}) restaura full y limpia rAF`, async () => {
  const result = await pageFor();
  await enter(result.page, 'projects');
  await result.page.waitForFunction(() => {
    const clock = document.querySelector('[data-mascot-scene="projects"] [data-mascot-actor]').getAnimations()[0];
    return !clock.pending;
  });
  await scene(result.page, 'projects').evaluate((element, value) => {
    const clock = element.querySelector('[data-mascot-actor]').getAnimations()[0];
    Object.defineProperty(clock, 'currentTime', { configurable: true, get: () => value === 'null' ? null : NaN });
  }, value);
  await result.page.waitForFunction(() => document.querySelector('[data-mascot-scene="projects"]').dataset.mascotState !== 'playing', null,
    { timeout: 500 }).catch(() => {});
  assert.equal(await scene(result.page, 'projects').getAttribute('data-mascot-state'), 'static');
  assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await result.page.evaluate(() => document.getAnimations().length), 0);
  await clean(result);
});

test('un error del callback de escritura restaura full y no deja excepción ni rAF pendiente', async () => {
  const result = await pageFor();
  await enter(result.page, 'projects');
  await scene(result.page, 'projects').evaluate(element => {
    const typed = element.querySelector('[data-mascot-copy-typed]');
    const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(typed, 'textContent', {
      configurable: true, get() { return descriptor.get.call(this); },
      set() { delete this.textContent; throw new Error('Escritura del overlay interrumpida una vez'); },
    });
    const clock = element.querySelector('[data-mascot-actor]').getAnimations()[0];
    clock.pause(); clock.currentTime = 1500;
  });
  await result.page.waitForFunction(() => document.querySelector('[data-mascot-scene="projects"]').dataset.mascotState !== 'playing', null,
    { timeout: 500 }).catch(() => {});
  assert.equal(await scene(result.page, 'projects').getAttribute('data-mascot-state'), 'static');
  assert.equal(await result.page.locator('[data-mascot-copy-full]').textContent(), projectCopy);
  assert.equal(await result.page.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await result.page.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await result.page.evaluate(() => document.getAnimations().length), 0);
  await clean(result);
});
