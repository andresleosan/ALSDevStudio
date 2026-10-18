// @ts-check
import {AdminError,adminResponse} from '../access.js';

/** @param {unknown} value @returns {value is Record<string,any>} */
const record=value=>!!value && typeof value==='object' && !Array.isArray(value);
/** @param {unknown} value */
const count=value=>Number.isSafeInteger(value) && Number(value)>=0;
/** @param {unknown} condition @returns {asserts condition} */
function requireThat(condition){if(!condition)throw new AdminError(503,'unavailable');}

/** Sólo el router administrativo autenticado invoca esta proyección de agregados.
 * No incluye destinatarios, claves, identificadores del proveedor ni contenido.
 * @param {Record<string,any>} env @param {number} now */
export async function whatsAppConsumptionResponse(env,now){
 requireThat(typeof env.SARIN_DB?.prepare==='function' && typeof env.SARIN_DB?.batch==='function'
  && typeof env.SARIN_WHATSAPP_BUSINESS_PHONE==='string' && /^\+[1-9]\d{1,14}$/.test(env.SARIN_WHATSAPP_BUSINESS_PHONE)
  && typeof env.SARIN_WHATSAPP_WABA_ID==='string' && /^[1-9]\d{0,31}$/.test(env.SARIN_WHATSAPP_WABA_ID));
 const {getWhatsAppBillingUsage}=await import('./billing.js');
 const value=await getWhatsAppBillingUsage(env.SARIN_DB,{businessPhone:env.SARIN_WHATSAPP_BUSINESS_PHONE,wabaId:env.SARIN_WHATSAPP_WABA_ID,now:()=>now});
 requireThat(record(value) && typeof value.available==='boolean' && value.partial===true);
 if(value.available===false)return adminResponse({consumption:{available:false,status:'unavailable',partial:true}});
 const counts=['observedMessages','freeServiceObserved','freeEntryObserved','paidMessagesObserved','unknownPricingObserved','conflictingMessagesObserved'];
 requireThat(['observed','empty'].includes(value.status) && value.source==='ycloud'
  && /^\d{4}-\d{2}$/.test(value.month) && value.groupingTimezone==='UTC' && value.quotaTimezone===null
  && count(value.coverageStart) && value.coverageStart<=now && value.freeServiceAllowance===1000
  && counts.every(key=>count(value[key])) && typeof value.storageLimited==='boolean' && typeof value.precisionDegraded==='boolean'
  && Array.isArray(value.amounts) && value.amounts.length<=32);
 const amounts=value.amounts.map((/** @type {unknown} */item)=>{
  requireThat(record(item) && typeof item.currency==='string' && /^[A-Z]{3}$/.test(item.currency)
   && typeof item.amountMicros==='string' && /^(?:0|[1-9]\d{0,23})$/.test(item.amountMicros));
  return {currency:item.currency,amountMicros:item.amountMicros};
 });
 requireThat(new Set(amounts.map(item=>item.currency)).size===amounts.length);
 return adminResponse({consumption:{available:true,status:value.status,source:'ycloud',month:value.month,
  groupingTimezone:'UTC',quotaTimezone:null,coverageStart:value.coverageStart,partial:true,freeServiceAllowance:1000,
  observedMessages:value.observedMessages,freeServiceObserved:value.freeServiceObserved,freeEntryObserved:value.freeEntryObserved,
  paidMessagesObserved:value.paidMessagesObserved,unknownPricingObserved:value.unknownPricingObserved,
  conflictingMessagesObserved:value.conflictingMessagesObserved,amounts,storageLimited:value.storageLimited,precisionDegraded:value.precisionDegraded}});
}
