// @ts-check
import { CATALOG } from './knowledge.js';

export const VALIDATION_REASONS = Object.freeze([
  'clasif_contract', 'generation_contract', 'reply_policy', 'brief_not_literal',
  'unknown_example', 'provider_envelope', 'provider_json', 'usage_contract',
]);

/**
 * @typedef {{role:'user'|'assistant', content:string}} HistoryMessage
 * @typedef {{message:string, history:HistoryMessage[]}} SarinInput
 * @typedef {{body:string, bytes:number, maxTokens:number}} ProviderPayload
 */
export class SarinError extends Error {
  /** @param {number} status @param {string} code @param {string} [diagnostic] */
  constructor(status, code, diagnostic) {
    super(code);
    this.name = 'SarinError';
    this.status = status;
    this.code = code;
    this.diagnostic = VALIDATION_REASONS.includes(diagnostic) ? diagnostic : undefined;
  }
}
export const invalid = () => new SarinError(400, 'invalid_request');
export const invalidOutput = (diagnostic = 'generation_contract') => new SarinError(502, 'invalid_output', diagnostic);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const closed = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);

/**
 * Lee incrementalmente; tampoco confía en Content-Length.
 * @param {ReadableStream<Uint8Array> | null} stream
 * @param {number} limit
 * @param {AbortSignal} [signal]
 */
export async function readBoundedJson(stream, limit, signal) {
  if (!stream) throw invalid();
  const reader = stream.getReader();
  let bytes = 0;
  const chunks = [];
  let abort;
  const cancelled = new Promise((_, reject) => {
    abort = () => {
      void reader.cancel().catch(() => {});
      reject(new SarinError(504, 'timeout'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
  try {
    while (true) {
      if (signal?.aborted) throw new SarinError(504, 'timeout');
      const { done, value } = await Promise.race([reader.read(), cancelled]);
      if (signal?.aborted) throw new SarinError(504, 'timeout');
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        void reader.cancel().catch(() => {});
        throw new SarinError(413, 'body_too_large');
      }
      chunks.push(value);
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    reader.releaseLock();
  }
  const all = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all));
  } catch {
    throw invalid();
  }
}

/** Valida campos cerrados, roles y pares antes de componer instrucciones. */
export function validateInput(value) {
  if (!closed(value, ['message', 'history']) || !text(value.message, 1200)
      || !Array.isArray(value.history) || value.history.length > 8 || value.history.length % 2) throw invalid();
  for (let i = 0; i < value.history.length; i++) {
    const item = value.history[i];
    if (!closed(item, ['role', 'content']) || item.role !== (i % 2 ? 'assistant' : 'user')
        || !text(item.content, 1200)) throw invalid();
  }
  return {
    message: value.message.trim(),
    history: value.history.map(item => ({ role: item.role, content: item.content })),
  };
}

/** El único contrato permitido del clasificador es {inScope:boolean}. */
export function validateClassification(value) {
  if (!closed(value, ['inScope']) || typeof value.inScope !== 'boolean'
      || Object.keys(value).length !== 1) throw invalidOutput('clasif_contract');
  return value;
}

function plain(value, max) {
  return text(value, max)
    && !/[<>`\[\]]|(?:https?:|www\.|javascript:|data:)|\b[\w-]+\.(?:com|dev|net|org|app|co|io)\b/iu.test(value);
}

/** @param {SarinInput} input */
export function validateGeneration(value, input) {
  if (!closed(value, ['reply', 'service', 'examples', 'brief']) || !text(value.reply, 1200)
      || !Array.isArray(value.examples) || value.examples.length > 2
      || new Set(value.examples).size !== value.examples.length
      || !closed(value.brief, ['business', 'need', 'features', 'timeline', 'budget'])) throw invalidOutput();
  if (!plain(value.reply, 1200)) throw invalidOutput('reply_policy');
  if (value.service !== undefined && !['website', 'store', 'application', 'chatbot'].includes(value.service)) {
    throw invalidOutput();
  }
  if (/[\p{Sc}]|\b(?:USD|COP|EUR|pesos|dólares|dolares|euros|gratis|descuento|gratuit[oa])\b|\d[\d.,]*\s*(?:mil|mill[oó]n|d[ií]as?|semanas?|meses?|horas?)\b/iu.test(value.reply)
      || (value.reply.match(/\?/g) || []).length > 1) throw invalidOutput('reply_policy');
  if (/\b(?:cuesta|costar[aá]|precio\s+(?:es|de)|valor\s+(?:es|de)|entrega\s+(?:ser[aá]|en)|desde\s+\d|en\s+(?:un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:d[ií]as?|semanas?|meses?|horas?))\b/iu.test(value.reply)) {
    throw invalidOutput('reply_policy');
  }
  // Patrones conservadores: también cubrir importes sin moneda y fechas prometidas.
  // Son una defensa adicional al contrato/prompt, no un filtro semántico infalible.
  const amountClaim = /\b(?:vale|valdr[aá]|costo|coste|tarifa|inversi[oó]n)\b[^.!?¿\n]{0,48}\b(?:\d[\d.,]*|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil)\b/iu;
  const dateClaim = /\b(?:entrega\s+(?:es|ser[aá]|queda)|(?:te\s+(?:lo\s+)?)?entreg(?:amos|aremos)|estar[aá]\s+list[oa]|(?:lo|la)\s+tendr[aá]s)\b[^.!?¿\n]{0,60}\b(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|ma[nñ]ana|\d{1,2}[/-]\d{1,2})\b/iu;
  if (amountClaim.test(value.reply) || dateClaim.test(value.reply)) throw invalidOutput('reply_policy');
  const shared = [...input.history.filter(x => x.role === 'user').map(x => x.content), input.message]
    .join('\n').normalize('NFKC').toLocaleLowerCase('es');
  for (const field of Object.values(value.brief)) {
    if (!plain(field, 240)) throw invalidOutput();
    if (!shared.includes(field.normalize('NFKC').toLocaleLowerCase('es'))) throw invalidOutput('brief_not_literal');
  }
  const examples = value.examples.map(id => {
    const item = CATALOG.find(x => x.id === id);
    if (!item) throw invalidOutput('unknown_example');
    return { ...item };
  });
  return {
    reply: value.reply.trim(), ...(value.service ? { service: value.service } : {}),
    examples, brief: { ...value.brief },
  };
}

/**
 * Retira pares completos antiguos; conserva siempre el último par disponible.
 * @param {SarinInput} input @param {string} prompt
 * @param {number} maxTokens @param {number} maxBytes
 * @returns {ProviderPayload}
 */
export function buildPayload(input, prompt, maxTokens, maxBytes) {
  const history = input.history.slice();
  while (true) {
    const payload = {
      model: 'deepseek-flash', thinking: { type: 'disabled' }, stream: false,
      response_format: { type: 'json_object' }, max_tokens: maxTokens,
      messages: [{ role: 'system', content: prompt }, ...history, { role: 'user', content: input.message }],
    };
    const body = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(body).length;
    if (bytes <= maxBytes) return { body, bytes, maxTokens };
    if (history.length <= 2) throw new SarinError(400, 'context_too_large');
    history.splice(0, 2);
  }
}
