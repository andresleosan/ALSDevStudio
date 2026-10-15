// @ts-check
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createApi } from './api.mjs';
import { createFirebaseVerifier } from './auth.mjs';
import { createControlService } from './service.mjs';
import { createFirestoreStore } from './firestore-store.mjs';
import { getRuntimeOptions, resolveRuntimeEnvironment } from './runtime-options.mjs';

let api;
function initializeApi() {
  const { projectId, demo, authEmulatorHost } = resolveRuntimeEnvironment(process.env);
  const config = {
    projectId, environment: demo ? 'demo' : 'production', authEmulatorHost,
    adminUid: demo ? 'andres-demo-admin' : process.env.CONTROL_ADMIN_UID ?? '',
    adminEmail: 'andres.san1404@gmail.com',
    allowedOrigins: (process.env.CONTROL_ALLOWED_ORIGINS ?? (demo ? 'http://127.0.0.1:8788' : '')).split(',').filter(Boolean),
  };
  const app = getApps()[0] ?? initializeApp({ projectId });
  return createApi({ service: createControlService({ store: createFirestoreStore(getFirestore(app)) }), verifyToken: createFirebaseVerifier({ auth: getAuth(app), config }), config });
}

export const controlApi = onRequest(getRuntimeOptions(process.env), async (request, response) => {
  try {
    api ??= initializeApi();
    const url = `https://control.invalid${request.path}`;
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) if (typeof value === 'string') headers.set(name, value);
    const result = await api(new Request(url, { method: request.method, headers,
      ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: request.rawBody ?? Buffer.alloc(0) }),
    }), { clientAddress: request.ip });
    result.headers.forEach((value, key) => response.setHeader(key, value));
    response.status(result.status).send(Buffer.from(await result.arrayBuffer()));
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    response.status(503).json({ error: { code: 'service-unavailable', message: 'El servicio administrativo no está configurado o no está disponible.' } });
  }
});
