import test from 'node:test';
import assert from 'node:assert/strict';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { controlRoot } from '../scripts/config.mjs';

const implementation = await import('../scripts/assert-production.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const production = {
  mode: 'production', apiBase: '/api',
  firebase: { projectId: 'alsdevstudio', authDomain: 'alsdevstudio.firebaseapp.com',
    apiKey: `AIza${'B'.repeat(35)}`, appId: '1:365384555628:web:abcdef0123456789abcdef' },
};
const execute = promisify(exec);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'als-production-artifact-'));
  async function put(path, value = 'fixture') {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, value);
  }
  for (const path of ['index.html', 'favicon.svg', 'styles/control.css', 'assets/brand/logo-als.png',
    'assets/fonts/fonts.css', 'scripts/app.mjs', 'scripts/render.mjs', 'scripts/vendor/firebase.mjs',
    'assets/products/dialon.ico', 'assets/products/laparada.png', 'assets/products/sarinbotsaas.png',
    'assets/products/semancontrol.svg']) await put(path);
  await put('scripts/platform.mjs', 'export function createPlatform() {}');
  await put('scripts/public-config.mjs', `export default ${JSON.stringify(production)};\n`);
  return {
    root, put,
    async config(value) { await put('scripts/public-config.mjs', `export default ${JSON.stringify(value)};\n`); },
    async check(options = {}) {
      assert.equal(typeof implementation?.assertProductionArtifact, 'function', 'Falta el guard de artefactos de producción.');
      return implementation.assertProductionArtifact({ directory: root, projectId: 'alsdevstudio', ...options });
    },
    async close() {
      assert.equal(resolve(root).startsWith(`${resolve(tmpdir())}${sep}als-production-artifact-`), true);
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('acepta el artefacto productivo mínimo y rechaza configuraciones que no pertenecen al panel real', async (t) => {
  const local = await fixture();
  try {
    await local.check();
    const invalid = [
      ['demo', { ...production, mode: 'demo' }],
      ['sin configurar', { mode: 'unconfigured', apiBase: '/api' }],
      ['proyecto ajeno', { ...production, firebase: { ...production.firebase, projectId: 'otro-proyecto' } }],
      ['authDomain ajeno', { ...production, firebase: { ...production.firebase, authDomain: 'otro.firebaseapp.com' } }],
      ['API externa', { ...production, apiBase: 'https://evil.example/api' }],
      ['appId inválido', { ...production, firebase: { ...production.firebase, appId: 'example' } }],
      ['dato privado', { ...production, privateKey: 'synthetic-private-data' }],
    ];
    for (const [name, config] of invalid) await t.test(name, async () => {
      await local.config(config);
      await assert.rejects(local.check(), /configuración pública de producción inválida/i);
    });
    await local.config(production);
    await assert.rejects(local.check({ projectId: 'demo-alsdevstudio' }), /proyecto de despliegue/i);
  } finally { await local.close(); }
});

test('lee JSON sin ejecutar el módulo de configuración publicado', async () => {
  const local = await fixture();
  globalThis.__CONTROL_GUARD_EXECUTED__ = false;
  try {
    await local.put('scripts/public-config.mjs', `export default (globalThis.__CONTROL_GUARD_EXECUTED__ = true, ${JSON.stringify(production)});`);
    await assert.rejects(local.check(), /configuración pública de producción inválida/i);
    assert.equal(globalThis.__CONTROL_GUARD_EXECUTED__, false);
  } finally { delete globalThis.__CONTROL_GUARD_EXECUTED__; await local.close(); }
});

test('rechaza conexiones de demostración que hayan quedado en platform', async (t) => {
  const local = await fixture();
  try {
    for (const marker of ['/__dev/session', 'connectAuthEmulator', 'demo-alsdevstudio', 'http://127.0.0.1:9099']) await t.test(marker, async () => {
      await local.put('scripts/platform.mjs', `export const endpoint = ${JSON.stringify(marker)};`);
      await assert.rejects(local.check(), /demostración/i);
    });
  } finally { await local.close(); }
});

test('rechaza archivos y directorios internos añadidos al artefacto', async (t) => {
  for (const path of ['functions/src/index.mjs', '.env', 'scripts/node_modules/private.json', 'assets/secret.json']) await t.test(path, async () => {
    const local = await fixture();
    try { await local.put(path); await assert.rejects(local.check(), /archivo|directorio|recurso.*no permitido/i); }
    finally { await local.close(); }
  });
});

test('el hook real de Hosting acepta producción y bloquea la demostración desde el directorio del proyecto', async () => {
  const local = await fixture();
  try {
    const config = JSON.parse(await readFile(join(controlRoot, 'firebase.json'), 'utf8'));
    const commands = typeof config.hosting.predeploy === 'string' ? [config.hosting.predeploy] : config.hosting.predeploy;
    assert.ok(Array.isArray(commands) && commands.length > 0, 'Hosting debe ejecutar el guard antes de publicar.');
    const run = async () => {
      for (const command of commands) await execute(command, { cwd: controlRoot,
        env: { ...process.env, GCLOUD_PROJECT: 'alsdevstudio', RESOURCE_DIR: local.root } });
    };
    await run();
    await local.config({ ...production, mode: 'demo' });
    await assert.rejects(run());
    const robots = config.hosting.headers.flatMap(rule => rule.headers).find(header => header.key.toLowerCase() === 'x-robots-tag');
    assert.match(robots?.value ?? '', /noindex,\s*nofollow,\s*noarchive/);
  } finally { await local.close(); }
});
