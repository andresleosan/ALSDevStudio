// @ts-check
import { pseudonymizeIp } from './quota.js';
import { SarinError, readBoundedJson } from './policy.js';
import { NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION, NOTICE_TEXT } from '../../scripts/modules/sarin-consent.js';

export const SESSION_COOKIE = '__Host-sarin-session';
export const PUBLIC_HEADERS = Object.freeze({
  'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY', 'X-Robots-Tag':'noindex, nofollow',
});
const MESSAGES = {
  400:'Revisa tu consulta o acorta el contexto. Puedes contactar con Andrés.',
  401:'Inicia una conversación y autoriza el tratamiento antes de enviar. Puedes contactar con Andrés.',
  403:'No se puede continuar esta conversación. Revisa la autorización o contacta con Andrés.',
  405:'Usa POST para enviar tu consulta.',
  409:'Hay una consulta pendiente o el identificador ya se usó. Espera antes de volver a enviar.',
  410:'Esta conversación ya no está disponible. Puedes iniciar otra o contactar con Andrés.',
  413:'La consulta es demasiado extensa.',
  429:'Alcanzaste el límite del chat. Puedes contactar con Andrés.',
  502:'No pudimos validar la respuesta. Puedes contactar con Andrés.',
  503:'Sarin todavía no está disponible. Puedes contactar con Andrés.',
  504:'La espera terminó. Puedes contactar con Andrés.',
};
const CODES = new Set(['invalid_request','consent_required','origin_rejected','method_not_allowed','body_too_large',
  'session_required','session_invalid','session_expired','session_blocked','request_conflict','turn_in_progress',
  'turn_limit','history_capacity','session_rate_limit','history_unavailable','config_invalid','rate_limit',
  'budget_limit','quota_blocked','quota_unavailable','quota_config_invalid','unavailable','timeout',
  'provider_error','invalid_output','invalid_usage','context_too_large','conversation_expired']);

export function publicResponse(body, status=200, headers={}) {
  return new Response(JSON.stringify(body), {status,headers:{...PUBLIC_HEADERS,...headers}});
}
export function publicFailure(error) {
  const status = Object.hasOwn(MESSAGES,error?.status) ? Number(error.status) : 503;
  const code = CODES.has(error?.code) ? error.code : status===429 ? 'rate_limit' : 'unavailable';
  return {status,body:{error:{code,message:MESSAGES[status]}}};
}
export function ensureHistoryConfiguration(env) {
  if (env.SARIN_ENABLED!=='true' || env.SARIN_HISTORY_ENABLED!=='true'
      || typeof env.SARIN_DB?.prepare!=='function' || typeof env.SARIN_DB?.batch!=='function'
      || typeof env.SARIN_IP_SECRET!=='string' || env.SARIN_IP_SECRET.length<32 || env.SARIN_IP_SECRET.length>4096) {
    throw new SarinError(503,'unavailable');
  }
}
/** Valida cabeceras antes de consumir el cuerpo o persistir información. */
export function validatePost(request) {
  if(request.method!=='POST')throw new SarinError(405,'method_not_allowed');
  if(request.headers.get('Origin')!==new URL(request.url).origin)throw new SarinError(403,'origin_rejected');
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type')||'') || request.headers.has('Content-Encoding'))throw new SarinError(400,'invalid_request');
  const length=request.headers.get('Content-Length');
  if(length&&(!/^\d+$/.test(length)||Number(length)>16384))throw new SarinError(413,'body_too_large');
}
export async function hashText(text) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),value=>value.toString(16).padStart(2,'0')).join('');
}
export function readSessionToken(request) {
  const cookie=request.headers.get('Cookie')||'';
  if(cookie.length>8192)throw new SarinError(401,'session_invalid');
  const values=cookie.split(';').map(x=>x.trim()).filter(x=>x.startsWith(`${SESSION_COOKIE}=`));
  if(values.length!==1)throw new SarinError(401,'session_required');
  const value=values[0].slice(SESSION_COOKIE.length+1);
  if(!/^[a-f0-9]{64}$/.test(value))throw new SarinError(401,'session_invalid');
  return value;
}
export async function requestIdentity(request,env,now) {
  let ip=request.headers.get('CF-Connecting-IP');
  if(!ip&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname))ip='127.0.0.1';
  return pseudonymizeIp(ip,env.SARIN_IP_SECRET,now);
}
/** La sustitución de almacén solo procede del código de pruebas, nunca de HTTP/env. */
export async function historyStore(env,options={}) {
  if(options.store)return options.store;
  const {createHistoryStore}=await import('./history.js');
  return createHistoryStore({db:env.SARIN_DB,now:options.now});
}
export async function handleSarinSession(request,env,options={}) {
  try {
    validatePost(request);
    const body=await readBoundedJson(request.body,16384,request.signal);
    if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).length!==1 || !Object.hasOwn(body,'consent'))throw new SarinError(400,'invalid_request');
    const consent=body.consent;
    if(!consent || typeof consent!=='object' || Array.isArray(consent)
        || Object.keys(consent).length!==4 || !Object.keys(consent).every(k=>['accepted','noticeVersion','privacyVersion','termsVersion'].includes(k)))throw new SarinError(403,'consent_required');
    if(consent.accepted!==true || consent.noticeVersion!==NOTICE_VERSION || consent.privacyVersion!==PRIVACY_VERSION || consent.termsVersion!==TERMS_VERSION)throw new SarinError(403,'consent_required');
    ensureHistoryConfiguration(env);
    if(request.signal.aborted)throw new SarinError(504,'timeout');
    const now=(options.now||Date.now)();
    const identity=await requestIdentity(request,env,now);
    const store=await historyStore(env,options);
    const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),value=>value.toString(16).padStart(2,'0')).join('');
    const result=await store.createSession({tokenHash:await hashText(token),identity,consent:{
      noticeVersion:NOTICE_VERSION,privacyVersion:PRIVACY_VERSION,termsVersion:TERMS_VERSION,
      noticeHash:await hashText(NOTICE_TEXT),acceptedAt:now,method:'checkbox_and_start',
    }});
    return publicResponse(result,200,{'Set-Cookie':`${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`});
  } catch(error) {
    const failure=publicFailure(error);
    return publicResponse(failure.body,failure.status,failure.status===405?{Allow:'POST'}:{});
  }
}
