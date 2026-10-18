// @ts-check
/** @typedef {{kind:'none'}|{kind:'invalid'}|{kind:'valid',fullName:string}} ProfileInput */
const unsafe=/[\p{C}\p{Zl}\p{Zp}<>]/u;
const namePattern=/^\p{L}[\p{L}\p{M} .'’ʼ‐‑·-]*$/u;
export const WHATSAPP_PROFILE_SAVED='Gracias. Tu nombre quedó asociado a esta consulta durante la vigencia del mensaje. Cuéntame qué necesita tu negocio; también puedes enviar una nota de voz. Usa Hablar con Andrés para atención humana o Salir para detener a Sarin.';
export const WHATSAPP_PROFILE_INVALID='Escribe tu nombre y apellido por texto con el formato NOMBRE: Ana Pérez (máximo 160 caracteres). Es opcional: también puedes continuar con tu consulta. Usa Hablar con Andrés para atención humana o Salir para detener a Sarin.';
/** El prefijo explícito evita adivinar identidad a partir de una consulta o audio.
 * No verifica la identidad ni separa nombres y apellidos compuestos.
 * @param {unknown} text @returns {ProfileInput} */
export function parseWhatsAppProfileInput(text) {
 if(typeof text!=='string'||!/^\s*NOMBRE\s*:/iu.test(text))return {kind:'none'};
 if(text.length>1024||unsafe.test(text))return {kind:'invalid'};
 const fullName=text.replace(/^\s*NOMBRE\s*:/iu,'').normalize('NFC').trim().replace(/\p{Zs}+/gu,' ');
 const components=fullName.split(' ');
 if(fullName.length>160||!namePattern.test(fullName)||components.length<2||!components.every(part=>/\p{L}/u.test(part)))return {kind:'invalid'};
 return {kind:'valid',fullName};
}
