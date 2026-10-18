// @ts-check
import {createWhatsAppBillingStore} from './billing.js';
import {createYCloudClient} from './ycloud-client.js';
import {lookupConfiguration} from './processing-config.js';

/** Recupera precios finales mediante GET autenticado, nunca envía mensajes.
 * El claim escribe un recibo desconocido y consume un cupo durable antes de la red.
 * Un fallo, cancelación o respuesta incompleta no vuelve a consultar ese ID.
 * @param {import('./processing-config.js').ProcessingEnv} env
 * @param {{now?:()=>number,fetch?:typeof fetch,signal?:AbortSignal,store?:ReturnType<typeof createWhatsAppBillingStore>}} [options] */
export async function syncWhatsAppBilling(env,options={}){
 const stats={lookups:0,enriched:0,unknown:0};
 try{
  const now=options.now??Date.now,config=lookupConfiguration(env,now());
  if(!config)return {status:'disabled',...stats};
  if(options.signal?.aborted)return {status:'stopped',...stats};
  const store=options.store??createWhatsAppBillingStore({db:config.db,now,businessPhone:config.business,wabaId:config.wabaId});
  const client=createYCloudClient({apiKey:config.apiKey,businessPhone:config.business,fetcher:options.fetch,timeoutMs:10000});
  for(let index=0;index<3;index++){
   if(options.signal?.aborted)return {status:'stopped',...stats};
   const claims=await store.claimMissing({limit:1});
   if(!Array.isArray(claims)||claims.length>1)return {status:'unavailable',...stats};
   if(!claims.length)return {status:stats.lookups?'complete':'idle',...stats};
   const claim=claims[0];stats.unknown++;
   if(options.signal?.aborted)return {status:'stopped',...stats};
   if(claim.from!==config.business||claim.wabaId!==config.wabaId||typeof claim.to!=='string'
    ||!/^\+[1-9]\d{1,14}$/.test(claim.to)||claim.to===config.business)return {status:'unavailable',...stats};
   let result;
   try{
    stats.lookups++;
    result=await client.getMessage({id:claim.messageId,expected:{from:claim.from,to:claim.to,wabaId:claim.wabaId,externalId:claim.externalId},
     includePricing:true,observedAt:now(),signal:options.signal});
   }catch{return {status:options.signal?.aborted?'stopped':'partial',...stats};}
   if(options.signal?.aborted)return {status:'stopped',...stats};
   // Una identidad ausente tampoco autoriza atribuir un precio a este negocio.
   if(result.providerId!==claim.messageId||result.from!==claim.from||result.to!==claim.to
    ||(result.wabaId!==undefined&&result.wabaId!==claim.wabaId)
    ||(result.externalId!==undefined&&result.externalId!==claim.externalId)
    ||!['delivered','read'].includes(result.status)||!result.pricing)continue;
   const recorded=await store.observe({messageId:claim.messageId,status:result.status,createdAt:now(),from:result.from,wabaId:claim.wabaId,pricing:result.pricing});
   if('verified' in recorded&&recorded.verified===true){stats.enriched++;stats.unknown--;}
  }
  return {status:'complete',...stats};
 }catch{return {status:'unavailable',...stats};}
}
