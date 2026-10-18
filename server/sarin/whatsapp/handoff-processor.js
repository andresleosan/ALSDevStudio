// @ts-check
import { createWhatsAppHandoffClient, HandoffClientError } from './handoff-client.js';
import { createWhatsAppHandoffStore, HandoffStoreError } from './handoff-store.js';
/** @param {Record<string,any>} env @param {{now?:()=>number,fetch?:typeof fetch,signal?:AbortSignal,store?:ReturnType<typeof createWhatsAppHandoffStore>}} [options] */
export async function processWhatsAppHandoff(env,options={}) {
  if(options.signal?.aborted)return {status:'cancelled'};
  if(env.SARIN_WHATSAPP_HANDOFF_ENABLED!=='true'||env.SARIN_WHATSAPP_SEND_ENABLED!=='true'
    ||env.SARIN_WHATSAPP_REPLIES_ENABLED!=='true'||!env.SARIN_DB
    ||typeof env.SARIN_WHATSAPP_WABA_ID!=='string'||!/^[1-9]\d{0,31}$/.test(env.SARIN_WHATSAPP_WABA_ID))return {status:'disabled'};
  let client;
  try { client=createWhatsAppHandoffClient({apiKey:env.SARIN_WHATSAPP_API_KEY,businessPhone:env.SARIN_WHATSAPP_BUSINESS_PHONE,
    ownerPhone:env.SARIN_WHATSAPP_OWNER_PHONE,sendEnabled:true,fetcher:options.fetch}); }
  catch { return {status:'disabled'}; }
  const now=options.now??Date.now,store=options.store??createWhatsAppHandoffStore({db:env.SARIN_DB,now});
  const identity={wabaId:env.SARIN_WHATSAPP_WABA_ID,businessPhone:env.SARIN_WHATSAPP_BUSINESS_PHONE,ownerPhone:env.SARIN_WHATSAPP_OWNER_PHONE};
  let permit;
  try {
    const alert=await store.next(identity);if(options.signal?.aborted)return {status:'cancelled'};
    if(!alert)return {status:'idle'};
    const templateName=env.SARIN_WHATSAPP_HANDOFF_TEMPLATE,templateLanguage=env.SARIN_WHATSAPP_HANDOFF_TEMPLATE_LANGUAGE;
    const readyTemplate=typeof templateName==='string'&&/^[a-z0-9_]{1,512}$/.test(templateName)
      &&typeof templateLanguage==='string'&&/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(templateLanguage);
    if(!alert.ownerWindowOpen&&!readyTemplate){await store.waitForTemplate(alert);return {status:'waiting_template'};}
    const mode=alert.ownerWindowOpen?'text':'template';
    if(options.signal?.aborted)return {status:'cancelled'};
    permit=await store.beginSend({...identity,alertId:alert.alertId,mode});
    if(options.signal?.aborted)throw new HandoffClientError('cancelled','not_sent');
    const input={to:permit.to,contactLabel:permit.contactLabel,panelUrl:permit.panelUrl,externalId:permit.externalId,signal:options.signal};
    const result=mode==='text'?await client.sendText(input):await client.sendTemplate({...input,templateName,templateLanguage});
    await store.finishSend({alertId:permit.alertId,result:{status:'accepted',providerId:result.providerId,...(result.wamid?{wamid:result.wamid}:{})}});
    if(['sent','delivered','read','failed'].includes(result.status))await store.applyStatus({eventId:'post:'+permit.alertId,
      providerId:result.providerId,externalId:permit.externalId,status:result.status,at:now(),
      wabaId:permit.wabaId,from:permit.from,to:permit.to,...(result.wamid?{wamid:result.wamid}:{})});
    return {status:'accepted'};
  } catch(error) {
    if(permit){
      const rejected=error instanceof HandoffClientError&&error.deliveryState==='rejected';
      await store.finishSend({alertId:permit.alertId,result:{status:rejected?'rejected':'uncertain'}}).catch(()=>{});
      return {status:rejected?'rejected':'uncertain'};
    }
    return {status:error instanceof HandoffStoreError&&error.code==='handoff_quota'?'limited'
      :error instanceof HandoffStoreError&&error.code==='handoff_denied'?'denied':'unavailable'};
  }
}
