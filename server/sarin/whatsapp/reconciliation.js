// @ts-check
import { createWhatsAppWorkStore } from './work-store.js';
import { createYCloudClient, YCloudClientError } from './ycloud-client.js';
import { lookupConfiguration } from './processing-config.js';
/** Un GET máximo por ejecución. Nunca interpreta HTTP 404 como fallo del POST.
 * @param {import('./processing-config.js').ProcessingEnv} env
 * @param {import('./processor.js').Options & {signal?:AbortSignal}} [options] */
export async function reconcileWhatsAppWork(env,options={}) {
 const config=lookupConfiguration(env);if(!config||options.signal?.aborted)return {status:'disabled'};
 const now=options.now??Date.now,store=options.store??createWhatsAppWorkStore({db:config.db,now});
 const recipient={wabaId:config.wabaId,from:config.business,to:config.peer};
 await store.expireReconciliationLeases();
 if(options.signal?.aborted)return {status:'stopped'};
 await store.discoverReconciliation({recipient});
 if(options.signal?.aborted)return {status:'stopped'};
 const token=crypto.randomUUID(),claim=await store.claimReconciliation({token,recipient});
 if(!claim.permit)return {status:'none'};
 const p=claim.permit,client=createYCloudClient({apiKey:config.apiKey,businessPhone:config.business,fetcher:options.fetch,timeoutMs:10000});
 /** @type {import('./work-contracts.js').ReconciliationResult} */let result;
 try{
  const response=await client.getMessage({id:p.providerId,expected:{...recipient,externalId:p.externalId},signal:options.signal});
  result=response.status==='pending'?{kind:'pending'}:{kind:'observation',observation:{...response,status:/** @type {import('./work-contracts.js').DeliveryObservation['status']} */(response.status),at:now()}};
 }catch(error){
  result=error instanceof YCloudClientError&&error.code==='identity_conflict'?{kind:'identity_conflict'}:
    {kind:'unavailable',code:error instanceof YCloudClientError&&['timeout','cancelled','network_error','provider_rejected','provider_unavailable','provider_redirect','invalid_response','response_too_large'].includes(error.code)?error.code:'invalid_response'};
 }
 return store.finishReconciliation({outboxId:p.outboxId,token,result});
}
