// @ts-check
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const controlRoot = fileURLToPath(new URL('../', import.meta.url));
export const DEMO_PROJECT = 'demo-alsdevstudio';
export const DEMO_UID = 'andres-demo-admin';
export const ADMIN_EMAIL = 'andres.san1404@gmail.com';
export const WEB_PORT = 8788;
export const demoPublicConfig = {
  mode: 'demo', apiBase: '/api',
  firebase: { apiKey: 'demo-api-key', authDomain: 'demo-alsdevstudio.firebaseapp.com', projectId: DEMO_PROJECT, appId: 'demo-alsdevstudio-control' },
};
export const toolsRoot = resolve(controlRoot, '.tools');

export function emulatorEnvironment(extra = {}) {
  // La CLI escribe su entorno en logs de depuración. Heredar solo rutas del sistema
  // evita propagar tokens de otras herramientas o credenciales de la sesión.
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:path|systemroot|windir|comspec|pathext|temp|tmp|userprofile|home|homedrive|homepath|localappdata|appdata|programfiles(?:\(x86\))?|programw6432|allusersprofile)$/i.test(key)));
  return {
    ...inherited, CI: 'true', NO_COLOR: '1', DEBUG: '',
    GCLOUD_PROJECT: DEMO_PROJECT, GOOGLE_CLOUD_PROJECT: DEMO_PROJECT,
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085',
    CONTROL_ADMIN_UID: DEMO_UID, CONTROL_ADMIN_EMAIL: ADMIN_EMAIL,
    CONTROL_ALLOWED_ORIGINS: `http://127.0.0.1:${WEB_PORT}`,
    // Los emuladores nunca toman credenciales del sistema para otros productos.
    GOOGLE_APPLICATION_CREDENTIALS: '', FIREBASE_TOKEN: '',
    ...extra,
  };
}
