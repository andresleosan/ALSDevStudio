import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { controlRoot } from '../scripts/config.mjs';

// Estos valores solo tienen formato Firebase; nunca se usan para acceder a una cuenta.
const production = {
  mode: 'production', apiBase: '/api',
  firebase: {
    projectId: 'alsdevstudio', authDomain: 'alsdevstudio.firebaseapp.com',
    apiKey: `AIza${'A'.repeat(35)}`, appId: '1:365384555628:web:0123456789abcdef012345',
  },
};

async function fixture() {
  const base = resolve(controlRoot, '.tools');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(join(base, 'production-build-'));
  const root = join(directory, 'control');
  await mkdir(join(root, 'scripts'), { recursive: true });
  await mkdir(join(directory, 'assets/fonts'), { recursive: true });
  await mkdir(join(directory, 'assets/brand'), { recursive: true });
  for (const name of ['build.mjs', 'config.mjs']) await cp(join(controlRoot, 'scripts', name), join(root, 'scripts', name));
  await cp(join(controlRoot, 'web'), join(root, 'web'), { recursive: true });
  await writeFile(join(directory, 'assets/fonts/fonts.css'), '/* fixture local */');
  await writeFile(join(directory, 'assets/brand/logo-als.png'), 'fixture local');
  const { buildControl } = await import(pathToFileURL(join(root, 'scripts/build.mjs')).href);
  return {
    root, buildControl,
    async configure(value) {
      await writeFile(join(root, 'public.json'), JSON.stringify(value));
      return { configPath: 'public.json' };
    },
    async config() {
      return (await import(`${pathToFileURL(join(root, 'dist/scripts/public-config.mjs')).href}?fresh=${crypto.randomUUID()}`)).default;
    },
    async close() {
      assert.equal(resolve(directory).startsWith(`${base}${sep}production-build-`), true);
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test('rechaza configuración ajena, credenciales de ejemplo y ajustes de emuladores sin sustituir el build válido', async (t) => {
  const local = await fixture();
  try {
    await local.buildControl({ configPath: '' });
    const cases = [
      ['otro proyecto', { ...production, firebase: { ...production.firebase, projectId: 'otro-proyecto' } }],
      ['proyecto ausente', { ...production, firebase: { ...production.firebase, projectId: undefined } }],
      ['otro authDomain', { ...production, firebase: { ...production.firebase, authDomain: 'otro-proyecto.firebaseapp.com' } }],
      ['API externa', { ...production, apiBase: 'https://evil.example/api' }],
      ['API key de ejemplo', { ...production, firebase: { ...production.firebase, apiKey: 'REEMPLAZAR_CON_CONFIG_PUBLICA_FIREBASE' } }],
      ['API key de longitud inválida', { ...production, firebase: { ...production.firebase, apiKey: 'AIza123' } }],
      ['appId de ejemplo', { ...production, firebase: { ...production.firebase, appId: 'REEMPLAZAR_CON_APP_ID_WEB' } }],
      ['appId de otro proyecto', { ...production, firebase: { ...production.firebase, appId: '1:123456789:web:0123456789abcdef012345' } }],
      ['appId no web', { ...production, firebase: { ...production.firebase, appId: '1:365384555628:android:0123456789abcdef012345' } }],
      ['modo demo en archivo', { ...production, mode: 'demo' }],
      ['emulador en configuración', { ...production, emulatorHost: '127.0.0.1:9099' }],
      ['dato privado en firebase', { ...production, firebase: { ...production.firebase, privateKey: 'synthetic-do-not-publish' } }],
      ['configuración nula', null],
      ['configuración array', []],
    ];
    for (const [name, config] of cases) await t.test(name, async () => {
      const previous = await readFile(join(local.root, 'dist/scripts/public-config.mjs'), 'utf8');
      await assert.rejects(local.buildControl(await local.configure(config)), /configuración pública de producción inválida/i);
      assert.equal(await readFile(join(local.root, 'dist/scripts/public-config.mjs'), 'utf8'), previous);
    });
  } finally { await local.close(); }
});

test('el build productivo contiene solo configuración pública y elimina las conexiones de demostración', async () => {
  const local = await fixture();
  try {
    await local.buildControl(await local.configure(production));
    assert.deepEqual(await local.config(), production);
    const platform = await readFile(join(local.root, 'dist/scripts/platform.mjs'), 'utf8');
    assert.doesNotMatch(platform, /\/__dev\/|connectAuthEmulator|127\.0\.0\.1:9099|demo-alsdevstudio/);
    assert.match(platform, /signInWithRedirect/);
    assert.match(platform, /getRedirectResult/);
    assert.doesNotMatch(platform, /signInWithPopup/);
  } finally { await local.close(); }
});

test('el build sin configuración permanece cerrado y la demostración necesita la opción explícita', async () => {
  const local = await fixture();
  try {
    await local.buildControl({ configPath: '' });
    assert.deepEqual(await local.config(), { mode: 'unconfigured', apiBase: '/api' });
    assert.doesNotMatch(await readFile(join(local.root, 'dist/scripts/platform.mjs'), 'utf8'), /\/__dev\/|connectAuthEmulator/);
    await local.buildControl({ demo: true });
    assert.equal((await local.config()).mode, 'demo');
    assert.equal((await local.config()).firebase.projectId, 'demo-alsdevstudio');
    assert.match(await readFile(join(local.root, 'dist/scripts/platform.mjs'), 'utf8'), /\/__dev\/session/);
  } finally { await local.close(); }
});
