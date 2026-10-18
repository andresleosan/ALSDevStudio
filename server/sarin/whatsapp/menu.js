// @ts-check
import {WHATSAPP_NOTICE} from './consent.js';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
// Copias cerradas de los avisos v3 aprobados: sólo compatibilidad de botones
// existentes. La generación nueva siempre usa WHATSAPP_NOTICE.
const LEGACY_PREFIX='Hola, soy Sarin, el asistente de IA de ALS Dev Studio. Puedo orientarte sobre páginas web, tiendas virtuales, aplicaciones y chatbots. WhatsApp/Meta y YCloud transportan los mensajes; Cloudflare aloja el servicio y convierte los audios en texto con Whisper. Si aceptas, autorizas el tratamiento internacional de tus mensajes, audios y contexto reciente por estos proveedores; DeepSeek recibe el texto para responderte. ALS Dev Studio conserva el contenido hasta 24 horas y recibos técnicos mínimos hasta 48 horas; estos plazos no cubren el almacenamiento de los proveedores. No compartas contraseñas ni datos sensibles. Más información: https://www.alsdevstudio.com/privacidad.html#whatsapp. ';
const LEGACY_NOTICES=Object.freeze([
 {text:LEGACY_PREFIX+'Elige Aceptar (1) para autorizar, Hablar con Andrés (2) para atención humana o Salir (3) para detener a Sarin. También puedes escribir ACEPTO, HUMANO o STOP. Si ya enviaste un audio, reenvíalo después de aceptar.',hash:'4ed1af437ea34c63cb5cbdb1a29e7dd15980bbfe037ca64f9af748210b0bb397',numeric:true},
 {text:LEGACY_PREFIX+'Escribe ACEPTO para autorizar y continuar, HUMANO para solicitar atención de Andrés o STOP para detener a Sarin. Si ya enviaste un audio, reenvíalo después de aceptar.',hash:'a9fc8f86ffd3b5757bb9ec385cfd44c0be531212b0546513114d85a4d043ba60',numeric:false},
]);
/** No admite variantes aportadas por mensajes, Queue o base de datos.
 * @returns {Promise<Array<{text:string,hash:string,numeric:boolean}>>} */
export async function approvedWhatsAppNotices() {
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(WHATSAPP_NOTICE))),b=>b.toString(16).padStart(2,'0')).join('');
 return [{text:WHATSAPP_NOTICE,hash,numeric:false},...LEGACY_NOTICES.map(notice=>({...notice}))];
}
/** Cota UTF-16 del transporte sin partir grafemas ni truncar en mitad de emoji.
 * @param {string} text */
export function limitWhatsAppBody(text) {
 if(text.length<=1024)return text;
 let bounded='';
 for(const {segment} of new Intl.Segmenter('es',{granularity:'grapheme'}).segment(text)) {
  if(bounded.length+segment.length>1023)break;
  bounded+=segment;
 }
 return bounded.trimEnd()+'…';
}
/** @typedef {{outboxId:string,action:'accept'|'human'|'stop'}} WhatsAppMenuChoice */
/** @param {string} outboxId @param {'notice'|'accepted'|'reply'} [purpose] */
export function createWhatsAppMenuButtons(outboxId,purpose='notice') {
 if(typeof outboxId!=='string'||!UUID.test(outboxId)||!['notice','accepted','reply'].includes(purpose))throw new TypeError('invalid_menu_reference');
 return [
  ...(purpose==='notice'?[{id:`sarin.menu.v1:accept:${outboxId}`,title:'Aceptar'}]:[]),
  {id:`sarin.menu.v1:human:${outboxId}`,title:'Hablar con Andrés'},
  {id:`sarin.menu.v1:stop:${outboxId}`,title:'Salir'},
 ];
}
/** @param {unknown} id @returns {WhatsAppMenuChoice|null} */
export function parseWhatsAppMenuReply(id) {
 if(typeof id!=='string')return null;
 const match=/^sarin\.menu\.v1:(accept|human|stop):([a-f0-9-]{36})$/.exec(id);
 if(!match||!UUID.test(match[2]))return null;
 return {outboxId:match[2],action:/** @type {WhatsAppMenuChoice['action']} */(match[1])};
}
