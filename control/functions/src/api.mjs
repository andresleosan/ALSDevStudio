// @ts-check

const MAX_BODY_BYTES = 32 * 1024;
const ACTIONS = new Set([
  'subject.create', 'product.plan.save', 'subscription.create', 'subscription.trial.start',
  'payment.preview', 'payment.confirm', 'subscription.suspend', 'subscription.reactivate',
]);

class ApiError extends Error {
  /** @param {number} status @param {string} code @param {string} message */
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** @param {Request} request */
async function readCommand(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw new ApiError(415, 'unsupported_media_type', 'Envía los datos como JSON.');
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new ApiError(413, 'payload_too_large', 'La solicitud supera el tamaño permitido.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'invalid_request', 'La solicitud está vacía.');
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, 'payload_too_large', 'La solicitud supera el tamaño permitido.');
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  let command;
  try { command = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer)); }
  catch { throw new ApiError(400, 'invalid_request', 'La solicitud no contiene JSON válido.'); }
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!isObject(command) || Object.keys(command).some(key => !['requestId', 'action', 'payload'].includes(key)) ||
      typeof command.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(command.requestId) ||
      !ACTIONS.has(command.action) || !isObject(command.payload)) {
    throw new ApiError(400, 'invalid_request', 'Revisa la acción y los datos enviados.');
  }
  return command;
}

/**
 * @param {{service:any,verifyToken:(token:string)=>Promise<{uid:string,email:string}>,config?:any}} dependencies
 */
export function createApi({ service, verifyToken, config = {} }) {
  const allowedOrigins = new Set(config.allowedOrigins || []);
  if (allowedOrigins.has('*') || allowedOrigins.has('null')) throw new Error('Los orígenes de la API deben ser explícitos.');
  const maxRequests = config.maxRequestsPerMinute || 120;
  /** @type {Map<string,{count:number,resetAt:number}>} */
  const buckets = new Map();

  /** @param {Request} request @param {{clientAddress?:string}} [context] */
  return async (request, context = {}) => {
    const headers = new Headers({
      'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', vary: 'Origin',
    });
    const origin = request.headers.get('origin');
    const reply = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
    try {
      if (origin && !allowedOrigins.has(origin)) throw new ApiError(403, 'origin_denied', 'Origen no autorizado.');
      if (origin) headers.set('access-control-allow-origin', origin);
      const path = new URL(request.url).pathname.replace(/\/$/, '');
      if (!['/api/state', '/api/commands'].includes(path)) throw new ApiError(404, 'not_found', 'Recurso no encontrado.');
      if (request.method === 'OPTIONS') {
        const method = request.headers.get('access-control-request-method');
        const requestedHeaders = (request.headers.get('access-control-request-headers') || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
        const allowedMethod = path === '/api/state' ? 'GET' : 'POST';
        if (method !== allowedMethod || requestedHeaders.some(value => !['authorization', 'content-type'].includes(value))) {
          throw new ApiError(405, 'method_not_allowed', 'Método o cabeceras no permitidos.');
        }
        headers.set('access-control-allow-methods', allowedMethod);
        headers.set('access-control-allow-headers', 'Authorization, Content-Type');
        headers.set('access-control-max-age', '600');
        return reply(null, 204);
      }
      const expectedMethod = path === '/api/state' ? 'GET' : 'POST';
      if (request.method !== expectedMethod) {
        headers.set('allow', `${expectedMethod}, OPTIONS`);
        throw new ApiError(405, 'method_not_allowed', 'Método no permitido.');
      }
      const now = Date.now();
      for (const [key, item] of buckets) if (item.resetAt <= now) buckets.delete(key);
      // El wrapper proporciona una dirección normalizada; nunca se confía en una cabecera del navegador.
      const clientKey = (context.clientAddress || 'unknown').slice(0, 128);
      const key = buckets.has(clientKey) || buckets.size < 1024 ? clientKey : 'overflow';
      const bucket = buckets.get(key) || { count: 0, resetAt: now + 60_000 };
      bucket.count += 1;
      buckets.set(key, bucket);
      if (bucket.count > maxRequests) {
        headers.set('retry-after', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
        throw new ApiError(429, 'rate_limited', 'Demasiadas solicitudes. Intenta de nuevo en un momento.');
      }
      const authorization = request.headers.get('authorization') || '';
      const bearer = /^Bearer ([^\s]+)$/.exec(authorization);
      if (!bearer) throw new ApiError(401, 'unauthenticated', 'Ingresa para acceder al panel.');
      const admin = await verifyToken(bearer[1]);
      if (path === '/api/state') {
        const state = await service.getState(admin);
        return reply({ ...state, environment: config.environment || 'production', admin });
      }
      const command = await readCommand(request);
      return reply(await service.execute(command, admin));
    } catch (error) {
      const exposed = error && ['ApiError', 'AuthError', 'ControlError'].includes(error.name) &&
        Number.isInteger(error.status) && error.status >= 400 && error.status <= 503 && typeof error.code === 'string';
      if (exposed) return reply({ error: { code: error.code, message: error.message } }, error.status);
      return reply({ error: { code: 'internal_error', message: 'No se pudo completar la operación. Intenta de nuevo.' } }, 500);
    }
  };
}
