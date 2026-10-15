// @ts-check
import { createRequire } from 'node:module';
import { DEMO_PROJECT, DEMO_UID, ADMIN_EMAIL } from './config.mjs';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

/** Este módulo se importa exclusivamente desde el servidor local, nunca desde Functions o web. */
export async function createDemoSession() {
  if (process.env.GCLOUD_PROJECT !== DEMO_PROJECT || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('La identidad ficticia requiere Auth emulator local.');
  const app = getApps().find((item) => item.name === 'control-local-session') ?? initializeApp({ projectId: DEMO_PROJECT }, 'control-local-session');
  const auth = getAuth(app);
  try { await auth.createUser({ uid: DEMO_UID, email: ADMIN_EMAIL, emailVerified: true, displayName: 'Administrador de demostración' }); }
  catch (error) { if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error; }
  await auth.updateUser(DEMO_UID, { email: ADMIN_EMAIL, emailVerified: true, disabled: false });
  await auth.setCustomUserClaims(DEMO_UID, { admin: true });
  return { token: await auth.createCustomToken(DEMO_UID, { admin: true }) };
}
