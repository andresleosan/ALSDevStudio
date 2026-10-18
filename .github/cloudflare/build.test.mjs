import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, truncate, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

// Estas pruebas crean exclusivamente fixtures locales; nunca usan red ni cuentas.
const implementation = await import('./build.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const temporaryRoots = [];
const scripts = ['analytics.js', 'main.js', 'picture-fallback.js', 'privacy.js',
  ...['contact', 'cursor', 'depth', 'dom', 'env', 'global-map', 'hero-carousel',
    'marquee', 'mascot-scenes', 'nav', 'projects', 'reveal', 'space',
    'sarin-chat', 'sarin-api', 'sarin-summary', 'sarin-consent', 'sarin-lead', 'sarin-admin', 'sarin-admin-auth', 'sarin-whatsapp-admin'].map(name => `modules/${name}.js`)];
const functionRoutes = ['/api/sarin','/api/sarin/','/api/sarin/session','/api/sarin/session/',
  '/api/sarin/whatsapp','/api/sarin/whatsapp/',
  '/control-sarin','/control-sarin/*','/api/control-sarin','/api/control-sarin/*'];
const brand = ['logo-als.png', 'mascot-flight.png', 'mascot-laptop.png', 'mascot-review.png', 'mascot-typing-a.png', 'mascot-typing-b.png', 'mascot-welcome.png',
  'mascot-global-typing-a.png', 'mascot-global-typing-b.png', 'mascot-process-typing-a.png', 'mascot-process-typing-b.png', 'og-image.jpg', 'world-map.svg'];

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
  await put(root, '_routes.json', JSON.stringify({ version: 1, include: functionRoutes, exclude: [] }));
  await put(root, 'sitemap.xml', '<urlset><url><loc>https://www.alsdevstudio.com/privacidad.html</loc></url></urlset>');
  await put(root, 'styles/main.css', 'body { color: black; }');
  await put(root, 'styles/sarin-admin.css', 'body { color: black; }');
  await put(root, 'control-sarin/index.html', '<!DOCTYPE html><a href="/control-sarin/">Panel</a><a href="/">Inicio</a>');
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
    'assets/projects/source.png', 'wrangler.jsonc', 'internal/.env', 'internal/functions/src/index.mjs',
    'internal/dist/index.html', 'internal/config/public.json', 'server/sarin/knowledge.js',
    'functions/api/sarin.js', 'migrations/sarin/0001_usage.sql', '.dev.vars',
    '.github/sarin/firebase-jwt.js','workers/sarin-retention/index.js','control-sarin/private.html']) await put(root, name, 'NO PUBLICAR');
  await build(root);
  assert.deepEqual(await files(path.join(root, 'dist')), [
    '404.html', '_headers', '_redirects', '_routes.json', 'cookies.html', 'favicon.svg', 'index.html',
    'privacidad.html', 'robots.txt', 'sitemap.xml', 'terminos.html', 'styles/main.css', 'styles/sarin-admin.css', 'control-sarin/index.html',
    ...scripts.map(name => `scripts/${name}`), ...brand.map(name => `assets/brand/${name}`),
    'assets/fonts/fonts.css', 'assets/fonts/font-1.woff2', 'assets/fonts/spacegrotesk-OFL.txt',
    'assets/projects/demo.jpg', 'assets/projects/responsive/480/demo.avif',
    'assets/projects/responsive/768/demo.webp',
  ].sort());
});

test('solo permite chat, sesión, webhook firmado y administración sin Functions en recursos estáticos', async () => {
  const root = await fixture();
  await build(root);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'dist/_routes.json'), 'utf8')),
    { version: 1, include: functionRoutes, exclude: [] });
  for (const routes of [
    { version: 1, include: ['/*'], exclude: [] },
    { version: 1, include: ['/api/sarin', '/api/sarin/'], exclude: [] },
    { version: 1, include: functionRoutes, exclude: ['/control-sarin/*'] },
    { version: 1, include: ['/api/sarin', '/api/sarin/'], exclude: [], extra: true },
    { version: 1, include: ['/api/sarin', '/api/sarin/'], exclude: ['/api/sarin'] },
  ]) {
    await put(root, '_routes.json', JSON.stringify(routes));
    await assert.rejects(build(root), /rutas|routes|sarin/i);
  }
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

test('un selector admin-from no se interpreta como import de un módulo', async () => {
  const root = await fixture();
  await put(root, 'scripts/modules/sarin-admin.js', "const from=find('#admin-from').value,to=find('#admin-to').value;");
  await build(root);
  assert.match(await readFile(path.join(root,'dist/scripts/modules/sarin-admin.js'),'utf8'), /admin-from/);
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

test('el chat público queda apagado en el artefacto y la vista local requiere habilitación explícita', async () => {
  const root = await fixture();
  await put(root, 'index.html', '<!DOCTYPE html><button id="sarin-launcher" data-sarin-enabled="false" hidden>Sarin</button>');
  for (const enableSarinChat of [undefined, false, 'true']) {
    await build(root, { enableSarinChat });
    assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /data-sarin-enabled="false"/);
  }
  await build(root, { enableSarinChat: true });
  assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /data-sarin-enabled="true"/);
  assert.match(await readFile(path.join(root, 'index.html'), 'utf8'), /data-sarin-enabled="false"/);
});

test('el build cerrado normaliza el chat aunque el fuente venga habilitado', async () => {
  const root = await fixture();
  const source = '<!DOCTYPE html><button id="sarin-launcher" data-sarin-enabled="true" hidden>Sarin</button>';
  await put(root, 'index.html', source);
  for (const enableSarinChat of [undefined, false, 'true', 1]) {
    await build(root, { enableSarinChat });
    assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /data-sarin-enabled="false"/);
  }
  await build(root, { enableSarinChat: true });
  assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /data-sarin-enabled="true"/);
  assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), source);
});

test('la habilitación por entorno requiere las dos flags estrictas y mantiene preview y local cerrados', () => {
  assert.equal(typeof implementation?.sarinChatEnabledFromEnvironment, 'function');
  const closed = [{}, { SARIN_ENABLED: 'true' }, { SARIN_HISTORY_ENABLED: 'true' },
    { SARIN_ENABLED: 'false', SARIN_HISTORY_ENABLED: 'false' },
    { SARIN_ENABLED: 'true', SARIN_HISTORY_ENABLED: 'false' },
    { SARIN_ENABLED: 'false', SARIN_HISTORY_ENABLED: 'true' },
    { SARIN_ENABLED: true, SARIN_HISTORY_ENABLED: true },
    { SARIN_ENABLED: 'TRUE', SARIN_HISTORY_ENABLED: 'true' },
    { SARIN_ENABLED: 'true', SARIN_HISTORY_ENABLED: ' true ' }];
  for (const env of closed) assert.equal(implementation.sarinChatEnabledFromEnvironment(env), false, JSON.stringify(env));
  assert.equal(implementation.sarinChatEnabledFromEnvironment({ SARIN_ENABLED: 'true', SARIN_HISTORY_ENABLED: 'true' }), true);
});

test('el CLI real emite el chat habilitado solo con ambas flags y vuelve a cerrarlo para preview', async () => {
  const root = await fixture();
  await put(root, 'index.html', '<!DOCTYPE html><button id="sarin-launcher" data-sarin-enabled="false" hidden>Sarin</button>');
  const cli = path.join(root, '.github/cloudflare/build.mjs');
  await put(root, '.github/cloudflare/build.mjs', await readFile(new URL('./build.mjs', import.meta.url), 'utf8'));
  for (const [enabled, history, expected] of [['true', 'true', 'true'], ['false', 'false', 'false'], ['true', 'false', 'false']]) {
    const child = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8',
      env: { ...process.env, SARIN_ENABLED: enabled, SARIN_HISTORY_ENABLED: history } });
    assert.equal(child.status, 0, child.stderr);
    assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), new RegExp(`data-sarin-enabled="${expected}"`));
  }
});

test('cada revisión pública actualiza HTML y el grafo main, chat, API y consentimiento incluso con módulos ya cargados',async()=>{
  const root=await fixture();
  await put(root,'package.json','{"type":"module"}');
  await put(root,'index.html','<link rel="stylesheet" href="styles/main.css"><script type="module" src="scripts/main.js"></script>');
  await put(root,'scripts/main.js',"export const open = () => import('./modules/sarin-chat.js');");
  await put(root,'scripts/modules/sarin-chat.js',"export { start } from './sarin-api.js';");
  await put(root,'scripts/modules/sarin-api.js',"import { NOTICE_VERSION } from './sarin-consent.js'; export const start=NOTICE_VERSION;");
  await put(root,'scripts/modules/sarin-consent.js',"export const NOTICE_VERSION='notice-v1';");
  async function emittedGraph(){
    const result=await build(root);
    assert.match(result.revision,/^[a-f0-9]{16}$/);
    const html=await readFile(path.join(root,'dist/index.html'),'utf8');
    const entry=html.match(/<script[^>]*src="([^"]+)"/)[1];
    const module=await import(new URL(entry,pathToFileURL(path.join(root,'dist/index.html'))).href);
    for(const name of ['scripts/main.js','scripts/modules/sarin-chat.js','scripts/modules/sarin-api.js']){
      const source=await readFile(path.join(root,'dist',name),'utf8');
      assert.match(source,new RegExp(`\\.js\\?v=${result.revision}`),name);
    }
    assert.equal(new URL(entry,'https://www.alsdevstudio.com/').searchParams.get('v'),result.revision);
    assert.match(html,new RegExp(`styles/main\\.css\\?v=${result.revision}`));
    return {revision:result.revision,notice:(await module.open()).start};
  }
  const first=await emittedGraph();assert.equal(first.notice,'notice-v1');
  await put(root,'scripts/modules/sarin-consent.js',"export const NOTICE_VERSION='notice-v2';");
  const second=await emittedGraph();assert.equal(second.notice,'notice-v2');assert.notEqual(second.revision,first.revision);
});

test('la revisión es determinista y solo depende de archivos públicos permitidos',async()=>{
  const root=await fixture();const first=await build(root);
  assert.match(first.revision,/^[a-f0-9]{16}$/);
  for(const name of ['.dev.vars','server/sarin/private.js','docs/private.md','scripts/internal-tool.js'])await put(root,name,'PRIVATE_FIXTURE_NEVER_PUBLIC');
  const second=await build(root);assert.equal(second.revision,first.revision);
  for(const name of await files(path.join(root,'dist'))){
    assert.equal((await readFile(path.join(root,'dist',name))).includes(Buffer.from('PRIVATE_FIXTURE_NEVER_PUBLIC')),false,name);
  }
  await put(root,'assets/projects/demo.jpg','another-public-image');
  assert.notEqual((await build(root)).revision,first.revision);
});

test('versiona recursos locales conservando otros parámetros y fragmentos sin cambiar API, enlaces o dominios externos',async()=>{
  const root=await fixture();
  const source='<link href="styles/main.css?theme=dark&amp;v=old#sheet" rel="stylesheet">'+
    '<script src="/scripts/main.js?entry=web&v=old#module"></script>'+
    '<script src="https://cdn.example/app.js?entry=external"></script>'+
    '<link rel="stylesheet" href="https://cdn.example/theme.css">'+
    '<a href="/?sarin=prueba#contacto">Prueba</a><a href="https://project.example/?demo=1">Proyecto</a>'+
    '<img src="assets/projects/demo.jpg?size=small">';
  await put(root,'index.html',source);
  await put(root,'scripts/main.js',"import './modules/env.js?mode=demo#module'; const open=()=>import('./modules/dom.js?lang=es'); const external=()=>import('https://cdn.example/module.js'); fetch('/api/sarin');");
  const result=await build(root);const html=await readFile(path.join(root,'dist/index.html'),'utf8');
  assert.match(html,new RegExp(`styles/main\\.css\\?theme=dark&amp;v=${result.revision}#sheet`));
  assert.match(html,new RegExp(`/scripts/main\\.js\\?entry=web&amp;v=${result.revision}#module`));
  for(const unchanged of ['https://cdn.example/app.js?entry=external','https://cdn.example/theme.css','/?sarin=prueba#contacto','https://project.example/?demo=1','assets/projects/demo.jpg?size=small'])assert.ok(html.includes(unchanged),unchanged);
  const module=await readFile(path.join(root,'dist/scripts/main.js'),'utf8');
  assert.match(module,new RegExp(`env\\.js\\?mode=demo&v=${result.revision}#module`));
  assert.match(module,new RegExp(`dom\\.js\\?lang=es&v=${result.revision}`));
  assert.ok(module.includes("import('https://cdn.example/module.js')"));assert.ok(module.includes("fetch('/api/sarin')"));
  assert.equal(await readFile(path.join(root,'index.html'),'utf8'),source);
});
