// @ts-check
import { createLocalJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from '../../.github/sarin/firebase-jwt.js';
import { readBoundedJson } from './policy.js';

export const ADMIN_SESSION_COOKIE = '__Host-sarin_admin';
const FIREBASE_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const FIREBASE_LOOKUP = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const SESSION_LIFETIME = 6 * 60 * 60;
// Deja espacio para el nombre y los atributos dentro del límite de una cookie.
const MAX_TOKEN_LENGTH = 3800;
const REMOTE_TIMEOUT = 5000;
const validProject = value => typeof value === 'string' && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value);
// Solo claves públicas ya descargadas; nunca identidades, tokens ni solicitudes.
const publicKeys = new WeakMap();

const PRIVATE_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
});

export class AdminError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

export function adminResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    ...PRIVATE_HEADERS, 'Content-Type': 'application/json; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", ...headers,
  } });
}

export function adminError(error) {
  const status = error instanceof AdminError ? error.status : 503;
  const code = error instanceof AdminError ? error.code : 'unavailable';
  return adminResponse({ error: { code, message: status === 403 ? 'Acceso no autorizado o vencido.' : status === 400 ? 'Revisa los datos enviados.' : status === 404 ? 'No se encontró la conversación.' : status === 405 ? 'Método no permitido.' : status === 413 ? 'La petición es demasiado extensa.' : 'La administración no está disponible.' } }, status,
    status === 405 ? { Allow: 'GET, POST' } : {});
}

function configuration(env) {
  if (env.SARIN_ADMIN_ENABLED !== 'true'
      || !validProject(env.SARIN_FIREBASE_PROJECT_ID)
      || typeof env.SARIN_FIREBASE_API_KEY !== 'string' || !/^[A-Za-z0-9_-]{20,256}$/.test(env.SARIN_FIREBASE_API_KEY)
      || typeof env.SARIN_ADMIN_UID !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(env.SARIN_ADMIN_UID)
      || typeof env.SARIN_ADMIN_EMAIL !== 'string' || env.SARIN_ADMIN_EMAIL.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SARIN_ADMIN_EMAIL)
      || typeof env.SARIN_ADMIN_CSRF_SECRET !== 'string' || env.SARIN_ADMIN_CSRF_SECRET.length < 32) {
    throw new AdminError(503, 'unavailable');
  }
  return { projectId: env.SARIN_FIREBASE_PROJECT_ID, apiKey: env.SARIN_FIREBASE_API_KEY,
    uid: env.SARIN_ADMIN_UID, email: env.SARIN_ADMIN_EMAIL.toLowerCase() };
}

function seconds(options) {
  const now = Math.floor((options.now || Date.now)() / 1000);
  if (!Number.isSafeInteger(now) || now < 0) throw new AdminError(503, 'unavailable');
  return now;
}

/** Petición de autenticación acotada, sin redirecciones, reintentos ni errores remotos públicos. */
async function remoteJson(url, init, fetchImpl, limit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT);
  let response;
  try {
    const fetchOptions = { ...init, headers: { Accept: 'application/json', ...init.headers },
      // Workerd admite manual; el estado 200 obligatorio descarta cualquier 3xx.
      redirect: 'manual', cache: 'no-store', credentials: 'omit', signal: controller.signal };
    // Algunos runtimes exigen el receptor global. Se conserva la función original
    // como clave de caché; las dependencias inyectadas siguen sin receptor.
    response = await (fetchImpl === globalThis.fetch ? globalThis.fetch(url, fetchOptions) : fetchImpl(url, fetchOptions));
    if (response.status !== 200) {
      void response.body?.cancel().catch(() => {});
      if (url.startsWith(FIREBASE_LOOKUP) && [400, 401, 403, 404].includes(response.status)) throw new AdminError(403, 'access_denied');
      throw new AdminError(503, 'unavailable');
    }
    if (!/^application\/json(?:\s*;[^\r\n]*)?$/i.test(response.headers.get('Content-Type') || '')) throw new AdminError(503, 'unavailable');
    const declared = response.headers.get('Content-Length');
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new AdminError(503, 'unavailable');
    const value = await readBoundedJson(response.body, limit, controller.signal);
    return { value, headers: response.headers };
  } catch (error) {
    if (error instanceof AdminError) throw error;
    throw new AdminError(503, 'unavailable');
  } finally {
    clearTimeout(timer);
    if (response?.body && !response.bodyUsed) void response.body.cancel().catch(() => {});
  }
}

async function firebaseKeys(fetchImpl, now, refresh = false) {
  const cached = publicKeys.get(fetchImpl);
  if (!refresh && cached && cached.expiresAt > now) return cached.resolve;
  const { value, headers } = await remoteJson(FIREBASE_JWKS, { method: 'GET' }, fetchImpl, 65536);
  if (!value || !Array.isArray(value.keys) || !value.keys.length || value.keys.length > 20
      || value.keys.some(key => !key || typeof key !== 'object' || key.kty !== 'RSA' || typeof key.kid !== 'string'
        || typeof key.n !== 'string' || typeof key.e !== 'string' || key.d !== undefined)) throw new AdminError(503, 'unavailable');
  const resolve = createLocalJWKSet(value);
  const maxAge = /(?:^|,)\s*max-age=(\d+)(?:\s*(?:,|$))/i.exec(headers.get('Cache-Control') || '');
  const ttl = Math.min(maxAge ? Number(maxAge[1]) : 60, 3600);
  if (Number.isFinite(ttl) && ttl > 0) publicKeys.set(fetchImpl, { resolve, expiresAt: now + ttl, fetchedAt: now });
  else publicKeys.delete(fetchImpl);
  return resolve;
}

function validateClaims(payload, config, now) {
  if (!payload || payload.iss !== `https://securetoken.google.com/${config.projectId}` || payload.aud !== config.projectId
      || payload.sub !== config.uid || typeof payload.email !== 'string' || payload.email.toLowerCase() !== config.email
      || payload.email_verified !== true || payload.firebase?.sign_in_provider !== 'google.com' || payload.firebase?.tenant !== undefined
      || !Number.isSafeInteger(payload.exp) || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.auth_time)
      || payload.iat < 0 || payload.auth_time < 0 || payload.auth_time > payload.iat || payload.iat > now
      || payload.exp <= now || payload.exp <= payload.iat
      || payload.auth_time > now || now - payload.auth_time >= SESSION_LIFETIME
      || (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || payload.nbf > now))) throw new AdminError(403, 'access_denied');
}

async function verifyFirebaseAdminToken(token, config, options) {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new AdminError(403, 'access_denied');
  const now = seconds(options);
  try {
    // El parseo inicial solo descarta entradas antes de red; no autoriza a nadie.
    const header = decodeProtectedHeader(token);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(header.kid)) throw new AdminError(403, 'access_denied');
    validateClaims(decodeJwt(token), config, now);
  } catch { throw new AdminError(403, 'access_denied'); }
  const fetchImpl = options.authFetch || globalThis.fetch;
  let keys = await firebaseKeys(fetchImpl, now);
  const verify = resolver => jwtVerify(token, resolver, { algorithms: ['RS256'], issuer: `https://securetoken.google.com/${config.projectId}`,
    audience: config.projectId, currentDate: new Date(now * 1000), requiredClaims: ['exp', 'iat', 'sub', 'auth_time'] });
  let verified;
  try {
    verified = await verify(keys);
  } catch (error) {
    const cached = publicKeys.get(fetchImpl);
    // Una rotación puede introducir un kid nuevo antes de vencer la caché pública.
    // La recarga se limita a una y tiene cooldown; firmas inválidas no la provocan.
    if (error?.code !== 'ERR_JWKS_NO_MATCHING_KEY' || !cached || now - cached.fetchedAt < 30) throw new AdminError(403, 'access_denied');
    keys = await firebaseKeys(fetchImpl, now, true);
    try { verified = await verify(keys); }
    catch { throw new AdminError(403, 'access_denied'); }
  }
  const { payload } = verified;
  validateClaims(payload, config, now);
  const lookup = new URL(FIREBASE_LOOKUP);
  lookup.searchParams.set('key', config.apiKey);
  const { value } = await remoteJson(lookup.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) }, fetchImpl, 32768);
  const user = value?.users?.[0];
  if (!Array.isArray(value?.users) || value.users.length !== 1 || !user || user.localId !== config.uid
      || typeof user.email !== 'string' || user.email.toLowerCase() !== config.email || user.emailVerified !== true
      || (user.disabled !== undefined && user.disabled !== false) || user.tenantId !== undefined
      || (user.validSince !== undefined && (typeof user.validSince !== 'string' || !/^(?:0|[1-9]\d{0,15})$/.test(user.validSince)
        || !Number.isSafeInteger(Number(user.validSince)) || payload.auth_time < Number(user.validSince)))) throw new AdminError(403, 'access_denied');
  return { admin: { email: config.email, subject: config.uid }, maxAge: Math.min(payload.exp, payload.auth_time + SESSION_LIFETIME) - now };
}

function sessionToken(request) {
  const header = request.headers.get('Cookie') || '';
  if (header.length > 32768) throw new AdminError(403, 'access_denied');
  const values = header.split(';').map(value => value.trim()).filter(value => value.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (values.length !== 1) throw new AdminError(403, 'access_denied');
  return values[0].slice(ADMIN_SESSION_COOKIE.length + 1);
}

/** Solo una cookie verificada; no se aceptan cabeceras de identidad ni bearer del cliente.
 * @param {Request} request
 * @param {Record<string, any>} env
 * @param {{now?:()=>number,authFetch?:typeof fetch}} [options] Dependencias internas de pruebas.
 */
export async function authenticateSarinAdmin(request, env, options = {}) {
  const config = configuration(env);
  return (await verifyFirebaseAdminToken(sessionToken(request), config, options)).admin;
}

function sameOrigin(request, url) {
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new AdminError(403, 'origin_rejected');
  if (request.headers.get('Origin') !== url.origin) throw new AdminError(403, 'origin_rejected');
}

async function requestJson(request, limit) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') || '') || request.headers.has('Content-Encoding')) throw new AdminError(400, 'invalid_request');
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new AdminError(413, 'body_too_large');
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timer = setTimeout(abort, REMOTE_TIMEOUT);
  try { return await readBoundedJson(request.body, limit, controller.signal); }
  catch (error) { throw new AdminError(error?.status === 413 ? 413 : 400, error?.status === 413 ? 'body_too_large' : 'invalid_request'); }
  finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); }
}

const sessionCookie = (value, maxAge) => `${ADMIN_SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

/** Devuelve null para las rutas de datos; estas siguen requiriendo autenticación en admin.js. */
export async function handleSarinAdminAuth(request, env, options = {}) {
  const url = new URL(request.url);
  const route = /^\/api\/control-sarin\/auth\/(config|session|logout)\/?$/.exec(url.pathname)?.[1];
  if (!route) return null;
  const method = route === 'config' ? 'GET' : 'POST';
  if (request.method !== method) return adminResponse({ error: { code: 'method_not_allowed', message: 'Método no permitido.' } }, 405, { Allow: method });
  if (url.search) throw new AdminError(400, 'invalid_request');
  if (route === 'logout') {
    sameOrigin(request, url);
    if (request.body) {
      const value = await requestJson(request, 256);
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length) throw new AdminError(400, 'invalid_request');
    } else if (request.headers.has('Content-Encoding')) throw new AdminError(400, 'invalid_request');
    return adminResponse({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
  }
  const config = configuration(env);
  if (route === 'config') return adminResponse({ firebase: { apiKey: config.apiKey, authDomain: `${config.projectId}.firebaseapp.com`, projectId: config.projectId } });
  sameOrigin(request, url);
  const value = await requestJson(request, 16384);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1 || typeof value.idToken !== 'string') throw new AdminError(400, 'invalid_request');
  const { maxAge } = await verifyFirebaseAdminToken(value.idToken, config, options);
  return adminResponse({ ok: true }, 200, { 'Set-Cookie': sessionCookie(value.idToken, maxAge) });
}

function htmlPolicy(env) {
  const authDomain = validProject(env.SARIN_FIREBASE_PROJECT_ID) ? `https://${env.SARIN_FIREBASE_PROJECT_ID}.firebaseapp.com` : '';
  return `default-src 'self'; script-src 'self' https://www.gstatic.com/firebasejs/12.19.0/ https://apis.google.com; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com ${authDomain}; frame-src ${authDomain || "'none'"}; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
}

/** El HTML contiene la pantalla de acceso; los datos privados solo salen por la API autenticada. */
export async function protectSarinAdmin(context) {
  try {
    const response = await context.next();
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
    headers.set('Content-Security-Policy', htmlPolicy(context.env));
    headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) { return adminError(error); }
}
