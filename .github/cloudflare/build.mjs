import { lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANONICAL_ORIGIN = 'https://www.alsdevstudio.com';
const OUTPUT_MARKER = '# ALSDevStudio: salida generada por .github/cloudflare/build.mjs\n';
const MAX_FILES = 20000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const HTML_FILES = ['index.html', 'privacidad.html', 'terminos.html', 'cookies.html', '404.html', 'control-sarin/index.html'];
const FUNCTION_ROUTES = ['/api/sarin','/api/sarin/','/api/sarin/session','/api/sarin/session/',
  '/control-sarin','/control-sarin/*','/api/control-sarin','/api/control-sarin/*'];
const SCRIPT_FILES = ['analytics.js', 'main.js', 'picture-fallback.js', 'privacy.js',
  ...['contact', 'cursor', 'depth', 'dom', 'env', 'global-map', 'hero-carousel',
    'marquee', 'mascot-scenes', 'nav', 'projects', 'reveal', 'space',
    'sarin-chat', 'sarin-api', 'sarin-summary', 'sarin-consent', 'sarin-admin'].map(name => `modules/${name}.js`)]
  .map(name => `scripts/${name}`);
const BRAND_FILES = ['logo-als.png', 'mascot-flight.png', 'mascot-laptop.png', 'mascot-review.png', 'mascot-typing-a.png', 'mascot-typing-b.png', 'mascot-welcome.png',
  'mascot-global-typing-a.png', 'mascot-global-typing-b.png', 'mascot-process-typing-a.png', 'mascot-process-typing-b.png', 'og-image.jpg', 'world-map.svg']
  .map(name => `assets/brand/${name}`);
const FIXED_FILES = [...HTML_FILES, 'favicon.svg', 'robots.txt', 'sitemap.xml', '_headers', '_redirects', '_routes.json',
  'styles/main.css', 'styles/sarin-admin.css', ...SCRIPT_FILES, ...BRAND_FILES, 'assets/fonts/fonts.css'];
const FIXED_SET = new Set(FIXED_FILES);
const PAGE_ROUTES = new Map([['/index.html', '/'], ['/control-sarin/index.html','/control-sarin/'], ['/privacidad.html', '/privacidad'],
  ['/terminos.html', '/terminos'], ['/cookies.html', '/cookies'], ['/404.html', '/404']]);

const samePath = (left, right) => path.relative(left, right) === '';
const publicFile = name => FIXED_SET.has(name) ||
  /^assets\/fonts\/[A-Za-z0-9_-]+(?:\.woff2|-OFL\.txt)$/.test(name) ||
  /^assets\/projects\/[A-Za-z0-9_-]+\.jpg$/.test(name) ||
  /^assets\/projects\/responsive\/(?:480|768|1200)\/[A-Za-z0-9_-]+\.(?:avif|webp)$/.test(name);
const publicDirectory = name => ['control-sarin', 'styles', 'scripts', 'scripts/modules', 'assets', 'assets/brand',
  'assets/fonts', 'assets/projects', 'assets/projects/responsive',
  'assets/projects/responsive/480', 'assets/projects/responsive/768', 'assets/projects/responsive/1200'].includes(name);

/** Comprueba los límites sobre metadatos antes de leer imágenes o escribir archivos. */
export function validateLimits(files) {
  if (files.length > MAX_FILES) throw new Error('Pages admite un máximo de 20000 archivos por build.');
  for (const file of files) {
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE_BYTES) {
      throw new Error(`Tamaño no permitido (máximo 25 MiB): ${file.path}`);
    }
  }
}

async function checkedStat(root, relative) {
  const absolute = path.resolve(root, relative);
  const within = path.relative(root, absolute);
  if (!within || within.startsWith('..') || path.isAbsolute(within)) throw new Error(`Ruta fuera del sitio: ${relative}`);
  let current = root;
  let stat;
  for (const part of within.split(path.sep)) {
    current = path.join(current, part);
    stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error(`Enlace simbólico no permitido: ${relative}`);
  }
  return stat;
}

async function directoryEntries(root, relative, { optional = false } = {}) {
  let stat;
  try { stat = await checkedStat(root, relative); }
  catch (error) { if (optional && error.code === 'ENOENT') return []; throw error; }
  if (!stat.isDirectory()) throw new Error(`No es una carpeta de recursos: ${relative}`);
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error(`Enlace simbólico no permitido: ${relative}/${entry.name}`);
  }
  return entries;
}

async function collectFiles(root) {
  const selected = new Set(FIXED_FILES);
  for (const entry of await directoryEntries(root, 'assets/fonts')) {
    const name = `assets/fonts/${entry.name}`;
    if (entry.isFile() && publicFile(name)) selected.add(name);
  }
  for (const entry of await directoryEntries(root, 'assets/projects')) {
    const name = `assets/projects/${entry.name}`;
    if (entry.isFile() && publicFile(name)) selected.add(name);
  }
  await directoryEntries(root, 'assets/projects/responsive', { optional: true });
  for (const width of ['480', '768', '1200']) {
    const folder = `assets/projects/responsive/${width}`;
    for (const entry of await directoryEntries(root, folder, { optional: true })) {
      const name = `${folder}/${entry.name}`;
      if (entry.isFile() && publicFile(name)) selected.add(name);
    }
  }
  const result = [];
  for (const name of [...selected].sort()) {
    const stat = await checkedStat(root, name);
    if (!stat.isFile()) throw new Error(`No es un archivo público regular: ${name}`);
    result.push({ path: name, size: stat.size });
  }
  validateLimits(result);
  return result;
}

function pageURL(value) {
  const isAbsolute = /^https?:\/\//i.test(value);
  if (!isAbsolute && !/^(?:\/)?(?:index|privacidad|terminos|cookies|404)\.html(?:[?#]|$)/.test(value)) return value;
  const url = new URL(value, `${CANONICAL_ORIGIN}/`);
  if (!['www.alsdevstudio.com', 'alsdevstudio.com'].includes(url.hostname)) return value;
  const route = PAGE_ROUTES.get(url.pathname);
  if (!route) return value;
  return `${isAbsolute ? url.origin : ''}${route}${url.search}${url.hash}`;
}

function transform(name, content) {
  if (HTML_FILES.includes(name)) {
    return content.replace(/(\bhref\s*=\s*)(["'])([^"']*)\2/gi,
      (_match, attribute, quote, value) => `${attribute}${quote}${pageURL(value)}${quote}`);
  }
  if (name === 'sitemap.xml') return content.replace(/(<loc>)([^<]+)(<\/loc>)/g,
    (_match, before, value, after) => `${before}${pageURL(value)}${after}`);
  if (name === '_headers') return OUTPUT_MARKER + content;
  return content;
}

function revisionURL(value, documentPath, outputFiles, revision, extension) {
  let url;
  try { url = new URL(value, new URL(documentPath, `${CANONICAL_ORIGIN}/`)); }
  catch { return value; } // La validación de referencias conserva el rechazo correspondiente.
  if (!['www.alsdevstudio.com', 'alsdevstudio.com'].includes(url.hostname) || !url.pathname.endsWith(extension)) return value;
  let target;
  try { target = decodeURIComponent(url.pathname).replace(/^\//, ''); }
  catch { return value; }
  if (!outputFiles.has(target)) return value;
  const fragmentAt = value.indexOf('#');
  const fragment = fragmentAt < 0 ? '' : value.slice(fragmentAt);
  const address = fragmentAt < 0 ? value : value.slice(0, fragmentAt);
  const queryAt = address.indexOf('?');
  const stem = queryAt < 0 ? address : address.slice(0, queryAt);
  const parameters = new URLSearchParams(queryAt < 0 ? '' : address.slice(queryAt + 1));
  parameters.set('v', revision);
  return `${stem}?${parameters}${fragment}`;
}

/** Una revisión compartida evita combinar módulos de despliegues distintos en caché. */
function versionReferences(name, content, outputFiles, revision) {
  if (name.endsWith('.html')) {
    const attribute = (tag, key, extension) => tag.replace(new RegExp(`(\\b${key}\\s*=\\s*)(["'])([^"']*)\\2`, 'gi'),
      (match, prefix, quote, value) => {
        const decoded = value.replaceAll('&amp;', '&');
        const revised = revisionURL(decoded, `/${name}`, outputFiles, revision, extension);
        return revised === decoded ? match : `${prefix}${quote}${revised.replaceAll('&', '&amp;')}${quote}`;
      });
    return content.replace(/<script\b[^>]*>/gi, tag => attribute(tag, 'src', '.js'))
      .replace(/<link\b[^>]*>/gi, tag => /\brel\s*=\s*(["'])[^"']*\bstylesheet\b[^"']*\1/i.test(tag) ? attribute(tag, 'href', '.css') : tag);
  }
  if (name.endsWith('.js')) {
    return content.replace(/(\b(?:from\s+|import\s*(?:\(\s*)?))(["'])([^"']+)\2/g,
      (match, prefix, quote, value) => /^\.\.?\//.test(value) ? `${prefix}${quote}${revisionURL(value, `/${name}`, outputFiles, revision, '.js')}${quote}` : match);
  }
  return content;
}

function localReference(value, documentPath, outputFiles) {
  if (!value || /^(?:#|data:|mailto:|tel:|javascript:)/i.test(value)) return;
  let url;
  try { url = new URL(value.replaceAll('&amp;', '&'), new URL(documentPath, `${CANONICAL_ORIGIN}/`)); }
  catch { throw new Error(`Referencia local inválida en ${documentPath}: ${value}`); }
  if (!['www.alsdevstudio.com', 'alsdevstudio.com'].includes(url.hostname)) return;
  let target;
  try { target = decodeURIComponent(url.pathname).replace(/^\//, ''); }
  catch { throw new Error(`Referencia local inválida en ${documentPath}: ${value}`); }
  if (!target) target = 'index.html';
  if (target.endsWith('/')) target += 'index.html';
  if (!outputFiles.has(target) && outputFiles.has(`${target}/index.html`)) target += '/index.html';
  if (!outputFiles.has(target) && outputFiles.has(`${target}.html`)) target += '.html';
  if (!outputFiles.has(target)) throw new Error(`Referencia local sin archivo permitido en ${documentPath}: ${value}`);
}

function htmlReferences(content, documentPath, outputFiles) {
  for (const match of content.matchAll(/\b(?:href|src|data-src|data-map-src)\s*=\s*(["'])(.*?)\1/gi)) {
    localReference(match[2], documentPath, outputFiles);
  }
  for (const match of content.matchAll(/\b(?:srcset|data-srcset)\s*=\s*(["'])(.*?)\1/gi)) {
    if (match[2].startsWith('data:')) continue;
    for (const candidate of match[2].split(',')) localReference(candidate.trim().split(/\s+/)[0], documentPath, outputFiles);
  }
}

function validateReferences(contents, outputFiles) {
  for (const [name, content] of contents) {
    const documentPath = `/${name}`;
    if (name.endsWith('.html')) htmlReferences(content, documentPath, outputFiles);
    if (name.endsWith('.js')) {
      // Espacio tras from evita confundir selectores como '#admin-from'.
      for (const match of content.matchAll(/\b(?:from\s+|import\s*(?:\(\s*)?)(["'])([^"']+)\1/g)) {
        localReference(match[2], documentPath, outputFiles);
      }
      // Las plantillas HTML y scripts creados por JS resuelven contra el documento.
      htmlReferences(content, '/', outputFiles);
      for (const match of content.matchAll(/\.src\s*=\s*(["'])(.*?)\1/g)) localReference(match[2], '/', outputFiles);
    }
    if (name.endsWith('.css')) {
      for (const match of content.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) localReference(match[2], documentPath, outputFiles);
    }
    if (name === 'sitemap.xml') {
      for (const match of content.matchAll(/<loc>([^<]+)<\/loc>/g)) localReference(match[1], '/', outputFiles);
    }
  }
}

function validateFunctionRoutes(content) {
  let routes;
  try { routes = JSON.parse(content); }
  catch { throw new Error('El archivo _routes.json debe contener las rutas exactas de Sarin.'); }
  if (!routes || Object.keys(routes).sort().join(',') !== 'exclude,include,version' || routes.version !== 1 ||
      !Array.isArray(routes.include) || routes.include.length !== FUNCTION_ROUTES.length ||
      [...routes.include].sort().join(',') !== [...FUNCTION_ROUTES].sort().join(',') ||
      !Array.isArray(routes.exclude) || routes.exclude.length !== 0) {
    throw new Error('Las rutas de Functions deben limitarse al chat, sesión y administración protegida de Sarin.');
  }
}

async function verifyOwnedOutput(root, output) {
  if (!samePath(path.resolve(root, 'dist'), output)) throw new Error('La salida debe ser exactamente la carpeta dist del sitio.');
  let stat;
  try { stat = await lstat(output); }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  if (stat.isSymbolicLink()) throw new Error('Enlace simbólico no permitido en dist.');
  if (!stat.isDirectory() || !samePath(await realpath(output), output)) throw new Error('dist ajeno: ruta no verificada.');
  async function inspect(folder, prefix = '') {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Enlace simbólico no permitido en dist: ${name}`);
      if (entry.isDirectory()) {
        if (!publicDirectory(name)) throw new Error(`Archivo o carpeta ajeno no permitido en dist: ${name}`);
        await inspect(path.join(folder, entry.name), name);
      } else if (!entry.isFile() || !publicFile(name)) throw new Error(`Archivo ajeno no permitido en dist: ${name}`);
    }
  }
  await inspect(output);
  let headers;
  try { headers = await readFile(path.join(output, '_headers'), 'utf8'); }
  catch { throw new Error('dist ajeno o no generado por este build; no se reemplaza.'); }
  if (!headers.startsWith(OUTPUT_MARKER)) throw new Error('dist ajeno o no generado por este build; no se reemplaza.');
  return true;
}

/** Empaqueta recursos públicos; el servidor se compila por separado y no se copia a dist. */
export async function build({ sourceDir = PROJECT_ROOT, outputDir, enableSarinChat = false } = {}) {
  const root = path.resolve(sourceDir);
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !samePath(await realpath(root), root)) throw new Error('Enlace simbólico no permitido en la raíz del sitio.');
  if (!rootStat.isDirectory()) throw new Error('La raíz del sitio no es una carpeta.');
  const output = path.resolve(outputDir ?? path.join(root, 'dist'));
  await verifyOwnedOutput(root, output);
  const selected = await collectFiles(root);
  const contents = new Map();
  const publicHash = createHash('sha256');
  for (const file of selected) {
    let hashed = await readFile(path.join(root, file.path));
    if (/\.(?:html|xml|css|js|txt)$/.test(file.path) || ['_headers', '_redirects', '_routes.json'].includes(file.path)) {
      let text = transform(file.path, hashed.toString('utf8'));
      if (file.path === 'index.html' && enableSarinChat === true) {
        text = text.replace('data-sarin-enabled="false"', 'data-sarin-enabled="true"');
      }
      contents.set(file.path, text);
      hashed = Buffer.from(text);
    }
    publicHash.update(file.path).update('\0').update(String(hashed.byteLength)).update('\0').update(hashed);
  }
  const revision = publicHash.digest('hex').slice(0, 16);
  const outputFiles = new Set(selected.map(file => file.path));
  for (const file of selected) {
    if (!contents.has(file.path)) continue;
    const text = versionReferences(file.path, contents.get(file.path), outputFiles, revision);
    contents.set(file.path, text);
    file.size = Buffer.byteLength(text);
  }
  validateLimits(selected);
  validateFunctionRoutes(contents.get('_routes.json'));
  validateReferences(contents, outputFiles);
  // Revalidar la ruta absoluta y propiedad inmediatamente antes de cualquier borrado.
  if (await verifyOwnedOutput(root, output)) await rm(output, { recursive: true });
  await mkdir(output);
  for (const file of selected) {
    await checkedStat(root, file.path);
    const destination = path.join(output, file.path);
    await mkdir(path.dirname(destination), { recursive: true });
    const content = contents.get(file.path) ?? await readFile(path.join(root, file.path));
    await writeFile(destination, content, { flag: 'wx' });
  }
  return { outputDir: output, files: selected.length, bytes: selected.reduce((sum, file) => sum + file.size, 0), revision };
}

if (process.argv[1] && samePath(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  try {
    const result = await build();
    console.log(`Build Pages: ${result.files} archivos públicos, ${result.bytes} bytes; revisión ${result.revision}; salida ${result.outputDir}`);
  } catch (error) {
    console.error(`Build Pages rechazado: ${error.message}`);
    process.exitCode = 1;
  }
}
