// @ts-check
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import { resolve, delimiter } from 'node:path';
import { toolsRoot } from './config.mjs';

const archiveUrl = 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jre_x64_windows_hotspot_21.0.12.1_1.zip';
const checksum = 'd35f31e712f0fcf6ac5a093edc90204fbff22f720ba3950bd09d331d5e621636';
const execute = promisify(execFile);

/** Java portable, usado solo por procesos hijos; no cambia JAVA_HOME/PATH del sistema. */
export async function javaEnvironment() {
  const installed = spawnSync('java', ['-version'], { encoding: 'utf8', windowsHide: true });
  const version = /version "(\d+)/.exec(installed.stderr ?? '')?.[1];
  if (Number(version) >= 21) return {};
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Instala Java 21 o superior para los emuladores en esta plataforma.');
  const javaRoot = resolve(toolsRoot, 'java');
  await mkdir(javaRoot, { recursive: true });
  let entry = (await readdir(javaRoot)).find((name) => name.startsWith('jdk-21'));
  if (!entry) {
    const archive = resolve(toolsRoot, 'temurin21-jre.zip');
    let binary = await readFile(archive).catch(() => null);
    if (!binary || createHash('sha256').update(binary).digest('hex') !== checksum) {
      console.log('Preparando Java 21 portable de Adoptium (49 MB, SHA-256 verificado)…');
      const response = await fetch(archiveUrl, { signal: AbortSignal.timeout(180000) });
      if (!response.ok) throw new Error('No se pudo descargar Java portable.');
      binary = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(binary).digest('hex') !== checksum) throw new Error('La verificación SHA-256 de Java falló.');
      await writeFile(archive, binary);
    }
    await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', 'Expand-Archive -LiteralPath $env:CONTROL_JAVA_ARCHIVE -DestinationPath $env:CONTROL_JAVA_DESTINATION -Force'], {
      windowsHide: true, env: { ...process.env, CONTROL_JAVA_ARCHIVE: archive, CONTROL_JAVA_DESTINATION: javaRoot },
    });
    entry = (await readdir(javaRoot)).find((name) => name.startsWith('jdk-21'));
  }
  if (!entry) throw new Error('No se encontró la distribución Java portable.');
  const javaHome = resolve(javaRoot, entry);
  await access(resolve(javaHome, 'bin/java.exe'));
  const path = `${resolve(javaHome, 'bin')}${delimiter}${process.env.Path ?? process.env.PATH ?? ''}`;
  // Node ordena las claves al crear procesos Windows; las variantes deben coincidir.
  return { JAVA_HOME: javaHome, PATH: path, Path: path };
}
