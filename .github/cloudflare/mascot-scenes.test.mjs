import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const moduleURL = new URL('../../scripts/modules/mascot-scenes.js', import.meta.url);
const projectCopy = 'Sitios publicados y productos en desarrollo. Abre cada proyecto para conocer su diseño y funcionalidad.';
const processCopy = 'Así convertimos una idea en un sitio claro y útil.';
const steps = [
  ['step-define', 'Define', 'Primero aclaramos la idea y acordamos el resultado esperado.'],
  ['step-build', 'Construye', 'Diseñamos y construimos el sitio con revisiones en cada etapa.'],
  ['step-deliver', 'Entrega', 'Verificamos el resultado y acompañamos la publicación del sitio.'],
];
const stepsFixture = `<ol>${steps.map(([kind, title, copy]) => `<li class="process-item" data-mascot-scene="${kind}" data-mascot-state="idle">
  <div class="process-character" data-mascot-actor aria-hidden="true">${kind === 'step-build'
    ? '<span data-mascot-part="typing-a">Laptop A</span><span data-mascot-part="typing-b">Laptop B</span>' : 'Sarin'}${kind === 'step-deliver'
    ? '<span data-mascot-part="approval"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5 11-11"/></svg></span>' : ''}</div>
  <div class="process-copy process-bubble" data-mascot-part="window"><span class="process-speaker" aria-hidden="true">↘</span>
    <h3><span data-mascot-copy-full>${title}</span><span data-mascot-copy-typed aria-hidden="true"></span></h3>
    <p><span data-mascot-copy-full>${copy}</span><span data-mascot-copy-typed aria-hidden="true"></span></p>
  </div></li>`).join('')}</ol>`;
const processFixture = `<section data-mascot-scene="process" data-mascot-state="idle">
  <div data-mascot-actor aria-hidden="true"><span data-mascot-part="typing-a">Laptop A</span><span data-mascot-part="typing-b">Laptop B</span></div>
  <p id="sarin-process-copy" data-mascot-part="window"><span data-mascot-copy-full>${processCopy}</span><span data-mascot-copy-typed aria-hidden="true"></span></p>
  <article id="process-card">Contenido permanente de la tarjeta</article>
</section>`;
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
[data-mascot-part="greeting"]{position:absolute;left:50%;top:50%;opacity:1;background:#071a2f;color:white}
[data-mascot-copy-typed]{position:absolute;inset:0;pointer-events:none}
.process-bubble h3,.process-bubble p{position:relative;max-width:none;margin:8px 0}
.process-bubble[data-mascot-part="window"]{width:300px;height:auto;min-height:140px}
[data-mascot-part="approval"]{opacity:1;display:block;width:24px;height:24px}
.is-typing [data-mascot-copy-full]{opacity:0}
[data-mascot-part="window"]{position:absolute;right:115px;top:40px;width:110px;height:100px;background:#d7eeef;opacity:1}
[data-mascot-part="pointer"]{position:absolute;right:135px;top:80px;opacity:1}
[data-mascot-part="line"]{display:block;height:8px;margin:12px;background:#18455b;opacity:1}
p{max-width:40%;opacity:1}
</style><button id="focus-anchor">Referencia de foco</button><main>
<section id="sarin-flight" data-mascot-scene="flight" data-mascot-state="idle" aria-hidden="true"><p>Contenido permanente</p>
  <div data-mascot-actor><span data-mascot-part="flying">Vuelo</span><span data-mascot-part="landed">Sarin</span></div><span data-mascot-part="trail">Estela</span><div data-mascot-part="greeting">Hola</div>
</section>
<button type="button" data-mascot-toggle="sarin-flight" aria-controls="sarin-flight" aria-label="Pausar animación de Sarin" title="Pausar animación de Sarin" data-paused="false" hidden><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14"/></svg></button>
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
    if (request.url.includes('process=1')) html = html.replace('<section data-mascot-scene="contact"', processFixture + '<section data-mascot-scene="contact"');
    if (request.url.includes('steps=1')) {
      const cards = request.url.includes('invalidpair=1') ? stepsFixture.replace(
        `<p><span data-mascot-copy-full>${steps[0][2]}</span><span data-mascot-copy-typed aria-hidden="true"></span></p>`,
        `<p><span data-mascot-copy-full>${steps[0][2]}</span></p>`) : stepsFixture;
      html = html.replace('<section data-mascot-scene="contact"', cards + '<section data-mascot-scene="contact"');
    }
    if (request.url.includes('without=greeting')) html = html.replace('<div data-mascot-part="greeting">Hola</div>', '');
    if (request.url.includes('invalid=greeting')) html = html.replace('<div data-mascot-part="greeting">Hola</div>', '<svg data-mascot-part="greeting"></svg>');
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
  assert.equal(timing.duration, 8800);
  assert.equal(timing.frames.find(frame => frame.offset === .27).x, timing.frames.find(frame => frame.offset === .72).x);
  const samples = await scene(page, 'flight').evaluate(element => {
    const actor = element.querySelector('[data-mascot-actor]');
    const animations = element.getAnimations({ subtree: true });
    animations.forEach(animation => { animation.pause(); animation.currentTime = 3100; });
    const x1 = new DOMMatrix(getComputedStyle(actor).transform).m41;
    const headClearance = actor.getBoundingClientRect().top - element.getBoundingClientRect().top;
    animations.forEach(animation => { animation.currentTime = 6200; });
    const x2 = new DOMMatrix(getComputedStyle(actor).transform).m41;
    const pose = ['flying', 'landed'].map(part => getComputedStyle(element.querySelector(`[data-mascot-part="${part}"]`)).opacity);
    animations.forEach(animation => { animation.currentTime = 9200; animation.play(); });
    return { x1, x2, headClearance, pose, nextX: new DOMMatrix(getComputedStyle(actor).transform).m41 };
  });
  assert.ok(Math.abs(samples.x1 - samples.x2) < .1, 'El actor sostiene la posición central durante la pausa del ciclo');
  assert.ok(samples.headClearance >= 0, 'La cabeza cabe en el slot de vuelo');
  assert.deepEqual(samples.pose, ['0', '1']);
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
  assert.equal(await scene(dynamic.page, 'flight').locator('[data-mascot-part="greeting"]').evaluate(element => getComputedStyle(element).opacity), '1');
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
]) test(`${mode}: repite 8000ms con desplazamiento corto de 28px`, async () => {
  const result = await pageFor(options, setup);
  await enter(result.page, 'flight');
  const timing = await scene(result.page, 'flight').locator('[data-mascot-actor]').evaluate(element => {
    const effect = element.getAnimations()[0].effect;
    return { duration: effect.getTiming().duration, x: new DOMMatrix(effect.getKeyframes()[0].transform).m41 };
  });
  assert.equal(timing.duration, 8000);
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
  assert.equal(await scene(result.page, 'flight').locator('[data-mascot-part="greeting"]').evaluate(element => getComputedStyle(element).opacity), '1');
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
  assert.equal(await toggle(page).textContent(), '');
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Reanudar animación de Sarin');
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
  assert.equal(await toggle(page).textContent(), '');
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Pausar animación de Sarin');
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
  const before = await scene(page, 'flight').locator('[data-mascot-actor]').evaluate(element => element.getAnimations()[0].currentTime / 8800);
  await page.setViewportSize({ width: 390, height: 720 });
  await page.waitForFunction(() => document.querySelector('[data-mascot-scene="flight"] [data-mascot-actor]').getAnimations()[0].effect.getTiming().duration === 8000);
  const after = await scene(page, 'flight').locator('[data-mascot-actor]').evaluate(element => {
    const animation = element.getAnimations()[0];
    return { phase: animation.currentTime / 8000, playState: animation.playState,
      xs: animation.effect.getKeyframes().map(frame => new DOMMatrix(frame.transform).m41) };
  });
  assert.ok(Math.abs(before - after.phase) < .001);
  assert.equal(after.playState, 'paused');
  assert.ok(after.xs.every(x => Math.abs(x) <= 28));
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Reanudar animación de Sarin');
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

test('proceso reutiliza tecleo finito, conserva copia accesible y no toca la tarjeta', async () => {
  const result = await pageFor({}, undefined, undefined, '?process=1');
  const { page } = result;
  const process = scene(page, 'process');
  const full = process.locator('[data-mascot-copy-full]');
  const typed = process.locator('[data-mascot-copy-typed]');
  await enter(page, 'process');
  assert.equal(await process.getAttribute('aria-hidden'), null);
  assert.equal(await full.textContent(), processCopy);
  assert.equal(await full.getAttribute('aria-hidden'), null);
  assert.equal(await typed.getAttribute('aria-hidden'), 'true');
  const clock = await process.locator('[data-mascot-actor]').evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.pause(); animation.currentTime = 1500;
    return animation.effect.getTiming();
  });
  assert.equal(clock.duration, 3000);
  assert.equal(clock.iterations, 1);
  await page.waitForFunction(() => document.querySelector('[data-mascot-scene="process"] [data-mascot-copy-typed]').textContent.length > 0);
  const copy = await typed.textContent();
  assert.ok(copy.length < processCopy.length && processCopy.startsWith(copy));
  assert.equal(await full.textContent(), processCopy);
  const frames = await page.evaluate(() => window.animationCalls.filter(call => call.scene === 'process' && call.part.startsWith('typing-')));
  assert.equal(frames.length, 2);
  assert.ok(frames.every(frame => frame.duration === 280 && frame.iterations === 9));
  await process.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 2800; animation.play(); }));
  await finished(page, 'process');
  assert.equal(await full.evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await typed.textContent(), '');
  assert.equal(await page.locator('#process-card').textContent(), 'Contenido permanente de la tarjeta');
  assert.equal(await page.locator('#process-card').evaluate(element => element.getAnimations().length), 0);
  const calls = await page.evaluate(() => window.animationCalls.length);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await process.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
  await clean(result);
});

test('saludo extiende el ciclo, inmoviliza actor y muestra welcome/bubble solo en la parada', async () => {
  const result = await pageFor();
  const { page } = result;
  await enter(page, 'flight');
  const samples = await scene(page, 'flight').evaluate(element => {
    const actor = element.querySelector('[data-mascot-actor]');
    const animations = element.getAnimations({ subtree: true });
    const clock = actor.getAnimations()[0];
    const duration = clock.effect.getTiming().duration;
    animations.forEach(animation => animation.pause());
    const sample = offset => {
      animations.forEach(animation => { animation.currentTime = offset * duration; });
      const matrix = new DOMMatrix(getComputedStyle(actor).transform);
      return { offset, x: matrix.m41, transform: [matrix.m11, matrix.m12, matrix.m21, matrix.m22, matrix.m41, matrix.m42],
        parts: ['flying', 'landed', 'greeting', 'trail'].map(name => getComputedStyle(element.querySelector(`[data-mascot-part="${name}"]`)).opacity),
        angle: Math.atan2(new DOMMatrix(getComputedStyle(element.querySelector('[data-mascot-part="landed"]')).transform).b,
          new DOMMatrix(getComputedStyle(element.querySelector('[data-mascot-part="landed"]')).transform).a) * 180 / Math.PI };
    };
    return { duration, iterations: clock.effect.getTiming().iterations, frames: clock.effect.getKeyframes(),
      samples: [0, .26, .27, .285, .29, .35, .43, .6, .699, .7, .701, .72, .74, .85, 1.05].map(sample) };
  });
  assert.equal(samples.duration, 8800);
  assert.equal(samples.iterations, Infinity);
  const at = offset => samples.samples.find(sample => sample.offset === offset);
  const hold = [.27, .29, .35, .43, .6, .7, .72].map(offset => at(offset).x);
  assert.ok(hold.every(x => Math.abs(x - hold[0]) < .01));
  assert.ok([.29, .35, .43, .6, .7, .72].every(offset => at(offset).transform
    .every((value, index) => Math.abs(value - at(.27).transform[index]) < .01)), 'El actor no se traslada ni inclina durante el saludo');
  // WAAPI interpola offsets binarios: en el límite puede devolver 5e-15 en lugar de cero.
  for (const offset of [.27, .72]) assert.ok(at(offset).parts.slice(0, 2)
    .every((value, index) => Math.abs(Number(value) - index) < 1e-12));
  assert.deepEqual(at(.35).parts, ['0', '1', '1', '0']);
  assert.deepEqual(at(.6).parts, ['0', '1', '1', '0']);
  assert.equal(at(0).parts[2], '0');
  assert.equal(at(.26).parts[2], '0');
  assert.equal(at(.285).parts[2], '0');
  assert.equal(at(.29).parts[2], '1');
  assert.equal(at(.699).parts[2], '1');
  assert.equal(at(.7).parts[2], '0');
  assert.equal(at(.701).parts[2], '0');
  assert.equal(at(.74).parts[2], '0');
  assert.deepEqual(at(.85).parts.slice(0, 3), ['1', '0', '0']);
  assert.ok(at(.85).x > at(.72).x, 'El vuelo continúa a la derecha después del saludo');
  assert.ok(at(1.05).x < at(.27).x, 'El siguiente ciclo vuelve a entrar desde la izquierda');
  assert.ok([.35, .43].some(offset => Math.abs(at(offset).angle) > .5));
  assert.ok(samples.samples.every(sample => Math.abs(sample.angle) <= 4.01));
  assert.equal(await scene(page, 'flight').locator('[data-mascot-part="greeting"]').getAttribute('aria-live'), null);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await finished(page, 'flight');
  assert.equal(await scene(page, 'flight').locator('[data-mascot-part="greeting"]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await scene(page, 'flight').locator('[data-mascot-part="landed"]').evaluate(element => getComputedStyle(element).opacity), '1');
  await clean(result);
});

for (const trigger of ['viewport', 'hidden', 'resize', 'reduced']) test(`proceso: ${trigger} restaura la copia completa, limpia y no repite`, async () => {
  const result = await pageFor({}, undefined, undefined, '?process=1');
  const { page } = result;
  const process = scene(page, 'process');
  const full = process.locator('[data-mascot-copy-full]');
  const typed = process.locator('[data-mascot-copy-typed]');
  await enter(page, 'process');
  await process.locator('[data-mascot-actor]').evaluate(element => {
    const clock = element.getAnimations()[0];
    clock.pause(); clock.currentTime = 1500;
  });
  await page.waitForFunction(() => document.querySelector('[data-mascot-scene="process"] [data-mascot-copy-typed]').textContent.length > 0);
  const calls = await page.evaluate(() => window.animationCalls.length);
  if (trigger === 'viewport') await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  else if (trigger === 'hidden') await hidden(page, true);
  else if (trigger === 'resize') await page.setViewportSize({ width: 900, height: 720 });
  else await page.emulateMedia({ reducedMotion: 'reduce' });
  await state(page, 'process', trigger === 'reduced' ? 'static' : 'finished');
  assert.equal(await process.evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  assert.equal(await typed.textContent(), '');
  assert.equal(await full.textContent(), processCopy);
  assert.equal(await full.evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await process.locator('[data-mascot-part="window"]').evaluate(element => element.classList.contains('is-typing')), false);
  assert.equal(await page.evaluate(() => window.pendingSceneFrames.size), 0);
  if (trigger === 'hidden') await hidden(page, false);
  else if (trigger === 'reduced') await page.emulateMedia({ reducedMotion: 'no-preference' });
  await process.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.initScenes());
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
  assert.equal(await page.locator('#process-card').textContent(), 'Contenido permanente de la tarjeta');
  await clean(result);
});

for (const invalid of ['without=greeting', 'invalid=greeting']) test(`${invalid}: vuelo queda estático y el control oculto`, async () => {
  const result = await pageFor({}, undefined, undefined, `?${invalid}`);
  assert.equal(await scene(result.page, 'flight').getAttribute('data-mascot-state'), 'static');
  assert.equal(await scene(result.page, 'flight').evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  assert.equal(await toggle(result.page).isVisible(), false);
  assert.equal(await toggle(result.page).locator('svg').count(), 1);
  assert.equal(await scene(result.page, 'flight').locator('[data-mascot-part="landed"]').evaluate(element => getComputedStyle(element).opacity), '1');
  await clean(result);
});

test('proceso sin JavaScript o sin rAF conserva texto accesible y frame A visibles', async () => {
  const noJS = await pageFor({ javaScriptEnabled: false }, undefined, undefined, '?process=1');
  const process = scene(noJS.page, 'process');
  assert.equal(await process.locator('[data-mascot-copy-full]').textContent(), processCopy);
  assert.equal(await process.locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await process.locator('[data-mascot-copy-typed]').textContent(), '');
  assert.equal(await process.locator('[data-mascot-part="typing-a"]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await process.locator('[data-mascot-part="typing-b"]').evaluate(element => getComputedStyle(element).opacity), '0');
  assert.deepEqual(noJS.errors, []);
  await noJS.context.close();
  const noRAF = await pageFor({}, () => { window.requestAnimationFrame = undefined; }, undefined, '?process=1');
  assert.equal(await scene(noRAF.page, 'process').getAttribute('data-mascot-state'), 'static');
  assert.equal(await scene(noRAF.page, 'process').locator('[data-mascot-copy-full]').textContent(), processCopy);
  assert.equal(await scene(noRAF.page, 'process').locator('[data-mascot-copy-full]').evaluate(element => getComputedStyle(element).opacity), '1');
  assert.equal(await noRAF.page.evaluate(() => window.animationCalls.length), 0);
  await clean(noRAF);
});

test('control conserva el SVG, usa nombre/title nuevos y data-paused al pausar y reanudar', async () => {
  const result = await pageFor();
  const { page } = result;
  const svg = await toggle(page).locator('svg').evaluate(element => element.outerHTML);
  await enter(page, 'flight');
  assert.equal(await toggle(page).locator('svg').count(), 1);
  assert.equal(await toggle(page).textContent(), '');
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Pausar animación de Sarin');
  assert.equal(await toggle(page).getAttribute('title'), 'Pausar animación de Sarin');
  assert.equal(await toggle(page).getAttribute('data-paused'), 'false');
  await toggle(page).click();
  await pausedFlight(page);
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Reanudar animación de Sarin');
  assert.equal(await toggle(page).getAttribute('title'), 'Reanudar animación de Sarin');
  assert.equal(await toggle(page).getAttribute('data-paused'), 'true');
  await toggle(page).click();
  await state(page, 'flight', 'playing');
  assert.equal(await toggle(page).getAttribute('aria-label'), 'Pausar animación de Sarin');
  assert.equal(await toggle(page).getAttribute('data-paused'), 'false');
  assert.equal(await toggle(page).locator('svg').evaluate(element => element.outerHTML), svg);
  assert.equal(await toggle(page).textContent(), '');
  await clean(result);
});

test('tarjetas Proceso escriben título→párrafo, conservan texto/altura y terminan una sola vez', async () => {
  const result = await pageFor({}, undefined, undefined, '?steps=1');
  const { page } = result;
  for (const [kind, title, copy] of steps) {
    const card = scene(page, kind);
    const full = card.locator('[data-mascot-copy-full]');
    const typed = card.locator('[data-mascot-copy-typed]');
    const height = await card.evaluate(element => element.getBoundingClientRect().height);
    const speaker = await card.locator('.process-speaker').textContent();
    await enter(page, kind);
    assert.equal(await card.getAttribute('aria-hidden'), null);
    assert.equal(await card.locator('[data-mascot-actor]').getAttribute('aria-hidden'), 'true');
    assert.deepEqual(await full.allTextContents(), [title, copy]);
    assert.deepEqual(await full.evaluateAll(elements => elements.map(element => element.getAttribute('aria-hidden'))), [null, null]);
    assert.deepEqual(await typed.evaluateAll(elements => elements.map(element => element.getAttribute('aria-hidden'))), ['true', 'true']);
    const duration = await card.evaluate(element => {
      const animations = element.getAnimations({ subtree: true });
      animations.forEach(animation => { animation.pause(); animation.currentTime = 3600 * .12; });
      return element.querySelector('[data-mascot-actor]').getAnimations()[0].effect.getTiming().duration;
    });
    assert.equal(duration, 3600);
    await page.waitForFunction(kind => document.querySelector(`[data-mascot-scene="${kind}"] h3 [data-mascot-copy-typed]`).textContent.length > 0, kind);
    const beginning = await typed.allTextContents();
    assert.ok(beginning[0].length < title.length && title.startsWith(beginning[0]));
    assert.equal(beginning[1], '');
    await card.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 1800; }));
    await page.waitForFunction(kind => document.querySelector(`[data-mascot-scene="${kind}"] p [data-mascot-copy-typed]`).textContent.length > 0, kind);
    const middle = await typed.allTextContents();
    assert.equal(middle[0], title);
    assert.ok(middle[1].length < copy.length && copy.startsWith(middle[1]));
    assert.deepEqual(await full.allTextContents(), [title, copy]);
    assert.equal(await card.evaluate(element => element.getBoundingClientRect().height), height);
    assert.equal(await card.locator('.process-speaker').textContent(), speaker);
    await card.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 3500; animation.play(); }));
    await finished(page, kind);
    assert.deepEqual(await typed.allTextContents(), ['', '']);
    assert.deepEqual(await full.evaluateAll(elements => elements.map(element => getComputedStyle(element).opacity)), ['1', '1']);
    const calls = await page.evaluate(() => window.animationCalls.length);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.initScenes());
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
  }
  await clean(result);
});

test('tarjetas Proceso esperan el 60% visible y mantienen el umbral anterior de otras escenas', async () => {
  const result = await pageFor({}, undefined, undefined, '?steps=1');
  const { page } = result;
  const card = scene(page, 'step-define');
  await card.evaluate(element => {
    const rect = element.getBoundingClientRect();
    scrollTo({ top: scrollY + rect.top - innerHeight + rect.height * .59, behavior: 'instant' });
  });
  await page.waitForTimeout(100);
  assert.equal(await card.getAttribute('data-mascot-state'), 'idle');
  assert.equal(await card.evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  await card.evaluate(element => {
    const rect = element.getBoundingClientRect();
    scrollTo({ top: scrollY + rect.top - innerHeight + rect.height * .61, behavior: 'instant' });
  });
  await state(page, 'step-define', 'playing');
  await hidden(page, true);
  await finished(page, 'step-define');
  await hidden(page, false);
  await scene(page, 'projects').evaluate(element => {
    const rect = element.getBoundingClientRect();
    scrollTo({ top: scrollY + rect.top - innerHeight + rect.height * .4, behavior: 'instant' });
  });
  await state(page, 'projects', 'playing');
  await hidden(page, true);
  await finished(page, 'projects');
  await clean(result);
});

test('gestos de las tarjetas respetan amplitud compacta, cuerpo fijo al teclear y aprobación final', async () => {
  for (const compact of [false, true]) {
    const result = await pageFor(compact ? { viewport: { width: 390, height: 844 } } : {}, undefined, undefined, '?steps=1');
    const { page } = result;
    for (const [kind] of steps) {
      await enter(page, kind);
      const frames = await scene(page, kind).locator('[data-mascot-actor]').evaluate(element => {
        const effect = element.getAnimations()[0].effect;
        return { duration: effect.getTiming().duration, iterations: effect.getTiming().iterations,
          frames: effect.getKeyframes().map(frame => {
            const matrix = new DOMMatrix(frame.transform);
            return { y: matrix.m42, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, identity: matrix.isIdentity };
          }) };
      });
      assert.equal(frames.duration, 3600);
      assert.equal(frames.iterations, 1);
      if (kind === 'step-define') {
        assert.ok(frames.frames.every(frame => Math.abs(frame.y) <= (compact ? 1 : 3) && Math.abs(frame.angle) <= 3.01));
        assert.ok(frames.frames.some(frame => frame.angle < -2.5) && frames.frames.some(frame => frame.angle > 2.5));
        assert.ok(frames.frames.some(frame => frame.y === (compact ? -1 : -3)));
      } else if (kind === 'step-build') {
        assert.ok(frames.frames.every(frame => frame.identity));
        const calls = await page.evaluate(() => window.animationCalls.filter(call => call.scene === 'step-build' && call.part.startsWith('typing-')));
        assert.equal(calls.length, 2);
        assert.ok(calls.every(call => call.duration === 280 && call.delay === 120 && call.iterations === 12));
        const poses = await scene(page, kind).evaluate(element => {
          const parts = ['typing-a', 'typing-b'].map(name => element.querySelector(`[data-mascot-part="${name}"]`));
          return [190, 330].map(time => {
            parts.forEach(part => { const animation = part.getAnimations()[0]; animation.pause(); animation.currentTime = time; });
            return parts.map(part => getComputedStyle(part).opacity);
          });
        });
        assert.deepEqual(poses, [['1', '0'], ['0', '1']]);
      } else {
        assert.ok(frames.frames.every(frame => Math.abs(frame.angle) <= 2.01));
        assert.ok(frames.frames.some(frame => frame.angle > 1.9));
        const approval = await scene(page, kind).locator('[data-mascot-part="approval"]').evaluate(element => {
          const animation = element.getAnimations()[0];
          animation.pause();
          return [.74, .825, .9].map(offset => {
            animation.currentTime = 3600 * offset;
            return Number(getComputedStyle(element).opacity);
          });
        });
        assert.ok(Math.abs(approval[0]) < 1e-12 && Math.abs(approval[1] - .5) < 1e-6 && Math.abs(approval[2] - 1) < 1e-12);
      }
      await hidden(page, true);
      await finished(page, kind);
      await hidden(page, false);
    }
    await clean(result);
  }
});

test('cancelaciones de tarjetas limpian ambos overlays, restauran completos y no repiten', async () => {
  const triggers = ['viewport', 'hidden', 'resize', 'reduced', 'pagehide'];
  for (const [index, trigger] of triggers.entries()) {
    const result = await pageFor({}, undefined, undefined, '?steps=1');
    const { page } = result;
    const [kind, title, copy] = steps[index % steps.length];
    const card = scene(page, kind);
    await enter(page, kind);
    await card.locator('[data-mascot-actor]').evaluate(element => {
      const clock = element.getAnimations()[0];
      clock.pause(); clock.currentTime = 1800;
    });
    await page.waitForFunction(kind => document.querySelector(`[data-mascot-scene="${kind}"] p [data-mascot-copy-typed]`).textContent.length > 0, kind);
    const calls = await page.evaluate(() => window.animationCalls.length);
    if (trigger === 'viewport') await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    else if (trigger === 'hidden') await hidden(page, true);
    else if (trigger === 'resize') await page.setViewportSize({ width: 900, height: 720 });
    else if (trigger === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
    else await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await state(page, kind, trigger === 'reduced' ? 'static' : 'finished');
    assert.equal(await card.evaluate(element => element.getAnimations({ subtree: true }).length), 0);
    assert.deepEqual(await card.locator('[data-mascot-copy-full]').allTextContents(), [title, copy]);
    assert.deepEqual(await card.locator('[data-mascot-copy-full]').evaluateAll(elements => elements.map(element => getComputedStyle(element).opacity)), ['1', '1']);
    assert.deepEqual(await card.locator('[data-mascot-copy-typed]').allTextContents(), ['', '']);
    assert.equal(await card.locator('[data-mascot-part="window"]').evaluate(element => element.classList.contains('is-typing')), false);
    assert.equal(await page.evaluate(() => window.pendingSceneFrames.size), 0);
    if (trigger === 'hidden') await hidden(page, false);
    else if (trigger === 'reduced') await page.emulateMedia({ reducedMotion: 'no-preference' });
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.initScenes());
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => window.animationCalls.length), calls);
    await clean(result);
  }
});

test('error en el segundo overlay restaura ambos textos originales y limpia todos los efectos', async () => {
  const result = await pageFor({}, undefined, undefined, '?steps=1');
  const { page } = result;
  const card = scene(page, 'step-build');
  await enter(page, 'step-build');
  await card.evaluate(element => {
    const typed = element.querySelector('p [data-mascot-copy-typed]');
    const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(typed, 'textContent', {
      configurable: true, get() { return descriptor.get.call(this); },
      set() { delete this.textContent; throw new Error('Segundo overlay interrumpido una vez'); },
    });
    const clock = element.querySelector('[data-mascot-actor]').getAnimations()[0];
    clock.pause(); clock.currentTime = 1800;
  });
  await state(page, 'step-build', 'static');
  assert.deepEqual(await card.locator('[data-mascot-copy-full]').allTextContents(), [steps[1][1], steps[1][2]]);
  assert.deepEqual(await card.locator('[data-mascot-copy-typed]').allTextContents(), ['', '']);
  assert.deepEqual(await card.locator('[data-mascot-copy-full]').evaluateAll(elements => elements.map(element => getComputedStyle(element).opacity)), ['1', '1']);
  assert.equal(await card.evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  await clean(result);
});

test('fallback de tarjetas sin JS/API o con pareja inválida mantiene textos y poses', async () => {
  const noJS = await pageFor({ javaScriptEnabled: false }, undefined, undefined, '?steps=1');
  for (const [kind, title, copy] of steps) {
    const card = scene(noJS.page, kind);
    assert.deepEqual(await card.locator('[data-mascot-copy-full]').allTextContents(), [title, copy]);
    assert.deepEqual(await card.locator('[data-mascot-copy-full]').evaluateAll(elements => elements.map(element => getComputedStyle(element).opacity)), ['1', '1']);
    assert.deepEqual(await card.locator('[data-mascot-copy-typed]').allTextContents(), ['', '']);
    assert.equal(await card.locator('[data-mascot-actor]').evaluate(element => getComputedStyle(element).transform), 'none');
  }
  assert.deepEqual(noJS.errors, []);
  await noJS.context.close();
  const noRAF = await pageFor({}, () => { window.requestAnimationFrame = undefined; }, undefined, '?steps=1');
  for (const [kind, title, copy] of steps) {
    const card = scene(noRAF.page, kind);
    assert.equal(await card.getAttribute('data-mascot-state'), 'static');
    assert.deepEqual(await card.locator('[data-mascot-copy-full]').allTextContents(), [title, copy]);
    assert.deepEqual(await card.locator('[data-mascot-copy-full]').evaluateAll(elements => elements.map(element => getComputedStyle(element).opacity)), ['1', '1']);
  }
  assert.equal(await noRAF.page.evaluate(() => window.animationCalls.length), 0);
  await clean(noRAF);
  const invalid = await pageFor({}, undefined, undefined, '?steps=1&invalidpair=1');
  await scene(invalid.page, 'step-define').scrollIntoViewIfNeeded();
  await state(invalid.page, 'step-define', 'static');
  assert.deepEqual(await scene(invalid.page, 'step-define').locator('[data-mascot-copy-full]').allTextContents(), [steps[0][1], steps[0][2]]);
  assert.equal(await scene(invalid.page, 'step-define').evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  await clean(invalid);
});
