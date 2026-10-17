// @ts-check
import { createQuota } from './quota.js';
import { CLASSIFICATION_PROMPT, GENERATION_PROMPT, OUT_OF_SCOPE } from './knowledge.js';
import { SarinError, VALIDATION_REASONS, invalidOutput, readBoundedJson, validateChatRequest, validateInput, validateClassification, validateGeneration, buildPayload } from './policy.js';
import { callDeepSeek, reservationMicros, verifiedCost } from './deepseek.js';
import { ensureHistoryConfiguration, validatePost, readSessionToken, hashText, requestIdentity, historyStore, publicResponse, publicFailure } from './sessions.js';

function configuration(env) {
  ensureHistoryConfiguration(env);
  if(typeof env.DEEPSEEK_API_KEY!=='string'||!env.DEEPSEEK_API_KEY.trim())throw new SarinError(503,'unavailable');
  const values=['SARIN_INPUT_PRICE_MICROS','SARIN_OUTPUT_PRICE_MICROS','SARIN_DAILY_BUDGET_MICROS','SARIN_MONTHLY_BUDGET_MICROS'].map(key=>{
    if(typeof env[key]!=='string'||!/^\d+$/.test(env[key])||!Number.isSafeInteger(Number(env[key]))||Number(env[key])<=0)throw new SarinError(503,'unavailable');
    return Number(env[key]);
  });
  return {inputPrice:values[0],outputPrice:values[1],dailyMicros:values[2],monthlyMicros:values[3]};
}

/**
 * Dependencias sustituibles exclusivamente desde codigo interno de pruebas.
 * El cliente no selecciona proveedor, almacen, reloj, historial o cuotas.
 * @param {Request} request
 * @param {Record<string,any>} env
 * @param {{fetch?:typeof fetch,now?:()=>number,quota?:ReturnType<typeof createQuota>,store?:any}} [options]
 */
export async function handleSarin(request,env,options={}) {
  let store,turn,tokenHash,submission;
  let finished=false;
  try {
    validatePost(request);
    submission=validateChatRequest(await readBoundedJson(request.body,16384,request.signal));
    const config=configuration(env);
    tokenHash=await hashText(readSessionToken(request));
    if(request.signal.aborted)throw new SarinError(504,'timeout');
    const now=options.now||(()=>Date.now());
    const identity=await requestIdentity(request,env,now());
    store=await historyStore(env,options);
    turn=await store.beginTurn({tokenHash,requestId:submission.requestId,message:submission.message});
    if(turn.replay)return publicResponse(turn.replay.body,turn.replay.status);
    const input=validateInput({message:submission.message,history:turn.history});
    const classification=buildPayload(input,CLASSIFICATION_PROMPT,128,8192);
    const generation=buildPayload(input,GENERATION_PROMPT,512,32768);
    const quota=options.quota||createQuota({db:env.SARIN_DB,identity,now,
      limits:{perMinute:10,perDay:50,dailyMicros:config.dailyMicros,monthlyMicros:config.monthlyMicros}});
    const fetcher=options.fetch||globalThis.fetch.bind(globalThis);
    async function execute(stage,payload,validate,timeoutMs) {
      if(request.signal.aborted)throw new SarinError(504,'timeout');
      const id=crypto.randomUUID();
      const amountMicros=reservationMicros(payload.bytes,payload.maxTokens,config.inputPrice,config.outputPrice);
      await quota.reserve({id,stage,amountMicros});
      try {
        await store.attachReservation({conversationId:turn.conversationId,requestId:submission.requestId,reservationId:id});
        if(request.signal.aborted)throw new SarinError(504,'timeout');
      } catch(error) {
        // No se invoco fetch: solo este gasto se conoce como cero.
        await quota.settle(id,0);
        throw error;
      }
      const result=await callDeepSeek({body:payload.body,key:env.DEEPSEEK_API_KEY,fetcher,signal:request.signal,timeoutMs});
      const cost=verifiedCost(result.usage,payload,config.inputPrice,config.outputPrice);
      if(cost.excess||cost.actualMicros>amountMicros){await quota.block();throw invalidOutput('usage_contract');}
      const output=validate(result.content);
      if(request.signal.aborted)throw new SarinError(504,'timeout');
      await quota.settle(id,cost.actualMicros);
      return output;
    }
    const scope=await execute('classification',classification,validateClassification,10000);
    const output=scope.inScope ? await execute('generation',generation,value=>validateGeneration(value,input),20000) : OUT_OF_SCOPE;
    const body={...output,conversationId:turn.conversationId,requestId:submission.requestId,turn:turn.turn,expiresAt:turn.expiresAt};
    finished=true;
    const saved=await store.finishTurn({tokenHash,requestId:submission.requestId,body,status:200,outcome:scope.inScope?'completed':'out_of_scope'});
    if(!saved.applied)throw new SarinError(410,'conversation_expired');
    return publicResponse(body);
  } catch(error) {
    if(error instanceof SarinError&&VALIDATION_REASONS.includes(error.diagnostic))console.warn(JSON.stringify({event:'validation_error',kind:error.diagnostic}));
    let failure=publicFailure(error);
    if(store&&turn&&!turn.replay&&!finished) {
      finished=true;
      try {
        const saved=await store.finishTurn({tokenHash,requestId:submission.requestId,body:failure.body,status:failure.status,outcome:failure.status===504?'timeout':'error'});
        if(!saved.applied)failure=publicFailure(new SarinError(410,'conversation_expired'));
      } catch { failure=publicFailure(new SarinError(503,'history_unavailable')); }
    } else if(!turn) {
      // Registro agregado sin cuerpo, Cookie, cabeceras o IP cruda.
      try {
        ensureHistoryConfiguration(env);
        store=store||await historyStore(env,options);
        await store.recordRejection({code:failure.body.error.code==='session_required'?'session_invalid':failure.body.error.code});
      } catch { /* El fallo del registro nunca habilita una peticion rechazada. */ }
    }
    return publicResponse(failure.body,failure.status,failure.status===405?{Allow:'POST'}:{});
  }
}
