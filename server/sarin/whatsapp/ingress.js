// @ts-check
import { readYCloudWebhook, YCloudWebhookError } from './ycloud-webhook.js';
import { WhatsAppWorkError } from './work-store.js';
import { createWhatsAppIngressStore, getWhatsAppReplyStore, WhatsAppIngressError } from './ingress-store.js';
import { accessConfiguration } from './processing-config.js';
import {createWhatsAppHandoffStore} from './handoff-store.js';

const MAX_AGE = 8 * 60 * 60 * 1000;
const MAX_FUTURE = 5 * 60 * 1000;
/** @param {unknown} value @returns {value is string} */
const phone = value => typeof value === 'string' && /^\+[1-9]\d{1,14}$/.test(value);
const unavailable = () => new WhatsAppIngressError(503, 'ingress_unavailable');

/** El alcance y la fecha de apertura sólo proceden del servidor, nunca del webhook.
 * @param {Record<string,any>} env @param {number} at */
function configuration(env, at) {
  if (env.SARIN_WHATSAPP_INGRESS_ENABLED !== 'true'
    || !env.SARIN_DB || typeof env.SARIN_DB.prepare !== 'function' || typeof env.SARIN_DB.batch !== 'function'
    || typeof env.SARIN_WHATSAPP_WEBHOOK_SECRET !== 'string' || !env.SARIN_WHATSAPP_WEBHOOK_SECRET.trim()
    || env.SARIN_WHATSAPP_WEBHOOK_SECRET.length > 4096
    || !phone(env.SARIN_WHATSAPP_BUSINESS_PHONE)
    || typeof env.SARIN_WHATSAPP_WABA_ID !== 'string' || !/^[1-9]\d{0,31}$/.test(env.SARIN_WHATSAPP_WABA_ID)
    || !Number.isSafeInteger(at) || at < 0) throw unavailable();
  const sinceText = env.SARIN_WHATSAPP_CAPTURE_SINCE;
  if (typeof sinceText !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(sinceText)) throw unavailable();
  const since = Date.parse(sinceText);
  if (!Number.isSafeInteger(since) || since < 0 || since > at || new Date(since).toISOString() !== sinceText) throw unavailable();
  const access = accessConfiguration(env, at);
  if (!access) throw unavailable();
  return { secret: env.SARIN_WHATSAPP_WEBHOOK_SECRET, business: env.SARIN_WHATSAPP_BUSINESS_PHONE,
    wabaId: env.SARIN_WHATSAPP_WABA_ID, ...access, since };
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

/** Recepción de WhatsApp: almacena capturas; no llama al motor ni envía mensajes.
 * Dependencias sustituibles sólo desde código interno de pruebas.
 * @param {Request} request
 * @param {Record<string,any>} env
 * @param {{now?:()=>number,store?:Pick<ReturnType<typeof createWhatsAppIngressStore>,'capture'>,commitTimeoutMs?:number,notifyWork?:(hint:{jobId:string,epoch:string})=>unknown}} [options]
 */
export async function handleWhatsAppIngress(request, env, options = {}) {
  try {
    const now = options.now || Date.now;
    const at = now();
    const config = configuration(env, at);
    const timeout = options.commitTimeoutMs ?? 2000;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 2000) throw unavailable();
    const event = await readYCloudWebhook(request, { secret: config.secret, now: () => at });
    if (event.kind === 'ignored') return response({ ok: true });
    const repliesEnabled=env.SARIN_WHATSAPP_REPLIES_ENABLED==='true';
    /** La funcion de Pages adjunta la publicacion a waitUntil; el cron rescata fallos.
     * @param {ReturnType<import('./work-store.js').createWhatsAppWorkStore>|null} replies */
    async function notify(replies) {
      if(!replies||!options.notifyWork)return;
      const hints=await replies.listDispatchable({limit:10});
      for(const hint of hints){try{void Promise.resolve(options.notifyWork(hint)).catch(()=>{});}catch{/* El commit ya es durable. */}}
    }
    if(event.kind==='status') {
      if(event.createdAt<config.since||at-event.createdAt>MAX_AGE||event.createdAt-at>MAX_FUTURE)return response({ok:true});
      // El consumo observado abarca todos los envíos del número configurado,
      // aunque no exista un outbox de Sarin o sus respuestas estén apagadas.
      const billableObservation=['delivered','read'].includes(event.status)&&event.from===config.business
        &&(event.wabaId===undefined||event.wabaId===config.wabaId);
      if(!repliesEnabled&&!billableObservation)return response({ok:true});
      await committed(async()=>{
        const replies=repliesEnabled?await getWhatsAppReplyStore({db:env.SARIN_DB,now,repliesEnabled}):null;
        if(replies){
          const observation={eventId:event.eventId,providerId:event.messageId,status:/** @type {import('./work-contracts.js').DeliveryObservation['status']} */(event.status),at:event.createdAt,
            ...(event.externalId===undefined?{}:{externalId:event.externalId}),...(event.wamid===undefined?{}:{wamid:event.wamid}),
            ...(event.from===undefined?{}:{from:event.from}),...(event.to===undefined?{}:{to:event.to}),...(event.wabaId===undefined?{}:{wabaId:event.wabaId})};
          await replies.applyStatus(observation);
          await createWhatsAppHandoffStore({db:env.SARIN_DB,now}).applyStatus(observation);
        }
        if(billableObservation){
          const {recordWhatsAppBilling}=await import('./billing.js');
          await recordWhatsAppBilling(env.SARIN_DB,{event,businessPhone:config.business,wabaId:config.wabaId,now});
        }
        await notify(replies);
      },timeout,request.signal);
      return response({ok:true});
    }
    const business = event.kind === 'inbound' ? event.to : event.from;
    const peer = event.kind === 'inbound' ? event.from : event.to;
    const captureSince = Math.max(config.since, config.publicSince ?? 0);
    if (business !== config.business || event.wabaId !== config.wabaId || peer === config.business
      || (config.mode === 'pilot' && !config.peers.has(peer))
      || [event.createdAt, event.sentAt].some(value => value < captureSince || at - value > MAX_AGE || value - at > MAX_FUTURE)) {
      return response({ ok: true });
    }
    const store = options.store || createWhatsAppIngressStore({ db: env.SARIN_DB, now, repliesEnabled, publicMode: config.mode === 'public' });
    const saved = await committed(() => store.capture(event), timeout, request.signal);
    if (!saved || !['captured', 'duplicate'].includes(saved.status)) throw unavailable();
    if(repliesEnabled&&options.notifyWork)await notify(await getWhatsAppReplyStore({db:env.SARIN_DB,now,repliesEnabled}));
    return response({ ok: true });
  } catch (error) {
    // Nunca propagar mensajes arbitrarios de D1 ni cuerpos/cabeceras del proveedor.
    if (error instanceof WhatsAppIngressError && error.code === 'stale_event') return response({ ok: true });
    if (error instanceof YCloudWebhookError || error instanceof WhatsAppIngressError || error instanceof WhatsAppWorkError) {
      return response({ error: { code: error.code } }, error.status);
    }
    return response({ error: { code: 'ingress_unavailable' } }, 503);
  }
}
