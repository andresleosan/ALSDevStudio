// @ts-check
export const WHATSAPP_NOTICE_VERSION = 'whatsapp-service-2026-10-18-v2';
export const WHATSAPP_NOTICE = 'Hola, soy Sarin, el asistente de IA de ALS Dev Studio. Puedo orientarte sobre páginas web, tiendas virtuales, aplicaciones y chatbots. WhatsApp/Meta y YCloud transportan los mensajes y Cloudflare aloja el servicio. Si aceptas, autorizas el tratamiento internacional de tus mensajes y contexto reciente por estos proveedores y DeepSeek para responderte. ALS Dev Studio conserva el contenido hasta 24 horas y recibos técnicos mínimos hasta 48 horas; estos plazos no cubren el almacenamiento de los proveedores. No compartas contraseñas ni datos sensibles. Más información: https://www.alsdevstudio.com/privacidad.html#whatsapp. Escribe ACEPTO para autorizar y continuar, HUMANO para solicitar atención de Andrés o STOP para detener a Sarin.';
export const WHATSAPP_ACCEPTED = 'Gracias por aceptar. Cuéntame qué necesita tu negocio y te orientaré sobre los servicios de ALS Dev Studio. Puedes escribir HUMANO para solicitar atención de Andrés o STOP para detener a Sarin.';
/** @param {{mediaType:string,text?:string|null}} input @returns {'accept'|'stop'|'human'|'text'|'media'} */
export function classifyWhatsAppInput({mediaType,text}) {
  if(mediaType!=='text')return 'media';
  const normalized=(text??'').trim().replace(/\s+/gu,' ').toUpperCase();
  if(normalized==='ACEPTO')return 'accept';
  if(['STOP','PARAR','NO ACEPTO'].includes(normalized))return 'stop';
  return normalized==='HUMANO'?'human':'text';
}
