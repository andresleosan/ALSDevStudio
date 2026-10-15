// @ts-check
import { lstat, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { controlRoot } from './config.mjs';
import { isProductionConfig } from './build.mjs';

const directories = new Set(['assets', 'assets/brand', 'assets/fonts', 'scripts', 'scripts/vendor', 'styles']);
const required = new Set(['index.html', 'styles/control.css', 'scripts/app.mjs', 'scripts/render.mjs',
  'scripts/platform.mjs', 'scripts/public-config.mjs', 'scripts/vendor/firebase.mjs',
  'assets/brand/logo-als.png', 'assets/fonts/fonts.css']);
const publicFile = /^(?:index\.html|styles\/control\.css|scripts\/(?:app|render|platform|public-config)\.mjs|scripts\/vendor\/firebase\.mjs|assets\/brand\/logo-als\.png|assets\/fonts\/(?:[A-Za-z0-9_-]+\.(?:woff2|css|txt)|SOURCES\.json))$/;

/** Verifica el artefacto sin ejecutar su configuración ni modificar archivos. */
export async function assertProductionArtifact({ directory = process.env.RESOURCE_DIR ?? resolve(controlRoot, 'dist'), projectId = process.env.GCLOUD_PROJECT } = {}) {
  if (projectId && projectId !== 'alsdevstudio') throw new Error('Proyecto de despliegue no autorizado para este panel.');
  const root = resolve(directory);
  const rootEntry = await lstat(root);
  if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) throw new Error('Directorio de publicación no permitido.');
  const files = new Set();
  async function inspect(prefix = '') {
    for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Recurso no permitido en el artefacto: ${path}`);
      if (entry.isDirectory() && directories.has(path)) await inspect(path);
      else if (entry.isFile() && publicFile.test(path)) files.add(path);
      else throw new Error(`Archivo o directorio no permitido en el artefacto: ${path}`);
    }
  }
  await inspect();
  for (const path of required) if (!files.has(path)) throw new Error(`Falta un recurso público requerido: ${path}`);
  let config;
  try {
    const source = await readFile(resolve(root, 'scripts/public-config.mjs'), 'utf8');
    const match = /^\s*export default ([\s\S]+);\s*$/.exec(source);
    if (!match) throw new Error();
    config = JSON.parse(match[1]);
  } catch { throw new Error('Configuración pública de producción inválida.'); }
  if (!isProductionConfig(config)) throw new Error('Configuración pública de producción inválida.');
  const platform = await readFile(resolve(root, 'scripts/platform.mjs'), 'utf8');
  if (/\/__dev\/|connectAuthEmulator|demo-alsdevstudio|https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/.test(platform)) {
    throw new Error('El artefacto contiene conexiones de demostración. Compila producción antes de publicar.');
  }
  return { files: files.size, projectId: 'alsdevstudio' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await assertProductionArtifact();
    console.log(`Artefacto de producción verificado: ${result.files} archivos públicos.`);
  } catch (error) {
    console.error(`Publicación bloqueada: ${error.message}`);
    process.exitCode = 1;
  }
}
