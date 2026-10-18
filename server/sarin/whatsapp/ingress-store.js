// @ts-check
import { createWhatsAppWorkStore, WhatsAppWorkError } from './work-store.js';
import {WHATSAPP_NOTICE_VERSION} from './consent.js';
import { closed, integer, WhatsAppIngressError, normalizeWhatsAppMessage as normalize, digestWhatsApp as digest } from './ingress-identity.js';
export { WhatsAppIngressError } from './ingress-identity.js';
const DAY = 86400000;
const encoder = new TextEncoder();
/** @typedef {{maxInboxRows:number,maxReceipts:number,maxBytes:number,maxPeers:number,perMinute:number,perDay:number,globalPerMinute:number,globalPerDay:number}} Limits */
/** @type {Readonly<Limits>} */
const DEFAULTS = Object.freeze({ maxInboxRows: 10000, maxReceipts: 20000, maxBytes: 8 * 1024 * 1024,
  maxPeers: 10, perMinute: 10, perDay: 50, globalPerMinute: 60, globalPerDay: 1000 });
/** @param {unknown} error */
function safeError(error) {
  if (error instanceof WhatsAppIngressError) return error;
  if (error instanceof WhatsAppWorkError && error.code === 'work_capacity') return new WhatsAppIngressError(429, 'ingress_capacity');
  if (error instanceof WhatsAppWorkError && error.code === 'work_conflict') return new WhatsAppIngressError(409, 'event_conflict');
  const message = error instanceof Error ? error.message : '';
  const signals = { WA_CONFLICT: [409,'event_conflict'], WA_CAPACITY: [429,'ingress_capacity'],
    WA_RATE: [429,'ingress_rate_limit'], WA_STALE: [409,'stale_event'] };
  for (const [signal, [status, code]] of Object.entries(signals)) {
    if (message.includes(signal)) return new WhatsAppIngressError(Number(status), String(code));
  }
  return new WhatsAppIngressError(503, 'ingress_unavailable');
}
/**
 * @typedef {{bind:(...values:any[])=>Statement}} Statement
 * @typedef {{success:boolean,results:any[],meta?:{changes?:number}}} Result
 * @typedef {{prepare:(sql:string)=>Statement,batch:(statements:Statement[])=>Promise<Result[]>}} Database
 */
/**
 * Sentencias para incorporar a UNA transacción de recuperación de todo el sistema.
 * El llamante debe confirmar mantenimiento y drenaje antes de ejecutarlas.
 * Nunca toca cuotas, reservas monetarias o transcripciones web. El piso incluye
 * cinco minutos de cuarentena para cubrir el desfase futuro admitido antes del restore.
 * @param {{db:Database,at:number}} options
 * @returns {Statement[]}
 */
export function getWhatsAppRecoveryStatements({ db, at }) {
  if (!integer(at) || !db || typeof db.prepare !== 'function') throw new WhatsAppIngressError(400, 'invalid_request');
  return [db.prepare(`UPDATE sarin_wa_state SET inbox_rows = (SELECT COUNT(*) FROM sarin_wa_inbox),
    receipt_rows = (SELECT COUNT(*) FROM sarin_wa_receipts),
    content_bytes = COALESCE((SELECT SUM(stored_bytes) FROM sarin_wa_inbox),0) WHERE id = 1`),
    db.prepare('DELETE FROM sarin_wa_inbox'), db.prepare('DELETE FROM sarin_wa_receipts'),
    db.prepare('DELETE FROM sarin_wa_peers'),
    db.prepare(`UPDATE sarin_wa_state SET inbox_rows = 0, receipt_rows = 0, content_bytes = 0,
      paused_all = 1, replay_floor_at = MAX(replay_floor_at,?), last_purge_at = ?, purge_remaining = 0 WHERE id = 1`).bind(at + 300000, at)];
}

export { normalize as normalizeWhatsAppMessage, digest as digestWhatsApp };
/** Ausencia de 0005 es compatible; errores de consulta nunca se ignoran.
 * @param {{db:Database,now?:()=>number,repliesEnabled?:boolean}} options */
export async function getWhatsAppReplyStore({db,now=Date.now,repliesEnabled}) {
  const results=await db.batch([db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sarin_wa_pilot'")]);
  if(results.length!==1||results[0].success!==true||!Array.isArray(results[0].results))throw new WhatsAppIngressError(503,'ingress_unavailable');
  if(!results[0].results.length)return null;
  const store=createWhatsAppWorkStore({db,now});
  if(repliesEnabled===false)await store.suspendReplies();
  return store;
}
/** @param {{db:Database,now?:()=>number,limits?:Partial<Limits>,repliesEnabled?:boolean,publicMode?:boolean}} options */
export function createWhatsAppIngressStore({ db, now = () => Date.now(), limits = {}, repliesEnabled, publicMode = false }) {
  const maximum = { ...DEFAULTS, maxPeers: publicMode === true ? 1000 : DEFAULTS.maxPeers };
  const config = { ...maximum, ...limits };
  const keys = /** @type {(keyof Limits)[]} */ (Object.keys(DEFAULTS));
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function' || typeof now !== 'function'
      || typeof publicMode !== 'boolean' || !closed(limits, keys) || keys.some(key => !integer(config[key], maximum[key], 1))) {
    throw new WhatsAppIngressError(503, 'ingress_config_invalid');
  }
  /** @param {string} sql @param {...unknown} values */
  const stmt = (sql, ...values) => db.prepare(sql).bind(...values);
  const clock = () => { const at = now(); if (!integer(at)) throw new WhatsAppIngressError(503, 'ingress_config_invalid'); return at; };
  /** @param {Statement[]} statements */
  async function batch(statements) {
    const result = await db.batch(statements);
    if (!Array.isArray(result) || result.length !== statements.length || result.some(row => row?.success !== true || !Array.isArray(row.results))) {
      throw new WhatsAppIngressError(503, 'ingress_unavailable');
    }
    return result;
  }
  /** @template {unknown[]} A @template R @param {(...args:A)=>Promise<R>} callback @returns {(...args:A)=>Promise<R>} */
  const guarded = callback => async (...args) => { try { return await callback(...args); } catch (error) { throw safeError(error); } };
  return {
    capture: guarded(/** @param {unknown} event @returns {Promise<{status:'captured'|'duplicate',eventId:string}>} */ async event => {
      const at = clock(); const normalized = normalize(event, at);
      const replies=await getWhatsAppReplyStore({db,now,repliesEnabled});
      // Commit separado: una captura rechazada no revierte la pausa.
      if(replies)await replies.observeControl({event,autoStart:publicMode&&repliesEnabled===true});
      const business = normalized.kind === 'inbound' ? normalized.to : normalized.from;
      const peer = normalized.kind === 'inbound' ? normalized.from : normalized.to;
      const facts = [normalized.kind,normalized.messageId,normalized.wamid,normalized.wabaId,
        normalized.from,normalized.to,normalized.sentAt,normalized.mediaType,normalized.text,...(normalized.audio?[normalized.audio]:[]),...(normalized.choice?[normalized.choice]:[])];
      const [peerKey, messageKey, messageHash, eventHash] = await Promise.all([
        digest('sarin-wa-peer-v1', [normalized.wabaId,business,peer]),
        digest('sarin-wa-message-v1', [normalized.kind,normalized.wabaId,business,normalized.wamid]),
        digest('sarin-wa-facts-v1', facts), digest('sarin-wa-event-v1', [normalized.eventId,normalized.createdAt,...facts]),
      ]);
      const token = crypto.randomUUID();
      const storedText = normalized.kind === 'inbound' ? normalized.text : null;
      // El cobro incluye la representación UTF-8 de todos los datos durables del inbox;
      // los topes de filas cubren además índices, recibos y overhead de SQLite.
      const storedBytes = encoder.encode(JSON.stringify([normalized.eventId,peerKey,normalized.kind,'captured',
        normalized.messageId,normalized.wamid,normalized.wabaId,business,peer,normalized.mediaType,storedText,
        normalized.createdAt,normalized.sentAt,at,at + DAY])).byteLength;
      // Con 0005, el INSERT del inbox admite el trabajo mediante trigger en esta
      // misma transacción. Con 0004 conserva exclusivamente la recepción.
      const result = await batch([
        stmt(`INSERT INTO sarin_wa_capture(event_id,event_hash,message_key,message_hash,peer_key,kind,admission_token,
          message_id,wamid,waba_id,business_phone,peer_phone,media_type,text,created_at,sent_at,received_at,stored_bytes,
          max_inbox,max_receipts,max_bytes,max_peers,per_minute,per_day,global_minute,global_day,minute_start,day_start)
          VALUES(${Array(28).fill('?').join(',')})`, normalized.eventId,eventHash,messageKey,messageHash,peerKey,normalized.kind,token,
        normalized.messageId,normalized.wamid,normalized.wabaId,business,peer,normalized.mediaType,storedText,
        normalized.createdAt,normalized.sentAt,at,storedBytes,config.maxInboxRows,config.maxReceipts,config.maxBytes,
        config.maxPeers,config.perMinute,config.perDay,config.globalPerMinute,config.globalPerDay,
        Math.floor(at / 60000) * 60000,Math.floor(at / DAY) * DAY),
        stmt('SELECT event_id,canonical_event_id,admission_token FROM sarin_wa_receipts WHERE event_id = ?', normalized.eventId),
        ...(replies&&normalized.kind==='inbound'&&normalized.mediaType==='audio'?[stmt(`INSERT INTO sarin_wa_audio(event_id,descriptor,created_at,expires_at)
          SELECT i.event_id,CASE WHEN c.accepted_at<i.sent_at AND c.accepted_at<i.received_at AND c.consent_expires_at>?
            AND c.consent_version=? AND EXISTS(SELECT 1 FROM sarin_wa_consent_proofs p WHERE p.acceptance_event_id=c.acceptance_event_id
              AND p.conflict=0 AND p.version=c.consent_version AND p.expires_at>? AND p.consent_expires_at>?) THEN ? ELSE NULL END,i.received_at,i.expires_at
          FROM sarin_wa_inbox i JOIN sarin_wa_contexts c ON c.peer_key=i.peer_key WHERE i.event_id=? ON CONFLICT DO NOTHING`,
          at,WHATSAPP_NOTICE_VERSION,at,at,normalized.audio?JSON.stringify(normalized.audio):null,normalized.eventId)]:[]),
      ]);
      const row = result[1].results[0];
      if (!row || row.event_id !== normalized.eventId || typeof row.admission_token !== 'string') throw new WhatsAppIngressError(503, 'ingress_unavailable');
      if(replies)await replies.reconcileConsent({peerKey});
      return { status: row.canonical_event_id === null && row.admission_token === token ? 'captured' : 'duplicate',
        eventId: row.canonical_event_id ?? row.event_id };
    }),
    purge: guarded(/** @param {{limit?:number}} [options] */ async ({ limit = 100 } = {}) => {
      if (!integer(limit, 500, 1)) throw new WhatsAppIngressError(400, 'invalid_request');
      const at = clock();
      const pendingSql = `SELECT EXISTS(SELECT 1 FROM sarin_wa_inbox WHERE expires_at <= ?)
        OR EXISTS(SELECT 1 FROM sarin_wa_receipts WHERE expires_at <= ?)
        OR EXISTS(SELECT 1 FROM sarin_wa_peers WHERE expires_at <= ?) AS remaining`;
      const result = await batch([
        stmt('DELETE FROM sarin_wa_inbox WHERE event_id IN (SELECT event_id FROM sarin_wa_inbox WHERE expires_at <= ? ORDER BY expires_at,event_id LIMIT ?) RETURNING event_id', at,limit),
        stmt('DELETE FROM sarin_wa_receipts WHERE event_id IN (SELECT event_id FROM sarin_wa_receipts WHERE expires_at <= ? ORDER BY expires_at,event_id LIMIT ?) RETURNING event_id', at,limit),
        stmt('DELETE FROM sarin_wa_peers WHERE peer_key IN (SELECT peer_key FROM sarin_wa_peers WHERE expires_at <= ? ORDER BY expires_at,peer_key LIMIT ?) RETURNING peer_key', at,limit),
        stmt(`UPDATE sarin_wa_state SET last_purge_at = ?, purge_remaining = (${pendingSql}) WHERE id = 1`, at,at,at,at),
        stmt(pendingSql, at,at,at),
      ]);
      // RETURNING mide filas propias, independientemente de los writes de triggers.
      const counts = result.slice(0,3).map(row => row.results.length);
      if (counts.some(count => count > limit)) throw new WhatsAppIngressError(503, 'ingress_unavailable');
      const remaining = result[4].results[0]?.remaining;
      if (remaining !== 0 && remaining !== 1) throw new WhatsAppIngressError(503, 'ingress_unavailable');
      return { inbox: counts[0], receipts: counts[1], peers: counts[2], remaining: remaining === 1 };
    }),
    recover: guarded(/** @param {{at?:number,maintenanceConfirmed?:boolean,requestsDrained?:boolean}} [options] */ async ({ at, maintenanceConfirmed, requestsDrained } = {}) => {
      if (maintenanceConfirmed !== true || requestsDrained !== true) throw new WhatsAppIngressError(503, 'maintenance_required');
      const current = clock();
      if (at !== undefined && !integer(at)) throw new WhatsAppIngressError(400, 'invalid_request');
      const result = await batch([
        stmt(`SELECT (SELECT COUNT(*) FROM sarin_wa_inbox) AS inbox,
          (SELECT COUNT(*) FROM sarin_wa_receipts) AS receipts,(SELECT COUNT(*) FROM sarin_wa_peers) AS peers`),
        ...getWhatsAppRecoveryStatements({ db, at: Math.max(current, at ?? current) }),
      ]);
      const counts = result[0].results[0];
      if (!counts || !['inbox','receipts','peers'].every(key => integer(counts[key]))) throw new WhatsAppIngressError(503, 'ingress_unavailable');
      return { ...counts, budgetReconciliationRequired: true };
    }),
  };
}
