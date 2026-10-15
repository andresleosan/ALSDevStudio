// Verificación de presentación contra el dominio real y un transporte de prueba.
// No cambia platform.mjs ni conecta Firebase. Ejecutar: node control/test/ui.smoke.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createControlService } from '../functions/src/service.mjs';
import { createMemoryStore } from '../functions/src/memory-store.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const admin = { uid: 'test-admin', email: 'admin@example.test' };
const service = createControlService({ store: createMemoryStore() });
const operations = [];
let confirmationAttempt = 0;
let expireNextSession = true;
const stub = `
export function createPlatform() {
 const callbacks = new Set();
 let session = sessionStorage.getItem('test-session') ? ${JSON.stringify(admin)} : null;
 const notify = () => callbacks.forEach(cb => cb(session));
 async function request(path, body) { const response = await fetch(path, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}); const data = await response.json(); if(!response.ok) { if(response.status===401){session=null;sessionStorage.removeItem('test-session');notify();} throw Object.assign(new Error(data.error.message),data.error); } return data; }
 return { mode:'demo', onSession(cb) { callbacks.add(cb); cb(session); return () => callbacks.delete(cb); }, async signIn(){session=${JSON.stringify(admin)};sessionStorage.setItem('test-session','1');notify();}, async signOut(){session=null;sessionStorage.removeItem('test-session');notify();}, getState:()=>request('/test-state'), command:(action,payload,requestId)=>request('/test-command',{action,payload,requestId}) };
}`;
const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/scripts/platform.mjs') { response.setHeader('Content-Type', 'text/javascript'); response.end(stub); return; }
    if (url.pathname === '/test-state') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(await service.getState(admin))); return; }
    if (url.pathname === '/test-command') {
      let body = ''; for await (const chunk of request) body += chunk;
      const operation = JSON.parse(body); operations.push(operation);
      if (operation.action === 'payment.confirm') {
        confirmationAttempt += 1;
        if ([2, 3].includes(confirmationAttempt)) {
          const status = confirmationAttempt === 2 ? 429 : 401;
          response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: status === 429 ? 'Límite temporal de prueba.' : 'Sesión vencida durante la confirmación.', status, code: status === 429 ? 'RATE_LIMIT' : 'UNAUTHORIZED' } })); return;
        }
      }
      if (operation.action === 'subject.create' && operation.payload.name === 'Sesión caducada' && expireNextSession) {
        expireNextSession = false; response.writeHead(401, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: 'Sesión vencida.', status: 401 } })); return;
      }
      const result = await service.execute(operation, admin);
      if (operation.action === 'payment.confirm' && confirmationAttempt === 1) {
        response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: 'Respuesta perdida de prueba. Reintenta la misma operación.', status: 503 } })); return;
      }
      response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(result)); return;
    }
    const sharedAsset = url.pathname === '/favicon.svg' || (url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/assets/products/'));
    const file = sharedAsset ? resolve(root, `.${url.pathname}`) : resolve(root, 'control/web', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (!file.startsWith(root)) throw new Error('Ruta inválida');
    response.setHeader('Content-Type', types[extname(file)] || 'text/plain'); response.end(await readFile(file));
  } catch (error) {
    response.writeHead(error.status || 400, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: error.message, code: error.code, status: error.status || 400 } }));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const screenshots = resolve(root, '.superpowers/sdd/2026-10-14-nucleo-panel-suscripciones/ui');
await mkdir(screenshots, { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button', { name: 'Entrar al entorno de prueba' }).click();
  await page.getByRole('heading', { name: 'Todo bajo control.' }).waitFor();
  assert.equal(await page.locator('.metric strong').first().textContent(), '0');
  await page.screenshot({ path: resolve(screenshots, 'resumen-1440.png'), fullPage: true });
  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  await page.locator('.product-card').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('.product-card').count(), 4);
  await page.locator('[data-product="laparada"]').getByRole('button', { name: 'Configurar plan' }).click();
  await page.getByLabel('Nombre del plan').fill('Plan local');
  await page.getByLabel('Precio del período (COP)').fill('50000');
  await page.getByRole('button', { name: 'Guardar plan', exact: true }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.getByRole('link', { name: 'Suscripciones', exact: true }).click();
  await page.locator('.page-actions').getByRole('button', { name: 'Crear persona o negocio' }).click();
  await page.getByLabel('Nombre de la persona o negocio').fill('Negocio de prueba');
  await page.getByLabel('Correo de contacto').fill('negocio@example.test');
  await page.getByRole('button', { name: 'Crear contratante' }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.locator('.primary-line').getByText('Negocio de prueba', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => ['H1', 'MAIN'].includes(document.activeElement?.tagName)), true, 'Después de guardar el foco permanece en el contenido actualizado');
  await page.locator('.page-actions').getByRole('button', { name: 'Crear suscripción', exact: true }).click();
  await page.getByLabel('Persona o negocio', { exact: true }).selectOption({ label: 'Negocio de prueba · negocio@example.test' });
  await page.locator('#work-dialog').getByRole('button', { name: 'Crear suscripción', exact: true }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Iniciar prueba', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar prueba de 7 días' }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.locator('.badge-trial').waitFor();
  await page.locator('.row-actions').getByRole('button', { name: 'Registrar pago' }).click();
  await page.getByLabel('Importe recibido (COP)').fill('45000');
  await page.getByLabel('Referencia o comprobante').fill('QA-001');
  await page.getByRole('button', { name: 'Revisar pago' }).click();
  await page.getByRole('heading', { name: 'Confirmar pago' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Confirmar registro del pago' }).isDisabled(), true);
  await page.getByLabel('Acepto registrar un importe diferente', { exact: false }).check();
  await page.getByRole('button', { name: 'Confirmar registro del pago' }).click();
  await page.getByRole('button', { name: 'Reintentar confirmación' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Reintentar confirmación' }).waitFor();
  await page.getByRole('button', { name: 'Reintentar confirmación' }).click();
  await page.getByText('Límite temporal de prueba.', { exact: true }).waitFor();
  assert.notEqual(await page.evaluate(uid => sessionStorage.getItem(`als-control:confirmation:${uid}`), admin.uid), null, '429 conserva la confirmación pendiente');
  assert.equal(await page.locator('#work-dialog .form-actions .secondary').isDisabled(), true, 'No permite generar otra cotización mientras la respuesta es incierta');
  assert.equal(await page.getByLabel('Acepto registrar un importe diferente', { exact: false }).isDisabled(), true, 'El payload aceptado permanece bloqueado');
  await page.getByRole('button', { name: 'Reintentar confirmación' }).click();
  await page.getByRole('button', { name: 'Entrar al entorno de prueba' }).waitFor();
  assert.notEqual(await page.evaluate(uid => sessionStorage.getItem(`als-control:confirmation:${uid}`), admin.uid), null, '401 conserva la confirmación para la siguiente sesión');
  await page.reload();
  await page.getByRole('button', { name: 'Entrar al entorno de prueba' }).click();
  await page.getByRole('button', { name: 'Reintentar confirmación' }).waitFor();
  assert.equal(await page.getByLabel('Acepto registrar un importe diferente', { exact: false }).isChecked(), true);
  assert.equal(await page.getByLabel('Acepto registrar un importe diferente', { exact: false }).isDisabled(), true);
  await page.getByRole('button', { name: 'Reintentar confirmación' }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  const confirmations = operations.filter(operation => operation.action === 'payment.confirm');
  assert.equal(confirmations.length, 4);
  for (const confirmation of confirmations) {
    assert.equal(confirmation.requestId, confirmations[0].requestId);
    assert.deepEqual(confirmation.payload, confirmations[0].payload);
  }
  assert.equal(confirmations[0].payload.acceptAmountDifference, true);
  assert.equal(await page.evaluate(uid => sessionStorage.getItem(`als-control:confirmation:${uid}`), admin.uid), null);
  assert.equal((await service.getState(admin)).payments.length, 1);
  await page.locator('.badge-active').waitFor();
  assert.equal(await page.evaluate(() => ['H1', 'MAIN'].includes(document.activeElement?.tagName)), true, 'Después de confirmar el pago el foco permanece en el contenido actualizado');
  await page.getByRole('button', { name: 'Suspender', exact: true }).click();
  await page.getByLabel('Motivo', { exact: true }).fill('Revisión solicitada');
  await page.getByRole('button', { name: 'Suspender suscripción', exact: true }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Reactivar', exact: true }).click();
  await page.getByLabel('Motivo', { exact: true }).fill('Revisión terminada');
  await page.getByRole('button', { name: 'Reactivar suscripción', exact: true }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.locator('.badge-active').waitFor();
  await page.locator('.page-actions').getByRole('button', { name: 'Crear persona o negocio' }).click();
  await page.getByLabel('Nombre de la persona o negocio').fill('<img src=x onerror=alert(1)>');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).last().click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.reload();
  await page.locator('.page-actions').getByRole('button', { name: 'Crear persona o negocio' }).click();
  assert.equal(await page.getByLabel('Nombre de la persona o negocio').inputValue(), '<img src=x onerror=alert(1)>');
  await page.getByLabel('Correo de contacto').fill('xss@example.test');
  await page.getByRole('button', { name: 'Crear contratante' }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#workspace img').count(), 0);
  await page.getByText('<img src=x onerror=alert(1)>', { exact: true }).waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Sin desbordamiento en ${width}px`);
    await page.screenshot({ path: resolve(screenshots, `suscripciones-${width}.png`), fullPage: true });
  }
  await page.getByRole('link', { name: 'Pagos', exact: true }).click();
  await page.getByText('QA-001', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Actividad', exact: true }).click();
  await page.locator('.activity-action').getByText('Pago confirmado', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Suscripciones', exact: true }).click();
  await page.locator('.page-actions').getByRole('button', { name: 'Crear persona o negocio' }).click();
  const openerText = await page.evaluate(() => document.activeElement?.textContent);
  await page.keyboard.press('Escape');
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Crear persona o negocio');
  await page.locator('.page-actions').getByRole('button', { name: 'Crear persona o negocio' }).click();
  await page.getByLabel('Nombre de la persona o negocio').fill('Sesión caducada');
  await page.getByLabel('Correo de contacto').fill('sesion@example.test');
  await page.getByRole('button', { name: 'Crear contratante' }).click();
  await page.getByRole('button', { name: 'Entrar al entorno de prueba' }).click();
  await page.locator('.page-actions').getByRole('button', { name: 'Crear persona o negocio' }).click();
  assert.equal(await page.getByLabel('Nombre de la persona o negocio').inputValue(), 'Sesión caducada');
  assert.equal(await page.getByLabel('Correo de contacto').inputValue(), 'sesion@example.test');
  await page.getByRole('button', { name: 'Crear contratante' }).click();
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar al entorno de prueba' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('UI smoke: recorrido completo, retry idempotente tras recarga, borrador/recarga/sesión vencida, foco al cerrar, XSS como texto, 4 anchos, sesión y cero errores JS.');
  console.log(`Capturas: ${screenshots}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
