// @ts-check
import { handleWhatsAppIngress } from '../../../server/sarin/whatsapp/ingress.js';
/** @param {{request:Request,env:import('../../../server/sarin/whatsapp/processing-config.js').ProcessingEnv,waitUntil:(promise:Promise<unknown>)=>void}} context */
export const onRequest = context => handleWhatsAppIngress(context.request, context.env, {
 notifyWork: hint => {
  const queue=context.env.SARIN_WHATSAPP_QUEUE;
  if(queue)context.waitUntil(queue.send(hint).catch(()=>{}));
 },
});
