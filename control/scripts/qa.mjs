// @ts-check
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { startDevelopment } from './dev.mjs';
import { controlRoot, emulatorEnvironment } from './config.mjs';

// Comprueba antes de compilar para no alterar el build de una demostración activa.
async function verifyAvailablePorts() {
  for (const port of [8788, 9099, 8085, 5001, 4001, 4401, 4501, 9150]) {
    await new Promise((resolve, reject) => {
      const probe = createServer();
      probe.once('error', () => reject(new Error(`El puerto ${port} está ocupado. Detén la demostración y cualquier suite de emuladores antes de ejecutar npm run qa.`)));
      probe.listen(port, '127.0.0.1', () => probe.close(resolve));
    });
  }
}

let currentChild;
let runtime;
let interrupted = false;

function stopCurrentChild() {
  if (!currentChild || currentChild.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(currentChild.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else currentChild.kill('SIGTERM');
}

async function run(args) {
  if (interrupted) throw new Error('QA interrumpido.');
  const environment = { ...emulatorEnvironment(), CONTROL_URL: 'http://127.0.0.1:8788' };
  await new Promise((resolve, reject) => {
    currentChild = spawn(process.execPath, args, { cwd: controlRoot, env: environment, stdio: 'inherit', windowsHide: true });
    currentChild.once('error', reject);
    currentChild.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`La etapa de QA terminó con ${signal ?? `código ${code ?? 1}`}.`)));
  });
  currentChild = undefined;
}

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  interrupted = true;
  stopCurrentChild();
});

try {
  await verifyAvailablePorts();
  runtime = await startDevelopment();
  console.log('\nQA: pruebas unitarias e integración Firestore.\n');
  await run(['--test', 'functions/test/*.test.mjs', 'test/*.test.mjs']);
  console.log('\nQA: recuperación de pagos y foco con transporte de prueba.\n');
  await run(['test/ui.smoke.mjs']);
  console.log('\nQA: recorrido de navegador con Playwright y axe-core.\n');
  await run(['test/e2e.mjs']);
  console.log('\nQA completo: todas las etapas finalizaron correctamente.');
} catch (error) {
  console.error(error.message);
  process.exitCode = interrupted ? 130 : 1;
} finally {
  stopCurrentChild();
  if (runtime) await runtime.stop();
}
