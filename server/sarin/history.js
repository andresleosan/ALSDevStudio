// @ts-check
import { CATALOG } from './knowledge.js';

const DAY = 86400000;
const encoder = new TextEncoder();
const DEFAULTS = Object.freeze({ maxConversations: 2000, maxTextBytes: 64 * 1024 * 1024, maxReplyBytes: 16384,
  maxMessageBytes: 4800, maxTurns: 15, sessionPerMinute: 5, sessionPerDay: 20, maxEvents: 32, maxRejections: 10000 });
const STATES = ['empty', 'active', 'pending', 'completed', 'out_of_scope', 'error', 'timeout', 'blocked', 'reviewed', 'unreviewed'];
const SERVICES = ['website', 'store', 'application', 'chatbot'];
const CODES = ['invalid_request','body_too_large','context_too_large','session_invalid','session_expired','session_blocked',
  'request_conflict','turn_in_progress','turn_limit','history_capacity','session_rate_limit','history_unavailable',
  'history_config_invalid','rate_limit','budget_limit','quota_blocked','quota_unavailable','quota_config_invalid',
  'timeout','provider_error','invalid_output','unavailable','disabled','origin_denied','origin_rejected','method_not_allowed','unsupported_media_type'];
const TIMEOUT_BODY = Object.freeze({ error: { code: 'timeout', message: 'La solicitud superó el tiempo de espera.' } });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const closed = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const integer = (value, max = Number.MAX_SAFE_INTEGER, min = 0) => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const bytes = value => encoder.encode(value).byteLength;
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);

export class HistoryError extends Error {
  /** @param {number} status @param {string} code */
  constructor(status, code) { super(code); this.name = 'HistoryError'; this.status = status; this.code = code; }
}
const invalid = () => new HistoryError(400, 'invalid_request');
/** Traduce únicamente señales SQL propias; nunca devuelve mensajes arbitrarios de D1. */
function safeError(error) {
  if (error instanceof HistoryError) return error;
  const message = error instanceof Error ? error.message : '';
  const signals = { HISTORY_CAPACITY: [429,'history_capacity'], HISTORY_SESSION_RATE: [429,'session_rate_limit'],
    HISTORY_SESSION_INVALID: [401,'session_invalid'], HISTORY_SESSION_EXPIRED: [401,'session_expired'],
    HISTORY_SESSION_BLOCKED: [403,'session_blocked'], HISTORY_REQUEST_CONFLICT: [409,'request_conflict'],
    HISTORY_TURN_ACTIVE: [409,'turn_in_progress'], HISTORY_TURN_LIMIT: [429,'turn_limit'], HISTORY_RESPONSE_TOO_LARGE: [400,'invalid_request'],
    HISTORY_RESPONSE_METADATA: [400,'invalid_request'] };
  for (const [signal, [status, code]] of Object.entries(signals)) if (message.includes(signal)) return new HistoryError(Number(status), String(code));
  return new HistoryError(503, 'history_unavailable');
}

/**
 * @typedef {{bind:(...values:any[])=>Statement}} Statement
 * @typedef {{success:boolean,results:any[],meta?:{changes?:number}}} Result
 * @typedef {{prepare:(sql:string)=>Statement,batch:(statements:Statement[])=>Promise<Result[]>}} Database
 * @param {{db:Database,now?:()=>number,limits?:Partial<typeof DEFAULTS>}} options
 */
export function createHistoryStore({ db, now = () => Date.now(), limits = {} }) {
  const config = { ...DEFAULTS, ...limits };
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function' || typeof now !== 'function'
      || !closed(limits, Object.keys(DEFAULTS)) || Object.keys(DEFAULTS).some(key => !integer(config[key], DEFAULTS[key], 1))) {
    throw new HistoryError(503, 'history_config_invalid');
  }
  const stmt = (sql, ...values) => db.prepare(sql).bind(...values);
  const clock = () => { const at = now(); if (!integer(at, 8640000000000000 - 35 * DAY)) throw new HistoryError(503, 'history_config_invalid'); return at; };
  async function batch(statements) {
    const result = await db.batch(statements);
    if (!Array.isArray(result) || result.length !== statements.length || result.some(row => row?.success !== true || !Array.isArray(row.results))) throw new HistoryError(503, 'history_unavailable');
    return result;
  }
  const guarded = callback => async (...args) => { try { return await callback(...args); } catch (error) { throw safeError(error); } };
  const expireLeases = (at, limit = 100) => stmt(`UPDATE sarin_turns SET outcome = 'timeout',status_code = 504,finished_at = ?
    WHERE (conversation_id,request_id) IN (SELECT conversation_id,request_id FROM sarin_turns WHERE outcome = 'pending' AND lease_expires_at <= ? ORDER BY lease_expires_at LIMIT ?)`, at, at, limit);
  const summarySql = `SELECT c.*,
    COALESCE((SELECT SUM(r.reserved_micros) FROM sarin_turn_reservations tr JOIN sarin_reservations r ON r.id = tr.reservation_id WHERE tr.conversation_id = c.id),0) AS reserved_micros,
    COALESCE((SELECT SUM(r.actual_micros) FROM sarin_turn_reservations tr JOIN sarin_reservations r ON r.id = tr.reservation_id WHERE tr.conversation_id = c.id AND r.actual_micros IS NOT NULL),0) AS verified_micros,
    COALESCE((SELECT SUM(r.reserved_micros) FROM sarin_turn_reservations tr JOIN sarin_reservations r ON r.id = tr.reservation_id WHERE tr.conversation_id = c.id AND r.actual_micros IS NULL),0) AS retained_micros
    FROM sarin_conversations c`;
  function summary(row, at) {
    return { id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, expiresAt: row.expires_at,
      service: row.service, turns: row.turns, reviewedAt: row.reviewed_at, blockedUntil: row.blocked_until,
      status: row.blocked_until > at ? 'blocked' : row.status, outOfScopeCount: row.out_of_scope_count, errorCount: row.error_count,
      usage: { reservedMicros: row.reserved_micros, verifiedMicros: row.verified_micros, retainedMicros: row.retained_micros } };
  }
  function validateResponse(body, status, outcome) {
    if (!integer(status, 599, 200) || !['completed','out_of_scope','error','timeout'].includes(outcome) || !object(body)) throw invalid();
    const success = ['completed','out_of_scope'].includes(outcome);
    if (success) {
      if (status !== 200 || !closed(body, ['reply','service','examples','brief','conversationId','requestId','turn','expiresAt'])
          || !text(body.reply, 1200) || (body.service !== undefined && !SERVICES.includes(body.service))
          || !Array.isArray(body.examples) || body.examples.length > 2 || !closed(body.brief, ['business','need','features','timeline','budget'])
          || Object.values(body.brief).some(value => !text(value, 240))) throw invalid();
      const exampleIds = new Set();
      for (const item of body.examples) {
        if (!closed(item, ['id','title','url','description'])) throw invalid();
        const approved = CATALOG.find(example => example.id === item.id);
        if (!approved || exampleIds.has(item.id) || Object.entries(approved).some(([key, value]) => item[key] !== value)) throw invalid();
        exampleIds.add(item.id);
      }
    } else if (status < 400 || !closed(body, ['error','conversationId','requestId','turn','expiresAt'])
        || !closed(body.error, ['code','message']) || !CODES.includes(body.error.code) || !text(body.error.message, 240)) throw invalid();
    if ((body.conversationId !== undefined && !uuid(body.conversationId)) || (body.requestId !== undefined && !uuid(body.requestId))
        || (body.turn !== undefined && !integer(body.turn, 15, 1)) || (body.expiresAt !== undefined && !integer(body.expiresAt))) throw invalid();
    const serialized = JSON.stringify(body);
    if (bytes(serialized) > config.maxReplyBytes) throw invalid();
    return { serialized, content: success ? body.reply : body.error.message, service: success ? body.service ?? null : null };
  }
  return {
    createSession: guarded(async ({ tokenHash, identity, consent }) => {
      if (!hash(tokenHash) || !hash(identity) || !closed(consent, ['noticeVersion','privacyVersion','termsVersion','noticeHash','acceptedAt','method'])
          || !text(consent.noticeVersion, 100) || !text(consent.privacyVersion, 100) || !text(consent.termsVersion, 100)
          || !hash(consent.noticeHash) || consent.method !== 'checkbox_and_start') throw invalid();
      const at = clock(); const id = crypto.randomUUID();
      await batch([
        stmt('INSERT INTO sarin_session_commands(id,token_hash,at,identity,max_conversations,per_minute,per_day,max_events) VALUES (?,?,?,?,?,?,?,?)', id,tokenHash,at,identity,config.maxConversations,config.sessionPerMinute,config.sessionPerDay,config.maxEvents),
        stmt('INSERT INTO sarin_consents(conversation_id,notice_version,privacy_version,terms_version,notice_hash,accepted_at,method) VALUES (?,?,?,?,?,?,?)', id,consent.noticeVersion,consent.privacyVersion,consent.termsVersion,consent.noticeHash,at,'checkbox_and_start'),
      ]);
      return { conversationId: id, sessionExpiresAt: at + DAY };
    }),

    beginTurn: guarded(async ({ tokenHash, requestId, message }) => {
      if (!hash(tokenHash) || !uuid(requestId) || !text(message, 1200) || bytes(message) > config.maxMessageBytes) throw invalid();
      const at = clock();
      const result = await batch([
        // Recuperar primero al solicitante evita que un lote global lleno lo deje bloqueado.
        // El índice único limita esta actualización a un único turno pendiente.
        stmt(`UPDATE sarin_turns SET outcome = 'timeout',status_code = 504,finished_at = ?
          WHERE conversation_id IN (SELECT id FROM sarin_conversations WHERE token_hash = ?)
            AND outcome = 'pending' AND lease_expires_at <= ?`,at,tokenHash,at),
        expireLeases(at),
        stmt('INSERT INTO sarin_turn_commands(token_hash,request_id,message,at,max_turns,max_text_bytes,max_reply_bytes) VALUES (?,?,?,?,?,?,?)', tokenHash,requestId,message,at,config.maxTurns,config.maxTextBytes,config.maxReplyBytes),
        stmt(`SELECT c.id,c.expires_at,t.turn,t.outcome,t.response_body,t.status_code FROM sarin_conversations c JOIN sarin_turns t ON t.conversation_id = c.id WHERE c.token_hash = ? AND t.request_id = ?`,tokenHash,requestId),
        stmt(`SELECT t.message,t.response_text FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id WHERE c.token_hash = ? AND t.request_id != ? AND t.outcome IN ('completed','out_of_scope') ORDER BY t.turn DESC LIMIT 4`,tokenHash,requestId),
      ]);
      const row = result[3].results[0]; if (!row) throw new HistoryError(503, 'history_unavailable');
      const history = result[4].results.slice().reverse().flatMap(item => [{ role: 'user', content: item.message }, { role: 'assistant', content: item.response_text }]);
      return { conversationId: row.id,turn: row.turn,expiresAt: row.expires_at,history,
        ...(row.outcome !== 'pending' ? { replay: { status: row.status_code,body: row.response_body ? JSON.parse(row.response_body) : TIMEOUT_BODY } } : {}) };
    }),

    attachReservation: guarded(async ({ conversationId, requestId, reservationId }) => {
      if (!uuid(conversationId) || !uuid(requestId) || typeof reservationId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(reservationId)) throw invalid();
      const at = clock();
      const result = await batch([
        stmt(`INSERT INTO sarin_turn_reservations(conversation_id,request_id,reservation_id)
          SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id WHERE c.id = ? AND t.request_id = ? AND t.outcome = 'pending' AND t.lease_expires_at > ? AND c.expires_at > ?)
          AND EXISTS (SELECT 1 FROM sarin_reservations WHERE id = ? AND expires_at > ?)
          AND (SELECT COUNT(*) FROM sarin_turn_reservations WHERE conversation_id = ? AND request_id = ?) < 2
          ON CONFLICT(reservation_id) DO NOTHING`,conversationId,requestId,reservationId,conversationId,requestId,at,at,reservationId,at,conversationId,requestId),
        stmt('SELECT conversation_id,request_id FROM sarin_turn_reservations WHERE reservation_id = ?', reservationId),
      ]);
      const row = result[1].results[0];
      if (!row || row.conversation_id !== conversationId || row.request_id !== requestId) throw new HistoryError(503,'history_unavailable');
    }),

    finishTurn: guarded(async ({ tokenHash, requestId, body, status, outcome }) => {
      if (!hash(tokenHash) || !uuid(requestId)) throw invalid();
      const response = validateResponse(body,status,outcome); const at = clock();
      const result = await batch([
        stmt(`UPDATE sarin_turns SET outcome = ?,status_code = ?,response_body = ?,response_text = ?,service = ?,finished_at = ?
          WHERE request_id = ? AND outcome = 'pending' AND lease_expires_at > ? AND conversation_id IN (SELECT id FROM sarin_conversations WHERE token_hash = ? AND expires_at > ?) RETURNING request_id`,outcome,status,response.serialized,response.content,response.service,at,requestId,at,tokenHash,at),
      ]);
      return { applied: result[0].results.length === 1 };
    }),

    recordRejection: guarded(async ({ code }) => {
      if (!CODES.includes(code)) throw invalid(); const at = clock(); const minute = Math.floor(at / 60000);
      await batch([
        stmt(`INSERT INTO sarin_rejections(minute,code,count,expires_at) SELECT ?,?,1,? WHERE (SELECT COUNT(*) FROM sarin_rejections) < ? OR EXISTS (SELECT 1 FROM sarin_rejections WHERE minute = ? AND code = ?)
          ON CONFLICT(minute,code) DO UPDATE SET count = count + 1`,minute,code,at + 2 * DAY,config.maxRejections,minute,code),
        stmt(`UPDATE sarin_history_state SET rejection_overflow = rejection_overflow + 1 WHERE singleton = 1 AND NOT EXISTS (SELECT 1 FROM sarin_rejections WHERE minute = ? AND code = ?)`,minute,code),
      ]);
    }),

    listConversations: guarded(async (filters = {}) => {
      if (!closed(filters, ['limit','cursor','service','state','from','to'])) throw invalid();
      const { limit = 25,cursor,service,state,from,to } = filters;
      if (!integer(limit,50,1) || (service !== undefined && !SERVICES.includes(service)) || (state !== undefined && !STATES.includes(state))
          || (from !== undefined && !integer(from)) || (to !== undefined && !integer(to)) || (from !== undefined && to !== undefined && from > to)) throw invalid();
      const at = clock(); const where = ['c.expires_at > ?']; const values = [at];
      if (service) { where.push('c.service = ?'); values.push(service); }
      if (from !== undefined) { where.push('c.created_at >= ?'); values.push(from); }
      if (to !== undefined) { where.push('c.created_at <= ?'); values.push(to); }
      if (state === 'reviewed') where.push('c.reviewed_at IS NOT NULL');
      else if (state === 'unreviewed') where.push('c.reviewed_at IS NULL');
      else if (state === 'blocked') { where.push('c.blocked_until > ?'); values.push(at); }
      else if (state) { where.push('c.status = ? AND (c.blocked_until IS NULL OR c.blocked_until <= ?)'); values.push(state,at); }
      if (cursor !== undefined) {
        let decoded; try { if (typeof cursor !== 'string' || cursor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw invalid(); decoded = JSON.parse(atob(cursor.replace(/-/g,'+').replace(/_/g,'/'))); } catch { throw invalid(); }
        if (!Array.isArray(decoded) || decoded.length !== 2 || !integer(decoded[0]) || !uuid(decoded[1])) throw invalid();
        where.push('(c.updated_at < ? OR (c.updated_at = ? AND c.id < ?))'); values.push(decoded[0],decoded[0],decoded[1]);
      }
      const result = await batch([stmt(`${summarySql} WHERE ${where.join(' AND ')} ORDER BY c.updated_at DESC,c.id DESC LIMIT ?`,...values,limit + 1)]);
      const rows = result[0].results; const selected = rows.slice(0,limit); const last = selected.at(-1);
      return { items: selected.map(row => summary(row,at)),nextCursor: rows.length > limit && last ? btoa(JSON.stringify([last.updated_at,last.id])).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') : null };
    }),

    getConversation: guarded(async id => {
      if (!uuid(id)) throw invalid(); const at = clock();
      const result = await batch([
        stmt(`${summarySql} WHERE c.id = ? AND c.expires_at > ?`,id,at),
        stmt(`SELECT m.id,m.turn,m.role,m.content,m.at,m.status FROM sarin_messages m JOIN sarin_conversations c ON c.id = m.conversation_id WHERE c.id = ? AND c.expires_at > ? ORDER BY m.turn,m.role DESC`,id,at),
        stmt(`SELECT e.id,e.kind,e.at,e.count FROM sarin_events e JOIN sarin_conversations c ON c.id = e.conversation_id WHERE c.id = ? AND c.expires_at > ? ORDER BY e.at,e.id`,id,at),
        stmt(`SELECT s.notice_version AS noticeVersion,s.privacy_version AS privacyVersion,s.terms_version AS termsVersion,s.notice_hash AS noticeHash,s.accepted_at AS acceptedAt,s.method FROM sarin_consents s JOIN sarin_conversations c ON c.id = s.conversation_id WHERE c.id = ? AND c.expires_at > ?`,id,at),
      ]);
      const row = result[0].results[0]; if (!row) throw new HistoryError(404,'conversation_not_found');
      return { ...summary(row,at),messages: result[1].results.map(message => ({ ...message })),events: result[2].results.map(event => ({ ...event })),consent: { ...result[3].results[0] } };
    }),

    adminAction: guarded(async ({ id, action, actor }) => {
      if (!uuid(id) || !['review','block','unblock','delete'].includes(action) || !text(actor,254) || (!hash(actor) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actor))) throw invalid();
      const at = clock();
      // RETURNING confirma presencia dentro del mismo batch; el insert de auditoría precede al borrado.
      const mutation = action === 'review' ? 'reviewed_at = ?' : action === 'block' ? 'blocked_until = ?' : action === 'unblock' ? 'blocked_until = NULL' : 'updated_at = updated_at';
      const args = action === 'review' ? [at] : action === 'block' ? [at + DAY] : [];
      const operations = [
        stmt(`UPDATE sarin_conversations SET ${mutation} WHERE id = ? AND expires_at > ? RETURNING id`,...args,id,at),
        stmt(`INSERT INTO sarin_admin_audit(id,conversation_id,actor,action,result,at,expires_at) SELECT ?,?,?,?,'ok',?,? WHERE EXISTS (SELECT 1 FROM sarin_conversations WHERE id = ? AND expires_at > ?)`,crypto.randomUUID(),id,actor,action,at,at + 30 * DAY,id,at),
      ];
      if (action === 'delete') operations.push(stmt('DELETE FROM sarin_conversations WHERE id = ? AND expires_at > ?',id,at));
      else operations.push(stmt('INSERT INTO sarin_event_commands(id,conversation_id,kind,at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM sarin_conversations WHERE id = ? AND expires_at > ?)',crypto.randomUUID(),id,action,at,id,at));
      const result = await batch(operations);
      if (!result[0].results.length) throw new HistoryError(404,'conversation_not_found');
      return { ok: true };
    }),

    purge: guarded(async ({ limit = 100 } = {}) => {
      if (!integer(limit,500,1)) throw invalid(); const at = clock();
      try {
        const result = await batch([
          expireLeases(at,limit),
          stmt('DELETE FROM sarin_conversations WHERE id IN (SELECT id FROM sarin_conversations WHERE expires_at <= ? AND started_at IS NULL ORDER BY expires_at LIMIT ?) RETURNING id',at,limit),
          stmt('DELETE FROM sarin_conversations WHERE id IN (SELECT id FROM sarin_conversations WHERE expires_at <= ? AND started_at IS NOT NULL ORDER BY expires_at LIMIT ?) RETURNING id',at,limit),
          stmt('DELETE FROM sarin_rejections WHERE (minute,code) IN (SELECT minute,code FROM sarin_rejections WHERE expires_at <= ? ORDER BY expires_at LIMIT ?) RETURNING code',at,limit),
          stmt('DELETE FROM sarin_admin_audit WHERE id IN (SELECT id FROM sarin_admin_audit WHERE expires_at <= ? ORDER BY expires_at LIMIT ?) RETURNING id',at,limit),
          stmt('DELETE FROM sarin_counters WHERE key IN (SELECT key FROM sarin_counters WHERE expires_at <= ? ORDER BY expires_at LIMIT ?) RETURNING key',at,limit),
          stmt('DELETE FROM sarin_reservations WHERE id IN (SELECT id FROM sarin_reservations WHERE expires_at <= ? ORDER BY expires_at LIMIT ?) RETURNING id',at,limit),
          stmt(`UPDATE sarin_history_state SET last_run_at = ?,last_success_at = ?,purge_status = 'ok',purge_remaining =
            EXISTS (SELECT 1 FROM sarin_conversations WHERE expires_at <= ?) OR EXISTS (SELECT 1 FROM sarin_rejections WHERE expires_at <= ?)
            OR EXISTS (SELECT 1 FROM sarin_admin_audit WHERE expires_at <= ?) OR EXISTS (SELECT 1 FROM sarin_counters WHERE expires_at <= ?)
            OR EXISTS (SELECT 1 FROM sarin_reservations WHERE expires_at <= ?) OR EXISTS (SELECT 1 FROM sarin_turns WHERE outcome = 'pending' AND lease_expires_at <= ?) WHERE singleton = 1 RETURNING purge_remaining`,at,at,at,at,at,at,at,at),
        ]);
        return { sessions: result[1].results.length,conversations: result[2].results.length,rejections: result[3].results.length,
          audits: result[4].results.length,counters: result[5].results.length,reservations: result[6].results.length,remaining: result[7].results[0]?.purge_remaining === 1 };
      } catch (error) {
        try { await batch([stmt("UPDATE sarin_history_state SET last_run_at = ?,last_error_at = ?,purge_status = 'error' WHERE singleton = 1",at,at)]); } catch { /* Sin trazas con detalles internos. */ }
        throw error;
      }
    }),

    getPurgeStatus: guarded(async () => {
      const result = await batch([stmt('SELECT last_run_at,last_success_at,last_error_at,purge_status,purge_remaining FROM sarin_history_state WHERE singleton = 1')]);
      const row = result[0].results[0]; if (!row) throw new HistoryError(503,'history_unavailable');
      return { lastRunAt: row.last_run_at,lastSuccessAt: row.last_success_at,lastErrorAt: row.last_error_at,status: row.purge_status,remaining: row.purge_remaining === 1 };
    }),
  };
}
