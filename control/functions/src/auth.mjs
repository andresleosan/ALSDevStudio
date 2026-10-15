// @ts-check

/** @typedef {{projectId:string, adminUid:string, adminEmail:string, environment:string, authEmulatorHost?:string}} AuthConfig */

export class AuthError extends Error {
  /** @param {number} status @param {string} code @param {string} message */
  constructor(status, code, message) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

/** @param {AuthConfig} config */
function validateConfiguration(config) {
  const expectedEmail = 'andres.san1404@gmail.com';
  const uidValid = typeof config.adminUid === 'string' && config.adminUid.length > 0 && config.adminUid.length <= 128;
  const demo = config.environment === 'demo' && config.projectId === 'demo-alsdevstudio' &&
    /^(?:127\.0\.0\.1|localhost|\[::1\]):\d{1,5}$/.test(config.authEmulatorHost || '');
  const production = config.environment === 'production' && config.projectId === 'alsdevstudio' && !config.authEmulatorHost;
  if (!uidValid || config.adminEmail !== expectedEmail || (!demo && !production)) {
    throw new AuthError(503, 'configuration_required', 'El acceso administrativo requiere configuración segura.');
  }
  return { demo };
}

/**
 * Autoriza claims previamente verificados por Firebase. Nunca decodifica JWT sin verificar.
 * @param {Record<string, any>} decoded
 * @param {AuthConfig} config
 * @param {number} [nowMs]
 * @returns {{uid:string,email:string}}
 */
export function assertAdminClaims(decoded, config, nowMs = Date.now()) {
  const { demo } = validateConfiguration(config);
  const validIdentity = decoded && typeof decoded === 'object' &&
    decoded.uid === config.adminUid && decoded.sub === config.adminUid &&
    typeof decoded.email === 'string' && decoded.email.toLowerCase() === config.adminEmail &&
    decoded.email_verified === true && decoded.admin === true &&
    decoded.aud === config.projectId && decoded.iss === `https://securetoken.google.com/${config.projectId}`;
  const provider = decoded?.firebase?.sign_in_provider;
  if (!validIdentity || !(provider === 'google.com' || (demo && provider === 'custom'))) {
    throw new AuthError(403, 'forbidden', 'Esta cuenta no tiene acceso administrativo.');
  }
  if (typeof decoded.exp !== 'number' || !Number.isFinite(decoded.exp) || decoded.exp * 1000 <= nowMs) {
    throw new AuthError(401, 'unauthenticated', 'La sesión venció. Ingresa de nuevo.');
  }
  return { uid: config.adminUid, email: config.adminEmail };
}

/**
 * @param {{auth:{verifyIdToken:(token:string,checkRevoked:boolean)=>Promise<any>},config:AuthConfig}} dependencies
 */
export function createFirebaseVerifier({ auth, config }) {
  return async (token) => {
    validateConfiguration(config);
    if (typeof token !== 'string' || !token || token.length > 8192) {
      throw new AuthError(401, 'unauthenticated', 'Ingresa para acceder al panel.');
    }
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token, true);
    } catch {
      throw new AuthError(401, 'unauthenticated', 'La sesión no es válida. Ingresa de nuevo.');
    }
    return assertAdminClaims(decoded, config);
  };
}
