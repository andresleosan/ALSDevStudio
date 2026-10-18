// @ts-check
import { CLASSIFICATION_PROMPT, GENERATION_PROMPT, OUT_OF_SCOPE } from './knowledge.js';
import { SarinError, invalidOutput, validateInput, validateClassification, validateGeneration, buildPayload } from './policy.js';
import { callDeepSeek, reservationMicros, verifiedCost } from './deepseek.js';

/**
 * Ejecución interna tras la admisión del adaptador. No autoriza sesiones ni
 * deduplica: el llamador conserva consentimiento, historial, replay y entrega.
 * Configuración y dependencias proceden del servidor, nunca de HTTP.
 * createQuota se difiere hasta validar entrada y ambos payloads, como en la web.
 * @param {{message:string,history:import('./policy.js').HistoryMessage[],signal:AbortSignal}} submission
 * @param {{config:{inputPrice:number,outputPrice:number},apiKey:string,
 *   createQuota:()=>ReturnType<typeof import('./quota.js').createQuota>,
 *   attachReservation:(reservationId:string)=>Promise<unknown>,fetch?:typeof fetch}} dependencies
 * @returns {Promise<{output:ReturnType<typeof validateGeneration>|typeof OUT_OF_SCOPE,outcome:'completed'|'out_of_scope'}>}
 */
export async function runCommercialTurn({ message, history, signal }, { config, apiKey, createQuota, attachReservation, fetch: fetchImpl }) {
  const input = validateInput({ message, history });
  const classification = buildPayload(input, CLASSIFICATION_PROMPT, 128, 8192);
  const generation = buildPayload(input, GENERATION_PROMPT, 512, 32768);
  const quota = createQuota();
  const fetcher = fetchImpl || globalThis.fetch.bind(globalThis);

  /**
   * @template T
   * @param {'classification'|'generation'} stage
   * @param {import('./policy.js').ProviderPayload} payload
   * @param {(value:any)=>T} validate
   * @param {number} timeoutMs
   * @returns {Promise<T>}
   */
  async function execute(stage, payload, validate, timeoutMs) {
    if (signal.aborted) throw new SarinError(504, 'timeout');
    const id = crypto.randomUUID();
    const amountMicros = reservationMicros(payload.bytes, payload.maxTokens, config.inputPrice, config.outputPrice);
    await quota.reserve({ id, stage, amountMicros });
    try {
      await attachReservation(id);
      if (signal.aborted) throw new SarinError(504, 'timeout');
    } catch (error) {
      // No se invocó fetch: sólo este gasto se conoce como cero.
      await quota.settle(id, 0);
      throw error;
    }
    const result = await callDeepSeek({ body: payload.body, key: apiKey, fetcher, signal, timeoutMs });
    const cost = verifiedCost(result.usage, payload, config.inputPrice, config.outputPrice);
    if (cost.excess || cost.actualMicros > amountMicros) { await quota.block(); throw invalidOutput('usage_contract'); }
    const output = validate(result.content);
    if (signal.aborted) throw new SarinError(504, 'timeout');
    await quota.settle(id, cost.actualMicros);
    return output;
  }

  const scope = await execute('classification', classification, validateClassification, 10000);
  const output = scope.inScope
    ? await execute('generation', generation, value => validateGeneration(value, input), 20000)
    : OUT_OF_SCOPE;
  return { output, outcome: scope.inScope ? 'completed' : 'out_of_scope' };
}
