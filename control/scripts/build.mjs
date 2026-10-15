// @ts-check
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { controlRoot, demoPublicConfig } from './config.mjs';

export function isProductionConfig(config) {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!object(config) || !object(config.firebase)) return false;
  // Solo los campos públicos utilizados por este panel pueden llegar al artefacto.
  const configFields = new Set(['mode', 'apiBase', 'firebase']);
  const firebaseFields = new Set(['projectId', 'authDomain', 'apiKey', 'appId']);
  return Object.keys(config).every(key => configFields.has(key)) &&
    Object.keys(config.firebase).every(key => firebaseFields.has(key)) &&
    config.mode === 'production' && config.apiBase === '/api' &&
    config.firebase.projectId === 'alsdevstudio' &&
    config.firebase.authDomain === 'alsdevstudio.firebaseapp.com' &&
    typeof config.firebase.apiKey === 'string' && /^AIza[A-Za-z0-9_-]{35}$/.test(config.firebase.apiKey) &&
    typeof config.firebase.appId === 'string' && /^1:365384555628:web:[a-f0-9]{16,64}$/.test(config.firebase.appId);
}

export async function buildControl({ demo = false, configPath = process.env.CONTROL_PUBLIC_CONFIG } = {}) {
  let config = { mode: 'unconfigured', apiBase: '/api' };
  if (demo) config = demoPublicConfig;
  else if (configPath) {
    config = JSON.parse(await readFile(resolve(controlRoot, configPath), 'utf8'));
    if (!isProductionConfig(config)) {
      throw new Error('Configuración pública de producción inválida. Usa config/public.example.json.');
    }
  }
  const output = resolve(controlRoot, 'dist');
  // El destino es constante y se verifica antes de eliminar el build anterior.
  if (relative(controlRoot, output) !== 'dist' || !output.startsWith(`${controlRoot.replace(/[\\/]$/, '')}${sep}`)) throw new Error('Destino de build inválido.');
  await rm(output, { recursive: true, force: true });
  await mkdir(resolve(output, 'scripts/vendor'), { recursive: true });
  await cp(resolve(controlRoot, 'web'), output, { recursive: true, filter: (source) => !source.endsWith('firebase-entry.mjs') });
  await cp(resolve(controlRoot, '../favicon.svg'), resolve(output, 'favicon.svg'));
  await mkdir(resolve(output, 'assets/fonts'), { recursive: true });
  await cp(resolve(controlRoot, '../assets/fonts'), resolve(output, 'assets/fonts'), { recursive: true });
  await mkdir(resolve(output, 'assets/brand'), { recursive: true });
  await cp(resolve(controlRoot, '../assets/brand/logo-als.png'), resolve(output, 'assets/brand/logo-als.png'));
  await writeFile(resolve(output, 'scripts/public-config.mjs'), `export default ${JSON.stringify(config)};\n`);
  await build({ entryPoints: [resolve(controlRoot, 'web/scripts/firebase-entry.mjs')], bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'eof', outfile: resolve(output, 'scripts/vendor/firebase.mjs') });
  await build({ entryPoints: [resolve(controlRoot, 'web/scripts/platform.mjs')], bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: true,
    external: ['./public-config.mjs', './vendor/firebase.mjs'], define: { __CONTROL_DEMO__: String(demo) }, outfile: resolve(output, 'scripts/platform.mjs') });
  if (!demo && (await readFile(resolve(output, 'scripts/platform.mjs'), 'utf8')).includes('/__dev/')) throw new Error('El build de producción contiene una ruta de desarrollo.');
  console.log(`Panel compilado: ${config.mode} → control/dist`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await buildControl({ demo: process.argv.includes('--demo') });
