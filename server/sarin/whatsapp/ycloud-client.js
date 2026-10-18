// @ts-check
import {readYCloudPricing} from './ycloud-webhook.js';

const MESSAGES_URL = 'https://api.ycloud.com/v2/whatsapp/messages';
const MAX_RESPONSE_BYTES = 65536;
const PHONE = /^\+[1-9]\d{1,14}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const STATES = new Set(['accepted', 'sent', 'delivered', 'read', 'failed']);

/** @typedef {'not_sent'|'rejected'|'uncertain'} DeliveryState */
/** @typedef {'invalid_config'|'send_disabled'|'invalid_request'|'cancelled'|'timeout'|'network_error'|'provider_rejected'|'provider_unavailable'|'provider_redirect'|'invalid_response'|'response_too_large'|'identity_conflict'} ErrorCode */

/** Errores cerrados: nunca contienen el cuerpo, credenciales ni la causa externa. */
export class YCloudClientError extends Error {
  /** @param {ErrorCode} code @param {DeliveryState} deliveryState */
  constructor(code, deliveryState) {
    super(code);
    this.name = 'YCloudClientError';
    this.code = code;
    this.deliveryState = deliveryState;
  }
}

/** @param {unknown} value */
function validPhone(value) {
  return typeof value === 'string' && PHONE.test(value);
}

/** @param {unknown} value */
function validId(value) {
  return typeof value === 'string' && ID.test(value);
}

/** @param {unknown} value */
function validReference(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 128
    && value.trim() === value && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}

/** @param {ReadableStream<Uint8Array>|null|undefined} body */
function discard(body) {
  // No esperar al productor de un stream externo que puede ignorar cancelación.
  try { void body?.cancel().catch(() => {}); } catch { /* No trasladar detalles externos. */ }
}

/** @param {Response} response @param {AbortSignal} signal @returns {Promise<unknown>} */
async function readResponse(response, signal) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '') || !response.body) {
    discard(response.body);
    throw new YCloudClientError('invalid_response', 'uncertain');
  }
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const chunks = [];
  let total = 0;
  try {
    if (signal.aborted) throw new YCloudClientError('cancelled', 'uncertain');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) throw new YCloudClientError('response_too_large', 'uncertain');
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    cancel();
    if (error instanceof YCloudClientError) throw error;
    throw new YCloudClientError('invalid_response', 'uncertain');
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

/**
 * Transporte interno, sin rutas públicas, reintentos ni destinos configurables.
 * @param {{apiKey:string,businessPhone:string,sendEnabled?:boolean,fetcher?:typeof fetch,timeoutMs?:number}} options
 */
export function createYCloudClient({ apiKey, businessPhone, sendEnabled = false,
  fetcher = globalThis.fetch, timeoutMs = 10000 } = /** @type {any} */ ({})) {
  if (typeof apiKey !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(apiKey)
      || !validPhone(businessPhone) || typeof fetcher !== 'function'
      || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new YCloudClientError('invalid_config', 'not_sent');
  }

  /**
   * El timeout incluye fetch y lectura, incluso si el transporte ignora abort.
   * @param {'POST'|'GET'} method @param {string} url
   * @param {{to?:string,from?:string,wabaId?:string,externalId?:string,id?:string}} expected
   * @param {string|undefined} body @param {AbortSignal|undefined} signal @param {number} [pricingAt]
   */
  async function request(method, url, expected, body, signal, pricingAt) {
    if (signal?.aborted) throw new YCloudClientError('cancelled', 'not_sent');
    const controller = new AbortController();
    let started = false;
    /** @type {(reason:YCloudClientError)=>void} */
    let rejectStopped;
    const stopped = new Promise((_, reject) => { rejectStopped = reject; });
    /** @param {'cancelled'|'timeout'} code */
    const stop = code => {
      rejectStopped(new YCloudClientError(code, started ? 'uncertain' : 'not_sent'));
      controller.abort();
    };
    const abort = () => stop('cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop('timeout'), timeoutMs);

    async function receive() {
      /** @type {Response} */
      let response;
      try {
        started = true;
        response = await fetcher(url, {
          method, redirect: 'manual',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          ...(body === undefined ? {} : { body }), signal: controller.signal,
        });
      } catch {
        throw new YCloudClientError('network_error', 'uncertain');
      }
      if (controller.signal.aborted) {
        discard(response.body);
        throw new YCloudClientError('cancelled', 'uncertain');
      }
      if (!response.ok) {
        discard(response.body);
        if (response.status >= 300 && response.status < 400) {
          throw new YCloudClientError('provider_redirect', 'uncertain');
        }
        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          throw new YCloudClientError('provider_rejected', 'rejected');
        }
        throw new YCloudClientError('provider_unavailable', 'uncertain');
      }
      const result = /** @type {Record<string, unknown>} */ (await readResponse(response, controller.signal));
      if (method === 'GET' && expected.wabaId !== undefined && result && typeof result === 'object' && !Array.isArray(result)
        && (result.id !== expected.id || ['wabaId','from','to','externalId'].some(field =>
          field in result && expected[/** @type {'wabaId'|'from'|'to'|'externalId'} */(field)] !== undefined
            && result[field] !== expected[/** @type {'wabaId'|'from'|'to'|'externalId'} */(field)]))) {
        throw new YCloudClientError('identity_conflict', 'uncertain');
      }
      if (method === 'GET' && ['queued','sending','pending'].includes(/** @type {string} */(result?.status))) result.status = 'pending';
      if (!result || typeof result !== 'object' || Array.isArray(result)
          || !validId(result.id) || typeof result.status !== 'string' || !(STATES.has(result.status) || (method === 'GET' && result.status === 'pending'))
          || ('wamid' in result && (typeof result.wamid!=='string'||!/^[\x21-\x7e]{1,512}$/.test(result.wamid)))
          || (expected.id !== undefined && result.id !== expected.id)
          || ('from' in result && result.from !== businessPhone)
          || ('to' in result && (!validPhone(result.to) || (expected.to !== undefined && result.to !== expected.to)))
          || ('externalId' in result && (!validReference(result.externalId)
            || (expected.externalId !== undefined && result.externalId !== expected.externalId)))) {
        throw new YCloudClientError('invalid_response', 'uncertain');
      }
      const charge=method==='GET'&&pricingAt!==undefined?readYCloudPricing(result,pricingAt):undefined;
      return { providerId: /** @type {string} */ (result.id), status: result.status,...(charge?{pricing:charge}:{}),
        ...(method==='GET'?{...('wabaId' in result?{wabaId:/** @type {string} */(result.wabaId)}:{}),...('from' in result?{from:/** @type {string} */(result.from)}:{}),...('to' in result?{to:/** @type {string} */(result.to)}:{}),...('externalId' in result?{externalId:/** @type {string} */(result.externalId)}:{})}:{}), ...('wamid' in result?{wamid:/** @type {string} */(result.wamid)}:{}) };
    }

    try {
      return await Promise.race([receive(), stopped]);
    } catch (error) {
      if (error instanceof YCloudClientError) throw error;
      throw new YCloudClientError('invalid_response', started ? 'uncertain' : 'not_sent');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  return {
    /** @param {{to:string,text:string,externalId:string,signal?:AbortSignal}} input */
    async sendText({ to, text, externalId, signal } = /** @type {any} */ ({})) {
      if (sendEnabled !== true) throw new YCloudClientError('send_disabled', 'not_sent');
      if (!validPhone(to) || typeof text !== 'string' || text.trim() === '' || text.length > 1200
          || !validReference(externalId)) throw new YCloudClientError('invalid_request', 'not_sent');
      return request('POST', MESSAGES_URL, { to, externalId }, JSON.stringify({
        from: businessPhone, to, type: 'text', text: { body: text, preview_url: false }, externalId,
      }), signal);
    },
    /** Un solo intento de botones; errores o resultados inciertos nunca generan otro POST.
     * @param {{to:string,text:string,buttons:Array<{id:string,title:string}>,externalId:string,signal?:AbortSignal}} input */
    async sendButtons(input = /** @type {any} */ ({})) {
      if (sendEnabled !== true) throw new YCloudClientError('send_disabled', 'not_sent');
      if (!input || typeof input !== 'object' || Array.isArray(input)
          || Object.keys(input).some(key => !['to','text','buttons','externalId','signal'].includes(key))
          || !validPhone(input.to) || typeof input.text !== 'string' || !input.text.trim() || input.text.length > 1024
          || !validReference(input.externalId) || (input.signal !== undefined && !(input.signal instanceof AbortSignal))
          || !Array.isArray(input.buttons) || input.buttons.length < 1 || input.buttons.length > 3
          || !Array.from(input.buttons).every(button => button && typeof button === 'object' && !Array.isArray(button)
            && Object.keys(button).length === 2 && Object.keys(button).every(key => ['id','title'].includes(key))
            && typeof button.id === 'string' && button.id.length >= 1 && button.id.length <= 256
            && button.id.trim() === button.id && !/[\u0000-\u001f\u007f-\u009f]/.test(button.id)
            && typeof button.title === 'string' && button.title.trim().length >= 1 && button.title.length <= 20
            && !/[\u0000-\u001f\u007f-\u009f]/.test(button.title))
          || new Set(input.buttons.map(button => button.id)).size !== input.buttons.length
          || new Set(input.buttons.map(button => button.title)).size !== input.buttons.length) {
        throw new YCloudClientError('invalid_request', 'not_sent');
      }
      const { to, text, buttons, externalId, signal } = input;
      return request('POST', MESSAGES_URL, { to, externalId }, JSON.stringify({
        from: businessPhone, to, type: 'interactive', interactive: { type: 'button', body: { text },
          action: { buttons: buttons.map(button => ({ type: 'reply', reply: { id: button.id, title: button.title } })) } }, externalId,
      }), signal);
    },
    /** El precio es optativo: las reconciliaciones existentes conservan su contrato.
     * @param {{id:string,expected?:{wabaId:string,from:string,to:string,externalId:string},signal?:AbortSignal,includePricing?:boolean,observedAt?:number}} input */
    async getMessage({ id, expected, signal, includePricing=false, observedAt=Date.now() } = /** @type {any} */ ({})) {
      if (!validId(id) || typeof includePricing!=='boolean'
        || (includePricing && (!Number.isSafeInteger(observedAt)||observedAt<0||observedAt>=253339228800000))
        || (expected !== undefined && (!validPhone(expected.from) || expected.from!==businessPhone || !validPhone(expected.to) || !/^[1-9]\d{0,31}$/.test(expected.wabaId) || !validReference(expected.externalId)))) throw new YCloudClientError('invalid_request', 'not_sent');
      return request('GET', `${MESSAGES_URL}/${id}`, { id, ...expected }, undefined, signal,includePricing?observedAt:undefined);
    },
  };
}
