// @ts-check
const MESSAGES_URL = 'https://api.ycloud.com/v2/whatsapp/messages';
const MAX_RESPONSE_BYTES = 65536;
const PHONE = /^\+[1-9]\d{1,14}$/;
const STATES = new Set(['accepted', 'sent', 'delivered', 'read', 'failed']);
/** @typedef {'not_sent'|'rejected'|'uncertain'} DeliveryState */
/** @typedef {'invalid_config'|'send_disabled'|'invalid_request'|'cancelled'|'timeout'|'network_error'|'provider_rejected'|'provider_unavailable'|'provider_redirect'|'invalid_response'|'response_too_large'} ErrorCode */
/** Errores cerrados; no conservan datos del proveedor ni credenciales. */
export class HandoffClientError extends Error {
  /** @param {ErrorCode} code @param {DeliveryState} deliveryState */
  constructor(code, deliveryState) { super(code); this.name = 'HandoffClientError'; this.code = code; this.deliveryState = deliveryState; }
}
/** @param {ReadableStream<Uint8Array>|null|undefined} body */
function discard(body) { try { void body?.cancel().catch(() => {}); } catch { /* Sin detalles externos. */ } }
/** @param {Response} response @param {AbortSignal} signal */
async function readResponse(response, signal) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '') || !response.body) {
    discard(response.body); throw new HandoffClientError('invalid_response', 'uncertain');
  }
  const reader = response.body.getReader(), chunks = [];
  let total = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (signal.aborted) throw new HandoffClientError('cancelled', 'uncertain');
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) throw new HandoffClientError('response_too_large', 'uncertain');
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    cancel(); if (error instanceof HandoffClientError) throw error;
    throw new HandoffClientError('invalid_response', 'uncertain');
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}
/** @typedef {{to:string,contactLabel:string,panelUrl:string,externalId:string,signal?:AbortSignal}} HandoffMessage */
/** @typedef {HandoffMessage & {templateName:string,templateLanguage:string}} HandoffTemplate */
/** Transporte sin decisión de ventana, sin reintentos y con destinatario administrativo fijo.
 * @param {{apiKey:string,businessPhone:string,ownerPhone:string,sendEnabled?:boolean,fetcher?:typeof fetch,timeoutMs?:number}} options */
export function createWhatsAppHandoffClient({ apiKey, businessPhone, ownerPhone, sendEnabled = false,
  fetcher = globalThis.fetch, timeoutMs = 10000 } = /** @type {any} */({})) {
  if (typeof apiKey !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(apiKey)
      || typeof businessPhone !== 'string' || !PHONE.test(businessPhone)
      || typeof ownerPhone !== 'string' || !PHONE.test(ownerPhone) || ownerPhone === businessPhone
      || typeof fetcher !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new HandoffClientError('invalid_config', 'not_sent');
  }
  /** @param {HandoffMessage|HandoffTemplate} input @param {boolean} template */
  async function send(input, template) {
    if (sendEnabled !== true) throw new HandoffClientError('send_disabled', 'not_sent');
    const keys = ['to','contactLabel','panelUrl','externalId','signal', ...(template ? ['templateName','templateLanguage'] : [])];
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))
      || input.to !== ownerPhone || typeof input.contactLabel !== 'string' || !/^\*\*\*(?: \d{4})?$/.test(input.contactLabel)
      || typeof input.panelUrl !== 'string' || !/^https:\/\/www\.alsdevstudio\.com\/control-sarin\/#whatsapp=[a-f0-9]{64}$/.test(input.panelUrl)
      || typeof input.externalId !== 'string' || input.externalId.length < 1 || input.externalId.length > 128
      || input.externalId.trim() !== input.externalId || /[\u0000-\u001f\u007f-\u009f]/u.test(input.externalId)
      || (input.signal !== undefined && !(input.signal instanceof AbortSignal))) {
      throw new HandoffClientError('invalid_request', 'not_sent');
    }
    const details = /** @type {HandoffTemplate} */(input);
    if (template && (typeof details.templateName !== 'string' || !/^[a-z0-9_]{1,512}$/.test(details.templateName)
      || typeof details.templateLanguage !== 'string' || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(details.templateLanguage))) {
      throw new HandoffClientError('invalid_request', 'not_sent');
    }
    const body = { from: businessPhone, to: ownerPhone, externalId: input.externalId,
      ...(template ? { type: 'template', template: { name: details.templateName, language: { code: details.templateLanguage },
        components: [{ type: 'body', parameters: [{ type: 'text', text: input.contactLabel }, { type: 'text', text: input.panelUrl }] }] } }
        : { type: 'text', text: { body: `ALS Dev Studio: el contacto ${input.contactLabel} solicitó hablar con Andrés. Sarin quedó pausado en esa conversación. Revisa la solicitud en el panel administrativo: ${input.panelUrl}`, preview_url: false } }),
    };
    const signal = input.signal;
    if (signal?.aborted) throw new HandoffClientError('cancelled', 'not_sent');
    const controller = new AbortController(); let started = false;
    /** @type {(reason:HandoffClientError)=>void} */ let rejectStopped;
    const stopped = new Promise((_, reject) => { rejectStopped = reject; });
    /** @param {'cancelled'|'timeout'} code */
    const stop = code => { rejectStopped(new HandoffClientError(code, started ? 'uncertain' : 'not_sent')); controller.abort(); };
    const abort = () => stop('cancelled'); signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    async function receive() {
      /** @type {Response} */ let response;
      try {
        started = true;
        response = await fetcher(MESSAGES_URL, { method: 'POST', redirect: 'manual',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey }, body: JSON.stringify(body), signal: controller.signal });
      } catch { throw new HandoffClientError('network_error', 'uncertain'); }
      if (controller.signal.aborted) { discard(response.body); throw new HandoffClientError('cancelled', 'uncertain'); }
      if (!response.ok) {
        discard(response.body);
        if (response.status >= 300 && response.status < 400) throw new HandoffClientError('provider_redirect', 'uncertain');
        if (response.status >= 400 && response.status < 500 && response.status !== 408) throw new HandoffClientError('provider_rejected', 'rejected');
        throw new HandoffClientError('provider_unavailable', 'uncertain');
      }
      const result = await readResponse(response, controller.signal);
      if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.id !== 'string'
        || !/^[A-Za-z0-9_-]{1,128}$/.test(result.id) || !STATES.has(result.status)
        || ('from' in result && result.from !== businessPhone) || ('to' in result && result.to !== ownerPhone)
        || ('externalId' in result && result.externalId !== input.externalId)
        || ('wamid' in result && (typeof result.wamid !== 'string' || !/^[\x21-\x7e]{1,512}$/.test(result.wamid)))) {
        throw new HandoffClientError('invalid_response', 'uncertain');
      }
      return { providerId: result.id, status: result.status, ...('wamid' in result ? { wamid: result.wamid } : {}) };
    }
    try { return await Promise.race([receive(), stopped]); }
    catch (error) {
      if (error instanceof HandoffClientError) throw error;
      throw new HandoffClientError('invalid_response', started ? 'uncertain' : 'not_sent');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  return {
    /** @param {HandoffMessage} input */ sendText: input => send(input, false),
    /** @param {HandoffTemplate} input */ sendTemplate: input => send(input, true),
  };
}
