// @ts-check
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { buildControl } from './build.mjs';
import { createLocalServer } from './local-server.mjs';
import { createDemoSession } from './demo-session.mjs';
import { javaEnvironment } from './ensure-java.mjs';
import { controlRoot, DEMO_PROJECT, WEB_PORT, emulatorEnvironment } from './config.mjs';

export async function startDevelopment() {
  const root = await buildControl({ demo: true });
  const environment = emulatorEnvironment(await javaEnvironment());
  Object.assign(process.env, environment);
  const emulator = spawn(process.execPath, [resolve(controlRoot, 'node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:start', '--only', 'auth,firestore,functions', '--project', DEMO_PROJECT, '--non-interactive'], {
    cwd: controlRoot, env: { ...environment, FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' }, stdio: 'inherit', windowsHide: true,
  });
  let exited = false;
  emulator.once('exit', () => { exited = true; });
  let server;
  const stop = async () => {
    if (server) await new Promise((done) => server.close(done));
    if (!exited) {
      if (process.platform === 'win32') spawnSyncKill(emulator.pid);
      else emulator.kill('SIGTERM');
    }
  };
  try {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      if (exited) throw new Error('Los emuladores se cerraron antes de iniciar. Revisa los puertos y Java.');
      const ready = await fetch(`http://127.0.0.1:5001/${DEMO_PROJECT}/us-central1/controlApi/api/state`, { signal: AbortSignal.timeout(1000) }).then((response) => response.status === 401).catch(() => false);
      if (ready) {
        server = createLocalServer({ root, createSession: createDemoSession });
        await new Promise((done, reject) => { server.once('error', reject); server.listen(WEB_PORT, '127.0.0.1', done); });
        console.log(`\nPanel local listo: http://127.0.0.1:${WEB_PORT}\nEmulator UI: http://127.0.0.1:4001\nSolo datos sintéticos. Ctrl+C para detener.\n`);
        return { server, emulator, stop };
      }
      await delay(1000);
    }
    throw new Error('Los emuladores no estuvieron disponibles dentro del plazo esperado.');
  } catch (error) { await stop(); throw error; }
}

import { spawnSync } from 'node:child_process';
function spawnSyncKill(pid) { spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const runtime = await startDevelopment();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await runtime.stop(); process.exit(0); });
  runtime.emulator.once('exit', async (code) => { await runtime.stop(); process.exit(code ?? 1); });
}
