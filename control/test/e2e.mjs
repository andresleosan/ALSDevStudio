// @ts-check
// Requiere `npm run dev` activo; crea únicamente registros sintéticos identificados como QA local.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const base = process.env.CONTROL_URL || 'http://127.0.0.1:8788';
assert.equal(new URL(base).hostname, '127.0.0.1', 'QA solo admite entorno loopback.');
const output = resolve('../test-results/control');
await mkdir(output, { recursive: true });
const suffix = Date.now().toString(36);
const business = `QA local ${suffix}`;
const person = `QA persona ${suffix}`;
const errors = [];
const checks = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(20000);

async function closeDialog() {
  await page.locator('#work-dialog').waitFor({ state: 'hidden' });
  await page.locator('#workspace[aria-busy="false"]').waitFor();
}
async function submit() { await page.locator('#work-dialog button[type="submit"]').click(); }
async function navigate(name) { await page.locator(`[data-view="${name}"]`).click(); }
async function configurePlan(product, amount) {
  await navigate('productos');
  const card = page.locator('.product-card').filter({ has: page.getByRole('heading', { name: product, exact: true }) });
  await card.getByRole('button', { name: /Configurar plan|Editar plan/ }).click();
  await page.locator('#work-dialog [name="name"]').fill(`Prueba local ${product}`);
  await page.locator('#work-dialog [name="amount"]').fill(amount);
  await submit(); await closeDialog();
}
async function createSubject(kind, name) {
  await navigate('suscripciones');
  await page.getByRole('button', { name: 'Crear persona o negocio', exact: true }).first().click();
  await page.locator('#work-dialog [name="kind"]').selectOption(kind);
  await page.locator('#work-dialog [name="name"]').fill(name);
  await page.locator('#work-dialog [name="email"]').fill(`qa-${suffix}-${kind}@example.com`);
  await submit(); await closeDialog();
}
async function createSubscription(productId, name, forbiddenName) {
  await page.getByRole('button', { name: 'Crear suscripción', exact: true }).first().click();
  await page.locator('#work-dialog [name="productId"]').selectOption(productId);
  const options = await page.locator('#work-dialog [name="subjectId"] option').allTextContents();
  assert.equal(options.some(label => label.startsWith(forbiddenName)), false, 'Solo muestra contratantes compatibles.');
  const option = page.locator('#work-dialog [name="subjectId"] option').filter({ hasText: name });
  await page.locator('#work-dialog [name="subjectId"]').selectOption(await option.getAttribute('value'));
  await submit(); await closeDialog();
}
async function sessionToken() {
  const seeded = await fetch(`${base}/__dev/session`, { method: 'POST', headers: { origin: base } });
  assert.equal(seeded.status, 200);
  const { token } = await seeded.json();
  const signed = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }),
  });
  assert.equal(signed.status, 200);
  return (await signed.json()).idToken;
}

try {
  await page.goto(base);
  await page.locator('#sign-in:not([disabled])').waitFor();
  await page.screenshot({ path: resolve(output, 'login-desktop.png'), fullPage: true });
  await page.locator('#sign-in').click();
  await page.locator('#app-shell').waitFor({ state: 'visible' });
  await page.locator('#workspace h1').waitFor();
  await configurePlan('La Parada', '60000');
  await configurePlan('Dialon', '30000');
  await createSubject('business', business);
  await createSubject('person', person);
  await createSubscription('laparada', business, person);
  await createSubscription('dialon', person, business);
  checks.push('Planes y suscripciones por negocio/persona con filtros compatibles.');

  const row = () => page.locator('section[aria-label="Suscripciones"] tr').filter({ hasText: business });
  await row().getByRole('button', { name: 'Iniciar prueba', exact: true }).click();
  await page.locator('#work-dialog').getByRole('button', { name: 'Iniciar prueba de 7 días', exact: true }).click();
  await closeDialog();
  assert.match(await row().textContent(), /En prueba/);
  await row().getByRole('button', { name: 'Registrar pago', exact: true }).click();
  await page.locator('#work-dialog [name="reference"]').fill(`QA-${suffix}`);
  await submit();
  await page.locator('#dialog-title').filter({ hasText: 'Confirmar pago' }).waitFor();
  await page.locator('#work-dialog').getByRole('button', { name: 'Confirmar registro del pago', exact: true }).click();
  await closeDialog();
  assert.match(await row().textContent(), /Vigente/);
  assert.match(await row().textContent(), /Sin conectar/);
  checks.push('Prueba, vista previa y pago real sobre Firestore emulator; vigencia y conexión separadas.');

  for (const [button, label] of [['Suspender', 'Suspendida'], ['Reactivar', 'Vigente']]) {
    await row().getByRole('button', { name: button, exact: true }).click();
    await page.locator('#work-dialog [name="reason"]').fill(`QA local: ${button.toLowerCase()}`);
    await submit(); await closeDialog();
    assert.match(await row().textContent(), new RegExp(label));
  }
  checks.push('Suspender y reactivar con motivo e historial.');

  const bearer = await sessionToken();
  const headers = { origin: base, authorization: `Bearer ${bearer}`, 'content-type': 'application/json' };
  const state = async () => (await fetch(`${base}/api/state`, { headers })).json();
  const command = async (action, payload, requestId = crypto.randomUUID()) => {
    const response = await fetch(`${base}/api/commands`, { method: 'POST', headers, body: JSON.stringify({ action, payload, requestId }) });
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
    return response.json();
  };
  let current = await state();
  const subject = current.subjects.find(value => value.name === business);
  const subscription = current.subscriptions.find(value => value.subjectId === subject.id && value.productId === 'laparada');
  assert.equal(Date.parse(subscription.trialEndsAt) - Date.parse(subscription.trialStartedAt), 7 * 86400000);
  assert.equal(subscription.confirmedVersion, null);
  assert.equal(subscription.connectionStatus, 'disconnected');
  const preview = (await command('payment.preview', { subscriptionId: subscription.id, amountMinor: 6000000, method: 'transfer', reference: `QA-concurrent-${suffix}`, receivedAt: new Date().toISOString() })).result;
  const requestId = crypto.randomUUID();
  const confirmations = await Promise.all([0, 1].map(() => command('payment.confirm', { quoteId: preview.id, acceptAmountDifference: false }, requestId)));
  assert.equal(confirmations[0].result.payment.id, confirmations[1].result.payment.id);
  current = await state();
  assert.equal(current.payments.filter(value => value.quoteId === preview.id).length, 1);
  assert.equal((await fetch(`${base}/api/state`)).status, 401);
  assert.equal((await fetch(`${base}/api/state`, { headers: { authorization: 'Bearer invalid-token' } })).status, 401);
  assert.equal((await fetch(`${base}/api/state`, { headers: { ...headers, origin: 'https://attacker.example' } })).status, 403);
  checks.push('Confirmación concurrente idempotente y API rechaza token ausente/inválido y origen externo.');

  const hostile = `<img src=x onerror="globalThis.controlXss=true"> QA ${suffix}`;
  await createSubject('business', hostile);
  assert.equal(await page.evaluate(() => globalThis.controlXss === true), false);
  assert.ok(await page.getByText(hostile, { exact: true }).count());
  checks.push('Nombre con HTML se muestra como texto y no se ejecuta.');
  await page.reload();
  await page.locator('#app-shell').waitFor({ state: 'visible' });
  await page.locator('#workspace h1').waitFor();
  await navigate('pagos');
  await page.getByText(`QA-${suffix}`, { exact: true }).waitFor();
  checks.push('Datos persistidos y sesión restaurada tras recarga.');

  const axe = await readFile(resolve('node_modules/axe-core/axe.min.js'), 'utf8');
  const responsive = [];
  await navigate('resumen');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 900 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow a ${width}px`);
    await page.evaluate(axe);
    const audit = await page.evaluate(async () => globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    assert.deepEqual(audit.violations.map(value => ({ id: value.id, impact: value.impact, nodes: value.nodes.map(node => node.target) })), [], `axe ${width}px`);
    await page.screenshot({ path: resolve(output, `dashboard-${width}.png`), fullPage: true });
    responsive.push({ width, overflow: false, violations: 0 });
  }
  await page.locator('#sign-out').click();
  await page.locator('#login').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#app-shell').isVisible(), false);
  checks.push('Cierre de sesión y responsive/reduced-motion/axe en cuatro anchos.');
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'e2e.json'), JSON.stringify({ checks, responsive, jsErrors: errors }, null, 2));
  console.log(`PASS: ${checks.length} recorridos; responsive y axe en cuatro anchos; sin errores JS.`);
} finally { await browser.close(); }
