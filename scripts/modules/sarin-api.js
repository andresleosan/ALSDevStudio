// @ts-check
import {NOTICE_VERSION,PRIVACY_VERSION,TERMS_VERSION} from './sarin-consent.js';
/** @typedef {'website'|'store'|'application'|'chatbot'} Service */
/** @typedef {{role:'user'|'assistant',content:string}} ChatMessage */
/** @typedef {Partial<Record<'business'|'need'|'features'|'timeline'|'budget',string>>} Brief */
/** @typedef {{id:string,title:string,url:string,description:string}} Example */
/** @typedef {{reply:string,service?:Service,examples:Example[],brief:Brief,conversationId?:string,requestId?:string,turn?:number,expiresAt?:number}} SarinResponse */
/** @typedef {{signal?:AbortSignal,fetchImpl?:typeof fetch,timeoutMs?:number,privateTest?:boolean}} RequestOptions */
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
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
  if (!record(value) || !keys(value,['reply','service','examples','brief','conversationId','requestId','turn','expiresAt']) || !plain(value.reply,1200) ||
      (value.service !== undefined && (typeof value.service !== 'string' || !services.has(value.service))) || !Array.isArray(value.examples) || value.examples.length > 2 || !record(value.brief)) return invalid();
  if (['conversationId','requestId'].some(key=>value[key] !== undefined && (typeof value[key] !== 'string' || !uuid.test(/** @type {string} */(value[key])))) ||
      (value.turn !== undefined && (!Number.isInteger(value.turn) || Number(value.turn)<1 || Number(value.turn)>15)) ||
      (value.expiresAt !== undefined && (!Number.isSafeInteger(value.expiresAt) || Number(value.expiresAt)<=0))) return invalid();
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

/** Una sola solicitud, sin reintentos ni historial aportado por el navegador.
 * @param {string} message @param {string} requestId
 * @param {RequestOptions} [options] */
export async function requestSarin(message, requestId, {signal,fetchImpl = globalThis.fetch,timeoutMs = 35000,privateTest = false} = {}) {
  if (!plain(message,1200) || typeof requestId !== 'string' || !uuid.test(requestId)) {
    throw new Error('Escribe un mensaje de 1 a 1200 caracteres.');
  }
  const body = JSON.stringify({message,requestId});
  if (new TextEncoder().encode(body).byteLength > 16384) throw new Error('La consulta es demasiado extensa. Acorta el mensaje o inicia una conversación nueva.');
  return validateResponse(await send(privateTest?'/api/control-sarin/test/message':'/api/sarin',body,{signal,fetchImpl,timeoutMs,privateTest}));
}

/** Crea la sesión únicamente tras la acción explícita de autorización de la interfaz.
 * @param {RequestOptions} [options] */
export async function createSarinSession(options = {}) {
  const body=JSON.stringify({consent:{accepted:true,noticeVersion:NOTICE_VERSION,privacyVersion:PRIVACY_VERSION,termsVersion:TERMS_VERSION}});
  const value=await send(options.privateTest?'/api/control-sarin/test/session':'/api/sarin/session',body,options);
  if (!record(value) || !keys(value,['conversationId','sessionExpiresAt']) || typeof value.conversationId !== 'string' || !uuid.test(value.conversationId) || !Number.isSafeInteger(value.sessionExpiresAt) || Number(value.sessionExpiresAt)<=0) throw new Error('No pudimos iniciar la conversación. Puedes contactar con Andrés.');
  return /** @type {{conversationId:string,sessionExpiresAt:number}} */(/** @type {unknown} */(value));
}

/** Solo comprueba el acceso; no crea una sesión ni conserva el token en el navegador.
 * @param {RequestOptions} [options] */
export async function checkSarinPrivateTest(options={}) {
  privateAccess(await send('/api/control-sarin/bootstrap',undefined,{...options,privateTest:false}));
}

/** @param {unknown} value @returns {string} */
function privateAccess(value) {
  if(!record(value) || value.privateTestEnabled!==true || typeof value.csrfToken!=='string' || !/^[A-Za-z0-9._~-]{16,4096}$/.test(value.csrfToken) || !plain(value.adminEmail,320)) {
    throw new Error('La prueba privada no está disponible. Comprueba tu acceso en la administración de Sarin.');
  }
  return value.csrfToken;
}

/** @param {Response} response @returns {Promise<unknown>} */
async function readResponse(response) {
  if (!response.ok) {
    /** @type {Record<number,string>} */
    const messages = {401:'La sesión venció o ya no es válida. Inicia una nueva conversación o contacta con Andrés.',403:'Esta sesión está bloqueada temporalmente. Puedes contactar con Andrés.',409:'Hay una consulta en curso o una solicitud en conflicto. Espera antes de continuar; puedes contactar con Andrés.',410:'Esta conversación venció o fue eliminada. Inicia una nueva conversación o contacta con Andrés.',429:'Alcanzamos el límite de consultas. Puedes continuar con Andrés.',503:'Sarin todavía no está conectado. Puedes contactar con Andrés.',504:'La respuesta tardó demasiado. Puedes contactar con Andrés.'};
    const error = new Error(messages[response.status] || 'No pudimos obtener una respuesta. Puedes contactar con Andrés.');
    Object.assign(error,{status:response.status}); throw error;
  }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Respuesta no válida. Puedes contactar con Andrés.');
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > 16384) throw new Error('Respuesta no válida. Puedes contactar con Andrés.');
  return JSON.parse(text);
}

/** @param {string} url @param {string|undefined} body @param {RequestOptions} [options] @returns {Promise<unknown>} */
async function send(url,body,{signal,fetchImpl=globalThis.fetch,timeoutMs=35000,privateTest=false}={}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  let timedOut = false;
  const timeout = setTimeout(() => {timedOut = true; controller.abort();}, timeoutMs);
  try {
    /** @type {RequestInit} */
    const common={signal:controller.signal,credentials:'same-origin',cache:'no-store',redirect:'error'};
    /** @type {Record<string,string>} */
    const headers={'Accept':'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(privateTest){
      controller.signal.throwIfAborted();
      const bootstrap=await fetchImpl('/api/control-sarin/bootstrap',{...common,method:'GET',headers:{'Accept':'application/json'}});
      headers['X-Sarin-CSRF']=privateAccess(await readResponse(bootstrap));
    }
    controller.signal.throwIfAborted();
    return await readResponse(await fetchImpl(url,{...common,method:body===undefined?'GET':'POST',headers,body}));
  } catch (error) {
    if (timedOut) throw new Error('La respuesta tardó demasiado. Puedes contactar con Andrés.');
    if((privateTest || url==='/api/control-sarin/bootstrap') && error instanceof Error && 'status' in error && [401,403].includes(Number(error.status))) {
      error.message='Tu acceso a la prueba privada venció o no está autorizado. Abre la administración de Sarin y vuelve a intentarlo.';
    }
    if (error instanceof SyntaxError || error instanceof TypeError) throw new Error('No pudimos conectar con Sarin. Puedes contactar con Andrés.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort',abort);
  }
}
