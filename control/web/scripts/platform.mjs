// @ts-check
import publicConfig from './public-config.mjs';

function failure(code, message, status = 0) {
  return Object.assign(new Error(message), { code, status });
}

/** Transporte compartido de la UI; Firebase solo gestiona identidad, la API decide permisos. */
export function createPlatform(options = {}) {
  const config = options.config ?? publicConfig;
  const mode = ['demo', 'production'].includes(config.mode) ? config.mode : 'unconfigured';
  const request = options.fetch ?? globalThis.fetch.bind(globalThis);
  const loadSdk = options.loadSdk ?? (() => import('./vendor/firebase.mjs'));
  const listeners = new Set();
  let user = null;
  let sdk;
  let auth;
  let initialized;
  const notify = () => { const session = user ? { uid: user.uid, email: user.email } : null; for (const callback of listeners) callback(session); };

  async function initialize() {
    if (mode === 'unconfigured') throw failure('not-configured', 'Configura Firebase para iniciar sesión.');
    if (!initialized) initialized = (async () => {
      if (!config.firebase?.apiKey || !config.firebase?.projectId || !config.firebase?.appId || !config.firebase?.authDomain) {
        throw failure('not-configured', 'La configuración pública de Firebase está incompleta.');
      }
      sdk = await loadSdk();
      auth = sdk.getAuth(sdk.initializeApp(config.firebase));
      if (typeof __CONTROL_DEMO__ !== 'undefined' && __CONTROL_DEMO__ && mode === 'demo') {
        if (!['localhost', '127.0.0.1', '[::1]'].includes(globalThis.location?.hostname) || config.firebase.projectId !== 'demo-alsdevstudio') {
          throw failure('invalid-environment', 'La demostración solo está disponible en el entorno local.');
        }
        sdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      } else if (mode !== 'production') throw failure('invalid-environment', 'Este build no permite sesiones de demostración.');
      await new Promise((resolve, reject) => sdk.onIdTokenChanged(auth, (value) => { user = value; notify(); resolve(); }, reject));
    })().catch((error) => { initialized = null; throw failure(error.code ?? 'auth-unavailable', 'No fue posible iniciar Firebase. Revisa la configuración y la conexión.'); });
    return initialized;
  }

  async function api(path, body) {
    await initialize();
    if (!user) throw failure('unauthenticated', 'Inicia sesión para continuar.', 401);
    let token;
    try { token = await user.getIdToken(); }
    catch { user = null; notify(); throw failure('session-expired', 'La sesión venció. Inicia sesión de nuevo.', 401); }
    let response;
    try {
      response = await request(`${config.apiBase ?? '/api'}${path}`, {
        method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'omit',
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
      });
    } catch { throw failure('network-error', 'No se pudo conectar con el servidor. Reintenta con la misma operación.'); }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) { await sdk.signOut(auth); user = null; notify(); }
      throw failure(data?.error?.code ?? 'server-error', data?.error?.message ?? 'El servidor no pudo procesar la solicitud.', response.status);
    }
    if (!data || typeof data !== 'object') throw failure('invalid-response', 'La respuesta del servidor no es válida.', response.status);
    return data;
  }

  return {
    mode,
    onSession(callback) {
      listeners.add(callback);
      callback(user ? { uid: user.uid, email: user.email } : null);
      if (mode !== 'unconfigured') initialize().catch(() => {});
      return () => listeners.delete(callback);
    },
    async signIn() {
      await initialize();
      try {
        if (typeof __CONTROL_DEMO__ !== 'undefined' && __CONTROL_DEMO__ && mode === 'demo') {
          const response = await request('/__dev/session', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw failure('demo-unavailable', 'No se pudo preparar la identidad local. Comprueba los emuladores.');
          const { token } = await response.json();
          await sdk.signInWithCustomToken(auth, token);
          return;
        }
        const provider = new sdk.GoogleAuthProvider();
        await sdk.signInWithPopup(auth, provider);
      } catch (error) {
        throw failure(error.code ?? 'auth-error', 'No se pudo iniciar sesión. Revisa la conexión e inténtalo nuevamente.');
      }
    },
    async signOut() { await initialize(); await sdk.signOut(auth); user = null; notify(); },
    getState: () => api('/state'),
    command: (action, payload, requestId = crypto.randomUUID()) => api('/commands', { action, payload, requestId }),
  };
}
