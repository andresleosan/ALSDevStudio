// @ts-check
export const WHATSAPP_NOTICE_VERSION = 'whatsapp-pilot-v1';
export const WHATSAPP_NOTICE = 'Soy Sarin, el asistente de IA de ALS DevStudio. Esta es una prueba privada: usa sólo datos ficticios. WhatsApp/Meta y YCloud transportan los mensajes; si aceptas, DeepSeek procesará tus consultas para responder sobre servicios de ALS. ALS conserva el contenido de esta prueba hasta 24 horas; cada proveedor aplica sus propias condiciones. Más información: https://www.alsdevstudio.com/privacidad.html#whatsapp-piloto. Escribe ACEPTO para probar o HUMANO para que te atienda Andrés';
export const WHATSAPP_ACCEPTED = 'Gracias por aceptar. Cuéntame qué proyecto tienes en mente para ALS DevStudio. Puedes escribir HUMANO para que te atienda Andrés.';
/** @param {{mediaType:string,text?:string|null}} input @returns {'accept'|'stop'|'human'|'text'|'media'} */
export function classifyWhatsAppInput({mediaType,text}) {
  if(mediaType!=='text')return 'media';
  const normalized=(text??'').trim().replace(/\s+/gu,' ').toUpperCase();
  if(normalized==='ACEPTO')return 'accept';
  if(['STOP','PARAR','NO ACEPTO'].includes(normalized))return 'stop';
  return normalized==='HUMANO'?'human':'text';
}
