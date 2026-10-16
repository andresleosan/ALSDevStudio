// @ts-check
/** @typedef {'website'|'store'|'application'|'chatbot'} Service */
/** @typedef {{role:'user'|'assistant',content:string}} ChatMessage */
/** @typedef {Partial<Record<'business'|'need'|'features'|'timeline'|'budget',string>>} Brief */
/** @typedef {{id:string,title:string,url:string,description:string}} Example */
/** @typedef {{reply:string,service?:Service,examples:Example[],brief:Brief}} SarinResponse */
const urls = new Map([
  ['bpt-jersey','https://www.bptjersey.com/'], ['sarinbotsaas','https://sarinbotsaas.pages.dev/'], ['semancontrol','https://semancontrol.pages.dev/'],
  ['mundocelular','https://mundocelular.vercel.app/'], ['coctelsops','https://coctelsops.vercel.app/'], ['laparada','https://laparada.pages.dev/'],
  ['field-hours','https://field-hours.vercel.app/'], ['dialon','https://dialon.pages.dev/'], ['vigia','https://vigiaapp.pages.dev/demo/']
]);
const services = new Set(['website','store','application','chatbot']);
const briefKeys = new Set(['business','need','features','timeline','budget']);
/** @param {unknown} value @param {number} max @param {boolean} [empty] @returns {value is string} */
const plain = (value, max, empty = false) => typeof value === 'string' && (empty || value.trim().length > 0) && value.length <= max && !/[<>\u0000]/.test(value);
/** @param {unknown} value @returns {value is Record<string,unknown>} */
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** @param {Record<string,unknown>} value @param {string[]} allowed */
const keys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));

/** Valida también respuestas del mismo origen: ningún contenido se interpreta como HTML.
 * @param {unknown} value @returns {SarinResponse} */
export function validateResponse(value) {
  /** @returns {never} */
  const invalid = () => { throw new Error('Respuesta no válida. Puedes contactar con Andrés.'); };
  if (!record(value) || !keys(value,['reply','service','examples','brief']) || !plain(value.reply,1200) ||
      (value.service !== undefined && (typeof value.service !== 'string' || !services.has(value.service))) || !Array.isArray(value.examples) || value.examples.length > 2 || !record(value.brief)) return invalid();
  if (Object.entries(value.brief).some(([key,text]) => !briefKeys.has(key) || !plain(text,240))) invalid();
  for (const example of value.examples) {
    if (!record(example) || !keys(example,['id','title','url','description']) || !plain(example.id,80) || !plain(example.title,180) || !plain(example.description,400)) invalid();
    try {
      if (typeof example.url !== 'string') return invalid();
      const url = new URL(example.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || urls.get(example.id) !== url.href) invalid();
    } catch { invalid(); }
  }
  return /** @type {SarinResponse} */ (/** @type {unknown} */ (value));
}

/** Una sola solicitud, sin reintentos. El historial contiene pares completos anteriores.
 * @param {string} message @param {ChatMessage[]} history
 * @param {{signal?:AbortSignal,fetchImpl?:typeof fetch,timeoutMs?:number}} [options] */
export async function requestSarin(message, history, {signal,fetchImpl = globalThis.fetch,timeoutMs = 35000} = {}) {
  if (!plain(message,1200) || !Array.isArray(history) || history.length > 8 || history.length % 2 ||
      history.some((entry,index) => !record(entry) || !keys(entry,['role','content']) || entry.role !== (index%2 ? 'assistant':'user') || !plain(entry.content,1200))) {
    throw new Error('Escribe un mensaje de 1 a 1200 caracteres.');
  }
  const body = JSON.stringify({message,history});
  if (new TextEncoder().encode(body).byteLength > 16384) throw new Error('La consulta es demasiado extensa. Acorta el mensaje o inicia una conversación nueva.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  let timedOut = false;
  const timeout = setTimeout(() => {timedOut = true; controller.abort();}, timeoutMs);
  try {
    const response = await fetchImpl('/api/sarin', {method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body,signal:controller.signal,credentials:'same-origin',cache:'no-store',redirect:'error'});
    if (!response.ok) {
      /** @type {Record<number,string>} */
      const messages = {429:'Alcanzamos el límite de consultas. Puedes continuar con Andrés.',503:'Sarin todavía no está conectado. Puedes contactar con Andrés.',504:'La respuesta tardó demasiado. Puedes contactar con Andrés.'};
      throw new Error(messages[response.status] || 'No pudimos obtener una respuesta. Puedes contactar con Andrés.');
    }
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Respuesta no válida. Puedes contactar con Andrés.');
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > 16384) throw new Error('Respuesta no válida. Puedes contactar con Andrés.');
    return validateResponse(JSON.parse(text));
  } catch (error) {
    if (timedOut) throw new Error('La respuesta tardó demasiado. Puedes contactar con Andrés.');
    if (error instanceof SyntaxError || error instanceof TypeError) throw new Error('No pudimos conectar con Sarin. Puedes contactar con Andrés.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort',abort);
  }
}
