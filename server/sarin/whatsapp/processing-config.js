// @ts-check
/** @typedef {import('./ingress-store.js').Database} Database */
/** @typedef {{jobId:string,epoch:string}} WorkHint */
/** @typedef {Record<string,unknown> & {SARIN_DB?:Database,SARIN_WHATSAPP_QUEUE?:{send:(hint:WorkHint)=>Promise<unknown>}}} ProcessingEnv */
/** @param {unknown} v @returns {v is string} */
const phone=v=>typeof v==='string'&&/^\+[1-9]\d{1,14}$/.test(v);
/** @param {unknown} v @returns {v is string} */
const secret=v=>typeof v==='string'&&/^[\x21-\x7e]{1,4096}$/.test(v);
/** Configuración interna cerrada: ausencia nunca concede un permiso.
 * @param {ProcessingEnv} env */
export function lookupConfiguration(env) {
 if(!env.SARIN_DB||typeof env.SARIN_DB.batch!=='function'||typeof env.SARIN_DB.prepare!=='function'
   ||!secret(env.SARIN_WHATSAPP_API_KEY)||!phone(env.SARIN_WHATSAPP_BUSINESS_PHONE)
   ||typeof env.SARIN_WHATSAPP_WABA_ID!=='string'||!/^[1-9]\d{0,31}$/.test(env.SARIN_WHATSAPP_WABA_ID)
   ||typeof env.SARIN_WHATSAPP_PILOT_PHONES!=='string'||env.SARIN_WHATSAPP_PILOT_PHONES.length>256)return null;
 let peers;try{peers=JSON.parse(env.SARIN_WHATSAPP_PILOT_PHONES);}catch{return null;}
 if(!Array.isArray(peers)||peers.length!==1||!peers.every(phone)||peers.includes(env.SARIN_WHATSAPP_BUSINESS_PHONE))return null;
 return {db:env.SARIN_DB,apiKey:env.SARIN_WHATSAPP_API_KEY,business:env.SARIN_WHATSAPP_BUSINESS_PHONE,wabaId:env.SARIN_WHATSAPP_WABA_ID,peer:/** @type {string} */(peers[0])};
}
/** @param {ProcessingEnv} env */
export function processingConfiguration(env) {
 const lookup=lookupConfiguration(env);
 if(!lookup||env.SARIN_WHATSAPP_REPLIES_ENABLED!=='true'||env.SARIN_WHATSAPP_SEND_ENABLED!=='true'
   ||!env.SARIN_WHATSAPP_QUEUE||typeof env.SARIN_WHATSAPP_QUEUE.send!=='function'
   ||!secret(env.DEEPSEEK_API_KEY)||!secret(env.SARIN_IP_SECRET)||env.SARIN_IP_SECRET.length<32)return null;
 const values=['SARIN_INPUT_PRICE_MICROS','SARIN_OUTPUT_PRICE_MICROS','SARIN_DAILY_BUDGET_MICROS','SARIN_MONTHLY_BUDGET_MICROS'].map(k=>{
  const v=env[k];return typeof v==='string'&&/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))?Number(v):0;
 });
 if(values.some(v=>v<=0)||values[2]>1000000||values[3]>10000000)return null;
 return {...lookup,aiKey:env.DEEPSEEK_API_KEY,identitySecret:env.SARIN_IP_SECRET,inputPrice:values[0],outputPrice:values[1],dailyMicros:values[2],monthlyMicros:values[3]};
}
/** @param {unknown} hint @returns {hint is WorkHint} */
export function validWorkHint(hint) {
 if(!hint||typeof hint!=='object'||Array.isArray(hint))return false;
 const h=/** @type {Record<string,unknown>} */(hint),random=/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
 return Object.keys(h).length===2&&typeof h.jobId==='string'&&random.test(h.jobId)&&typeof h.epoch==='string'&&random.test(h.epoch);
}
