// @ts-check
export const WHATSAPP_NOTICE_VERSION = 'whatsapp-service-2026-10-18-v3';
export const WHATSAPP_NOTICE = 'Hola, soy Sarin, el asistente de IA de ALS Dev Studio. Puedo orientarte sobre páginas web, tiendas virtuales, aplicaciones y chatbots. WhatsApp/Meta y YCloud transportan los mensajes; Cloudflare aloja el servicio y convierte los audios en texto con Whisper. Si aceptas, autorizas el tratamiento internacional de tus mensajes, audios y contexto reciente por estos proveedores; DeepSeek recibe el texto para responderte. ALS Dev Studio conserva el contenido hasta 24 horas y los recibos operativos hasta 48 horas. Para controlar costos conserva hasta 13 meses importes, fechas y una huella del identificador del mensaje, sin contenido ni número. Estos plazos no cubren a los proveedores. No compartas contraseñas ni datos sensibles. Más información: https://www.alsdevstudio.com/privacidad.html#whatsapp. Usa los botones: Aceptar para autorizar, Hablar con Andrés para atención humana o Salir para detener a Sarin. Si ya enviaste un audio, reenvíalo después de aceptar.';
export const WHATSAPP_ACCEPTED = 'Gracias por aceptar. Para identificar tu consulta, puedes escribir tu nombre y apellido por texto: NOMBRE: Ana Pérez. Es opcional; también puedes contarme qué necesita tu negocio o enviar una nota de voz de hasta 2 minutos. Si enviaste un audio antes de aceptar, vuelve a enviarlo. Usa los botones Hablar con Andrés para solicitar atención o Salir para detener a Sarin.';
/** @param {{mediaType:string,text?:string|null}} input @returns {'accept'|'stop'|'human'|'text'|'audio'|'media'} */
export function classifyWhatsAppInput({mediaType,text}) {
  if(mediaType==='audio')return 'audio';
  if(mediaType!=='text')return 'media';
  const normalized=(text??'').trim().replace(/\s+/gu,' ').toUpperCase();
  if(normalized==='ACEPTO')return 'accept';
  if(['STOP','PARAR','SALIR','NO ACEPTO'].includes(normalized))return 'stop';
  return normalized==='HUMANO'?'human':'text';
}
