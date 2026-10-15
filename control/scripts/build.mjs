// @ts-check
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { controlRoot, demoPublicConfig } from './config.mjs';

export async function buildControl({ demo = false, configPath = process.env.CONTROL_PUBLIC_CONFIG } = {}) {
  let config = { mode: 'unconfigured', apiBase: '/api' };
  if (demo) config = demoPublicConfig;
  else if (configPath) {
    config = JSON.parse(await readFile(resolve(controlRoot, configPath), 'utf8'));
    if (config.mode !== 'production' || config.firebase?.projectId?.startsWith('demo-') || !config.firebase?.apiKey || !config.firebase?.appId || !/^[a-z0-9-]+\.firebaseapp\.com$/.test(config.firebase?.authDomain ?? '') || config.apiBase !== '/api') {
      throw new Error('Configuración pública de producción inválida. Usa config/public.example.json.');
    }
  }
  const output = resolve(controlRoot, 'dist');
  // El destino es constante y se verifica antes de eliminar el build anterior.
  if (relative(controlRoot, output) !== 'dist' || !output.startsWith(`${controlRoot.replace(/[\\/]$/, '')}${sep}`)) throw new Error('Destino de build inválido.');
  await rm(output, { recursive: true, force: true });
  await mkdir(resolve(output, 'scripts/vendor'), { recursive: true });
  await cp(resolve(controlRoot, 'web'), output, { recursive: true, filter: (source) => !source.endsWith('firebase-entry.mjs') });
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
