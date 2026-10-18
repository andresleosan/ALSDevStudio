// @ts-check
/** Consumo privado: observaciones parciales, sin estimaciones ni saldo calculado. */
/** @typedef {{status:'hidden'|'idle'|'loading'|'error'|'unavailable'|'observed'|'empty',period?:string,coverage?:string,limit?:string,freeService?:string|null,paid?:string|null,freeEntry?:string|null,amounts?:string[],costLabel?:string,warning?:string}} ConsumptionState */
/** @param {unknown} value @returns {Record<string,any>} */
const record=value=>value && typeof value==='object' && !Array.isArray(value)?value:{};
const invalid=()=>new Error('El consumo recibido no es válido.');
const monthFormat=new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric',timeZone:'UTC'});
const coverageFormat=new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'});
/** @param {unknown} value @returns {ConsumptionState} */
export function consumptionSummary(value){
 const item=record(record(value).consumption);
 if(item.available===false && item.status==='unavailable' && item.partial===true)return {status:'unavailable'};
 const keys=['observedMessages','freeServiceObserved','freeEntryObserved','paidMessagesObserved','unknownPricingObserved','conflictingMessagesObserved'];
 if(item.available!==true || !['observed','empty'].includes(item.status) || item.source!=='ycloud' || item.partial!==true || item.groupingTimezone!=='UTC' || item.quotaTimezone!==null || item.freeServiceAllowance!==1000 || typeof item.storageLimited!=='boolean' || typeof item.precisionDegraded!=='boolean'
  || typeof item.month!=='string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(item.month) || Number(item.month.slice(0,4))<2000
  || !Number.isSafeInteger(item.coverageStart) || item.coverageStart<=0 || item.coverageStart>8640000000000000
  || keys.some(key=>!Number.isSafeInteger(item[key]) || item[key]<0 || item[key]>item.observedMessages)
  || !Array.isArray(item.amounts) || item.amounts.length>32)throw invalid();
 const currencies=new Set();
 const amounts=item.amounts.map(raw=>{
  const amount=record(raw);
  if(typeof amount.currency!=='string' || !/^[A-Z]{3}$/.test(amount.currency) || currencies.has(amount.currency) || typeof amount.amountMicros!=='string' || !/^[1-9]\d{0,119}$/.test(amount.amountMicros))throw invalid();
  currencies.add(amount.currency);
  const micros=BigInt(amount.amountMicros),whole=micros/1000000n;
  const decimals=(micros%1000000n).toString().padStart(6,'0').replace(/0+$/,'').padEnd(2,'0');
  return `${amount.currency} ${whole.toLocaleString('es-CO')},${decimals}`;
 });
 if((item.status==='empty' && (keys.some(key=>item[key]!==0) || amounts.length)) || (item.status==='observed' && item.observedMessages===0))throw invalid();
 const warnings=[];
 if(item.unknownPricingObserved)warnings.push(`${item.unknownPricingObserved.toLocaleString('es-CO')} mensajes sin precio confirmado.`);
 if(item.conflictingMessagesObserved)warnings.push(`${item.conflictingMessagesObserved.toLocaleString('es-CO')} mensajes con conflicto de precio, excluidos de los importes.`);
 if(item.storageLimited)warnings.push('Se alcanzó la capacidad del registro; la cobertura puede ser menor.');
 if(item.precisionDegraded && !warnings.length)warnings.push('Hay datos incompletos o inconsistentes; los totales requieren revisión.');
 return {status:item.status,period:`WhatsApp · ${monthFormat.format(new Date(`${item.month}-01T00:00:00Z`))} (UTC)`,
  coverage:`Cobertura parcial desde ${coverageFormat.format(new Date(item.coverageStart))} (Colombia); histórico anterior pendiente.`,
  limit:'Referencia mensual: 1.000 mensajes gratuitos de servicio por número. El restante exacto es desconocido; no se conoce la zona horaria de la cuota.',
  freeService:item.status==='empty'?null:`${item.freeServiceObserved.toLocaleString('es-CO')} observados / 1.000 de referencia`,
  paid:item.status==='empty'?null:`${item.paidMessagesObserved.toLocaleString('es-CO')} observados`,
  freeEntry:item.freeEntryObserved?`${item.freeEntryObserved.toLocaleString('es-CO')} observados`:null,
  amounts,costLabel:item.status==='observed' && item.paidMessagesObserved===0 && !item.unknownPricingObserved && !item.conflictingMessagesObserved && !item.precisionDegraded && !item.storageLimited?'Sin cargos en los registros observados':'Sin importes confirmados',warning:warnings.join(' ')};
}

/**
 * Cada apertura obtiene datos nuevos. Cerrar, perder el acceso o reiniciar invalida toda respuesta pendiente.
 * @param {{request:(options:{signal:AbortSignal})=>Promise<unknown>,onState:(state:ConsumptionState)=>void,fail:(error:unknown)=>void}} options
 */
export function createConsumptionController({request,onState,fail}){
 let ready=false,open=false,generation=0;
 /** @type {AbortController|null} */let pending=null;
 const cancel=()=>{generation++;pending?.abort();pending=null;};
 const clear=()=>{ready=false;open=false;cancel();onState({status:'hidden'});};
 const reload=async()=>{
  if(!ready || !open)return;
  cancel();const current=generation,controller=new AbortController();pending=controller;onState({status:'loading'});
  try{
   const value=await request({signal:controller.signal});
   if(current!==generation || !ready || !open)return;
   onState(consumptionSummary(value));
  }catch(error){
   if(current!==generation || !ready || !open || record(error).name==='AbortError')return;
   if([401,403].includes(Number(record(error).status))){clear();fail(error);}else onState({status:'error'});
  }finally{if(current===generation)pending=null;}
 };
 return {clear,reload,
  /** @param {boolean} value */setReady(value){if(!value){clear();return;}cancel();ready=true;open=false;onState({status:'idle'});},
  /** @param {boolean} value */async setOpen(value){if(!ready)return;if(open===value)return;open=value;if(open)await reload();else{cancel();onState({status:'idle'});}}
 };
}
