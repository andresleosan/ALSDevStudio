// @ts-check
import { processWhatsAppWork, dispatchWhatsAppWork } from '../../server/sarin/whatsapp/processor.js';
import { reconcileWhatsAppWork } from '../../server/sarin/whatsapp/reconciliation.js';
import {processWhatsAppHandoff} from '../../server/sarin/whatsapp/handoff-processor.js';
/** @typedef {import('../../server/sarin/whatsapp/processing-config.js').ProcessingEnv} ProcessingEnv */
/** Dependencias internas para pruebas; ningún parámetro procede de HTTP.
 * @param {import('../../server/sarin/whatsapp/processor.js').Options} [options] */
export function createWhatsAppWorker(options={}) {return {
 /** @param {{messages:Array<{body:unknown,attempts:number,ack:()=>void,retry:(options:{delaySeconds:number})=>void}>}} batch @param {ProcessingEnv} env */
 async queue(batch,env) {
  // Un lote mal configurado tampoco puede multiplicar trabajo en una invocación.
  for(const message of batch.messages.slice(1))message.retry({delaySeconds:60});
  const message=batch.messages[0];if(!message)return;
  try{const result=await processWhatsAppWork(message.body,env,options);if(result.status==='retry'&&message.attempts<=3)message.retry({delaySeconds:60});else message.ack();}
  catch{if(message.attempts<=3)message.retry({delaySeconds:60});else message.ack();}
 },
 /** @param {unknown} controller @param {ProcessingEnv} env */
 async scheduled(controller,env){
  const abort=new AbortController();
  /** @type {ReturnType<typeof setTimeout>|undefined} */let timer;
  const deadline=new Promise(resolve=>{timer=setTimeout(()=>{abort.abort();resolve(undefined);},60000);});
  const work=async()=>{await dispatchWhatsAppWork(env,options);if(!abort.signal.aborted)await processWhatsAppHandoff(env,{now:options.now,fetch:options.fetch,signal:abort.signal});
    if(!abort.signal.aborted)await reconcileWhatsAppWork(env,{...options,signal:abort.signal});};
  try{await Promise.race([work(),deadline]);}finally{clearTimeout(timer);}
 },
};}
export default createWhatsAppWorker();
