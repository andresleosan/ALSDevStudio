// @ts-check
import {validateWhatsAppAudioDescriptor} from './audio-client.js';
const MAX_TIME=8640000000000000-2*86400000;
const encoder=new TextEncoder();
const FIELDS = ['kind','eventId','createdAt','messageId','wamid','wabaId','from','to','sentAt','mediaType','text','audio'];
/** @param {unknown} value @returns {value is Record<string,any>} */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value @param {string[]} keys @returns {value is Record<string,any>} */
export const closed = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
/** @param {unknown} value @param {number} [max] @param {number} [min] @returns {value is number} */
export const integer = (value, max = MAX_TIME, min = 0) => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
/** @param {unknown} value @param {number} [max] @returns {value is string} */
const id = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && /^[\x21-\x7e]+$/.test(value);
/** @param {unknown} value @returns {value is string} */
const phone = value => typeof value === 'string' && /^\+[1-9]\d{1,14}$/.test(value);

export class WhatsAppIngressError extends Error {
  /** @param {number} status @param {string} code */
  constructor(status, code) { super(code); this.name = 'WhatsAppIngressError'; this.status = status; this.code = code; }
}
/** Sólo copia campos normalizados; nunca conserva el objeto ni payload original.
 * @param {unknown} event @param {number} at */
export function normalizeWhatsAppMessage(event, at) {
  if (!closed(event, FIELDS) || !['inbound','echo'].includes(event.kind) || !id(event.eventId)
      || !id(event.messageId) || !id(event.wamid, 512) || typeof event.wabaId !== 'string' || !/^[1-9]\d{0,31}$/.test(event.wabaId)
      || !phone(event.from) || !phone(event.to) || !integer(event.createdAt) || !integer(event.sentAt)
      || event.createdAt > at + 300000 || event.sentAt > at + 300000
      || typeof event.mediaType !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(event.mediaType)
      || (event.mediaType === 'text' && (typeof event.text !== 'string' || !event.text.trim()
        || event.text.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(event.text)))
      || (event.mediaType !== 'text' && event.text !== undefined)
      || (event.audio !== undefined && (event.kind!=='inbound' || event.mediaType!=='audio' || !validateWhatsAppAudioDescriptor(event.audio)))) {
    throw new WhatsAppIngressError(400, 'invalid_event');
  }
  return { kind: event.kind, eventId: event.eventId, createdAt: event.createdAt, messageId: event.messageId,
    wamid: event.wamid, wabaId: event.wabaId, from: event.from, to: event.to, sentAt: event.sentAt,
    mediaType: event.mediaType, text: event.mediaType === 'text' ? event.text : null,
    ...(event.audio===undefined?{}:{audio:validateWhatsAppAudioDescriptor(event.audio)}) };
}
/** @param {string} domain @param {unknown[]} values */
export async function digestWhatsApp(domain, values) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify([domain, ...values]))));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
