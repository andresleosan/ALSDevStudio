import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, truncate, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Estas pruebas crean exclusivamente fixtures locales; nunca usan red ni cuentas.
const implementation = await import('./build.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const temporaryRoots = [];
const scripts = ['analytics.js', 'main.js', 'picture-fallback.js', 'privacy.js',
  ...['contact', 'cursor', 'depth', 'dom', 'env', 'global-map', 'hero-carousel',
    'marquee', 'mascot-scenes', 'nav', 'projects', 'reveal', 'space'].map(name => `modules/${name}.js`)];
const brand = ['logo-als.png', 'mascot-flight.png', 'mascot-laptop.png', 'mascot-review.png', 'mascot-typing-a.png', 'mascot-typing-b.png', 'mascot-welcome.png', 'og-image.jpg', 'world-map.svg'];

after(async () => {
  for (const root of temporaryRoots) {
    assert.ok(path.isAbsolute(root) && path.dirname(root) === path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('als-cloudflare-test-'));
    await rm(root, { recursive: true, force: true });
  }
});

async function put(root, file, content = 'fixture') {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function fixture() {
  const root = await mkdtemp(path.join(path.resolve(tmpdir()), 'als-cloudflare-test-'));
  temporaryRoots.push(root);
  for (const name of ['index', 'privacidad', 'terminos', 'cookies', '404']) {
    await put(root, `${name}.html`, '<!DOCTYPE html><a href="index.html">Inicio</a><link href="styles/main.css" rel="stylesheet">');
  }
  for (const name of ['favicon.svg', 'robots.txt', '_headers', '_redirects']) await put(root, name);
  await put(root, 'sitemap.xml', '<urlset><url><loc>https://www.alsdevstudio.com/privacidad.html</loc></url></urlset>');
  await put(root, 'styles/main.css', 'body { color: black; }');
  for (const name of scripts) await put(root, `scripts/${name}`, '// fixture');
  for (const name of brand) await put(root, `assets/brand/${name}`);
  await put(root, 'assets/fonts/fonts.css', '@font-face { src: url(font-1.woff2); }');
  await put(root, 'assets/fonts/font-1.woff2');
  await put(root, 'assets/fonts/spacegrotesk-OFL.txt');
  await put(root, 'assets/projects/demo.jpg');
  await put(root, 'assets/projects/responsive/480/demo.avif');
  await put(root, 'assets/projects/responsive/768/demo.webp');
  return root;
}

async function build(root, extra = {}) {
  assert.equal(typeof implementation?.build, 'function', 'Falta el build público de Pages');
  return implementation.build({ sourceDir: root, ...extra });
}

async function files(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await files(root, name));
    else result.push(name);
  }
  return result.sort();
}

test('publica únicamente recursos del sitio aunque la raíz contenga material interno', async () => {
  const root = await fixture();
  for (const name of ['docs/private.html', 'test-results/report.html', '.env', '.cronos/AGENCY.md',
    'scripts/internal-tool.js', 'assets/brand/private.png', 'assets/fonts/SOURCES.json',
    'assets/projects/source.png', 'wrangler.jsonc']) await put(root, name, 'NO PUBLICAR');
  await build(root);
  assert.deepEqual(await files(path.join(root, 'dist')), [
    '404.html', '_headers', '_redirects', 'cookies.html', 'favicon.svg', 'index.html',
    'privacidad.html', 'robots.txt', 'sitemap.xml', 'terminos.html', 'styles/main.css',
    ...scripts.map(name => `scripts/${name}`), ...brand.map(name => `assets/brand/${name}`),
    'assets/fonts/fonts.css', 'assets/fonts/font-1.woff2', 'assets/fonts/spacegrotesk-OFL.txt',
    'assets/projects/demo.jpg', 'assets/projects/responsive/480/demo.avif',
    'assets/projects/responsive/768/demo.webp',
  ].sort());
});

test('normaliza enlaces y canonicals de Pages conservando fuentes y destinos externos', async () => {
  const root = await fixture();
  const original = '<a href="index.html#inicio">Inicio</a><a href="cookies.html#analitica">Cookies</a>' +
    '<link rel="canonical" href="https://www.alsdevstudio.com/privacidad.html">' +
    '<a href="https://external.example/privacidad.html">Externo</a>';
  await put(root, 'index.html', original);
  await put(root, 'scripts/analytics.js', 'const oldPath = "privacidad.html";');
  await build(root);
  assert.equal(await readFile(path.join(root, 'dist/index.html'), 'utf8'),
    '<a href="/#inicio">Inicio</a><a href="/cookies#analitica">Cookies</a>' +
    '<link rel="canonical" href="https://www.alsdevstudio.com/privacidad">' +
    '<a href="https://external.example/privacidad.html">Externo</a>');
  assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), original);
  assert.equal(await readFile(path.join(root, 'dist/scripts/analytics.js'), 'utf8'), 'const oldPath = "privacidad.html";');
  assert.equal(await readFile(path.join(root, 'dist/sitemap.xml'), 'utf8'),
    '<urlset><url><loc>https://www.alsdevstudio.com/privacidad</loc></url></urlset>');
});

test('rechaza una referencia local rota antes de reemplazar un build válido', async () => {
  const root = await fixture();
  await build(root);
  const oldIndex = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  await put(root, 'index.html', '<img src="assets/missing.png">');
  await assert.rejects(build(root), /referencia local.*assets\/missing\.png/i);
  assert.equal(await readFile(path.join(root, 'dist/index.html'), 'utf8'), oldIndex);
});

test('comprueba los módulos y las fuentes en la salida permitida', async () => {
  const root = await fixture();
  await put(root, 'scripts/main.js', 'import { helper } from "./internal-tool.js";');
  await put(root, 'scripts/internal-tool.js', 'export const helper = 1;');
  await assert.rejects(build(root), /referencia local.*internal-tool\.js/i);
  await put(root, 'scripts/main.js', '// fixture');
  await put(root, 'assets/fonts/fonts.css', '@font-face { src: url(secret.woff2); }');
  await assert.rejects(build(root), /referencia local.*secret\.woff2/i);
});

test('rechaza carpetas enlazadas en los recursos sin leer su destino', async () => {
  const root = await fixture();
  const outside = await fixture();
  await symlink(outside, path.join(root, 'assets/fonts/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(build(root), /enlace simbólico/i);
  assert.ok((await files(outside)).includes('index.html'));
});

test('no elimina ni sobreescribe un dist ajeno', async () => {
  const root = await fixture();
  await put(root, 'dist/notes.txt', 'trabajo ajeno');
  await assert.rejects(build(root), /ajeno|no generado/i);
  assert.equal(await readFile(path.join(root, 'dist/notes.txt'), 'utf8'), 'trabajo ajeno');
});

test('no elimina archivos ajenos añadidos a un dist previamente generado', async () => {
  const root = await fixture();
  await build(root);
  await put(root, 'dist/notes.txt', 'trabajo ajeno');
  await assert.rejects(build(root), /ajeno|no permitido/i);
  assert.equal(await readFile(path.join(root, 'dist/notes.txt'), 'utf8'), 'trabajo ajeno');
});

test('rechaza salida fuera de dist antes de tocar el destino', async () => {
  const root = await fixture();
  const outside = await fixture();
  await assert.rejects(build(root, { outputDir: outside }), /salida.*dist/i);
  await assert.rejects(build(root, { outputDir: path.join(root, 'docs') }), /salida.*dist/i);
  assert.ok((await files(outside)).includes('index.html'));
});

test('rechaza un dist enlazado sin borrar los archivos del destino', async () => {
  const root = await fixture();
  const outside = await fixture();
  await symlink(outside, path.join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(build(root), /enlace simbólico/i);
  assert.equal(await readFile(path.join(outside, 'favicon.svg'), 'utf8'), 'fixture');
});

test('rechaza archivos superiores a 25 MiB antes de publicarlos', async () => {
  const root = await fixture();
  await truncate(path.join(root, 'assets/fonts/font-1.woff2'), 25 * 1024 * 1024 + 1);
  await assert.rejects(build(root), /25 MiB|tamaño/i);
});

test('el límite de Pages admite 20000 archivos y rechaza el siguiente', () => {
  assert.equal(typeof implementation?.validateLimits, 'function', 'Falta validar los límites del artefacto');
  const permitted = Array.from({ length: 20000 }, (_, i) => ({ path: `file-${i}`, size: 0 }));
  assert.doesNotThrow(() => implementation.validateLimits(permitted));
  assert.throws(() => implementation.validateLimits([...permitted, { path: 'one-too-many', size: 0 }]), /20000|20\.000/);
});

test('reconstruye un dist propio y retira recursos públicos obsoletos', async () => {
  const root = await fixture();
  await put(root, 'assets/fonts/old.woff2');
  await build(root);
  await unlink(path.join(root, 'assets/fonts/old.woff2'));
  await build(root);
  assert.ok(!(await files(path.join(root, 'dist'))).includes('assets/fonts/old.woff2'));
});
