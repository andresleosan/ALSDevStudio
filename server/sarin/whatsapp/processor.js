// @ts-check
import { runCommercialTurn } from '../run-commercial-turn.js';
import { createQuota } from '../quota.js';
import {SarinError,VALIDATION_REASONS} from '../policy.js';
import { createWhatsAppWorkStore, WhatsAppWorkError } from './work-store.js';
import { createYCloudClient, YCloudClientError } from './ycloud-client.js';
import { processingConfiguration, recipientAllowed, validWorkHint } from './processing-config.js';
import { WHATSAPP_NOTICE, WHATSAPP_NOTICE_VERSION, WHATSAPP_ACCEPTED } from './consent.js';
import {createWhatsAppMenuButtons} from './menu.js';
import {transcribeWhatsAppAudio} from './audio-client.js';
const AUDIO_FAILURE_REASONS=new Set(['invalid_config','invalid_descriptor','unsupported_format','cancelled','timeout','download_failed',
 'invalid_audio','audio_too_large','audio_too_long','integrity_mismatch','permission_denied','inference_uncertain','invalid_transcription']);
/** Diagnóstico cerrado: ningún valor del proveedor se convierte en texto de log.
 * @param {unknown} reason */
const safeAudioFailure=reason=>typeof reason==='string'&&AUDIO_FAILURE_REASONS.has(reason)?reason:'unknown';
const INFERENCE_STAGES=['preparation','audio','commercial_input','classification','generation','persistence','send'];
const INFERENCE_CODES=['invalid_output','deadline','provider_rejected','provider_unavailable'];
/** Proyección cerrada reutilizada en el límite del log; nunca copia un error.
 * @param {unknown} value */
export function safeWhatsAppInferenceFailure(value){
 if(!value||typeof value!=='object')return null;
 const v=/** @type {Record<string,unknown>} */(value);
 if(typeof v.stage!=='string'||!INFERENCE_STAGES.includes(v.stage)||typeof v.code!=='string'||!INFERENCE_CODES.includes(v.code))return null;
 return {stage:v.stage,code:v.code,...(typeof v.diagnostic==='string'&&VALIDATION_REASONS.includes(v.diagnostic)?{diagnostic:v.diagnostic}:{})};
}
/** @typedef {import('./processing-config.js').ProcessingEnv} ProcessingEnv */
/** @typedef {{store?:ReturnType<typeof createWhatsAppWorkStore>,fetch?:typeof fetch,now?:()=>number,transcribeAudio?:typeof transcribeWhatsAppAudio}} Options */
/** Identidad de cuota separada de web, sin teléfono ni sesión inventada.
 * @param {string} peerKey @param {string} secret @param {number} at */
async function identity(peerKey,secret,at) {
 const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode('sarin-whatsapp-quota-v1\n'+new Date(at).toISOString().slice(0,10)+'\n'+peerKey))),b=>b.toString(16).padStart(2,'0')).join('');
}
/** @param {string} text */
async function hash(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
/** @param {unknown} hint @param {ProcessingEnv} env @param {Options} [options] */
export async function processWhatsAppWork(hint,env,options={}) {
 if(!validWorkHint(hint))return {status:'invalid'};
 if(!env.SARIN_DB)return {status:'disabled'};
 const now=options.now??Date.now,store=options.store??createWhatsAppWorkStore({db:env.SARIN_DB,now});
 if(env.SARIN_WHATSAPP_REPLIES_ENABLED!=='true'){await store.suspendReplies();return {status:'disabled'};}
 const configured=processingConfiguration(env,now());if(!configured)return {status:'disabled'};
 const config=configured;
 const controller=new AbortController(),startedAt=now(),token=crypto.randomUUID(),own={...hint,token};
 let externalStarted=false,stage='preparation';
 const check=()=>{if(controller.signal.aborted||now()-startedAt>=60000){controller.abort();throw new Error('deadline');}};
 /** @type {ReturnType<typeof setTimeout>|undefined} */let timer;
 /** @type {Promise<{status:string,inferenceFailure?:{stage:string,code:string}}>} */
 const deadline=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve({status:externalStarted?'uncertain':'retry',
  ...(externalStarted?{inferenceFailure:{stage,code:'deadline'}}:{})});},60000);});
 const client=createYCloudClient({apiKey:config.apiKey,businessPhone:config.business,sendEnabled:true,fetcher:options.fetch});
 /** @param {string} outboxId @param {import('./work-contracts.js').Recipient} recipient */
 async function send(outboxId,recipient) {
  stage='send';
  check();const permit=await store.beginSend({outboxId,token,recipient});externalStarted=true;check();
  if(!recipientAllowed(config,permit)||permit.wabaId!==recipient.wabaId||permit.from!==recipient.from||permit.to!==recipient.to){
   await store.finishSend({outboxId,token,result:{status:'uncertain'}});return {status:'denied'};
  }
  try {
   // Cada salida conserva controles propios. Jamás se hace un segundo envío
   // de texto como respaldo de una solicitud interactiva fallida o incierta.
   const message={to:permit.to,text:permit.text,externalId:permit.externalId,signal:controller.signal};
   const result=await client.sendButtons({...message,buttons:createWhatsAppMenuButtons(permit.outboxId,permit.purpose)});
   await store.finishSend({outboxId,token,result:{status:'accepted',providerId:result.providerId,...(result.wamid?{wamid:result.wamid}:{})}});
   if(['sent','delivered','read','failed'].includes(result.status))await store.applyStatus({eventId:'post:'+outboxId,providerId:result.providerId,status:/** @type {'sent'|'delivered'|'read'|'failed'} */(result.status),at:now()});
   return {status:'accepted'};
  }catch(error){
   // Marcado antes de la red: ni timeout ni error de persistencia permiten repetir POST.
   await store.finishSend({outboxId,token,result:{status:error instanceof YCloudClientError&&error.deliveryState==='rejected'?'rejected':'uncertain'}}).catch(()=>{});
   return {status:'uncertain'};
  }
 }
 async function execute() {
  try {
   check();const recipient=await store.getWorkRecipient(own);check();
   if(!recipient||!recipientAllowed(config,recipient))return {status:'denied'};
   const ready=await store.claimSend(own);check();
   if(ready.status==='claimed')return await send(ready.outboxId,recipient);
   const claim=await store.claimGeneration(own);check();
   if(claim.status!=='claimed'||!claim.work)return {status:claim.status};
   const work=claim.work;
   if(!recipientAllowed(config,work.recipient)||work.recipient.wabaId!==recipient.wabaId||work.recipient.from!==recipient.from||work.recipient.to!==recipient.to){await store.finishWithoutReply({...own,reason:'cancelled'});return {status:'denied'};}
   if(work.decision==='ignore'){await store.finishWithoutReply({...own,reason:'ignored'});return {status:'ignored'};}
   if(work.decision==='accept_pending'){await store.deferWork({...own,reason:'waiting_notice'});return {status:'deferred'};}
   let out;
   if(work.decision==='profile') {
    out=await store.completeProfile(own);check();
   }else if(work.decision==='generate') {
    const quotaIdentity=await identity(work.peerKey,config.identitySecret,now());check();
    await store.markInferenceStarted(own);externalStarted=true;check();
    if(work.source==='audio'){
      stage='audio';
      const descriptor=await store.getAudioDescriptor(own);check();
      const result=descriptor?await (options.transcribeAudio??transcribeWhatsAppAudio)({descriptor,apiKey:config.apiKey,ai:env.AI,fetchImpl:options.fetch,
        signal:controller.signal,beforeInference:async()=>{check();try{return await store.beginAudioInference(own);}catch{return false;}}}):/** @type {import('./audio-client.js').AudioResult} */({ok:false,reason:'invalid_descriptor'});
      check();await store.finishAudio({...own,result});check();
      if(result.ok===false){
        out=await store.completeGeneration({...own,reply:'No pude transcribir ese audio. Envíame tu consulta por texto o una nota de voz de WhatsApp de hasta 2 minutos. También puedes usar el botón Hablar con Andrés.',outcome:'fallback'});
        return {...await send(out.outboxId,recipient),audioFailure:safeAudioFailure(result.reason)};
      }
      work.input=result.text;
    }
    stage='commercial_input';
    const result=await runCommercialTurn({message:work.input,history:work.history,signal:controller.signal},{config,apiKey:config.aiKey,fetch:options.fetch,
     createQuota:()=>{const quota=createQuota({db:config.db,identity:quotaIdentity,now,limits:{perMinute:10,perDay:50,dailyMicros:config.dailyMicros,monthlyMicros:config.monthlyMicros}});
      // Sólo observa la etapa: conserva la misma solicitud, cuota y liquidación.
      return {...quota,reserve:request=>{stage=request.stage;return quota.reserve(request);}};},
     attachReservation:async reservationId=>{check();await store.attachReservation({...own,reservationId});check();}});
    check();stage='persistence';out=await store.completeGeneration({...own,reply:result.output.reply,outcome:result.outcome});
   }else {
    const noticeHash=await hash(WHATSAPP_NOTICE);check();
    out=await store.createFixedReply({...own,purpose:work.decision==='notice'?'notice':'accepted',text:work.decision==='notice'?WHATSAPP_NOTICE:WHATSAPP_ACCEPTED,version:WHATSAPP_NOTICE_VERSION,hash:noticeHash});
   }
   return await send(out.outboxId,recipient);
  }catch(error){
   if(externalStarted){
    const code=controller.signal.aborted||(error instanceof SarinError&&error.code==='timeout')?'deadline':
     error instanceof SarinError&&error.code==='invalid_output'?'invalid_output':
      error instanceof SarinError&&error.code==='provider_rejected'?'provider_rejected':'provider_unavailable';
    const inferenceFailure=safeWhatsAppInferenceFailure({stage,code,diagnostic:error instanceof SarinError&&code==='invalid_output'?error.diagnostic:undefined});
    await store.failInference({...own,started:true,code}).catch(()=>{});return {status:'uncertain',inferenceFailure};
   }
   if(error instanceof WhatsAppWorkError&&error.status!==503)return {status:'denied'};
   return {status:'retry'};
  }
 }
 try{return await Promise.race([execute(),deadline]);}finally{clearTimeout(timer);}
}
/** Recuperación limitada a una cabeza; Queue sólo es una notificación.
 * @param {ProcessingEnv} env @param {Options} [options] */
export async function dispatchWhatsAppWork(env,options={}) {
 if(!env.SARIN_DB)return {published:0,expired:0};
 const store=options.store??createWhatsAppWorkStore({db:env.SARIN_DB,now:options.now});
 if(env.SARIN_WHATSAPP_REPLIES_ENABLED!=='true')await store.suspendReplies();
 const expired=await store.expireLeases({limit:1});
 if(!processingConfiguration(env,(options.now??Date.now)())||!env.SARIN_WHATSAPP_QUEUE)return {published:0,expired:expired.processed};
 const jobs=await store.listDispatchable({limit:1});let published=0;
 for(const hint of jobs){try{await env.SARIN_WHATSAPP_QUEUE.send(hint);published++;}catch{/* Cron vuelve a avisar; el trabajo sigue en D1. */}}
 return {published,expired:expired.processed};
}
