// @ts-check
const DAY = 86400000;
const MAX_TIME = 8640000000000000 - 2 * DAY;
const encoder = new TextEncoder();
/** @typedef {{maxInboxRows:number,maxReceipts:number,maxBytes:number,maxPeers:number,perMinute:number,perDay:number,globalPerMinute:number,globalPerDay:number}} Limits */
/** @type {Readonly<Limits>} */
const DEFAULTS = Object.freeze({ maxInboxRows: 10000, maxReceipts: 20000, maxBytes: 8 * 1024 * 1024,
  maxPeers: 10, perMinute: 10, perDay: 50, globalPerMinute: 60, globalPerDay: 1000 });
const FIELDS = ['kind','eventId','createdAt','messageId','wamid','wabaId','from','to','sentAt','mediaType','text'];
/** @param {unknown} value @returns {value is Record<string,any>} */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value @param {string[]} keys @returns {value is Record<string,any>} */
const closed = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
/** @param {unknown} value @param {number} [max] @param {number} [min] @returns {value is number} */
const integer = (value, max = MAX_TIME, min = 0) => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
/** @param {unknown} value @param {number} [max] @returns {value is string} */
const id = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && /^[\x21-\x7e]+$/.test(value);
/** @param {unknown} value @returns {value is string} */
const phone = value => typeof value === 'string' && /^\+[1-9]\d{1,14}$/.test(value);

export class WhatsAppIngressError extends Error {
  /** @param {number} status @param {string} code */
  constructor(status, code) { super(code); this.name = 'WhatsAppIngressError'; this.status = status; this.code = code; }
}
/** @param {unknown} error */
function safeError(error) {
  if (error instanceof WhatsAppIngressError) return error;
  const message = error instanceof Error ? error.message : '';
  const signals = { WA_CONFLICT: [409,'event_conflict'], WA_CAPACITY: [429,'ingress_capacity'],
    WA_RATE: [429,'ingress_rate_limit'], WA_STALE: [409,'stale_event'] };
  for (const [signal, [status, code]] of Object.entries(signals)) {
    if (message.includes(signal)) return new WhatsAppIngressError(Number(status), String(code));
  }
  return new WhatsAppIngressError(503, 'ingress_unavailable');
}
/** Sólo copia campos normalizados; nunca conserva el objeto ni payload original.
 * @param {unknown} event @param {number} at */
function normalize(event, at) {
  if (!closed(event, FIELDS) || !['inbound','echo'].includes(event.kind) || !id(event.eventId)
      || !id(event.messageId) || !id(event.wamid, 512) || typeof event.wabaId !== 'string' || !/^[1-9]\d{0,31}$/.test(event.wabaId)
      || !phone(event.from) || !phone(event.to) || !integer(event.createdAt) || !integer(event.sentAt)
      || event.createdAt > at + 300000 || event.sentAt > at + 300000
      || typeof event.mediaType !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(event.mediaType)
      || (event.mediaType === 'text' && (typeof event.text !== 'string' || !event.text.trim()
        || event.text.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(event.text)))
      || (event.mediaType !== 'text' && event.text !== undefined)) {
    throw new WhatsAppIngressError(400, 'invalid_event');
  }
  return { kind: event.kind, eventId: event.eventId, createdAt: event.createdAt, messageId: event.messageId,
    wamid: event.wamid, wabaId: event.wabaId, from: event.from, to: event.to, sentAt: event.sentAt,
    mediaType: event.mediaType, text: event.mediaType === 'text' ? event.text : null };
}
/** @param {string} domain @param {unknown[]} values */
async function digest(domain, values) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify([domain, ...values]))));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
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

/** @param {{db:Database,now?:()=>number,limits?:Partial<Limits>}} options */
export function createWhatsAppIngressStore({ db, now = () => Date.now(), limits = {} }) {
  const config = { ...DEFAULTS, ...limits };
  const keys = /** @type {(keyof Limits)[]} */ (Object.keys(DEFAULTS));
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function' || typeof now !== 'function'
      || !closed(limits, keys) || keys.some(key => !integer(config[key], DEFAULTS[key], 1))) {
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
      const business = normalized.kind === 'inbound' ? normalized.to : normalized.from;
      const peer = normalized.kind === 'inbound' ? normalized.from : normalized.to;
      const facts = [normalized.kind,normalized.messageId,normalized.wamid,normalized.wabaId,
        normalized.from,normalized.to,normalized.sentAt,normalized.mediaType,normalized.text];
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
      ]);
      const row = result[1].results[0];
      if (!row || row.event_id !== normalized.eventId || typeof row.admission_token !== 'string') throw new WhatsAppIngressError(503, 'ingress_unavailable');
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
