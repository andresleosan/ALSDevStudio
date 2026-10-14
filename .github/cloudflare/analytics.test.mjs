import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '../capturas/node_modules/playwright/index.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const KEY = 'als:analytics-consent:cloudflare:v1';
const OLD_KEY = 'als:analytics-consent:v1';
const VENDOR = 'https://static.cloudflareinsights.com/beacon.min.js';
const TOKEN = 'c2385e2589ca41c1887705cd00d06d8f'; // Public site identifier.
const engines = { chromium, firefox, webkit };
const browserName = process.env.CF_QA_BROWSER || 'chromium';
assert.ok(Object.hasOwn(engines, browserName), 'CF_QA_BROWSER debe ser chromium, firefox o webkit');
const vendor = await readFile(resolve(root, 'test-results/cloudflare-beacon.min.js'), 'utf8').catch(error => {
  if (error.code !== 'ENOENT') throw error;
  throw new Error('Falta test-results/cloudflare-beacon.min.js. Descarga el fixture público oficial preservando sus bytes: curl.exe --user-agent "Mozilla/5.0" --referer https://developers.cloudflare.com/ --output test-results/cloudflare-beacon.min.js https://static.cloudflareinsights.com/beacon.min.js . El SHA-256 debe coincidir con el fixture inspeccionado abajo; si el proveedor actualizó el SDK, revisa su comportamiento antes de actualizar el hash. Las pruebas no descargan ni envían datos por la red.', { cause: error });
});
assert.equal(createHash('sha256').update(vendor).digest('hex'), '3e5bc7ca508f5d5aa7255341243840c8d2b70c8aea323800b51610df3f5a8a2c', 'fixture oficial inspeccionado: 2026.10.0');
let browser;
before(async () => { browser = await engines[browserName].launch({ headless: true }); });
after(async () => { await browser?.close(); });

const saved = (choice = 'accepted', updatedAt = Date.now()) => ({ choice, updatedAt });
const shell = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>ALS · preferencias</title><link rel="stylesheet" href="/styles/main.css"></head><body><main id="contenido" tabindex="-1"><h1>ALS DevStudio</h1><img src="/assets/projects/surtifacil.png" width="240" height="150" alt="Proyecto Surtifácil"></main><footer><button data-analytics-preferences hidden>Preferencias de analítica</button></footer><script src="/scripts/analytics.js" defer></script></body></html>`;

async function harness(options = {}) {
  const context = await browser.newContext({ viewport: options.viewport || { width: 900, height: 800 }, serviceWorkers: 'block' });
  const target = options.url || 'https://www.alsdevstudio.com/';
  const source = options.referrer ? new URL(options.referrer).href : null;
  const requests = [], payloads = [], violations = [], writes = [];
  let releaseVendor;
  const pendingVendor = new Promise(resolve => { releaseVendor = resolve; });
  await context.exposeBinding('__recordConsentWrite', (_source, data) => { writes.push(data); });
  await context.addInitScript(({ key, oldKey, choice, oldChoice, blockSet, blockRemove, blockGet }) => {
    if (!localStorage.getItem('als:test:seeded')) {
      if (choice !== undefined) localStorage.setItem(key, JSON.stringify(choice));
      if (oldChoice !== undefined) localStorage.setItem(oldKey, JSON.stringify(oldChoice));
      localStorage.setItem('als:test:seeded', 'yes');
    }
    const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem, nativeGet = Storage.prototype.getItem;
    window.__storageFaults = { set: blockSet, remove: blockRemove, get: blockGet };
    Storage.prototype.getItem = function (name) {
      if (name === key && window.__storageFaults.get) throw new DOMException('Lectura bloqueada para prueba', 'SecurityError');
      return nativeGet.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) {
        window.__recordConsentWrite({ value, blocked: [...document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')].some(meta => meta.content.includes("connect-src 'none'")) });
        if (window.__storageFaults.set) throw new DOMException('Almacenamiento bloqueado para prueba', 'SecurityError');
      }
      return nativeSet.call(this, name, value);
    };
    Storage.prototype.removeItem = function (name) {
      if (name === key && window.__storageFaults.remove) throw new DOMException('Almacenamiento bloqueado para prueba', 'SecurityError');
      return nativeRemove.call(this, name);
    };
    document.addEventListener('securitypolicyviolation', event => { window.__violations = [...(window.__violations || []), event.effectiveDirective]; });
  }, { key: KEY, oldKey: OLD_KEY, choice: options.choice, oldChoice: options.oldChoice, blockSet: options.blockSet, blockRemove: options.blockRemove, blockGet: options.blockGet });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    requests.push({ url: request.url(), method: request.method() });
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/cdn-cgi/rum') {
      if (request.postData()) payloads.push(JSON.parse(request.postData()));
      return route.fulfill({ status: 204, headers: cors });
    }
    if (request.url() === VENDOR) {
      if (options.pendingVendor) await pendingVendor;
      return route.fulfill({ contentType: 'text/javascript', headers: cors, body: vendor }).catch(() => {});
    }
    if (url.pathname === '/scripts/analytics.js') return route.fulfill({ contentType: 'text/javascript', body: await readFile(resolve(root, 'scripts/analytics.js'), 'utf8') });
    if (url.pathname === '/styles/main.css') return route.fulfill({ contentType: 'text/css', body: await readFile(resolve(root, 'styles/main.css'), 'utf8') });
    if (url.pathname === '/assets/projects/surtifacil.png') return route.fulfill({ contentType: 'image/png', body: await readFile(resolve(root, 'assets/projects/surtifacil.png')) });
    if (source && url.href === source && request.isNavigationRequest()) {
      // Navegación real: goto({referer}) no rellena document.referrer en Firefox.
      // Solo el origen fixture usa unsafe-url para entregar queries deliberadas
      // al filtro; no se cambia document.referrer ni ningún payload del SDK.
      const href = target.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
      return route.fulfill({ contentType: 'text/html', headers: { 'referrer-policy': 'unsafe-url' }, body: `<!doctype html><html lang="es"><head><title>Origen de prueba</title></head><body><a id="enter-target" href="${href}">Entrar al sitio</a></body></html>` });
    }
    if (request.isNavigationRequest()) return route.fulfill({ contentType: 'text/html', headers: { 'content-security-policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com" }, body: shell });
    // Every request is intercepted; no analytics or other external request can escape.
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  page.on('console', message => { if (message.text().includes('Content Security Policy')) violations.push(message.text()); });
  if (source) {
    await page.goto(source);
    await page.locator('#enter-target').click();
    await page.waitForLoadState('load');
  } else await page.goto(target);
  await page.locator('#analytics-preferences').waitFor({ state: 'attached' });
  return { context, page, requests, payloads, violations, writes, releaseVendor, async close() { releaseVendor(); await context.close(); } };
}

const vendorCount = h => h.requests.filter(request => request.url === VENDOR).length;
async function eventually(read, expected, message) {
  for (let i = 0; i < 30 && read() !== expected; i++) await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(read(), expected, message);
}

test('aceptar carga el beacon oficial y envía una sola visita automática', async () => {
  const h = await harness();
  try {
    await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).click();
    await eventually(() => vendorCount(h), 1, 'aceptar debe solicitar Cloudflare, no el SDK Vercel');
    await eventually(() => h.payloads.filter(payload => payload.eventType === 1).length, 1, 'el runtime oficial mide la visita');
    assert.equal(h.payloads[0].siteToken, TOKEN);
    assert.equal(h.payloads[0].location, 'https://www.alsdevstudio.com/');
    assert.deepEqual(await h.page.locator('script[data-cf-beacon]').evaluate(script => ({ type: script.type, options: JSON.parse(script.dataset.cfBeacon) })), { type: 'module', options: { token: TOKEN, spa: false } });
    assert.deepEqual(await h.page.evaluate(() => [typeof window.va, typeof window.vaq]), ['undefined', 'undefined']);
    await h.page.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
    await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).click();
    await h.page.waitForTimeout(80);
    assert.equal(vendorCount(h), 1, 'aceptar repetidamente no duplica SDK ni visita');
    assert.equal(h.payloads.filter(payload => payload.eventType === 1).length, 1);
  } finally { await h.close(); }
});

test('sin elección, rechazo y aceptación antigua no cargan ni envían analítica', async () => {
  for (const options of [{}, { choice: saved('denied') }, { oldChoice: saved() }]) {
    const h = await harness(options);
    try {
      await h.page.waitForTimeout(80);
      assert.equal(vendorCount(h), 0);
      assert.equal(h.payloads.length, 0);
      if (!(await h.page.locator('dialog').evaluate(dialog => dialog.open))) await h.page.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
      await h.page.getByRole('button', { name: 'Rechazar analítica', exact: true }).click();
      assert.equal(await h.page.evaluate(key => JSON.parse(localStorage.getItem(key)).choice, KEY), 'denied');
      assert.equal(vendorCount(h), 0);
    } finally { await h.close(); }
  }
});

test('elecciones inválidas o vencidas nunca autorizan el SDK', async () => {
  const invalid = [saved('other'), saved('accepted', Date.now() + 60000), saved('accepted', Date.now() - 180 * 86400000), { ...saved(), unexpected: true }, { choice: 'accepted', updatedAt: '2026-10-13' }, null];
  for (const choice of invalid) {
    const h = await harness({ choice });
    try { await h.page.waitForTimeout(40); assert.equal(vendorCount(h), 0); assert.equal(h.payloads.length, 0); }
    finally { await h.close(); }
  }
});

test('solo hostname canónico y rutas conocidas miden visitas', async () => {
  const rejected = [
    { url: 'https://alsdevstudio.com/' }, { url: 'https://preview.pages.dev/' },
    { url: 'https://www.alsdevstudio.com/desconocida' }
  ];
  for (const options of rejected) {
    const h = await harness({ choice: saved(), ...options });
    try { await h.page.waitForTimeout(50); assert.equal(vendorCount(h), 0, JSON.stringify(options)); assert.equal(h.payloads.length, 0); }
    finally { await h.close(); }
  }
});

// Firefox 142 + Playwright 1.56.1 entrega document.referrer vacío en estas
// navegaciones interceptadas, incluso con cabecera Referer correcta. Reproducción
// same-origin confirmada; comportamiento relacionado: microsoft/playwright#19565.
// No simular ni falsificar el referente para declarar esta rama como probada.
test('referentes con rutas desconocidas o queries impiden cargar el beacon', {
  skip: browserName === 'firefox' ? 'Limitación verificada de Firefox/Playwright: document.referrer vacío bajo navegación interceptada; filtro no ejercitable aquí' : false
}, async () => {
  const rejected = [
    { referrer: 'https://search.example/private/path' },
    { referrer: 'https://search.example/?email=visitor%40example.test' },
    { referrer: 'https://www.alsdevstudio.com/cookies.html?private=hidden' },
    { referrer: 'https://www.alsdevstudio.com/desconocida' }
  ];
  for (const options of rejected) {
    const h = await harness({ choice: saved(), ...options });
    try { await h.page.waitForTimeout(50); assert.equal(vendorCount(h), 0, JSON.stringify(options)); assert.equal(h.payloads.length, 0); }
    finally { await h.close(); }
  }
});

test('runtime oficial limpia query/hash de rutas permitidas y conserva solo referente disponible', async t => {
  if (browserName === 'firefox') t.diagnostic('Firefox entrega document.referrer vacío con interceptación: se comprueba omisión del campo, no el filtro de referentes no vacíos.');
  for (const path of ['/', '/index.html', '/privacidad', '/privacidad.html', '/terminos', '/terminos.html', '/cookies', '/cookies.html']) {
    const h = await harness({ choice: saved(), url: `https://www.alsdevstudio.com${path}?private=visitor%40example.test#sensitive`, referrer: 'https://www.alsdevstudio.com/cookies.html' });
    try {
      await eventually(() => h.payloads.filter(payload => payload.eventType === 1).length, 1, `ruta permitida: ${path}`);
      assert.equal(h.payloads[0].location, `https://www.alsdevstudio.com${path}`);
      if (browserName === 'firefox') {
        assert.equal(await h.page.evaluate(() => document.referrer), '');
        assert.equal(h.payloads[0].referrer, undefined);
      } else assert.equal(h.payloads[0].referrer, 'https://www.alsdevstudio.com/cookies.html');
      assert.ok(!JSON.stringify(h.payloads).includes('visitor%40example.test'));
      assert.ok(!JSON.stringify(h.payloads).includes('sensitive'));
      assert.equal(vendorCount(h), 1);
    } finally { await h.close(); }
  }
});

test('revocar añade CSP antes de persistir y evita el beacon final de la recarga', async () => {
  const h = await harness({ choice: saved() });
  try {
    await eventually(() => h.payloads.filter(payload => payload.eventType === 1).length, 1);
    await h.page.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
    const navigation = h.page.waitForEvent('domcontentloaded');
    await h.page.getByRole('button', { name: 'Rechazar analítica', exact: true }).click();
    await navigation;
    await eventually(() => h.writes.filter(write => JSON.parse(write.value).choice === 'denied').length, 1);
    assert.equal(h.writes.find(write => JSON.parse(write.value).choice === 'denied').blocked, true);
    assert.equal(await h.page.evaluate(key => JSON.parse(localStorage.getItem(key)).choice, KEY), 'denied');
    await h.page.waitForTimeout(80);
    assert.equal(vendorCount(h), 1);
    assert.equal(h.payloads.length, 1, 'la recarga no transmite métricas tras retirar');
  } finally { await h.close(); }
});

test('retirar con el SDK pendiente bloquea conexiones antes de recargar', async () => {
  const h = await harness({ pendingVendor: true });
  try {
    await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).click();
    await eventually(() => vendorCount(h), 1);
    await h.page.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
    const navigation = h.page.waitForEvent('domcontentloaded');
    await h.page.getByRole('button', { name: 'Rechazar analítica', exact: true }).click();
    await navigation;
    h.releaseVendor();
    await h.page.waitForTimeout(80);
    assert.equal(h.writes.find(write => JSON.parse(write.value).choice === 'denied').blocked, true);
    assert.equal(h.payloads.length, 0);
    assert.equal(vendorCount(h), 1);
  } finally { await h.close(); }
});

test('fallo de set/remove al retirar deja CSP bloqueante, error legible y no recarga', async () => {
  const h = await harness({ choice: saved(), blockSet: true, blockRemove: true });
  try {
    await eventually(() => h.payloads.length, 1);
    await h.page.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
    await h.page.getByRole('button', { name: 'Rechazar analítica', exact: true }).click();
    await h.page.waitForTimeout(80);
    assert.equal(h.requests.filter(request => request.url === 'https://www.alsdevstudio.com/').length, 1, 'no recargar hacia aceptación anterior');
    assert.match(await h.page.locator('[data-analytics-status]').textContent(), /No se pudo guardar|No pudimos/i);
    assert.equal(await h.page.locator('dialog').evaluate(dialog => dialog.open), true);
    assert.equal(await h.page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'), "connect-src 'none'");
    // Simula ocultación para disparar el listener real del vendor en el documento vivo.
    await h.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await h.page.waitForTimeout(80);
    assert.equal(h.payloads.length, 1, 'CSP bloquea sendBeacon del vendor que sigue instalado');
    assert.ok((await h.page.evaluate(() => window.__violations || [])).includes('connect-src'));
  } finally { await h.close(); }
});

test('set bloqueado con remove permitido elimina aceptación antigua antes de recargar', async () => {
  const h = await harness({ choice: saved(), blockSet: true });
  try {
    await eventually(() => h.payloads.length, 1);
    await h.page.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
    const navigation = h.page.waitForEvent('domcontentloaded');
    await h.page.getByRole('button', { name: 'Rechazar analítica', exact: true }).click();
    await navigation;
    assert.equal(await h.page.evaluate(key => localStorage.getItem(key), KEY), null);
    assert.equal(vendorCount(h), 1);
    assert.equal(h.payloads.length, 1);
  } finally { await h.close(); }
});

test('aceptar con almacenamiento bloqueado no carga analítica y muestra el fallo', async () => {
  const h = await harness({ blockSet: true });
  try {
    await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).click();
    assert.equal(vendorCount(h), 0);
    assert.equal(h.payloads.length, 0);
    assert.match(await h.page.locator('[data-analytics-status]').textContent(), /No se pudo guardar/i);
  } finally { await h.close(); }
});

test('lectura bloqueada nunca reutiliza la aceptación conservada', async () => {
  const h = await harness({ choice: saved(), blockGet: true });
  try {
    assert.equal(vendorCount(h), 0);
    await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).click();
    assert.equal(vendorCount(h), 0);
    assert.equal(h.payloads.length, 0);
    assert.match(await h.page.locator('[data-analytics-status]').textContent(), /No se pudo guardar/i);
    assert.equal(await h.page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 0);
  } finally { await h.close(); }
});

test('reaceptar tras CSP bloqueante persiste primero y renueva el documento', async () => {
  const h = await harness({ choice: saved(), blockSet: true, blockRemove: true });
  try {
    await eventually(() => h.payloads.filter(payload => payload.eventType === 1).length, 1);
    await h.page.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
    await h.page.getByRole('button', { name: 'Rechazar analítica', exact: true }).click();
    assert.equal(await h.page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'), "connect-src 'none'");
    await h.page.evaluate(() => { window.__storageFaults.set = false; window.__storageFaults.remove = false; });
    const navigation = h.page.waitForEvent('domcontentloaded');
    await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).click();
    await navigation;
    await eventually(() => h.payloads.filter(payload => payload.eventType === 1).length, 2);
    assert.equal(h.writes.find(write => JSON.parse(write.value).choice === 'accepted').blocked, true);
    assert.equal(h.requests.filter(request => request.url === 'https://www.alsdevstudio.com/').length, 2);
    assert.equal(vendorCount(h), 2);
    assert.equal(await h.page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 0);
  } finally { await h.close(); }
});

test('rechazo inicial y aceptación fallida dejan funcionar el fetch propio sin beacon', async () => {
  for (const options of [{}, { blockSet: true }]) {
    const h = await harness(options);
    try {
      await h.page.getByRole('button', { name: options.blockSet ? 'Aceptar analítica' : 'Rechazar analítica', exact: true }).click();
      const status = await h.page.evaluate(async () => (await fetch('/assets/projects/surtifacil.png')).status).catch(() => 'blocked');
      assert.equal(status, 200, 'la preferencia inicial no debe romper solicitudes propias como el mapa');
      assert.equal(vendorCount(h), 0);
      assert.equal(h.payloads.length, 0);
      assert.equal(await h.page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 0);
    } finally { await h.close(); }
  }
});

test('ocultación revalida retirada sin storage event en fase capture antes de colectores posteriores', async () => {
  const h = await harness({ choice: saved(), blockSet: true, blockRemove: true });
  try {
    await eventually(() => h.payloads.length, 1);
    const gateSeen = await h.page.evaluate(key => {
      window.__storageFaults.set = false;
      localStorage.setItem(key, JSON.stringify({ choice: 'denied', updatedAt: Date.now() }));
      window.__storageFaults.set = true;
      let blockedAtCapture = false;
      document.addEventListener('visibilitychange', () => { blockedAtCapture = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'); }, { capture: true, once: true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      return blockedAtCapture;
    }, KEY);
    assert.equal(gateSeen, true, 'la barrera debe existir ya durante capture');
    await h.page.waitForTimeout(80);
    assert.equal(h.payloads.length, 1);
  } finally { await h.close(); }
});

test('retirada en otra pestaña invalida documento activo sin transmitir métricas finales', async () => {
  const h = await harness({ choice: saved() });
  try {
    await eventually(() => h.payloads.filter(payload => payload.eventType === 1).length, 1);
    const other = await h.context.newPage();
    await other.goto('https://www.alsdevstudio.com/');
    await eventually(() => h.payloads.filter(payload => payload.eventType === 1).length, 2);
    await other.getByRole('button', { name: 'Preferencias de analítica', exact: true }).click();
    await other.getByRole('button', { name: 'Rechazar analítica', exact: true }).click();
    await eventually(() => h.requests.filter(request => request.url === 'https://www.alsdevstudio.com/').length, 4, 'ambos documentos se renuevan sin SDK');
    await h.page.waitForTimeout(100);
    assert.equal(vendorCount(h), 2);
    assert.equal(h.payloads.filter(payload => payload.eventType === 1).length, 2);
    assert.equal(h.writes.every(write => JSON.parse(write.value).choice !== 'denied' || write.blocked), true);
  } finally { await h.close(); }
});

test('pageshow persisted simulado revalida consentimiento y bloquea el documento restaurado', async () => {
  const h = await harness({ choice: saved() });
  try {
    await eventually(() => h.payloads.length, 1);
    const navigation = h.page.waitForEvent('domcontentloaded');
    await h.page.evaluate(key => { localStorage.removeItem(key); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }, KEY);
    await navigation;
    assert.equal(vendorCount(h), 1);
    assert.equal(h.payloads.length, 1);
    assert.equal(h.writes.find(write => JSON.parse(write.value).choice === 'denied').blocked, true);
  } finally { await h.close(); }
});

test('vencimiento en documento vivo se detecta antes del listener visibilitychange del vendor', async () => {
  const h = await harness({ choice: saved(), blockSet: true, blockRemove: true });
  try {
    await eventually(() => h.payloads.length, 1);
    await h.page.evaluate(() => { const realNow = Date.now; Date.now = () => realNow() + 181 * 86400000; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await h.page.waitForTimeout(80);
    assert.equal(h.payloads.length, 1);
    assert.equal(await h.page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'), "connect-src 'none'");
  } finally { await h.close(); }
});

for (const width of [320, 390]) test(`dialog accesible a ${width}px sin desborde horizontal y con cierre por Escape`, async () => {
  const h = await harness({ viewport: { width, height: 844 } });
  try {
    const bounds = await h.page.locator('dialog').evaluate(dialog => ({ rect: dialog.getBoundingClientRect().toJSON(), scroll: dialog.scrollWidth, client: dialog.clientWidth, name: document.getElementById(dialog.getAttribute('aria-labelledby')).textContent }));
    assert.ok(bounds.rect.x >= 0 && bounds.rect.right <= width);
    assert.ok(bounds.scroll <= bounds.client);
    assert.match(bounds.name, /visitas|rendimiento/i);
    await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).scrollIntoViewIfNeeded();
    const button = await h.page.getByRole('button', { name: 'Aceptar analítica', exact: true }).boundingBox();
    assert.ok(button.x >= 0 && button.x + button.width <= width);
    await h.page.keyboard.press('Escape');
    assert.equal(await h.page.locator('dialog').evaluate(dialog => dialog.open), false);
    assert.equal(vendorCount(h), 0);
  } finally { await h.close(); }
});
