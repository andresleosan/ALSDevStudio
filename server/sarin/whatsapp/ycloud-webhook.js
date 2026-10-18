// @ts-check

const MAX_BODY_BYTES = 65536;
const MAX_READ_TIMEOUT_MS = 3000;
// Política local: admite el backoff documentado; la deduplicación será persistente.
const MAX_AGE_MS = 8 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const encoder = new TextEncoder();
const ERROR_STATUS = Object.freeze({
  method_not_allowed: 405, invalid_content_type: 415, invalid_config: 503,
  invalid_signature: 401, signature_expired: 401, body_too_large: 413,
  request_aborted: 408, body_timeout: 408, invalid_request: 400, invalid_json: 400, invalid_event: 400,
});
const STATUSES = new Set(['accepted', 'sent', 'delivered', 'read', 'failed']);

/** @typedef {keyof typeof ERROR_STATUS} WebhookErrorCode */
export class YCloudWebhookError extends Error {
  /** @param {WebhookErrorCode} code */
  constructor(code) {
    super(code);
    this.name = 'YCloudWebhookError';
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}
/** @param {WebhookErrorCode} code @returns {never} */
function fail(code) { throw new YCloudWebhookError(code); }
/** @param {unknown} value @returns {value is Record<string, any>} */
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value @param {number} [max] @returns {value is string} */
const identifier = (value, max = 256) => typeof value === 'string' && value.length > 0
  && value.length <= max && !/[^\x21-\x7e]/.test(value);
/** Correlación propia: mismo contrato de externalId que el cliente de envío.
 * @param {unknown} value @returns {value is string} */
const reference = value => typeof value === 'string' && value.length >= 1 && value.length <= 128
  && value.trim() === value && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
/** @param {AbortSignal} signal */
const checkAbort = signal => { if (signal.aborted) fail('request_aborted'); };

/**
 * Leer bytes sin decodificar ni reconstruir JSON: esos bytes forman la firma.
 * @param {Request} request
 * @param {number} readTimeoutMs
 */
async function readBytes(request, readTimeoutMs) {
  checkAbort(request.signal);
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let length = 0;
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    // Un productor externo puede no resolver cancel(); no bloquear el rechazo.
    try { void reader.cancel().catch(() => {}); } catch { /* Sin detalles externos. */ }
  };
  /** @type {YCloudWebhookError|null} */
  let stopped = null;
  /** @type {(code:'request_aborted'|'body_timeout')=>void} */
  let interrupt = () => {};
  /** @type {Promise<never>} */
  const interrupted = new Promise((_, reject) => {
    interrupt = code => {
      if (stopped) return;
      stopped = new YCloudWebhookError(code);
      reject(stopped);
      cancel();
    };
  });
  const abort = () => interrupt('request_aborted');
  const deadline = performance.now() + readTimeoutMs;
  request.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => interrupt('body_timeout'), readTimeoutMs);
  const checkReading = () => {
    if (stopped) throw stopped;
    checkAbort(request.signal);
    // También corta productores inmediatos que no dejan ejecutar el timer.
    if (performance.now() >= deadline) fail('body_timeout');
  };
  try {
    while (true) {
      checkReading();
      const { done, value } = await Promise.race([reader.read(), interrupted]);
      checkReading();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail('invalid_request');
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) fail('body_too_large');
      if (value.byteLength) chunks.push(new Uint8Array(value));
    }
  } catch (error) {
    cancel();
    if (stopped) throw stopped;
    if (request.signal.aborted) fail('request_aborted');
    if (error instanceof YCloudWebhookError) throw error;
    fail('invalid_request');
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

/** @param {string|null} header @param {number} now */
function readSignature(header, now) {
  if (typeof header !== 'string' || header.length > 1024) fail('invalid_signature');
  const parts = header.split(',').map(value => value.trim());
  if (parts.length !== 2) fail('invalid_signature');
  const timePart = parts.find(value => /^t=[1-9]\d{0,12}$/.test(value));
  const signaturePart = parts.find(value => /^s=[a-f0-9]{64}$/i.test(value));
  if (!timePart || !signaturePart) fail('invalid_signature');
  const timestamp = timePart.slice(2);
  const milliseconds = Number(timestamp) * 1000;
  if (!Number.isSafeInteger(milliseconds)) fail('invalid_signature');
  if (now - milliseconds > MAX_AGE_MS || milliseconds - now > MAX_FUTURE_MS) fail('signature_expired');
  const hex = signaturePart.slice(2);
  const digest = Uint8Array.from({ length: 32 }, (_, i) => Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16));
  return { timestamp, digest };
}

/** @param {Uint8Array} body @param {{timestamp:string,digest:Uint8Array}} signature @param {string} secret */
async function verify(body, signature, secret) {
  const prefix = encoder.encode(`${signature.timestamp}.`);
  const signed = new Uint8Array(prefix.byteLength + body.byteLength);
  signed.set(prefix); signed.set(body, prefix.byteLength);
  let valid;
  try {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    // Web Crypto verifica el MAC; no comparar strings ni bytes manualmente.
    valid = await crypto.subtle.verify('HMAC', key, new Uint8Array(signature.digest), signed);
  } catch { fail('invalid_config'); }
  if (!valid) fail('invalid_signature');
}

/** @param {unknown} value @returns {number} */
function instant(value) {
  if (typeof value !== 'string' || value.length > 35) return fail('invalid_event');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return fail('invalid_event');
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || Number(hourText) > 23 || Number(minuteText) > 59 || Number(secondText) > 59
    || (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))) return fail('invalid_event');
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed)) return fail('invalid_event');
  return parsed;
}

/**
 * @typedef {{kind:'ignored'}} IgnoredEvent
 * @typedef {{kind:'status',eventId:string,createdAt:number,messageId:string,status:string,wamid?:string,externalId?:string,from?:string,to?:string,wabaId?:string}} StatusEvent
 * @typedef {{kind:'inbound'|'echo',eventId:string,createdAt:number,messageId:string,wamid:string,wabaId:string,from:string,to:string,sentAt:number,mediaType:string,text?:string}} MessageEvent
 * @typedef {IgnoredEvent|StatusEvent|MessageEvent} YCloudEvent
 */

/** @param {unknown} event @returns {YCloudEvent} */
function normalize(event) {
  if (!record(event) || !identifier(event.id) || !identifier(event.type, 128) || event.apiVersion !== 'v2') return fail('invalid_event');
  const createdAt = instant(event.createTime);
  const base = { eventId: event.id, createdAt };
  if (event.type === 'whatsapp.message.updated') {
    const message = event.whatsappMessage;
    if (!record(message) || !identifier(message.id) || !STATUSES.has(message.status)
      || (Object.hasOwn(message, 'wamid') && !identifier(message.wamid, 512))
      || (Object.hasOwn(message, 'externalId') && !reference(message.externalId))
      || ['from','to'].some(key=>Object.hasOwn(message,key)&&(typeof message[key]!=='string'||!/^\+[1-9]\d{1,14}$/.test(message[key])))
      || (Object.hasOwn(message,'wabaId')&&(typeof message.wabaId!=='string'||! /^[1-9]\d{0,31}$/.test(message.wabaId)))) return fail('invalid_event');
    return { kind: 'status', ...base,
      ...(Object.hasOwn(message,'from')?{from:message.from}:{}),
      ...(Object.hasOwn(message,'to')?{to:message.to}:{}),
      ...(Object.hasOwn(message,'wabaId')?{wabaId:message.wabaId}:{}), messageId: message.id, status: message.status,
      ...(Object.hasOwn(message, 'wamid') ? { wamid: message.wamid } : {}),
      ...(Object.hasOwn(message, 'externalId') ? { externalId: message.externalId } : {}) };
  }
  const kind = event.type === 'whatsapp.inbound_message.received' ? 'inbound'
    : event.type === 'whatsapp.smb.message.echoes' ? 'echo' : null;
  if (!kind) return { kind: 'ignored' };
  const message = kind === 'inbound' ? event.whatsappInboundMessage : event.whatsappMessage;
  if (!record(message) || !identifier(message.id) || !identifier(message.wamid, 512)
    || typeof message.wabaId !== 'string' || !/^[1-9]\d{0,31}$/.test(message.wabaId)
    || typeof message.from !== 'string' || !/^\+[1-9]\d{1,14}$/.test(message.from)
    || typeof message.to !== 'string' || !/^\+[1-9]\d{1,14}$/.test(message.to)
    || typeof message.type !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(message.type)) return fail('invalid_event');
  const sentAt = instant(message.sendTime);
  /** @type {MessageEvent} */
  const result = { kind, ...base, messageId: message.id, wamid: message.wamid, wabaId: message.wabaId,
    from: message.from, to: message.to, sentAt, mediaType: message.type };
  if (message.type !== 'text') return result;
  if (!record(message.text) || typeof message.text.body !== 'string' || message.text.body.trim().length === 0
    || message.text.body.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(message.text.body)) return fail('invalid_event');
  return { ...result, text: message.text.body };
}

/**
 * Autentica y normaliza; no persiste, no deduplica y no confirma recepción HTTP.
 * El secreto pertenece al endpoint YCloud, no es la API key de envío.
 * La lectura completa admite 1..3000 ms (3000 por defecto), sin reiniciar por fragmento.
 * @param {Request} request
 * @param {{secret:string,now?:()=>number,readTimeoutMs?:number}} options
 * @returns {Promise<YCloudEvent>}
 */
export async function readYCloudWebhook(request, { secret, now = Date.now, readTimeoutMs = MAX_READ_TIMEOUT_MS } = { secret: '' }) {
  try {
    if (request.method !== 'POST') fail('method_not_allowed');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') || '')
      || request.headers.has('Content-Encoding')) fail('invalid_content_type');
    if (typeof secret !== 'string' || !secret.trim() || secret.length > 4096 || typeof now !== 'function'
      || !Number.isInteger(readTimeoutMs) || readTimeoutMs < 1 || readTimeoutMs > MAX_READ_TIMEOUT_MS) fail('invalid_config');
    let at;
    try { at = now(); } catch { fail('invalid_config'); }
    if (!Number.isSafeInteger(at) || at < 0) fail('invalid_config');
    const signature = readSignature(request.headers.get('YCloud-Signature'), at);
    const length = request.headers.get('Content-Length');
    if (length !== null && !/^\d+$/.test(length)) fail('invalid_request');
    if (length !== null && Number(length) > MAX_BODY_BYTES) fail('body_too_large');
    const body = await readBytes(request, readTimeoutMs);
    await verify(body, signature, secret);
    checkAbort(request.signal);
    let parsed;
    try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
    catch { fail('invalid_json'); }
    return normalize(parsed);
  } catch (error) {
    if (request.body && !request.body.locked) void request.body.cancel().catch(() => {});
    if (error instanceof YCloudWebhookError) throw error;
    return fail('invalid_request');
  }
}
