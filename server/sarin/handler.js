// @ts-check
import { createQuota, pseudonymizeIp } from './quota.js';
import { CLASSIFICATION_PROMPT, GENERATION_PROMPT, OUT_OF_SCOPE } from './knowledge.js';
import { SarinError, VALIDATION_REASONS, invalidOutput, readBoundedJson, validateInput, validateClassification, validateGeneration, buildPayload } from './policy.js';
import { callDeepSeek, reservationMicros, verifiedCost } from './deepseek.js';

const MESSAGES = {
  400: 'Revisa tu consulta o acorta el contexto. Puedes contactar con Andrés.',
  403: 'Origen no permitido.',
  405: 'Usa POST para enviar tu consulta.',
  413: 'La consulta es demasiado extensa.',
  429: 'Alcanzaste el límite del chat. Puedes contactar con Andrés.',
  503: 'Sarin todavía no está disponible. Puedes contactar con Andrés.',
  502: 'No pudimos validar la respuesta. Puedes contactar con Andrés.',
  504: 'La espera terminó. Puedes contactar con Andrés.',
};
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};
const respond = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...HEADERS, ...(status === 405 ? { Allow: 'POST' } : {}) },
});

function configuration(env) {
  if (env.SARIN_ENABLED !== 'true' || typeof env.DEEPSEEK_API_KEY !== 'string'
      || !env.DEEPSEEK_API_KEY.trim() || typeof env.SARIN_IP_SECRET !== 'string'
      || env.SARIN_IP_SECRET.length < 32 || typeof env.SARIN_DB?.prepare !== 'function') {
    throw new SarinError(503, 'unavailable');
  }
  const values = [
    'SARIN_INPUT_PRICE_MICROS', 'SARIN_OUTPUT_PRICE_MICROS',
    'SARIN_DAILY_BUDGET_MICROS', 'SARIN_MONTHLY_BUDGET_MICROS',
  ].map(key => {
    if (typeof env[key] !== 'string' || !/^\d+$/.test(env[key])
        || !Number.isSafeInteger(Number(env[key])) || Number(env[key]) <= 0) {
      throw new SarinError(503, 'unavailable');
    }
    return Number(env[key]);
  });
  return { inputPrice: values[0], outputPrice: values[1], dailyMicros: values[2], monthlyMicros: values[3] };
}

/**
 * options solo admite dependencias internas; nunca procede de HTTP/env.
 * @param {Request} request
 * @param {Record<string, any>} env
 * @param {{fetch?: typeof fetch, now?: () => number, quota?: ReturnType<typeof createQuota>}} [options]
 */
export async function handleSarin(request, env, options = {}) {
  try {
    if (request.method !== 'POST') throw new SarinError(405, 'method_not_allowed');
    const url = new URL(request.url);
    if (request.headers.get('Origin') !== url.origin) throw new SarinError(403, 'origin_rejected');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') || '')
        || request.headers.has('Content-Encoding')) throw new SarinError(400, 'invalid_request');
    const length = request.headers.get('Content-Length');
    if (length && (!/^\d+$/.test(length) || Number(length) > 16384)) throw new SarinError(413, 'body_too_large');
    const input = validateInput(await readBoundedJson(request.body, 16384, request.signal));
    const config = configuration(env);
    // Construir ambos payloads primero garantiza rechazos de contexto sin gasto.
    const classification = buildPayload(input, CLASSIFICATION_PROMPT, 128, 8192);
    const generation = buildPayload(input, GENERATION_PROMPT, 512, 32768);
    const now = options.now || (() => Date.now());
    let ip = request.headers.get('CF-Connecting-IP');
    if (!ip && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) ip = '127.0.0.1';
    if (!ip || ip.length > 64 || !/^[0-9a-f:.]+$/i.test(ip)) throw new SarinError(503, 'unavailable');
    const identity = await pseudonymizeIp(ip, env.SARIN_IP_SECRET, now());
    const quota = options.quota || createQuota({
      db: env.SARIN_DB, identity, now,
      limits: { perMinute: 10, perDay: 50, dailyMicros: config.dailyMicros, monthlyMicros: config.monthlyMicros },
    });
    // El runtime puede exigir el receptor del método; los dobles siguen intactos.
    const fetcher = options.fetch || globalThis.fetch.bind(globalThis);
    async function execute(stage, payload, validate, timeoutMs) {
      if (request.signal.aborted) throw new SarinError(504, 'timeout');
      const id = crypto.randomUUID();
      const amountMicros = reservationMicros(payload.bytes, payload.maxTokens, config.inputPrice, config.outputPrice);
      await quota.reserve({ id, stage, amountMicros });
      if (request.signal.aborted) throw new SarinError(504, 'timeout');
      const result = await callDeepSeek({
        body: payload.body, key: env.DEEPSEEK_API_KEY, fetcher, signal: request.signal, timeoutMs,
      });
      const cost = verifiedCost(result.usage, payload, config.inputPrice, config.outputPrice);
      if (cost.excess || cost.actualMicros > amountMicros) {
        await quota.block();
        throw invalidOutput('usage_contract');
      }
      const output = validate(result.content);
      if (request.signal.aborted) throw new SarinError(504, 'timeout');
      await quota.settle(id, cost.actualMicros);
      return output;
    }
    const scope = await execute('classification', classification, validateClassification, 10000);
    if (!scope.inScope) return respond(OUT_OF_SCOPE);
    return respond(await execute('generation', generation, value => validateGeneration(value, input), 20000));
  } catch (error) {
    if (error instanceof SarinError && VALIDATION_REASONS.includes(error.diagnostic)) {
      console.warn(JSON.stringify({ event: 'validation_error', kind: error.diagnostic }));
    }
    const status = [400, 403, 405, 413, 429, 503, 502, 504].includes(error?.status) ? error.status : 503;
    const code = error instanceof SarinError ? error.code : status === 429 ? 'rate_limit' : 'unavailable';
    return respond({ error: { code, message: MESSAGES[status] } }, status);
  }
}
