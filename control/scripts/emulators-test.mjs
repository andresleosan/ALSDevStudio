// @ts-check
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { javaEnvironment } from './ensure-java.mjs';
import { controlRoot, DEMO_PROJECT, emulatorEnvironment } from './config.mjs';

const environment = emulatorEnvironment(await javaEnvironment());
const child = spawn(process.execPath, [resolve(controlRoot, 'node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--only', 'auth,firestore,functions', '--project', DEMO_PROJECT, '--non-interactive', 'node --test functions/test/*.test.mjs test/*.test.mjs'], {
  cwd: controlRoot, env: { ...environment, FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' }, stdio: 'inherit', windowsHide: true,
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
