// @ts-check
import { authenticateSarinAdmin, AdminError, adminError, adminResponse } from './access.js';
import { readBoundedJson } from './policy.js';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SERVICES = ['website', 'store', 'application', 'chatbot'];
const STATES = ['empty', 'active', 'pending', 'completed', 'out_of_scope', 'error', 'timeout', 'blocked', 'reviewed', 'unreviewed'];
const ACTIONS = ['review', 'block', 'unblock', 'delete'];
const encoder = new TextEncoder();
const CSRF_LIFETIME = 15 * 60;
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const actorId = async admin => hex(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify([admin.subject, admin.email]))));
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
function unb64(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new AdminError(403, 'csrf_rejected');
  try { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)); }
  catch { throw new AdminError(403, 'csrf_rejected'); }
}
const csrfKey = secret => crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
async function createCsrf(secret, admin, now) {
  const value = b64(encoder.encode(JSON.stringify({ v: 1, actor: await actorId(admin), iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + CSRF_LIFETIME, nonce: crypto.randomUUID() })));
  return `${value}.${b64(await crypto.subtle.sign('HMAC', await csrfKey(secret), encoder.encode(value)))}`;
}
async function verifyCsrf(token, secret, admin, now) {
  if (typeof token !== 'string' || token.length > 1024) throw new AdminError(403, 'csrf_rejected');
  const parts = token.split('.');
  if (parts.length !== 2) throw new AdminError(403, 'csrf_rejected');
  let payload;
  try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(unb64(parts[0]))); }
  catch { throw new AdminError(403, 'csrf_rejected'); }
  const seconds = Math.floor(now / 1000);
  if (!payload || payload.v !== 1 || payload.actor !== await actorId(admin)
      || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)
      || payload.iat > seconds || payload.exp <= seconds || payload.exp - payload.iat !== CSRF_LIFETIME
      || typeof payload.nonce !== 'string' || !UUID.test(payload.nonce)
      || !await crypto.subtle.verify('HMAC', await csrfKey(secret), unb64(parts[1]), encoder.encode(parts[0]))) throw new AdminError(403, 'csrf_rejected');
}
const project = (value, fields) => Object.fromEntries(fields.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
const summary = value => ({ ...project(value, ['id', 'createdAt', 'updatedAt', 'expiresAt', 'service', 'turns', 'reviewedAt', 'blockedUntil', 'status', 'outOfScopeCount', 'errorCount']), usage: project(value?.usage, ['reservedMicros', 'verifiedMicros', 'retainedMicros']) });
function detail(value) {
  return { ...summary(value),
    messages: (value.messages || []).map(message => project(message, ['id', 'turn', 'role', 'content', 'at', 'status'])),
    events: (value.events || []).map(event => project(event, ['id', 'kind', 'at', 'count'])),
    consent: project(value.consent, ['acceptedAt', 'noticeVersion', 'privacyVersion', 'termsVersion', 'noticeHash', 'method']),
  };
}
function filters(params) {
  const value = { limit: 25 };
  const allowed = ['limit', 'cursor', 'service', 'state', 'from', 'to'];
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) throw new AdminError(400, 'invalid_filters');
  for (const [key, raw] of params) {
    if (key === 'limit') {
      if (!/^[1-9]\d?$/.test(raw) || Number(raw) > 50) throw new AdminError(400, 'invalid_filters');
      value.limit = Number(raw);
    } else if (key === 'service' || key === 'state') {
      if (!(key === 'service' ? SERVICES : STATES).includes(raw)) throw new AdminError(400, 'invalid_filters');
      value[key] = raw;
    } else if (key === 'cursor') {
      if (!/^[A-Za-z0-9_-]{1,512}$/.test(raw)) throw new AdminError(400, 'invalid_filters');
      value.cursor = raw;
    } else {
      if (!/^(?:0|[1-9]\d{0,15})$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 8640000000000000) throw new AdminError(400, 'invalid_filters');
      value[key] = Number(raw);
    }
  }
  if (value.from !== undefined && value.to !== undefined && value.from > value.to) throw new AdminError(400, 'invalid_filters');
  return value;
}

/**
 * Solo options internas; la petición nunca puede inyectar store/reloj.
 * @param {Request} request
 * @param {Record<string, any>} env
 * @param {{now?:()=>number, store?:any}} [options]
 */
export async function handleSarinAdmin(request, env, options = {}) {
  try {
    const admin = await authenticateSarinAdmin(request, env, options);
    const url = new URL(request.url);
    if (!['GET', 'POST'].includes(request.method)) throw new AdminError(405, 'method_not_allowed');
    const match = /^\/api\/control-sarin\/(bootstrap|conversations)(?:\/([^/]+))?\/?$/.exec(url.pathname);
    if (!match || (match[1] === 'bootstrap' && match[2]) || (match[2] && !UUID.test(match[2]))) throw new AdminError(404, 'not_found');
    if (request.method === 'POST' && (match[1] !== 'conversations' || !match[2])) throw new AdminError(405, 'method_not_allowed');
    if ((match[1] === 'bootstrap' || match[2]) && url.search) throw new AdminError(400, 'invalid_filters');
    const now = (options.now || Date.now)();
    const query = request.method === 'GET' && match[1] === 'conversations' && !match[2] ? filters(url.searchParams) : undefined;
    // No dependencia de DeepSeek, cuotas IP ni secretos de inferencia.
    if (!options.store && typeof env.SARIN_DB?.prepare !== 'function') throw new AdminError(503, 'unavailable');
    const store = options.store || (await import('./history.js')).createHistoryStore({ db: env.SARIN_DB, now: options.now });
    if (request.method === 'GET') {
      if (match[1] === 'bootstrap') {
        const purge = await store.getPurgeStatus();
        return adminResponse({ csrfToken: await createCsrf(env.SARIN_ADMIN_CSRF_SECRET, admin, now), adminEmail: admin.email,
          purge: project(purge, ['lastRunAt', 'lastSuccessAt', 'lastErrorAt', 'status', 'remaining']) });
      }
      if (match[2]) {
        const conversation = await store.getConversation(match[2].toLowerCase());
        if (!conversation) throw new AdminError(404, 'not_found');
        return adminResponse(detail(conversation));
      }
      const result = await store.listConversations(query);
      return adminResponse({ items: result.items.map(summary), nextCursor: result.nextCursor ?? null });
    }
    if (request.headers.get('Origin') !== url.origin) throw new AdminError(403, 'origin_rejected');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') || '') || request.headers.has('Content-Encoding')) throw new AdminError(400, 'invalid_request');
    await verifyCsrf(request.headers.get('X-Sarin-CSRF'), env.SARIN_ADMIN_CSRF_SECRET, admin, now);
    const length = request.headers.get('Content-Length');
    if (length && (!/^\d+$/.test(length) || Number(length) > 256)) throw new AdminError(413, 'body_too_large');
    let body;
    try { body = await readBoundedJson(request.body, 256, request.signal); }
    catch (error) { throw new AdminError(error?.status === 413 ? 413 : 400, error?.status === 413 ? 'body_too_large' : 'invalid_request'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !ACTIONS.includes(body.action)) throw new AdminError(400, 'invalid_request');
    await store.adminAction({ id: match[2].toLowerCase(), action: body.action, actor: await actorId(admin) });
    return adminResponse({ ok: true });
  } catch (error) {
    // Solo códigos de dominio conocidos. Nunca devolver mensajes SQL o tokens.
    if (!(error instanceof AdminError) && error?.code === 'conversation_not_found' && error?.status === 404) return adminError(new AdminError(404, 'not_found'));
    if (!(error instanceof AdminError) && ['invalid_filters', 'invalid_request'].includes(error?.code) && error?.status === 400) return adminError(new AdminError(400, 'invalid_filters'));
    return adminError(error);
  }
}
