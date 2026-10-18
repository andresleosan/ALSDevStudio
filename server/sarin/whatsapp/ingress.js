// @ts-check
import { readYCloudWebhook, YCloudWebhookError } from './ycloud-webhook.js';
import { createWhatsAppIngressStore, WhatsAppIngressError } from './ingress-store.js';

const MAX_AGE = 8 * 60 * 60 * 1000;
const MAX_FUTURE = 5 * 60 * 1000;
/** @param {unknown} value @returns {value is string} */
const phone = value => typeof value === 'string' && /^\+[1-9]\d{1,14}$/.test(value);
const unavailable = () => new WhatsAppIngressError(503, 'ingress_unavailable');

/** La lista de prueba sólo procede del servidor; nunca del cuerpo del webhook.
 * @param {Record<string,any>} env @param {number} at */
function configuration(env, at) {
  if (env.SARIN_WHATSAPP_INGRESS_ENABLED !== 'true'
    || !env.SARIN_DB || typeof env.SARIN_DB.prepare !== 'function' || typeof env.SARIN_DB.batch !== 'function'
    || typeof env.SARIN_WHATSAPP_WEBHOOK_SECRET !== 'string' || !env.SARIN_WHATSAPP_WEBHOOK_SECRET.trim()
    || env.SARIN_WHATSAPP_WEBHOOK_SECRET.length > 4096
    || !phone(env.SARIN_WHATSAPP_BUSINESS_PHONE)
    || typeof env.SARIN_WHATSAPP_WABA_ID !== 'string' || !/^[1-9]\d{0,31}$/.test(env.SARIN_WHATSAPP_WABA_ID)
    || typeof env.SARIN_WHATSAPP_PILOT_PHONES !== 'string' || env.SARIN_WHATSAPP_PILOT_PHONES.length > 256
    || !Number.isSafeInteger(at) || at < 0) throw unavailable();
  const sinceText = env.SARIN_WHATSAPP_CAPTURE_SINCE;
  if (typeof sinceText !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(sinceText)) throw unavailable();
  const since = Date.parse(sinceText);
  if (!Number.isSafeInteger(since) || since < 0 || since > at || new Date(since).toISOString() !== sinceText) throw unavailable();
  let peers;
  try { peers = JSON.parse(env.SARIN_WHATSAPP_PILOT_PHONES); } catch { throw unavailable(); }
  if (!Array.isArray(peers) || peers.length < 1 || peers.length > 10 || !peers.every(phone)
    || new Set(peers).size !== peers.length || peers.includes(env.SARIN_WHATSAPP_BUSINESS_PHONE)) throw unavailable();
  return { secret: env.SARIN_WHATSAPP_WEBHOOK_SECRET, business: env.SARIN_WHATSAPP_BUSINESS_PHONE,
    wabaId: env.SARIN_WHATSAPP_WABA_ID, peers: new Set(peers), since };
}

/** @param {unknown} body @param {number} [status] */
function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(status === 405 ? { Allow: 'POST' } : {}),
    ...(status === 429 || status === 503 ? { 'Retry-After': '10' } : {}),
  } });
}

/** D1 puede terminar después del timeout: jamás iniciar otro intento aquí.
 * @template T @param {()=>Promise<T>} operation @param {number} timeoutMs @param {AbortSignal} signal */
async function committed(operation, timeoutMs, signal) {
  if (signal.aborted) throw unavailable();
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let timer;
  let abort = () => {};
  /** @type {Promise<never>} */
  const deadline = new Promise((_, reject) => {
    abort = () => reject(unavailable());
    timer = setTimeout(abort, timeoutMs);
    signal.addEventListener('abort', abort, { once: true });
  });
  try { return await Promise.race([operation(), deadline]); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}

/** Recepción del piloto: almacena capturas; no llama al motor ni envía mensajes.
 * Dependencias sustituibles sólo desde código interno de pruebas.
 * @param {Request} request
 * @param {Record<string,any>} env
 * @param {{now?:()=>number,store?:Pick<ReturnType<typeof createWhatsAppIngressStore>,'capture'>,commitTimeoutMs?:number}} [options]
 */
export async function handleWhatsAppIngress(request, env, options = {}) {
  try {
    const now = options.now || Date.now;
    const at = now();
    const config = configuration(env, at);
    const timeout = options.commitTimeoutMs ?? 2000;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 2000) throw unavailable();
    const event = await readYCloudWebhook(request, { secret: config.secret, now: () => at });
    // Sin outbox local no se puede acreditar que un estado pertenece al piloto.
    if (event.kind === 'ignored' || event.kind === 'status') return response({ ok: true });
    const business = event.kind === 'inbound' ? event.to : event.from;
    const peer = event.kind === 'inbound' ? event.from : event.to;
    if (business !== config.business || event.wabaId !== config.wabaId || !config.peers.has(peer)
      || [event.createdAt, event.sentAt].some(value => value < config.since || at - value > MAX_AGE || value - at > MAX_FUTURE)) {
      return response({ ok: true });
    }
    const store = options.store || createWhatsAppIngressStore({ db: env.SARIN_DB, now });
    const saved = await committed(() => store.capture(event), timeout, request.signal);
    if (!saved || !['captured', 'duplicate'].includes(saved.status)) throw unavailable();
    return response({ ok: true });
  } catch (error) {
    // Nunca propagar mensajes arbitrarios de D1 ni cuerpos/cabeceras del proveedor.
    if (error instanceof WhatsAppIngressError && error.code === 'stale_event') return response({ ok: true });
    if (error instanceof YCloudWebhookError || error instanceof WhatsAppIngressError) {
      return response({ error: { code: error.code } }, error.status);
    }
    return response({ error: { code: 'ingress_unavailable' } }, 503);
  }
}
