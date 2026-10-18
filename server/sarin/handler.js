// @ts-check
import { createQuota } from './quota.js';
import { SarinError, VALIDATION_REASONS, readBoundedJson, validateChatRequest } from './policy.js';
import { runCommercialTurn } from './run-commercial-turn.js';
import { ensureHistoryConfiguration, validatePost, readSessionToken, hashSessionToken, requestIdentity, historyStore, publicResponse, publicFailure } from './sessions.js';

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
 * @param {{fetch?:typeof fetch,now?:()=>number,quota?:ReturnType<typeof createQuota>,store?:any,sessionCookie?:'__Host-sarin-session'|'__Host-sarin-test-session'}} [options]
 */
export async function handleSarin(request,env,options={}) {
  let store,turn,tokenHash,submission;
  let finished=false;
  try {
    validatePost(request);
    submission=validateChatRequest(await readBoundedJson(request.body,16384,request.signal));
    const config=configuration(env);
    tokenHash=await hashSessionToken(readSessionToken(request,options.sessionCookie),options.sessionCookie);
    if(request.signal.aborted)throw new SarinError(504,'timeout');
    const now=options.now||(()=>Date.now());
    const identity=await requestIdentity(request,env,now());
    store=await historyStore(env,options);
    turn=await store.beginTurn({tokenHash,requestId:submission.requestId,message:submission.message});
    if(turn.replay)return publicResponse(turn.replay.body,turn.replay.status);
    const {output,outcome}=await runCommercialTurn({message:submission.message,history:turn.history,signal:request.signal},{
      config,apiKey:env.DEEPSEEK_API_KEY,fetch:options.fetch,
      createQuota:()=>options.quota||createQuota({db:env.SARIN_DB,identity,now,
        limits:{perMinute:10,perDay:50,dailyMicros:config.dailyMicros,monthlyMicros:config.monthlyMicros}}),
      attachReservation:reservationId=>store.attachReservation({conversationId:turn.conversationId,requestId:submission.requestId,reservationId}),
    });
    const body={...output,conversationId:turn.conversationId,requestId:submission.requestId,turn:turn.turn,expiresAt:turn.expiresAt};
    finished=true;
    const saved=await store.finishTurn({tokenHash,requestId:submission.requestId,body,status:200,outcome});
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
