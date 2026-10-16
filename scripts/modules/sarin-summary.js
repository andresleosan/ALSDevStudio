// @ts-check
/** @type {Record<string,string>} */
const labels = {business:'Negocio',need:'Necesidad',features:'Funciones prioritarias',timeline:'Plazo',budget:'Presupuesto (opcional)'};
/** @type {Record<string,string>} */
const services = {website:'Página web',store:'Tienda virtual',application:'Aplicación a medida',chatbot:'Chatbot'};

/** Prepara un borrador, sin presentar lo inferido como información confirmada.
 * @param {{messages?:import('./sarin-api.js').ChatMessage[],brief?:Record<string,string|undefined>,service?:string}} [options] */
export function createSummary({messages = [], brief = {}, service} = {}) {
  const shared = messages.filter(message => message.role === 'user').map(message => message.content);
  if (!shared.length && !Object.keys(brief).length) return '';
  const lines = ['Hola Andrés, quisiera conversar sobre mi proyecto.'];
  if (shared.length) lines.push('', 'Lo que compartí:', ...shared.map(content => `• ${content}`));
  if (Object.keys(brief).length) {
    lines.push('', 'Borrador de Sarin para revisar y corregir:');
    for (const [key,label] of Object.entries(labels)) if (brief[key]) lines.push(`${label}: ${brief[key]}`);
  }
  if (service && services[service]) lines.push('', `Solución sugerida por Sarin (por confirmar): ${services[service]}`);
  lines.push('', 'Quiero revisar el alcance y la cotización contigo.');
  return lines.join('\n');
}

/** El visitante decide enviar el texto desde WhatsApp. Nunca se trunca. @param {string} text */
export function whatsappUrl(text) {
  if (typeof text !== 'string' || text.length > 1800) throw new Error('Corrige el resumen: máximo 1800 caracteres.');
  return `https://wa.me/573146432135${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
