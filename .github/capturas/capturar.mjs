// @ts-check
/**
 * Regenera las capturas de los proyectos de la landing.
 *
 * Lee las tarjetas de `index.html`, abre cada sitio real y lo fotografía al mismo viewport
 * que simula el `<iframe>` de la vista en vivo (1440×900), de modo que la captura llena la
 * tarjeta sin barras y el relevo hacia el marco vivo es imperceptible.
 *
 * Uso:  node .github/capturas/capturar.mjs [--solo clave1,clave2]
 *
 * Salida:  assets/projects/<clave>.jpg  y  assets/projects/responsive/{480,768,1200}/<clave>.{avif,webp}
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DESTINO = path.join(RAIZ, 'assets/projects');
/** Mismo viewport que simula el iframe de la vista en vivo. */
const ANCHO = 1440;
const ALTO = 900;
const ANCHOS_RESPONSIVE = [480, 768, 1200];
/** Tiempo de espera tras `networkidle` para que se asienten carruseles y contenido diferido. */
const ASENTAR = 4000;

const soloArg = process.argv.indexOf('--solo');
const solo = soloArg > -1 ? new Set(process.argv[soloArg + 1].split(',')) : null;

/** Saca clave y URL de cada tarjeta de proyecto del HTML. */
function leerProyectos() {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const proyectos = [];
  const re = /<a class="project-card"[^>]*?data-project-key="([a-z0-9-]+)"[^>]*?href="(https:\/\/[^"]+)"/g;
  for (const m of html.matchAll(re)) proyectos.push({ clave: m[1], url: m[2] });
  return proyectos;
}

/** @param {import('playwright').Browser} navegador @param {{clave:string,url:string}} proyecto */
async function capturar(navegador, proyecto) {
  const ctx = await navegador.newContext({
    viewport: { width: ANCHO, height: ALTO },
    deviceScaleFactor: 2,
    // Sin animaciones de entrada a medio camino, y con el mismo esquema que usa la landing.
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  try {
    try {
      await page.goto(proyecto.url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch {
      await page.goto(proyecto.url, { waitUntil: 'load', timeout: 45000 });
    }
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(ASENTAR);
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        /** @type {HTMLImageElement} */ (img).loading = 'eager';
      });
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    }).catch(() => {});
    await page.waitForTimeout(1200);
    return await page.screenshot({ clip: { x: 0, y: 0, width: ANCHO, height: ALTO } });
  } finally {
    await ctx.close();
  }
}

/** @param {Buffer} png @param {string} clave */
async function codificar(png, clave) {
  let bytes = 0;
  const base = path.join(DESTINO, `${clave}.jpg`);
  await sharp(png).resize(ANCHO, ALTO, { fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(base);
  bytes += fs.statSync(base).size;

  for (const ancho of ANCHOS_RESPONSIVE) {
    const alto = Math.round((ancho * ALTO) / ANCHO);
    const dir = path.join(DESTINO, 'responsive', String(ancho));
    fs.mkdirSync(dir, { recursive: true });
    const avif = path.join(dir, `${clave}.avif`);
    const webp = path.join(dir, `${clave}.webp`);
    await sharp(png).resize(ancho, alto, { fit: 'cover' }).avif({ quality: 52, effort: 5 }).toFile(avif);
    await sharp(png).resize(ancho, alto, { fit: 'cover' }).webp({ quality: 78, effort: 5 }).toFile(webp);
    bytes += fs.statSync(avif).size + fs.statSync(webp).size;
  }
  return bytes;
}

const proyectos = leerProyectos().filter(p => !solo || solo.has(p.clave));
if (!proyectos.length) {
  console.error('No se encontró ningún proyecto en index.html. ¿Cambió el marcado de .project-card?');
  process.exit(1);
}
console.log(`Regenerando ${proyectos.length} capturas a ${ANCHO}×${ALTO}\n`);

const navegador = await chromium.launch();
const fallos = [];
let total = 0;
for (const proyecto of proyectos) {
  try {
    const png = await capturar(navegador, proyecto);
    const bytes = await codificar(png, proyecto.clave);
    total += bytes;
    console.log(`  ok   ${proyecto.clave.padEnd(22)} ${String(Math.round(bytes / 1024)).padStart(5)} KB`);
  } catch (error) {
    fallos.push(proyecto.clave);
    // No se toca el archivo anterior: vale más una captura de la semana pasada que ninguna.
    console.log(`  FALLA ${proyecto.clave.padEnd(22)} ${error instanceof Error ? error.message.split('\n')[0] : error}`);
  }
}
await navegador.close();

console.log(`\nTotal escrito: ${Math.round(total / 1024)} KB`);
if (fallos.length) {
  console.log(`Sin regenerar (conservan la captura anterior): ${fallos.join(', ')}`);
  // Que fallen algunos sitios no invalida la ejecución; que fallen todos, sí.
  if (fallos.length === proyectos.length) process.exit(1);
}
