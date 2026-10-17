// @ts-check
import cloudflareAccessPlugin from '../../.github/sarin/access-plugin.js';

const PRIVATE_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
});
const HTML_POLICY = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

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
      || typeof env.SARIN_ACCESS_DOMAIN !== 'string' || !/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(env.SARIN_ACCESS_DOMAIN)
      || typeof env.SARIN_ACCESS_AUD !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(env.SARIN_ACCESS_AUD)
      || typeof env.SARIN_ADMIN_EMAIL !== 'string' || env.SARIN_ADMIN_EMAIL.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SARIN_ADMIN_EMAIL)
      || typeof env.SARIN_ADMIN_CSRF_SECRET !== 'string' || env.SARIN_ADMIN_CSRF_SECRET.length < 32) {
    throw new AdminError(503, 'unavailable');
  }
  return { domain: env.SARIN_ACCESS_DOMAIN, aud: env.SARIN_ACCESS_AUD, email: env.SARIN_ADMIN_EMAIL.toLowerCase() };
}

/**
 * El plugin oficial 1.0.5 verifica RS256 y la firma RSA. Sus claims son
 * opcionales: aquí se exige su presencia y tipo después de verificar la firma.
 * No se consulta getIdentity ni se acepta una cabecera de email como identidad.
 * @param {Request} request
 * @param {Record<string, any>} env
 * @param {{now?:()=>number}} [options] Solo dependencias internas de pruebas.
 */
export async function authenticateSarinAdmin(request, env, options = {}) {
  const config = configuration(env);
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!assertion || assertion.length > 16384) throw new AdminError(403, 'access_denied');
  const data = {};
  let admin;
  const plugin = cloudflareAccessPlugin({ domain: config.domain, aud: config.aud });
  try {
    // Datos nuevos por petición: nadie puede precargar una identidad validada.
    await plugin({ request, env, data, functionPath: '', params: {},
      waitUntil() {}, passThroughOnException() {},
      next: async () => {
        const payload = data.cloudflareAccess?.JWT?.payload;
        const now = Math.floor((options.now || Date.now)() / 1000);
        const audience = payload?.aud;
        const validAudience = typeof audience === 'string' ? audience === config.aud
          : Array.isArray(audience) && audience.length > 0 && audience.every(item => typeof item === 'string') && audience.includes(config.aud);
        if (!payload || payload.iss !== config.domain || !validAudience
            || !Number.isSafeInteger(payload.exp) || payload.exp <= now
            || !Number.isSafeInteger(payload.iat) || payload.iat < 0 || payload.iat > now + 30
            || (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || payload.nbf > now))
            || payload.type !== 'app' || typeof payload.sub !== 'string' || !payload.sub.trim() || payload.sub.length > 256
            || typeof payload.email !== 'string' || payload.email.toLowerCase() !== config.email) return adminResponse({}, 403);
        admin = { email: config.email, subject: payload.sub };
        return adminResponse({}, 200);
      },
    });
  } catch {
    // Ningún error del plugin, respuesta de Access o token aparece en logs/API.
  }
  if (!admin) throw new AdminError(403, 'access_denied');
  return admin;
}

/** Protege la entrega del HTML en dominio propio y también en *.pages.dev. */
export async function protectSarinAdmin(context, options = {}) {
  try {
    const identity = await authenticateSarinAdmin(context.request, context.env, options);
    context.data ||= {};
    context.data.sarinAdmin = identity;
    const response = await context.next();
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
    if (!headers.has('Content-Security-Policy')) headers.set('Content-Security-Policy', HTML_POLICY);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) { return adminError(error); }
}
