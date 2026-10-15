// @ts-check

/**
 * Falla antes de inicializar SDKs si el proyecto o los emuladores no son los previstos.
 * @param {Record<string, string | undefined>} [env]
 */
export function resolveRuntimeEnvironment(env = process.env) {
  const projectId = env.GCLOUD_PROJECT ?? env.GOOGLE_CLOUD_PROJECT ?? '';
  if ((env.GCLOUD_PROJECT !== undefined && env.GOOGLE_CLOUD_PROJECT !== undefined && env.GCLOUD_PROJECT !== env.GOOGLE_CLOUD_PROJECT) ||
      !['alsdevstudio', 'demo-alsdevstudio'].includes(projectId)) {
    throw new Error('El proyecto administrativo no es válido.');
  }
  const demo = projectId === 'demo-alsdevstudio';
  const authEmulatorHost = env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulatorHost = env.FIRESTORE_EMULATOR_HOST;
  if (demo && (authEmulatorHost !== '127.0.0.1:9099' || firestoreEmulatorHost !== '127.0.0.1:8085')) {
    throw new Error('La demostración requiere ambos emuladores locales configurados.');
  }
  if (!demo && (authEmulatorHost || firestoreEmulatorHost)) {
    throw new Error('Los emuladores no se permiten en producción.');
  }
  return { projectId, demo, authEmulatorHost };
}

/**
 * Opciones controladas por código: una sola instancia, sin reserva y con identidad mínima.
 * El invocador HTTP es público para que llegue el token Firebase; la API autoriza al titular.
 * @param {Record<string, string | undefined>} [env]
 * @returns {import('firebase-functions/v2/https').HttpsOptions}
 */
export function getRuntimeOptions(env = process.env) {
  const { demo } = resolveRuntimeEnvironment(env);
  return {
    region: 'us-central1', minInstances: 0, maxInstances: 1, concurrency: 20,
    timeoutSeconds: 30, memory: '256MiB', cors: false, invoker: 'public',
    ...(demo ? {} : { serviceAccount: 'als-control-api@alsdevstudio.iam.gserviceaccount.com' }),
  };
}
