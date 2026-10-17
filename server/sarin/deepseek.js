// @ts-check
import { SarinError, readBoundedJson, invalidOutput } from './policy.js';
export const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

/**
 * Sin redirects, reintentos ni destinos configurables. Timeout incluye lectura.
 * @param {{body:string, key:string, fetcher:typeof fetch, signal:AbortSignal, timeoutMs:number}} options
 */
export async function callDeepSeek({ body, key, fetcher, signal, timeoutMs }) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) throw new SarinError(504, 'timeout');
  signal.addEventListener('abort', abort, { once: true });
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new SarinError(504, 'timeout'));
    }, timeoutMs);
  });
  const cancelled = new Promise((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new SarinError(504, 'timeout')), { once: true });
  });
  async function receive() {
    const response = await fetcher(DEEPSEEK_URL, {
      // Workerd local rechaza «error»; «manual» devuelve 3xx y !ok lo descarta.
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body, signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(JSON.stringify({ event: 'provider_http_error', status: response.status }));
      throw new SarinError(502, 'provider_error');
    }
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') || '')) {
      throw invalidOutput('provider_envelope');
    }
    let result;
    try {
      result = await readBoundedJson(response.body, 65536, controller.signal);
    } catch (error) {
      if (error?.status === 504) throw error;
      throw invalidOutput('provider_json');
    }
    if (!result || !Array.isArray(result.choices) || result.choices.length !== 1) throw invalidOutput('provider_envelope');
    const choice = result.choices[0];
    if (choice.finish_reason !== 'stop' || choice.message?.role !== 'assistant'
        || choice.message.tool_calls || choice.message.function_call
        || typeof choice.message.content !== 'string') throw invalidOutput('provider_envelope');
    if (choice.message.content.trim() === '') throw invalidOutput('provider_empty_content');
    let content;
    try {
      content = JSON.parse(choice.message.content);
    } catch {
      throw invalidOutput('provider_json');
    }
    return { content, usage: result.usage };
  }
  try {
    return await Promise.race([receive(), timeout, cancelled]);
  } catch (error) {
    if (error instanceof SarinError) throw error;
    if (controller.signal.aborted || signal.aborted) throw new SarinError(504, 'timeout');
    console.warn(JSON.stringify({ event: 'transport_error', kind: error instanceof TypeError ? 'network' : 'unexpected' }));
    throw new SarinError(502, 'provider_error');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

/**
 * Precios por millón de tokens; cálculo entero y redondeo hacia arriba.
 * @param {number} bytes @param {number} maxTokens
 * @param {number} inputPrice @param {number} outputPrice
 */
export function reservationMicros(bytes, maxTokens, inputPrice, outputPrice) {
  const value = ((2n * BigInt(bytes) + 1024n) * BigInt(inputPrice)
    + BigInt(maxTokens) * BigInt(outputPrice) + 999999n) / 1000000n;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new SarinError(503, 'unavailable');
  return Number(value);
}

/**
 * Nunca liquida uso ausente/incoherente; señala exceso para bloqueo global.
 * @param {import('./policy.js').ProviderPayload} payload
 * @param {number} inputPrice @param {number} outputPrice
 */
export function verifiedCost(usage, payload, inputPrice, outputPrice) {
  const keys = ['prompt_tokens', 'completion_tokens', 'total_tokens'];
  if (!usage || keys.some(k => !Number.isSafeInteger(usage[k]) || usage[k] < 0)
      || usage.prompt_tokens + usage.completion_tokens !== usage.total_tokens) throw invalidOutput('usage_contract');
  const excess = usage.prompt_tokens > 2 * payload.bytes + 1024 || usage.completion_tokens > payload.maxTokens;
  const cost = (BigInt(usage.prompt_tokens) * BigInt(inputPrice)
    + BigInt(usage.completion_tokens) * BigInt(outputPrice) + 999999n) / 1000000n;
  return {
    excess: excess || cost > BigInt(Number.MAX_SAFE_INTEGER),
    actualMicros: cost > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(cost),
  };
}
