// @ts-check
/**
 * Regenera la tarjeta que ven los demás al compartir el enlace (Open Graph).
 *
 * Se dibuja con los mismos tokens y tipografías que `styles/main.css`, de modo que la
 * previsualización en WhatsApp, LinkedIn o Telegram hable el idioma visual del sitio y no
 * el de un banner suelto.
 *
 * Dos condiciones mandan sobre el diseño:
 *   - Zona segura. Muchos clientes recortan el 1200×630 al centro, así que marca y mensaje
 *     viven dentro del cuadrado central: un recorte 1:1 sigue mostrándolo todo.
 *   - Peso. WhatsApp descarta la previsualización si la imagen pesa de más, así que la
 *     salida es JPG y se busca la mayor calidad que quepa por debajo del tope.
 *
 * Uso:  node .github/capturas/og.mjs [--verificar]
 *       --verificar deja además los recortes 1:1 y 4:3 en el temporal para revisarlos.
 *
 * Salida:  assets/brand/og-image.jpg
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const DESTINO = path.join(RAIZ, 'assets/brand/og-image.jpg');
const ANCHO = 1200;
const ALTO = 630;
/** Tope por debajo del cual WhatsApp muestra la miniatura con holgura. */
const TOPE = 300 * 1024;
const CALIDADES = [90, 86, 82, 78];

const verificar = process.argv.includes('--verificar');

// El PNG del logo trae aire transparente a los lados: se recorta al círculo para que el
// borde del sello blanco caiga justo sobre el anillo del logo y lean como una sola pieza.
const logo = await sharp(path.join(RAIZ, 'assets/brand/logo-als.png')).trim().png().toBuffer();
const plantilla = fs
  .readFileSync(path.join(AQUI, 'og-card.html'), 'utf8')
  .replace('LOGO_SRC', 'data:image/png;base64,' + logo.toString('base64'));

const navegador = await chromium.launch();
const page = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 2 });
await page.setContent(plantilla, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
const png = await page.screenshot();
await navegador.close();

let escrito = null;
for (const calidad of CALIDADES) {
  const buf = await sharp(png)
    .resize(ANCHO, ALTO)
    // 4:4:4 y no el 4:2:0 por defecto: el texto fino y el verde de marca se ensucian al submuestrear.
    .jpeg({ quality: calidad, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
  console.log(`calidad ${calidad} → ${(buf.length / 1024).toFixed(0)} KB`);
  if (buf.length < TOPE) {
    fs.writeFileSync(DESTINO, buf);
    escrito = { calidad, peso: buf.length };
    break;
  }
}

if (!escrito) {
  console.error(`No se bajó de ${TOPE / 1024} KB ni con calidad ${CALIDADES.at(-1)}. Aligera la plantilla.`);
  process.exit(1);
}

console.log(`\n✓ assets/brand/og-image.jpg — ${ANCHO}×${ALTO}, calidad ${escrito.calidad}, ${(escrito.peso / 1024).toFixed(0)} KB`);

if (verificar) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const jpg = fs.readFileSync(DESTINO);
  for (const [nombre, ancho] of [['1-1', ALTO], ['4-3', 840]]) {
    await sharp(jpg).resize(ancho, ALTO, { fit: 'cover', position: 'center' }).toFile(path.join(temp, `recorte-${nombre}.jpg`));
  }
  console.log(`Recortes de prueba en ${temp}`);
}
