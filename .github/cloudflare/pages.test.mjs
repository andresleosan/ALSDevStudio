import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { chromium } from '../capturas/node_modules/playwright/index.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = (process.env.PAGES_QA_BASE || 'http://127.0.0.1:8788').replace(/\/$/, '');
const origin = new URL(base).origin;
const preview = new URL(base).hostname === 'alsdevstudio.pages.dev' || new URL(base).hostname.endsWith('.alsdevstudio.pages.dev');
const normalize = text => text.replace(/\r\n/g, '\n');
let browser;
before(async () => { browser = await chromium.launch(); await mkdir(path.join(root, 'test-results'), { recursive: true }); });
after(async () => { await browser?.close(); });

test('Pages sirve el artefacto revisado, sus cabeceras y las imágenes sociales', async () => {
  for (const [route, file] of [['/', 'index.html'], ['/privacidad', 'privacidad.html'], ['/terminos', 'terminos.html'], ['/cookies', 'cookies.html'],
    ['/scripts/analytics.js', 'scripts/analytics.js'], ['/styles/main.css', 'styles/main.css'], ['/sitemap.xml', 'sitemap.xml'], ['/robots.txt', 'robots.txt']]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.equal(normalize(await response.text()), normalize(await readFile(path.join(root, 'dist', file), 'utf8')), `artefacto publicado: ${route}`);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
    assert.match(response.headers.get('content-security-policy') || '', /connect-src 'self' https:\/\/cloudflareinsights\.com/);
    if (preview) assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  }
  const image = await fetch(base + '/assets/brand/og-image.jpg');
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type') || '', /image\/jpeg/);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), await readFile(path.join(root, 'dist/assets/brand/og-image.jpg')));
});

test('las URLs históricas redirigen y las rutas desconocidas o internas devuelven 404', async () => {
  for (const [old, current] of [['/index.html', '/'], ['/privacidad.html', '/privacidad'], ['/terminos.html', '/terminos'], ['/cookies.html', '/cookies'],
    ['/admin', '/'], ['/admin/', '/'], ['/admin.html', '/']]) {
    for (const search of ['', '?qa=public']) {
      const response = await fetch(base + old + search, { redirect: 'manual' });
      assert.ok([301, 308].includes(response.status), old + search);
      const location = new URL(response.headers.get('location'), base);
      assert.equal(location.origin, origin);
      assert.equal(location.pathname, current);
      assert.equal(location.search, search);
    }
  }
  for (const route of ['/no-existe/anidado', '/docs/MIGRACION-CLOUDFLARE.md', '/tasks.md', '/AGENTS.md', '/.codex/config.toml', '/.git/config', '/wrangler.jsonc', '/_headers', '/_redirects']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 404, route);
    assert.match(await response.text(), /Página no encontrada/);
  }
});

test('portafolio, mapa y aviso conservan lectura y controles a 320 y 1440 px', async () => {
  const axe = await readFile(path.join(root, 'test-results/axe.min.js'), 'utf8');
  for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const errors = [], external = [];
    await context.route('**/*', async route => {
      if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort('blockedbyclient'); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      const dialog = page.locator('#analytics-preferences');
      await dialog.waitFor({ state: 'visible' });
      assert.match(await dialog.innerText(), /Cloudflare Web Analytics/);
      assert.match(await dialog.locator('.analytics-contact').innerText(), /Andrés Leonardo Santiago González/);
      assert.equal(await page.locator('script[src*="cloudflareinsights"]').count(), 0, 'sin inserción automática');
      await page.evaluate(axe);
      const violations = await page.evaluate(async () => (await window.axe.run('#analytics-preferences', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations);
      assert.deepEqual(violations, [], `axe aviso ${width}px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(root, `test-results/cloudflare-pages-aviso-${width}.png`) });
      await page.locator('[data-analytics-choice="denied"]').click();
      assert.equal(await dialog.isVisible(), false);
      assert.equal(await page.locator('.project-card').count(), 20);
      assert.equal(await page.locator('a.project-card').count(), 20);
      assert.equal(await page.locator('.hero-slide').count(), 20);
      for (const [key, url] of [['dialon', 'https://dialon.pages.dev/'], ['vigia', 'https://vigiaapp.pages.dev/demo/'],
        ['sarinbotsaas', 'https://sarinbotsaas.pages.dev/'], ['semancontrol', 'https://semancontrol.pages.dev/']]) {
        const card = page.locator(`a.project-card[data-project-key="${key}"]`);
        assert.equal(await card.getAttribute('href'), url);
        assert.equal(await card.locator('picture img').count(), 1);
        assert.equal(await page.locator(`.hero-slide[data-project-key="${key}"]`).count(), 1);
      }
      await page.locator('.global-map-host').scrollIntoViewIfNeeded();
      await page.locator('.global-map-host svg').waitFor();
      assert.equal(await page.evaluate(async () => (await fetch('/assets/brand/world-map.svg')).status), 200, 'rechazo conserva fetch propio');
      // Movimiento reducido oculta la pausa de autoplay; la navegación manual sigue disponible.
      await page.locator('[data-hero-step="1"]').click();
      for (const route of ['/privacidad', '/terminos', '/cookies']) {
        await page.goto(base + route, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://www.alsdevstudio.com' + route);
        assert.ok(await page.locator('main h1').isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator('[data-analytics-preferences]').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#analytics-preferences').isVisible(), false);
      }
      assert.deepEqual(await context.cookies(), []);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
    } finally { await context.close(); }
  }
});

test('las políticas y el 404 anidado son legibles sin JavaScript', async () => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
  try {
    const page = await context.newPage();
    for (const route of ['/privacidad', '/terminos', '/cookies', '/no-existe/anidado']) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.ok(await page.locator('main h1').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'estilos del 404 y políticas');
    }
  } finally { await context.close(); }
});
