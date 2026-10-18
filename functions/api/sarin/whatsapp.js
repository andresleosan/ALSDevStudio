// @ts-check
import { handleWhatsAppIngress } from '../../../server/sarin/whatsapp/ingress.js';

/** @param {{request:Request,env:Record<string,any>}} context */
export const onRequest = ({ request, env }) => handleWhatsAppIngress(request, env);
