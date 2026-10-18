// @ts-check
import { classifyWhatsAppInput, WHATSAPP_NOTICE_VERSION, WHATSAPP_NOTICE } from './consent.js';
import { normalizeWhatsAppMessage, digestWhatsApp } from './ingress-identity.js';
import {parseWhatsAppProfileInput,WHATSAPP_PROFILE_SAVED,WHATSAPP_PROFILE_INVALID} from './profile.js';
import {approvedWhatsAppNotices,limitWhatsAppBody} from './menu.js';
/** @typedef {import('./work-contracts.js').Work} Work */
/** @typedef {import('./work-contracts.js').SendPermit} SendPermit */
/** @typedef {import('./work-contracts.js').DeliveryObservation} DeliveryObservation */
/** @typedef {import('./work-contracts.js').WorkErrorCode} WorkErrorCode */
/** @typedef {import('./ingress-store.js').Database} Database */
const DAY = 86400000, LEASE = 120000;
/** @typedef {{maxOutboxRows:number,maxOutboxBytes:number,dailyAttempts:number,monthlyAttempts:number}} WorkLimits */
/** @type {Readonly<WorkLimits>} */
const DEFAULTS = Object.freeze({ maxOutboxRows: 1000, maxOutboxBytes: 4194304, dailyAttempts: 20, monthlyAttempts: 100 });
const encoder = new TextEncoder();
/** @param {unknown} v */
const id = v => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,256}$/.test(v);
/** @param {unknown} v @param {number} [max] */
const providerId=(v,max=256)=>typeof v==='string'&&v.length>0&&v.length<=max&&/^[\x21-\x7e]+$/.test(v);
/** @param {unknown} v */
const phone=v=>typeof v==='string'&&/^\+[1-9]\d{1,14}$/.test(v);
/** @param {unknown} v */
const randomId = v => typeof v === 'string' && /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(v);
/** @param {unknown} v */
const integer = v => Number.isSafeInteger(v) && Number(v)>=0 && Number(v)<8640000000000000-2*DAY;
export class WhatsAppWorkError extends Error {
  /** @param {number} status @param {WorkErrorCode} code */
  constructor(status, code) { super(code); this.name='WhatsAppWorkError'; this.status=status; this.code=code; }
}
/** @param {unknown} test @param {WorkErrorCode} [code] @param {number} [status] */
function requireThat(test, code='invalid_request', status=400) { if (!test) throw new WhatsAppWorkError(status,code); }
// Estas condiciones se reevalúan dentro del commit que autoriza cada fase.
const LIVE = `p.enabled=1 AND p.epoch=j.epoch AND c.context_id=j.context_id AND c.revision=j.peer_revision
  AND c.paused=0 AND j.expires_at>t.at AND i.expires_at>t.at AND c.last_inbound_at>t.at-86400000
  AND i.sent_at>MAX(c.activation_at,p.activation_at) AND i.created_at>MAX(c.activation_at,p.activation_at)`;
const CONSENT_EVIDENCE = `c.accepted_at IS NOT NULL AND c.consent_version='${WHATSAPP_NOTICE_VERSION}'
  AND c.acceptance_event_id IS NOT NULL AND EXISTS(SELECT 1 FROM sarin_wa_consent_proofs n
    WHERE n.acceptance_event_id=c.acceptance_event_id AND n.notice_id=c.consent_notice_id AND n.peer_key=c.peer_key
      AND n.accepted_at=c.accepted_at AND n.consent_expires_at=c.consent_expires_at AND n.expires_at>t.at
      AND n.version=c.consent_version AND n.hash=c.consent_hash AND n.conflict=0)`;
const CONSENT_PROOF = `(${CONSENT_EVIDENCE}) AND c.consent_expires_at>t.at`;
const CONSENT = `(${CONSENT_PROOF}) AND c.accepted_at<i.sent_at AND c.accepted_at<i.received_at AND c.acceptance_event_id<>j.event_id AND j.input_kind='text'`;
const CONFIRM = `(${CONSENT_PROOF}) AND c.acceptance_event_id=j.event_id`;
const FROM = `FROM sarin_wa_jobs j JOIN sarin_wa_inbox i ON i.event_id=j.event_id
  JOIN sarin_wa_contexts c ON c.peer_key=j.peer_key CROSS JOIN sarin_wa_pilot p CROSS JOIN (SELECT ? AS at) t`;
const UNBLOCKED = `NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.peer_key=j.peer_key AND o.context_id=j.context_id
  AND o.job_id<>j.job_id AND o.state NOT IN('delivered','read','cancelled','expired'))
  AND (j.deferred_reason IS NULL OR (j.deferred_reason='waiting_consent' AND ((${CONSENT}) OR (${CONFIRM})))
    OR (j.deferred_reason='waiting_notice' AND EXISTS(SELECT 1 FROM sarin_wa_outbox n WHERE n.context_id=j.context_id AND n.purpose='notice' AND n.delivered_at IS NOT NULL))
    OR j.deferred_reason='waiting_delivery')`;

// Proyección privada de Staff: datos de contacto sólo mientras su fuente siga vigente.
// No acredita consentimiento sólo por una fecha ni conserva una agenda permanente.
// El fragmento requiere el contexto c y un único reloj t.at para lista y detalle.
const PEER_SUMMARY = `c.peer_key,c.paused,c.revision,c.context_id,c.last_inbound_at,
  COALESCE((SELECT CASE WHEN length(i.peer_phone)>=7 THEN '*** '||substr(i.peer_phone,-4) ELSE '***' END
    FROM sarin_wa_inbox i WHERE i.peer_key=c.peer_key AND i.expires_at>t.at
    ORDER BY i.received_at DESC,i.event_id DESC LIMIT 1),'***') AS masked_phone,
  (SELECT i.peer_phone FROM sarin_wa_inbox i WHERE i.peer_key=c.peer_key AND i.expires_at>t.at
    ORDER BY i.received_at DESC,i.event_id DESC LIMIT 1) AS phone,
  (SELECT i.expires_at FROM sarin_wa_inbox i WHERE i.peer_key=c.peer_key AND i.expires_at>t.at
    ORDER BY i.received_at DESC,i.event_id DESC LIMIT 1) AS phone_expires_at,
  (SELECT f.full_name FROM sarin_wa_profiles f JOIN sarin_wa_inbox i ON i.event_id=f.source_event_id
    WHERE f.peer_key=c.peer_key AND i.peer_key=c.peer_key AND f.expires_at>t.at AND i.expires_at>t.at) AS full_name,
  (SELECT f.expires_at FROM sarin_wa_profiles f JOIN sarin_wa_inbox i ON i.event_id=f.source_event_id
    WHERE f.peer_key=c.peer_key AND i.peer_key=c.peer_key AND f.expires_at>t.at AND i.expires_at>t.at) AS name_expires_at,
  MAX(c.activation_at,c.last_inbound_at,
    COALESCE((SELECT MAX(v.observed_at) FROM sarin_wa_control_events v WHERE v.peer_key=c.peer_key),0),
    COALESCE((SELECT MAX(MAX(o.created_at,COALESCE(o.started_at,0),COALESCE(o.delivered_at,0),COALESCE(o.reconcile_updated_at,0)))
      FROM sarin_wa_outbox o WHERE o.peer_key=c.peer_key),0)) AS updated_at,
  CASE WHEN (${CONSENT_EVIDENCE}) THEN CASE WHEN c.consent_expires_at>t.at THEN 'accepted' ELSE 'expired' END
    WHEN c.paused=1 AND c.accepted_at IS NULL AND EXISTS(SELECT 1 FROM sarin_wa_control_events v
      WHERE v.peer_key=c.peer_key AND v.context_id=c.context_id AND v.applied=1 AND v.expires_at>t.at
        AND v.sent_at>c.activation_at AND v.classification IN('stop','human','media')) THEN 'revoked'
    WHEN c.paused=0 AND c.accepted_at IS NULL AND c.pending_acceptance_event_id IS NOT NULL AND c.consent_version='${WHATSAPP_NOTICE_VERSION}'
      AND c.pending_accepted_at+86400000>t.at
      AND EXISTS(SELECT 1 FROM sarin_wa_control_events v WHERE v.event_id=c.pending_acceptance_event_id
        AND v.peer_key=c.peer_key AND v.context_id=c.context_id AND v.applied=1 AND v.classification='accept' AND v.expires_at>t.at)
      AND EXISTS(SELECT 1 FROM sarin_wa_outbox n WHERE n.outbox_id=c.consent_notice_id AND n.context_id=c.context_id
        AND n.purpose='notice' AND n.version=c.consent_version AND n.hash=c.consent_hash
        AND n.started_at<=c.pending_accepted_at AND n.expires_at>t.at AND n.conflict=0
        AND n.state IN('sending','accepted','sent','delivered','read')) THEN 'pending_delivery'
    ELSE 'pending' END AS consent_status,
  CASE WHEN (${CONSENT_EVIDENCE}) THEN c.consent_expires_at ELSE NULL END AS consent_expires_at`;

/** @param {{db:Database,now?:()=>number,limits?:Partial<typeof DEFAULTS>}} options */
export function createWhatsAppWorkStore({db,now=()=>Date.now(),limits={}}) {
  const config={...DEFAULTS,...limits};
  const keys=/** @type {(keyof WorkLimits)[]} */(Object.keys(DEFAULTS));
  requireThat(db && typeof db.prepare==='function' && typeof db.batch==='function' && typeof now==='function'
    && Object.keys(limits).every(k=>Object.hasOwn(DEFAULTS,k))
    && keys.every(k=>integer(config[k])&&config[k]>0&&config[k]<=DEFAULTS[k]),'work_config_invalid',503);
  const clock=()=>{const at=now();requireThat(integer(at),'work_config_invalid',503);return at;};
  /** @param {string} sql @param {...any} values */
  const s=(sql,...values)=>db.prepare(sql).bind(...values);
  /** @param {import('./ingress-store.js').Statement[]} statements */
  async function batch(statements) {
    const result=await db.batch(statements);
    requireThat(Array.isArray(result)&&result.length===statements.length&&result.every(r=>r.success===true&&Array.isArray(r.results)),'work_unavailable',503);
    return result;
  }
  /** @param {string} sql @param {...any} values */
  const read=async(sql,...values)=>(await batch([s(sql,...values)]))[0].results;
  /** @param {string} condition @param {any[]} values @param {string} [code] */
  const guard=(condition,values,code='denied')=>s(`INSERT INTO sarin_wa_work_guard(code) SELECT '${code}' WHERE NOT (${condition})`,...values);
  /** @param {any} x @param {number} at @param {string} states @param {boolean|'confirm'} [consent] */
  const permission=(x,at,states,consent=false)=>guard(`EXISTS(SELECT 1 ${FROM} WHERE j.job_id=? AND j.token=? AND j.lease_until>t.at
    AND j.state IN(${states}) AND ${LIVE}${consent?` AND (${consent==='confirm'?CONFIRM:CONSENT})`:''})`,[at,x.jobId,x.token]);
  /** @param {any} x */
  const own=x=>requireThat(x&&randomId(x.jobId)&&randomId(x.token));
  /** @template {(...args:any[])=>Promise<any>} T @param {T} fn @returns {T} */
  const guarded=fn=>/** @type {T} */(async(...args)=>{
    try{return await fn(...args);}catch(e){
      if(e instanceof WhatsAppWorkError)throw e;
      const message=e instanceof Error?e.message:'';
      if(message.includes('WA_WORK_QUOTA'))throw new WhatsAppWorkError(429,'work_quota');
      if(message.includes('WA_WORK_CAPACITY'))throw new WhatsAppWorkError(429,'work_capacity');
      if(message.includes('WA_WORK_CONFLICT'))throw new WhatsAppWorkError(409,'work_conflict');
      if(message.includes('WA_WORK_DENIED'))throw new WhatsAppWorkError(409,'work_denied');
      throw new WhatsAppWorkError(503,'work_unavailable');
    }
  });
  /** @param {number} at */
  const periods=at=>({day:new Date(at).toISOString().slice(0,10),month:new Date(at).toISOString().slice(0,7)});
  /** @param {number} at */
  const closureGuard=at=>guard(`NOT EXISTS(SELECT 1 FROM sarin_wa_send_closures WHERE period_end_at>?
    AND ((scope='day' AND period_key=?) OR (scope='month' AND period_key=?)))`,[at,periods(at).day,periods(at).month],'quota');
  /** @param {any} x @param {number} at @param {number} bytes */
  function reserve(x,at,bytes) {
    const {day,month}=periods(at);
    return [closureGuard(at),guard(`(SELECT COUNT(*) FROM sarin_wa_jobs WHERE reserved_bytes>0)< ?
      AND COALESCE((SELECT SUM(reserved_bytes) FROM sarin_wa_jobs),0)+?<=?`,[config.maxOutboxRows,bytes,config.maxOutboxBytes],'capacity'),
    guard(`COALESCE((SELECT consumed+reserved FROM sarin_wa_send_quota WHERE day_key=?),0)<?
      AND COALESCE((SELECT SUM(consumed+reserved) FROM sarin_wa_send_quota WHERE month_key=?),0)<?`,[day,config.dailyAttempts,month,config.monthlyAttempts],'quota'),
    s(`INSERT INTO sarin_wa_send_quota(day_key,month_key,reserved) VALUES(?,?,1)
      ON CONFLICT(day_key) DO UPDATE SET reserved=reserved+1`,day,month),
    s(`UPDATE sarin_wa_jobs SET reserved_bytes=?,quota_day=?,quota_month=?,quota_state='reserved' WHERE job_id=?`,bytes,day,month,x.jobId)];
  }
  /** @param {string} jobId */
  function release(jobId) {
    return [s(`UPDATE sarin_wa_send_quota SET reserved=reserved-1 WHERE day_key=(SELECT quota_day FROM sarin_wa_jobs WHERE job_id=? AND quota_state='reserved')`,jobId),
      s(`UPDATE sarin_wa_jobs SET quota_state=CASE WHEN quota_state='reserved' THEN 'released' ELSE quota_state END,
        reserved_bytes=CASE WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE job_id=?) THEN 0 ELSE reserved_bytes END WHERE job_id=?`,jobId,jobId)];
  }
  /** @param {any} j @param {number} at @returns {Promise<Work>} */
  async function work(j,at) {
    const r=(await read(`SELECT i.*,c.*,p.revision AS pilot_revision,(${CONSENT}) AS consent,(${CONFIRM}) AS confirm ${FROM} WHERE j.job_id=?`,at,j.job_id))[0];
    const n=(await read(`SELECT * FROM sarin_wa_outbox WHERE context_id=? AND purpose='notice'`,j.context_id))[0];
    const pairs=await read(`SELECT COALESCE(i.text,(SELECT a.transcript FROM sarin_wa_audio a WHERE a.event_id=i.event_id),'[Audio no transcrito]') AS input,o.text AS reply FROM sarin_wa_outbox o
      JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
      WHERE o.context_id=? AND o.purpose='reply' AND o.delivered_at IS NOT NULL AND o.conflict=0
        AND COALESCE(j.outcome,'') NOT IN('profile_saved','profile_invalid')
        AND o.expires_at>? AND i.expires_at>? ORDER BY o.created_at DESC,o.outbox_id DESC LIMIT 4`,j.context_id,at,at);
    const profileInput=r.consent && r.media_type==='text'?parseWhatsAppProfileInput(r.text):{kind:'none'};
    return {jobId:j.job_id,eventId:j.event_id,epoch:j.epoch,contextId:j.context_id,peerKey:j.peer_key,peerRevision:j.peer_revision,
      pilotRevision:r.pilot_revision,source:r.media_type==='audio'?'audio':'text',input:r.consent && classifyWhatsAppInput({mediaType:r.media_type,text:r.text})==='text'?r.text:'',
      decision:r.confirm?'confirm':r.consent?(profileInput.kind==='none'?'generate':'profile'):!n&&!(r.consent_expires_at>at)?'notice':r.pending_acceptance_event_id===j.event_id?'accept_pending':'ignore',
      history:(r.consent?pairs:[]).reverse().flatMap(p=>[{role:'user',content:p.input},{role:'assistant',content:p.reply}]),
      recipient:{wabaId:r.waba_id,from:r.business_phone,to:r.peer_phone},expiresAt:j.expires_at,leaseUntil:j.lease_until};
  }
  /** @param {any} x @param {string} purpose @param {string} text @param {string|null} version @param {string|null} hash */
  async function output(x,purpose,text,version,hash) {
    own(x);requireThat(typeof text==='string'&&text.trim().length>0&&text.length<=1200&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text));
    // El aviso de consentimiento nunca se trunca; las respuestas sí se adaptan
    // antes de persistir para que historial, cuota y transporte vean lo mismo.
    if(purpose==='notice')requireThat(text.length<=1024);else text=limitWhatsAppBody(text);
    const at=clock(),outboxId=crypto.randomUUID(),externalId=crypto.randomUUID(),bytes=encoder.encode(text).byteLength;
    const fixed=purpose!=='reply';
    await batch([permission(x,at,fixed?"'claimed'":"'inference_started'",purpose==='accepted'?'confirm':purpose!=='notice'),
      ...(fixed?[guard(`NOT EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE context_id=(SELECT context_id FROM sarin_wa_jobs WHERE job_id=?) AND purpose=?)`,[x.jobId,purpose],'conflict'),...reserve(x,at,bytes)]:[]),
      s(`INSERT INTO sarin_wa_outbox(outbox_id,job_id,peer_key,context_id,epoch,purpose,text,stored_bytes,version,hash,external_id,created_at,expires_at)
        SELECT ?,job_id,peer_key,context_id,epoch,?,?,?,?,?,?,?,expires_at FROM sarin_wa_jobs WHERE job_id=?`,outboxId,purpose,text,bytes,version,hash,externalId,at,x.jobId),
      ...(purpose==='notice'?[s(`UPDATE sarin_wa_contexts SET consent_notice_id=?,consent_version=?,consent_hash=?,accepted_at=NULL,consent_expires_at=NULL,acceptance_event_id=NULL,pending_acceptance_event_id=NULL,pending_accepted_at=NULL WHERE peer_key=(SELECT peer_key FROM sarin_wa_jobs WHERE job_id=?)`,outboxId,version,hash,x.jobId)]:[]),
      s(`UPDATE sarin_wa_jobs SET state='ready',reserved_bytes=?,outcome=? WHERE job_id=?`,bytes,fixed?purpose:x.outcome,x.jobId)]);
    return {outboxId};
  }
  /** Las tablas de control sobreviven a rechazos por capacidad del inbox.
   * @param {{event:unknown,autoStart?:boolean}} input */
  async function observeControl({event,autoStart=false}) {
    requireThat(typeof autoStart==='boolean');
    const at=clock(),e=normalizeWhatsAppMessage(event,at);
    const business=e.kind==='inbound'?e.to:e.from,peer=e.kind==='inbound'?e.from:e.to;
    const facts=[e.kind,e.messageId,e.wamid,e.wabaId,e.from,e.to,e.sentAt,e.mediaType,e.text,...(e.audio?[e.audio]:[]),...(e.choice?[e.choice]:[])];
    const [peerKey,messageKey,eventHash,messageHash]=await Promise.all([
      digestWhatsApp('sarin-wa-peer-v1',[e.wabaId,business,peer]),
      digestWhatsApp('sarin-wa-message-v1',[e.kind,e.wabaId,business,e.wamid]),
      digestWhatsApp('sarin-wa-event-v1',[e.eventId,e.createdAt,...facts]),digestWhatsApp('sarin-wa-facts-v1',facts)]);
    // Los botones no se convierten en comandos antes de cotejar el aviso en el commit.
    const kind=e.kind==='echo'?'echo':e.choice?'ignore':classifyWhatsAppInput(e);
    const digit=e.kind==='inbound'&&e.mediaType==='text'?(e.text??'').trim():'';
    const menuAction=e.choice?.action??(digit==='1'?'accept':digit==='2'?'human':digit==='3'?'stop':null);
    const noticeVariants=menuAction?(await approvedWhatsAppNotices()).filter(notice=>e.choice||notice.numeric):[];
    const actionButton=!!e.choice&&e.choice.action!=='accept';
    // La aceptación exige texto y hash de una variante aprobada, además del
    // aviso actual durable. Salir/atención humana sólo revocan y admiten replies.
    // La expresión se evalúa en cada transacción, nunca sobre una lectura previa.
    // 2/3 siguen disponibles en un menú nunca aceptado tras una pausa por capacidad.
    // La prueba durable impide reinterpretarlos después de aceptar y luego revocar.
    const menuPause=e.choice&&e.choice.action!=='accept'?'1=1':!e.choice&&(digit==='2'||digit==='3')?
      `NOT EXISTS(SELECT 1 FROM sarin_wa_consent_proofs v WHERE v.notice_id=consent_notice_id
        AND v.peer_key=sarin_wa_contexts.peer_key AND v.notice_context_id=sarin_wa_contexts.context_id)`:'paused=0';
    const noticeReference=actionButton?`n.purpose IN('notice','accepted','reply')`:
      `n.outbox_id=consent_notice_id AND n.purpose='notice' AND n.version=? AND n.version=consent_version AND n.hash=consent_hash
        AND (${noticeVariants.map(()=>'(n.hash=? AND n.text=?)').join(' OR ')||'0=1'})`;
    const menuCurrent=`${menuPause} ${e.choice?'':'AND accepted_at IS NULL'} AND EXISTS(SELECT 1 FROM sarin_wa_outbox n
      JOIN sarin_wa_jobs source_job ON source_job.job_id=n.job_id JOIN sarin_wa_inbox source_i ON source_i.event_id=source_job.event_id
      WHERE n.peer_key=sarin_wa_contexts.peer_key AND n.context_id=sarin_wa_contexts.context_id AND (${noticeReference})
        AND n.started_at IS NOT NULL AND n.started_at<=? AND n.started_at<=? AND n.expires_at>?
        AND n.conflict=0 AND n.state IN('sending','accepted','sent','delivered','read'${actionButton?",'send_uncertain'":''})
        AND source_job.peer_key=n.peer_key AND source_job.context_id=n.context_id AND source_job.epoch=n.epoch AND source_job.expires_at>?
        AND source_i.peer_key=n.peer_key AND source_i.kind='inbound' AND source_i.expires_at>?
        AND source_i.waba_id=? AND source_i.business_phone=? AND source_i.peer_phone=?
        AND EXISTS(SELECT 1 FROM sarin_wa_pilot p WHERE p.enabled=1 AND p.epoch=n.epoch)
        ${e.choice?'AND n.outbox_id=?':''})`;
    const menuValues=[...(actionButton?[]:[WHATSAPP_NOTICE_VERSION,...noticeVariants.flatMap(notice=>[notice.hash,notice.text])]),
      e.sentAt,e.createdAt,at,at,at,e.wabaId,business,peer,...(e.choice?[e.choice.outboxId]:[])];
    const resolvedKind=menuAction?`CASE WHEN (${menuCurrent}) THEN ? ELSE ? END`:'?';
    const resolvedValues=menuAction?[...menuValues,menuAction,kind]:[kind];
    const observedKind='(SELECT classification FROM sarin_wa_control_events WHERE event_id=?)';
    if(at-e.sentAt>28800000||at-e.createdAt>28800000)return {status:'ignored',peerKey};
    const fresh=`EXISTS(SELECT 1 FROM sarin_wa_control_events v WHERE v.event_id=? AND v.applied=0 AND v.context_id=sarin_wa_contexts.context_id)
      AND ?>activation_at AND ?>activation_at AND ?>=(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1)`;
    const eventGuard=()=>guard(`NOT EXISTS(SELECT 1 FROM sarin_wa_control_events WHERE (event_id=? AND event_hash<>?) OR (message_key=? AND message_hash<>?))`,[e.eventId,eventHash,messageKey,messageHash],'conflict');
    // La apertura pública no permite crear recibos ilimitados antes del cupo de captura.
    const full=(await read(`SELECT (SELECT COUNT(*) FROM sarin_wa_control_events)>=20000 AND NOT EXISTS(
      SELECT 1 FROM sarin_wa_control_events WHERE event_id=? OR message_key=?) AS full`,e.eventId,messageKey))[0]?.full;
    const pauseAtCapacity=async()=>{
      await batch([eventGuard(),s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1,
        accepted_at=CASE WHEN ?='echo' THEN accepted_at ELSE NULL END,
        consent_expires_at=CASE WHEN ?='echo' THEN consent_expires_at ELSE NULL END,
        acceptance_event_id=CASE WHEN ?='echo' THEN acceptance_event_id ELSE NULL END,
        pending_acceptance_event_id=NULL,pending_accepted_at=NULL
        WHERE peer_key=? AND (paused=0 OR (?<>'echo' AND accepted_at IS NOT NULL))
          AND ?>activation_at AND ?>activation_at AND ?>=(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1)
          AND ((${resolvedKind}) IN('stop','human','media') OR (?='echo' AND (SELECT COUNT(*) FROM sarin_wa_outbox o
            JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
            WHERE o.started_at IS NOT NULL AND o.wamid=? AND o.conflict=0 AND i.waba_id=? AND i.business_phone=? AND i.peer_phone=?)<>1
            AND NOT EXISTS(SELECT 1 FROM sarin_wa_handoff h WHERE h.started_at IS NOT NULL AND h.conflict=0
              AND h.wamid=? AND h.waba_id=? AND h.business_phone=? AND h.owner_phone=? AND h.receipt_expires_at>?)))`,
        kind,kind,kind,peerKey,kind,e.sentAt,e.createdAt,Math.min(e.sentAt,e.createdAt),...resolvedValues,kind,e.wamid,e.wabaId,business,peer,e.wamid,e.wabaId,business,peer,at)]);
      throw new WhatsAppWorkError(429,'work_capacity');
    };
    if(full)await pauseAtCapacity();
    try { await batch([
      eventGuard(),
      guard(`EXISTS(SELECT 1 FROM sarin_wa_contexts WHERE peer_key=?) OR (SELECT COUNT(*) FROM sarin_wa_contexts)<1000`,[peerKey],'capacity'),
      guard(`EXISTS(SELECT 1 FROM sarin_wa_control_events WHERE event_id=? OR message_key=?) OR (SELECT COUNT(*) FROM sarin_wa_control_events)<20000`,[e.eventId,messageKey],'capacity'),
      s(`INSERT INTO sarin_wa_contexts(peer_key,context_id,paused,activation_at)
        SELECT ?,?,CASE WHEN ?=1 AND ? IN('text','accept','audio') AND EXISTS(SELECT 1 FROM sarin_wa_pilot WHERE enabled=1 AND ?>activation_at AND ?>activation_at)
          AND ?>=(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1) THEN 0 ELSE 1 END,?
        ON CONFLICT(peer_key) DO NOTHING`,peerKey,crypto.randomUUID(),Number(autoStart),kind,e.sentAt,e.createdAt,Math.min(e.sentAt,e.createdAt),autoStart?Math.min(e.sentAt,e.createdAt)-1:0),
      // Renovar solo ante un mensaje nuevo, sin retirar una pausa humana.
      s(`UPDATE sarin_wa_contexts SET context_id=?,revision=revision+1,activation_at=?,consent_version=NULL,consent_hash=NULL,
        consent_notice_id=NULL,acceptance_event_id=NULL,accepted_at=NULL,consent_expires_at=NULL,pending_acceptance_event_id=NULL,pending_accepted_at=NULL
        WHERE peer_key=? AND paused=0 AND ? IN('text','accept','audio') AND ?>activation_at AND ?>activation_at
          AND NOT EXISTS(SELECT 1 FROM sarin_wa_control_events WHERE event_id=? OR message_key=?)
          AND ((consent_version IS NOT NULL AND consent_version<>?) OR (acceptance_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sarin_wa_consent_proofs p WHERE p.acceptance_event_id=sarin_wa_contexts.acceptance_event_id AND p.conflict=0)) OR consent_expires_at<=? OR (accepted_at IS NULL AND EXISTS(SELECT 1 FROM sarin_wa_outbox n WHERE n.context_id=sarin_wa_contexts.context_id AND n.purpose='notice' AND n.expires_at<=?)))`,
        crypto.randomUUID(),Math.min(e.sentAt,e.createdAt)-1,peerKey,kind,e.sentAt,e.createdAt,e.eventId,messageKey,WHATSAPP_NOTICE_VERSION,at,at),
      s(`UPDATE sarin_wa_send_quota SET reserved=reserved-(SELECT COUNT(*) FROM sarin_wa_jobs j
        WHERE j.peer_key=? AND j.context_id<>(SELECT context_id FROM sarin_wa_contexts WHERE peer_key=?)
          AND j.quota_state='reserved' AND j.quota_day=day_key AND NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=j.job_id AND o.started_at IS NOT NULL))`,peerKey,peerKey),
      s(`UPDATE sarin_wa_outbox SET state='cancelled' WHERE peer_key=? AND context_id<>(SELECT context_id FROM sarin_wa_contexts WHERE peer_key=?) AND state='ready'`,peerKey,peerKey),
      s(`UPDATE sarin_wa_jobs SET state=CASE WHEN state='inference_started' THEN 'inference_uncertain' ELSE 'cancelled' END,
        token=NULL,lease_until=NULL,quota_state=CASE WHEN quota_state='reserved' THEN 'released' ELSE quota_state END,
        reserved_bytes=CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id) THEN reserved_bytes ELSE 0 END
        WHERE peer_key=? AND context_id<>(SELECT context_id FROM sarin_wa_contexts WHERE peer_key=?)
          AND state IN('queued','claimed','inference_started','ready') AND NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id AND o.started_at IS NOT NULL)`,peerKey,peerKey),
      s(`INSERT INTO sarin_wa_control_events(event_id,message_key,event_hash,message_hash,peer_key,context_id,classification,sent_at,observed_at,expires_at)
        SELECT ?,?,?,?,?,context_id,${resolvedKind},?,?,? FROM sarin_wa_contexts WHERE peer_key=? ON CONFLICT DO NOTHING`,e.eventId,messageKey,eventHash,messageHash,peerKey,...resolvedValues,e.sentAt,at,at+2*DAY,peerKey),
      s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1,
        accepted_at=CASE WHEN ?='echo' THEN accepted_at ELSE NULL END,consent_expires_at=CASE WHEN ?='echo' THEN consent_expires_at ELSE NULL END,
        acceptance_event_id=CASE WHEN ?='echo' THEN acceptance_event_id ELSE NULL END,pending_acceptance_event_id=NULL,pending_accepted_at=NULL
        WHERE peer_key=? AND ${fresh} AND (${observedKind} IN('stop','human','media') OR (?='echo' AND
          (SELECT COUNT(*) FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
            WHERE o.started_at IS NOT NULL AND o.wamid=? AND o.conflict=0 AND i.waba_id=? AND i.business_phone=? AND i.peer_phone=?)<>1
            AND NOT EXISTS(SELECT 1 FROM sarin_wa_handoff h WHERE h.started_at IS NOT NULL AND h.conflict=0
              AND h.wamid=? AND h.waba_id=? AND h.business_phone=? AND h.owner_phone=? AND h.receipt_expires_at>?)))`,
        kind,kind,kind,peerKey,e.eventId,e.sentAt,e.createdAt,Math.min(e.createdAt,e.sentAt),e.eventId,kind,e.wamid,e.wabaId,business,peer,e.wamid,e.wabaId,business,peer,at),
      s(`UPDATE sarin_wa_contexts SET pending_acceptance_event_id=?,pending_accepted_at=?
        WHERE peer_key=? AND ${fresh} AND ${observedKind}='accept' AND paused=0 AND accepted_at IS NULL AND pending_acceptance_event_id IS NULL
          AND (? IS NULL OR consent_notice_id=?) ${menuAction?`AND (${menuCurrent})`:''}
          AND EXISTS(SELECT 1 FROM sarin_wa_pilot WHERE enabled=1 AND ? > activation_at AND ?>activation_at)
          AND EXISTS(SELECT 1 FROM sarin_wa_outbox n WHERE n.context_id=sarin_wa_contexts.context_id AND n.outbox_id=consent_notice_id
            AND n.purpose='notice' AND n.version='${WHATSAPP_NOTICE_VERSION}' AND n.started_at IS NOT NULL AND n.started_at<=? AND n.started_at<=?
            AND n.expires_at>? AND n.conflict=0 AND n.state IN('sending','accepted','sent','delivered','read'))`,
        e.eventId,e.sentAt,peerKey,e.eventId,e.sentAt,e.createdAt,Math.min(e.createdAt,e.sentAt),e.eventId,e.choice?.outboxId??null,e.choice?.outboxId??null,
        ...(menuAction?menuValues:[]),e.sentAt,e.createdAt,e.sentAt,e.createdAt,at),
      s('UPDATE sarin_wa_control_events SET applied=1 WHERE event_id=?',e.eventId)]); }
    catch(error){
      // Otro webhook puede ocupar el último cupo entre la lectura y el commit.
      // La pausa de seguridad debe sobrevivir también a ese rechazo atómico.
      if(error instanceof Error && error.message.includes('WA_WORK_CAPACITY'))await pauseAtCapacity();
      throw error;
    }
    return {status:'observed',peerKey};
  }
  /** @param {{peerKey:string}} input */
  async function reconcileConsent({peerKey}) {
    requireThat(id(peerKey));const at=clock();
    const notice=(await read(`SELECT i.waba_id,i.business_phone,i.peer_phone FROM sarin_wa_contexts c
      JOIN sarin_wa_outbox n ON n.outbox_id=c.consent_notice_id JOIN sarin_wa_jobs j ON j.job_id=n.job_id
      JOIN sarin_wa_inbox i ON i.event_id=j.event_id WHERE c.peer_key=? AND c.pending_acceptance_event_id IS NOT NULL`,peerKey))[0];
    if(!notice)return {status:'unchanged'};
    const hashes=await Promise.all([notice.waba_id,notice.business_phone,notice.peer_phone].map(v=>digestWhatsApp('sarin-wa-proof-identity-v1',[v])));
    const result=await batch([s(`UPDATE sarin_wa_contexts SET acceptance_event_id=pending_acceptance_event_id,
      accepted_at=MAX(pending_accepted_at,?),consent_expires_at=pending_accepted_at+86400000,
      pending_acceptance_event_id=NULL,pending_accepted_at=NULL
      WHERE peer_key=? AND paused=0 AND accepted_at IS NULL AND pending_accepted_at+86400000>? AND consent_version='${WHATSAPP_NOTICE_VERSION}'
        AND EXISTS(SELECT 1 FROM sarin_wa_pilot WHERE enabled=1)
        AND EXISTS(SELECT 1 FROM sarin_wa_inbox i JOIN sarin_wa_jobs j ON j.event_id=i.event_id
          WHERE i.event_id=pending_acceptance_event_id AND i.expires_at>? AND j.context_id=sarin_wa_contexts.context_id)
        AND EXISTS(SELECT 1 FROM sarin_wa_outbox n WHERE n.outbox_id=consent_notice_id AND n.context_id=sarin_wa_contexts.context_id
          AND n.version=consent_version AND n.hash=consent_hash AND n.started_at<=pending_accepted_at
          AND n.delivered_at IS NOT NULL AND n.conflict=0 AND n.state IN('delivered','read') AND n.expires_at>?) RETURNING acceptance_event_id`,at,peerKey,at,at,at),
      s(`INSERT INTO sarin_wa_consent_proofs(acceptance_event_id,notice_id,peer_key,notice_context_id,notice_epoch,version,hash,
        started_at,delivered_at,accepted_at,consent_expires_at,recorded_at,expires_at,external_id,provider_id,wamid,waba_hash,from_hash,to_hash)
        SELECT c.acceptance_event_id,n.outbox_id,c.peer_key,n.context_id,n.epoch,n.version,n.hash,n.started_at,n.delivered_at,
        c.accepted_at,c.consent_expires_at,?,?,n.external_id,n.provider_id,n.wamid,?,?,?
        FROM sarin_wa_contexts c JOIN sarin_wa_outbox n ON n.outbox_id=c.consent_notice_id
        WHERE c.peer_key=? AND changes()=1`,at,at+2*DAY,...hashes,peerKey)]);
    const rows=result[0].results;

    return {status:rows.length?'accepted':'unchanged'};
  }
  /** @param {DeliveryObservation} event
   * @param {import('./ingress-store.js').Statement[]} [prefix]
   * @param {import('./ingress-store.js').Statement[]} [suffix] */
  async function applyObservation(event,prefix=[],suffix=[]) {
      requireThat(event&&id(event.eventId)&&['accepted','sent','delivered','read','failed'].includes(event.status)&&integer(event.at)
        && (providerId(event.providerId)||randomId(event.externalId))
        && (event.providerId===undefined||providerId(event.providerId))
        && (event.wamid===undefined||providerId(event.wamid,512))
        && (event.externalId===undefined||(typeof event.externalId==='string'&&event.externalId.length>0&&event.externalId.length<=128&&!/[\u0000-\u001f\u007f-\u009f]/.test(event.externalId)))
        && (event.from===undefined||phone(event.from))&&(event.to===undefined||phone(event.to))
        && (event.wabaId===undefined||(typeof event.wabaId==='string'&&/^[1-9]\d{0,31}$/.test(event.wabaId))));
      const at=clock();requireThat(event.at<=at+300000);
      const o=(await read(`SELECT * FROM sarin_wa_delivery_targets o WHERE o.expires_at>? AND o.started_at IS NOT NULL
        AND ((? IS NOT NULL AND o.provider_id=?) OR (? IS NOT NULL AND o.external_id=?))`,
        at,event.providerId??null,event.providerId??null,event.externalId??null,event.externalId??null))[0];
      if(!o)return {status:'ignored'};
      const identityHashes=await Promise.all([event.wabaId,event.from,event.to].map(v=>v===undefined?null:digestWhatsApp('sarin-wa-proof-identity-v1',[v])));
      const expectedHashes=await Promise.all([['waba_hash','waba_id'],['from_hash','business_phone'],['to_hash','peer_phone']].map(([hash,raw])=>o[hash]??digestWhatsApp('sarin-wa-proof-identity-v1',[o[raw]])));
      const results=await batch([...prefix,
        s(`INSERT INTO sarin_wa_delivery_observations(event_id,outbox_id,provider_id,status,observed_at,expires_at)
          VALUES(?,?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,event.eventId,o.outbox_id,event.providerId??null,event.status,event.at,at+2*DAY),
        // Identidad dentro del commit: el POST puede vincular otro ID tras la lectura.
        s(`UPDATE sarin_wa_delivery_observations SET conflict=1 WHERE event_id=? AND applied=0 AND EXISTS(
          SELECT 1 FROM sarin_wa_delivery_targets n WHERE n.outbox_id=? AND n.expires_at>? AND (
            (n.provider_id IS NOT NULL AND ? IS NOT NULL AND n.provider_id<>?) OR
            (? IS NOT NULL AND n.external_id<>?) OR (n.wamid IS NOT NULL AND ? IS NOT NULL AND n.wamid<>?) OR
            (? IS NOT NULL AND ?<>?) OR (? IS NOT NULL AND ?<>?) OR (? IS NOT NULL AND ?<>?) OR
            EXISTS(SELECT 1 FROM sarin_wa_delivery_targets other WHERE other.outbox_id<>n.outbox_id AND other.provider_id=?) OR
            (?='failed' AND n.delivered_at IS NOT NULL) OR (? IN('delivered','read') AND n.state IN('failed','rejected'))))`,
          event.eventId,o.outbox_id,at,event.providerId??null,event.providerId??null,event.externalId??null,event.externalId??null,event.wamid??null,event.wamid??null,
          identityHashes[0],identityHashes[0],expectedHashes[0],identityHashes[1],identityHashes[1],expectedHashes[1],identityHashes[2],identityHashes[2],expectedHashes[2],event.providerId??null,event.status,event.status),
        s(`UPDATE sarin_wa_consent_proofs SET conflict=1 WHERE notice_id=? AND expires_at>? AND EXISTS(
          SELECT 1 FROM sarin_wa_delivery_observations WHERE event_id=? AND outbox_id=notice_id AND applied=0 AND conflict=1)`,o.outbox_id,at,event.eventId),
        s(`UPDATE sarin_wa_consent_proofs SET provider_id=COALESCE(provider_id,?),wamid=COALESCE(wamid,?)
          WHERE notice_id=? AND expires_at>? AND conflict=0 AND EXISTS(SELECT 1 FROM sarin_wa_delivery_observations
          WHERE event_id=? AND outbox_id=notice_id AND applied=0 AND conflict=0)`,event.providerId??null,event.wamid??null,o.outbox_id,at,event.eventId),
        s(`UPDATE sarin_wa_outbox SET conflict=1 WHERE outbox_id=? AND EXISTS(
          SELECT 1 FROM sarin_wa_delivery_observations WHERE event_id=? AND outbox_id=sarin_wa_outbox.outbox_id AND applied=0 AND conflict=1)`,o.outbox_id,event.eventId),
        s(`UPDATE sarin_wa_outbox SET provider_id=COALESCE(provider_id,?),wamid=COALESCE(wamid,?),
          delivered_at=CASE WHEN ? IN('delivered','read') THEN COALESCE(delivered_at,?) ELSE delivered_at END,
          state=CASE WHEN state IN('failed','rejected','cancelled','expired') THEN state
            WHEN ?='accepted' AND state IN('send_uncertain','sent','delivered','read') THEN state WHEN state='read' THEN state WHEN state='delivered' AND ?='sent' THEN state ELSE ? END
          WHERE outbox_id=? AND conflict=0 AND EXISTS(SELECT 1 FROM sarin_wa_delivery_observations WHERE event_id=? AND outbox_id=sarin_wa_outbox.outbox_id AND applied=0)`,
          event.providerId??null,event.wamid??null,event.status,event.at,event.status,event.status,event.status,o.outbox_id,event.eventId),
        s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE peer_key=(SELECT peer_key FROM sarin_wa_delivery_targets WHERE outbox_id=? AND context_id=sarin_wa_contexts.context_id AND (state='failed' OR conflict=1))
          AND EXISTS(SELECT 1 FROM sarin_wa_delivery_observations WHERE event_id=? AND outbox_id=? AND applied=0)`,o.outbox_id,event.eventId,o.outbox_id),
        s('UPDATE sarin_wa_delivery_observations SET applied=1 WHERE event_id=?',event.eventId),settleLookup(o.outbox_id,at),...suffix]);
      await api.reconcileConsent({peerKey:o.peer_key});
      return {status:results[prefix.length].results.length?'applied':'duplicate'};
    }
  /** Cualquier prueba definitiva cierra polling, aunque llegue por webhook.
   * @param {string} outboxId @param {number} at */
  const settleLookup=(outboxId,at)=>s(`UPDATE sarin_wa_outbox SET
    reconcile_state=CASE WHEN conflict=1 THEN 'conflict' ELSE 'complete' END,
    reconcile_token=NULL,reconcile_lease_until=NULL,reconcile_next_at=NULL,
    reconcile_last_result=CASE WHEN conflict=1 THEN 'identity_conflict' ELSE state END,reconcile_updated_at=?
    WHERE outbox_id=? AND (conflict=1 OR state IN('delivered','read','failed','rejected'))`,at,outboxId);
  /** @param {string} outboxId */
  async function reconciliationState(outboxId) {
    const row=(await read('SELECT reconcile_state AS status,reconcile_attempts AS attempts,reconcile_next_at AS nextAt FROM sarin_wa_outbox WHERE outbox_id=?',outboxId))[0];
    requireThat(row,'work_denied',409);
    return /** @type {import('./work-contracts.js').ReconciliationState} */(row);
  }
  const LOOKUP_LIVE=`o.started_at IS NOT NULL AND o.provider_id IS NOT NULL AND o.expires_at>?
    AND o.created_at>=(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1)`;
  /** @param {string} outboxId @param {string} token @param {string} binding @param {number} at */
  const lookupGuard=(outboxId,token,binding,at)=>guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.outbox_id=?
    AND o.reconcile_state='claimed' AND o.reconcile_token=? AND o.reconcile_lease_until>? AND o.provider_id=? AND ${LOOKUP_LIVE})`,[outboxId,token,at,binding,at]);
  /** @param {string} outboxId @param {number} at @param {string} result */
  const finishLookup=(outboxId,at,result)=>s(`UPDATE sarin_wa_outbox SET
    reconcile_state=CASE WHEN conflict=1 THEN 'conflict' WHEN state IN('delivered','read','failed','rejected') THEN 'complete'
      WHEN reconcile_attempts>=3 THEN 'exhausted' ELSE 'pending' END,
    reconcile_next_at=CASE WHEN conflict=1 OR state IN('delivered','read','failed','rejected') OR reconcile_attempts>=3 THEN NULL ELSE ?+60000 END,
    reconcile_token=NULL,reconcile_lease_until=NULL,reconcile_last_result=?,reconcile_updated_at=? WHERE outbox_id=?`,at,result,at,outboxId);
  const api={
    getWorkRecipient:guarded(/** @param {{jobId:string,epoch:string}} x */async({jobId,epoch})=>{
      requireThat(randomId(jobId)&&randomId(epoch));
      const rows=await read(`SELECT i.waba_id AS wabaId,i.business_phone AS 'from',i.peer_phone AS 'to'
        FROM sarin_wa_jobs j JOIN sarin_wa_inbox i ON i.event_id=j.event_id
        WHERE j.job_id=? AND j.epoch=? AND j.expires_at>? AND i.expires_at>?`,jobId,epoch,clock(),clock());
      return /** @type {import('./work-contracts.js').Recipient|null} */(rows[0]??null);
    }),
    getReconciliationRecipient:guarded(/** @param {{wabaId:string,from:string,to?:string}} x */async({wabaId,from,to})=>{
      requireThat(/^[1-9]\d{0,31}$/.test(wabaId)&&phone(from)&&(to===undefined||phone(to)));const at=clock();
      const rows=await read(`SELECT i.waba_id AS wabaId,i.business_phone AS 'from',i.peer_phone AS 'to'
        FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
        WHERE ${LOOKUP_LIVE} AND o.conflict=0 AND o.state IN('sending','accepted','sent','send_uncertain')
          AND ((o.reconcile_state='pending' AND o.reconcile_next_at<=?) OR o.reconcile_state='idle')
          AND i.waba_id=? AND i.business_phone=? AND (? IS NULL OR i.peer_phone=?)
        ORDER BY COALESCE(o.reconcile_next_at,o.created_at),o.outbox_id LIMIT 1`,at,at,wabaId,from,to??null,to??null);
      return /** @type {import('./work-contracts.js').Recipient|null} */(rows[0]??null);
    }),
    getPilot:guarded(async()=>{
      const pilot=(await read('SELECT enabled,revision,activation_at FROM sarin_wa_pilot WHERE id=1'))[0];
      requireThat(pilot,'work_unavailable',503);return pilot;
    }),
    getSendClosure:guarded(/** @returns {Promise<import('./work-contracts.js').SendClosure>} */async()=>{
      const at=clock();const closures=await read(`SELECT scope,period_key,period_end_at FROM sarin_wa_send_closures
        WHERE period_end_at>? AND ((scope='day' AND period_key=?) OR (scope='month' AND period_key=?))`,at,periods(at).day,periods(at).month);
      return {closed:closures.length>0,closures};
    }),
    requestReconciliation:guarded(/** @param {{outboxId:string,actor:string}} x */async({outboxId,actor})=>{
      requireThat(randomId(outboxId)&&id(actor));const at=clock();
      await batch([guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.outbox_id=? AND ${LOOKUP_LIVE})`,[outboxId,at]),
        s(`UPDATE sarin_wa_outbox SET reconcile_state=CASE WHEN conflict=1 THEN 'conflict'
          WHEN state IN('delivered','read','failed','rejected') THEN 'complete' WHEN reconcile_attempts>=3 AND reconcile_state<>'claimed' THEN 'exhausted'
          WHEN reconcile_state='idle' THEN 'pending' ELSE reconcile_state END,
          reconcile_next_at=CASE WHEN reconcile_state='idle' THEN ? ELSE reconcile_next_at END,reconcile_updated_at=? WHERE outbox_id=?`,at,at,outboxId),
        s(`INSERT INTO sarin_wa_audit(audit_id,actor,action,peer_key,revision,at)
          SELECT ?,?,'reconcile_'||reconcile_state,peer_key,0,? FROM sarin_wa_outbox WHERE outbox_id=?`,crypto.randomUUID(),actor,at,outboxId)]);
      return reconciliationState(outboxId);
    }),
    discoverReconciliation:guarded(/** @param {{recipient:import('./work-contracts.js').Recipient}} x */async({recipient})=>{
      requireThat(recipient&&phone(recipient.from)&&phone(recipient.to)&&/^[1-9]\d{0,31}$/.test(recipient.wabaId));
      const rows=await read(`SELECT o.outbox_id FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id
        JOIN sarin_wa_inbox i ON i.event_id=j.event_id WHERE ${LOOKUP_LIVE} AND o.reconcile_state='idle' AND o.conflict=0
        AND o.state IN('accepted','sent','send_uncertain') AND i.waba_id=? AND i.business_phone=? AND i.peer_phone=? ORDER BY o.created_at,o.outbox_id LIMIT 1`,clock(),recipient.wabaId,recipient.from,recipient.to);
      if(rows[0])await api.requestReconciliation({outboxId:rows[0].outbox_id,actor:'consumer_cron'});
      return {requested:rows.length};
    }),
    claimReconciliation:guarded(/** @param {{token:string,recipient:import('./work-contracts.js').Recipient}} x */async({token,recipient})=>{
      requireThat(randomId(token)&&recipient&&phone(recipient.from)&&phone(recipient.to)&&/^[1-9]\d{0,31}$/.test(recipient.wabaId));const at=clock();
      const results=await batch([
        s(`UPDATE sarin_wa_outbox SET reconcile_state='claimed',reconcile_attempts=reconcile_attempts+1,reconcile_token=?,
          reconcile_lease_until=?,reconcile_updated_at=? WHERE outbox_id=(SELECT o.outbox_id FROM sarin_wa_outbox o
          JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
          WHERE ${LOOKUP_LIVE} AND o.reconcile_state='pending' AND o.reconcile_attempts<3 AND o.reconcile_next_at<=? AND o.conflict=0
          AND o.state IN('sending','accepted','sent','send_uncertain') AND i.waba_id=? AND i.business_phone=? AND i.peer_phone=?
          ORDER BY o.reconcile_next_at,o.outbox_id LIMIT 1)`,token,at+LEASE,at,at,at,recipient.wabaId,recipient.from,recipient.to),
        s(`SELECT o.outbox_id AS outboxId,o.provider_id AS providerId,o.external_id AS externalId,i.waba_id AS wabaId,
          i.business_phone AS 'from',i.peer_phone AS 'to',o.context_id AS contextId,o.epoch,o.reconcile_attempts AS attempt,o.reconcile_lease_until AS leaseUntil
          FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
          WHERE o.reconcile_token=? AND o.reconcile_state='claimed'`,token)]);
      const permit=/** @type {import('./work-contracts.js').ReconciliationPermit|undefined} */(results[1].results[0]);
      return permit?{status:'claimed',permit}:{status:'none'};
    }),
    finishReconciliation:guarded(/** @param {{outboxId:string,token:string,result:import('./work-contracts.js').ReconciliationResult}} x */async({outboxId,token,result})=>{
      requireThat(randomId(outboxId)&&randomId(token)&&result&&['observation','pending','unavailable','identity_conflict'].includes(result.kind));
      if(result.kind==='unavailable')requireThat(['timeout','cancelled','network_error','provider_rejected','provider_unavailable','provider_redirect','invalid_response','response_too_large'].includes(result.code));
      const at=clock(),o=(await read('SELECT provider_id,reconcile_attempts,peer_key,context_id FROM sarin_wa_outbox WHERE outbox_id=?',outboxId))[0];
      requireThat(o&&providerId(o.provider_id),'work_denied',409);
      const prefix=[lookupGuard(outboxId,token,o.provider_id,at)];
      if(result.kind==='observation') {
        requireThat(result.observation&&result.observation.providerId===o.provider_id,'work_conflict',409);
        await applyObservation({...result.observation,eventId:'lookup:'+outboxId+':'+o.reconcile_attempts,at},prefix,[finishLookup(outboxId,at,result.observation.status)]);
      }else {
        await batch([...prefix,...(result.kind==='identity_conflict'?[
          s('UPDATE sarin_wa_outbox SET conflict=1 WHERE outbox_id=?',outboxId),
          s('UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE peer_key=? AND context_id=? AND paused=0',o.peer_key,o.context_id)]:[]),
          finishLookup(outboxId,at,result.kind==='unavailable'?result.code:result.kind)]);
      }
      return reconciliationState(outboxId);
    }),
    expireReconciliationLeases:guarded(async()=>{
      const at=clock();const result=await read(`UPDATE sarin_wa_outbox SET
        reconcile_state=CASE WHEN conflict=1 THEN 'conflict' WHEN state IN('delivered','read','failed','rejected') THEN 'complete'
          WHEN reconcile_attempts>=3 OR expires_at<=? OR created_at<(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1) THEN 'exhausted' ELSE 'pending' END,
        reconcile_next_at=reconcile_lease_until+60000,reconcile_token=NULL,reconcile_lease_until=NULL,
        reconcile_last_result='lease_expired',reconcile_updated_at=? WHERE outbox_id=(SELECT outbox_id FROM sarin_wa_outbox
          WHERE reconcile_state='claimed' AND reconcile_lease_until<=? ORDER BY reconcile_lease_until LIMIT 1) RETURNING outbox_id`,at,at,at);
      return {processed:result.length};
    }),

    observeControl:guarded(observeControl),
    reconcileConsent:guarded(reconcileConsent),
    recordNotice:guarded(async({peerKey,outboxId,version,hash})=>{
      requireThat(id(peerKey)&&randomId(outboxId)&&id(version)&&typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash));
      const result=await read(`UPDATE sarin_wa_contexts SET consent_notice_id=?,consent_version=?,consent_hash=?
        WHERE peer_key=? AND paused=0 AND EXISTS(SELECT 1 FROM sarin_wa_outbox n WHERE n.outbox_id=?
          AND n.peer_key=sarin_wa_contexts.peer_key AND n.context_id=sarin_wa_contexts.context_id AND n.purpose='notice'
          AND n.version=? AND n.hash=? AND n.conflict=0 AND n.expires_at>?) RETURNING peer_key`,outboxId,version,hash,peerKey,outboxId,version,hash,clock());
      requireThat(result.length===1,'work_denied',409);return {status:'recorded'};
    }),
    suspendReplies:guarded(async()=>{
      const pilot=(await read('SELECT enabled,revision FROM sarin_wa_pilot WHERE id=1'))[0];
      if(pilot.enabled)await api.setPilotMode({enabled:false,expectedRevision:pilot.revision,actor:'environment'});
      return {status:'disabled'};
    }),
    // La creación sólo ocurre en el trigger de captura, nunca tras ACK ni por backfill.
    admitJob:guarded(async({eventId,epoch})=>{
      requireThat(id(eventId)&&randomId(epoch));
      const j=(await read('SELECT job_id,epoch FROM sarin_wa_jobs WHERE event_id=?',eventId))[0];
      return j&&j.epoch===epoch?{status:'existing',jobId:j.job_id}:{status:'ignored'};
    }),
    claimGeneration:guarded(async(x)=>{
      own(x);requireThat(randomId(x.epoch));const at=clock();
      const peer=(await read('SELECT peer_key FROM sarin_wa_jobs WHERE job_id=?',x.jobId))[0];
      if(peer)await api.reconcileConsent({peerKey:peer.peer_key});
      const rows=await read(`UPDATE sarin_wa_jobs SET state='claimed',token=?,lease_until=?,deferred_reason=NULL
        WHERE job_id IN(SELECT j.job_id ${FROM} WHERE j.job_id=? AND j.epoch=? AND j.state='queued'
          AND j.inference_started_at IS NULL AND ${LIVE} AND ${UNBLOCKED}
          AND NOT EXISTS(SELECT 1 FROM sarin_wa_jobs a WHERE a.peer_key=j.peer_key AND a.state IN('claimed','inference_started','ready'))
          AND NOT EXISTS(SELECT 1 FROM sarin_wa_jobs a WHERE a.peer_key=j.peer_key AND a.context_id=j.context_id AND a.state='queued'
            AND (a.created_at<j.created_at OR (a.created_at=j.created_at AND a.job_id<j.job_id)))) RETURNING *`,x.token,at+LEASE,at,x.jobId,x.epoch);
      if(rows[0])return {status:'claimed',work:await work(rows[0],at)};
      const live=await read(`SELECT j.state ${FROM} WHERE j.job_id=? AND j.epoch=? AND ${LIVE}`,at,x.jobId,x.epoch);
      return {status:live[0]&&['queued','claimed','inference_started'].includes(live[0].state)?'busy':'terminal'};
    }),
    markInferenceStarted:guarded(async(x)=>{
      own(x);const at=clock();await batch([permission(x,at,"'claimed'",true),
        guard('NOT EXISTS(SELECT 1 FROM sarin_wa_jobs WHERE job_id=? AND inference_started_at IS NOT NULL)',[x.jobId]),
        ...reserve(x,at,4800),s("UPDATE sarin_wa_jobs SET state='inference_started',inference_started_at=? WHERE job_id=?",at,x.jobId)]);
      return {status:'started'};
    }),
    getAudioDescriptor:guarded(async(x)=>{
      own(x);const at=clock();
      const result=await batch([permission(x,at,"'inference_started'",true),s(`SELECT a.descriptor FROM sarin_wa_audio a JOIN sarin_wa_jobs j ON j.event_id=a.event_id
        WHERE j.job_id=? AND a.state='pending' AND a.expires_at>?`,x.jobId,at)]);
      const row=result[1].results[0];
      return row?.descriptor?JSON.parse(row.descriptor):null;
    }),
    beginAudioInference:guarded(async(x)=>{
      own(x);const at=clock(),{day,month}=periods(at);
      await batch([permission(x,at,"'inference_started'",true),closureGuard(at),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_audio a JOIN sarin_wa_jobs j ON j.event_id=a.event_id WHERE j.job_id=? AND a.state='pending' AND a.descriptor IS NOT NULL AND a.expires_at>?)`,[x.jobId,at]),
        guard(`COALESCE((SELECT consumed FROM sarin_wa_audio_quota WHERE day_key=?),0)<20 AND COALESCE((SELECT SUM(consumed) FROM sarin_wa_audio_quota WHERE month_key=?),0)<100`,[day,month],'quota'),
        s(`INSERT INTO sarin_wa_audio_quota(day_key,month_key,consumed) VALUES(?,?,1) ON CONFLICT(day_key) DO UPDATE SET consumed=consumed+1`,day,month),
        s(`UPDATE sarin_wa_audio SET state='started',started_at=? WHERE event_id=(SELECT event_id FROM sarin_wa_jobs WHERE job_id=?)`,at,x.jobId)]);
      return true;
    }),
    finishAudio:guarded(async(x)=>{
      own(x);const at=clock(),ok=x.result?.ok===true;
      if(ok)requireThat(typeof x.result.text==='string'&&x.result.text.trim().length>0&&x.result.text.length<=1200
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(x.result.text)
        && Number.isFinite(x.result.durationSeconds)&&x.result.durationSeconds>0&&x.result.durationSeconds<=120);
      await batch([permission(x,at,"'inference_started'",true),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_audio a JOIN sarin_wa_jobs j ON j.event_id=a.event_id WHERE j.job_id=? AND a.state IN(${ok?"'started'":"'pending','started'"}))`,[x.jobId]),
        s(`UPDATE sarin_wa_audio SET descriptor=NULL,state=?,transcript=?,duration_seconds=?,finished_at=? WHERE event_id=(SELECT event_id FROM sarin_wa_jobs WHERE job_id=?)`,ok?'transcribed':'failed',ok?x.result.text:null,ok?x.result.durationSeconds:null,at,x.jobId)]);
      return {status:ok?'transcribed':'failed'};
    }),
    attachReservation:guarded(async(x)=>{
      own(x);requireThat(randomId(x.reservationId));await batch([permission(x,clock(),"'inference_started'",true),
        guard('NOT EXISTS(SELECT 1 FROM sarin_wa_inference_reservations WHERE reservation_id=?)',[x.reservationId]),
        guard('(SELECT COUNT(*) FROM sarin_wa_inference_reservations WHERE job_id=?)<2',[x.jobId]),
        s('INSERT INTO sarin_wa_inference_reservations(reservation_id,job_id,attached_at) VALUES(?,?,?)',x.reservationId,x.jobId,clock()),
        s('UPDATE sarin_wa_jobs SET reservation_id=? WHERE job_id=?',x.reservationId,x.jobId)]);return {status:'attached'};
    }),
    completeGeneration:guarded(async(x)=>{
      requireThat(['completed','out_of_scope','answered','blocked','fallback'].includes(x.outcome));return output(x,'reply',x.reply,null,null);
    }),
    // Nombre y confirmación se guardan juntos; nunca se abre una reserva de IA.
    // El dato procede del inbox, no de Queue ni de un argumento del procesador.
    completeProfile:guarded(async(x)=>{
      own(x);let at=clock();
      const found=await batch([permission(x,at,"'claimed'",true),s(`SELECT i.text,i.media_type FROM sarin_wa_jobs j
        JOIN sarin_wa_inbox i ON i.event_id=j.event_id WHERE j.job_id=?`,x.jobId)]);
      const source=found[1].results[0];requireThat(source?.media_type==='text','work_denied',409);
      const input=parseWhatsAppProfileInput(source.text);requireThat(input.kind!=='none','work_denied',409);
      const text=limitWhatsAppBody(input.kind==='valid'?WHATSAPP_PROFILE_SAVED:WHATSAPP_PROFILE_INVALID);
      const outcome=input.kind==='valid'?'profile_saved':'profile_invalid',bytes=encoder.encode(text).byteLength;
      const outboxId=crypto.randomUUID(),externalId=crypto.randomUUID();at=clock();
      await batch([permission(x,at,"'claimed'",true),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_jobs j JOIN sarin_wa_inbox i ON i.event_id=j.event_id
          WHERE j.job_id=? AND i.media_type='text' AND i.text=?)`,[x.jobId,source.text]),
        ...reserve(x,at,bytes),
        ...(input.kind==='valid'?[s(`INSERT INTO sarin_wa_profiles(peer_key,context_id,source_event_id,full_name,stored_bytes,created_at,expires_at)
          SELECT j.peer_key,j.context_id,i.event_id,?,?,i.received_at,i.expires_at FROM sarin_wa_jobs j
            JOIN sarin_wa_inbox i ON i.event_id=j.event_id WHERE j.job_id=?
          ON CONFLICT(peer_key) DO UPDATE SET context_id=excluded.context_id,source_event_id=excluded.source_event_id,
            full_name=excluded.full_name,stored_bytes=excluded.stored_bytes,created_at=excluded.created_at,expires_at=excluded.expires_at`,
          input.fullName,encoder.encode(input.fullName).byteLength,x.jobId)]:[]),
        s(`INSERT INTO sarin_wa_outbox(outbox_id,job_id,peer_key,context_id,epoch,purpose,text,stored_bytes,external_id,created_at,expires_at)
          SELECT ?,job_id,peer_key,context_id,epoch,'reply',?,?,?,?,expires_at FROM sarin_wa_jobs WHERE job_id=?`,outboxId,text,bytes,externalId,at,x.jobId),
        s(`UPDATE sarin_wa_jobs SET state='ready',reserved_bytes=?,outcome=? WHERE job_id=?`,bytes,outcome,x.jobId)]);
      return {outboxId};
    }),
    createFixedReply:guarded(async(x)=>{
      requireThat(['notice','accepted'].includes(x.purpose)&&x.version===WHATSAPP_NOTICE_VERSION&&typeof x.hash==='string'&&/^[a-f0-9]{64}$/.test(x.hash));
      return output(x,x.purpose,x.text,x.version,x.hash);
    }),
    deferWork:guarded(async(x)=>{
      own(x);requireThat(['waiting_notice','waiting_consent','waiting_delivery'].includes(x.reason));
      await batch([permission(x,clock(),"'claimed'"),s(`UPDATE sarin_wa_jobs SET state='queued',token=NULL,lease_until=NULL,deferred_reason=? WHERE job_id=?`,x.reason,x.jobId)]);
      return {status:'deferred'};
    }),
    finishWithoutReply:guarded(async(x)=>{
      own(x);requireThat(['ignored','expired','cancelled','consent_required'].includes(x.reason));
      await batch([permission(x,clock(),"'claimed'"),...release(x.jobId),s("UPDATE sarin_wa_jobs SET state=?,token=NULL,lease_until=NULL,outcome=? WHERE job_id=?",x.reason==='expired'?'expired':x.reason==='cancelled'?'cancelled':'completed',x.reason,x.jobId)]);
      return {status:'finished'};
    }),
    failInference:guarded(async(x)=>{
      own(x);requireThat(['provider_rejected','provider_unavailable','invalid_output','permission_revoked','deadline'].includes(x.code)&&typeof x.started==='boolean');
      const at=clock();await batch([guard(`EXISTS(SELECT 1 FROM sarin_wa_jobs WHERE job_id=? AND token=? AND lease_until>? AND state IN('claimed','inference_started'))`,[x.jobId,x.token,at]),
        ...release(x.jobId),s(`UPDATE sarin_wa_jobs SET state=CASE WHEN inference_started_at IS NOT NULL OR ? THEN 'inference_uncertain' ELSE 'failed' END,
          outcome=?,token=NULL,lease_until=NULL WHERE job_id=?`,Number(x.started),x.code,x.jobId),
        s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE peer_key=(SELECT peer_key FROM sarin_wa_jobs WHERE job_id=? AND context_id=sarin_wa_contexts.context_id)`,x.jobId)]);
      return {status:'failed'};
    }),
    claimSend:guarded(async(x)=>{
      own(x);requireThat(randomId(x.epoch));const at=clock();
      const rows=await read(`UPDATE sarin_wa_jobs SET token=?,lease_until=? WHERE job_id IN(
        SELECT j.job_id ${FROM} JOIN sarin_wa_outbox o ON o.job_id=j.job_id WHERE j.job_id=? AND j.epoch=?
        AND j.state='ready' AND o.state='ready' AND o.started_at IS NULL AND (j.lease_until IS NULL OR j.lease_until<=t.at)
        AND ${LIVE} AND (o.purpose='reply' OR o.version='${WHATSAPP_NOTICE_VERSION}')) RETURNING job_id`,x.token,at+LEASE,at,x.jobId,x.epoch);
      if(!rows[0])return {status:'busy'};
      const o=(await read('SELECT outbox_id FROM sarin_wa_outbox WHERE job_id=?',x.jobId))[0];
      return {status:'claimed',outboxId:o.outbox_id};
    }),
    beginSend:guarded(async(x)=>{
      requireThat(x&&randomId(x.outboxId)&&randomId(x.token));const at=clock(),{day,month}=periods(at);
      const o=(await read('SELECT * FROM sarin_wa_outbox WHERE outbox_id=?',x.outboxId))[0];requireThat(o,'work_denied',409);
      requireThat(o.purpose!=='notice'||o.text.length<=1024,'work_denied',409);
      const prepared=o.purpose==='notice'?o.text:limitWhatsAppBody(o.text),preparedBytes=encoder.encode(prepared).byteLength;
      const ownX={jobId:o.job_id,token:x.token};
      const result=await batch([permission(ownX,at,"'ready'",o.purpose==='accepted'?'confirm':o.purpose!=='notice'),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE outbox_id=? AND (purpose='reply' OR version=?))`,[x.outboxId,WHATSAPP_NOTICE_VERSION]),
        ...(x.recipient?[guard(`EXISTS(SELECT 1 FROM sarin_wa_jobs j JOIN sarin_wa_inbox i ON i.event_id=j.event_id
          WHERE j.job_id=? AND i.waba_id=? AND i.business_phone=? AND i.peer_phone=?)`,[o.job_id,x.recipient.wabaId,x.recipient.from,x.recipient.to])]:[]),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE outbox_id=? AND state='ready' AND started_at IS NULL AND expires_at>?)`,[x.outboxId,at]),
        // Compatibilidad con ready anteriores de hasta1200: normalizar en este
        // mismo commit, antes del primer POST y sin alterar un envío iniciado.
        ...(prepared!==o.text?[guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE outbox_id=? AND text=?)`,[x.outboxId,o.text]),
          s('UPDATE sarin_wa_outbox SET text=?,stored_bytes=? WHERE outbox_id=?',prepared,preparedBytes,x.outboxId),
          s('UPDATE sarin_wa_jobs SET reserved_bytes=? WHERE job_id=?',preparedBytes,o.job_id)]:[]),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_jobs WHERE job_id=? AND quota_state='reserved')`,[o.job_id]),
        // Cambiar de día/mes no conserva un cupo del periodo anterior.
        closureGuard(at),...release(o.job_id),
        guard(`COALESCE((SELECT consumed+reserved FROM sarin_wa_send_quota WHERE day_key=?),0)<? AND
          COALESCE((SELECT SUM(consumed+reserved) FROM sarin_wa_send_quota WHERE month_key=?),0)<?`,[day,config.dailyAttempts,month,config.monthlyAttempts],'quota'),
        s(`INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed) VALUES(?,?,1) ON CONFLICT(day_key) DO UPDATE SET consumed=consumed+1`,day,month),
        s("UPDATE sarin_wa_jobs SET quota_day=?,quota_month=?,quota_state='consumed' WHERE job_id=?",day,month,o.job_id),
        s("UPDATE sarin_wa_outbox SET state='sending',started_at=? WHERE outbox_id=?",at,x.outboxId),
        s(`SELECT o.*,i.waba_id,i.business_phone,i.peer_phone FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id
          JOIN sarin_wa_inbox i ON i.event_id=j.event_id WHERE o.outbox_id=?`,x.outboxId)]);
      const finalResult=result.at(-1);
      if(!finalResult)throw new WhatsAppWorkError(503,'work_unavailable');
      const r=finalResult.results[0];
      requireThat(r,'work_unavailable',503);
      return /** @type {SendPermit} */({outboxId:r.outbox_id,externalId:r.external_id,text:r.text,purpose:r.purpose,version:r.version,wabaId:r.waba_id,from:r.business_phone,to:r.peer_phone,expiresAt:r.expires_at});
    }),
    finishSend:guarded(async(x)=>{
      requireThat(x&&randomId(x.outboxId)&&randomId(x.token)&&x.result&&['accepted','rejected','uncertain'].includes(x.result.status)
        && (x.result.status!=='accepted'||providerId(x.result.providerId)) && (x.result.wamid===undefined||providerId(x.result.wamid,512)));
      const at=clock(),next=x.result.status==='uncertain'?'send_uncertain':x.result.status;
      const results=await batch([guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id WHERE o.outbox_id=?
        AND j.token=? AND j.lease_until>? AND o.started_at IS NOT NULL AND o.state IN('sending','accepted','sent','delivered','read','failed'))`,[x.outboxId,x.token,at]),
        s(`UPDATE sarin_wa_outbox SET conflict=1 WHERE outbox_id=? AND
          ((provider_id IS NOT NULL AND ? IS NOT NULL AND provider_id<>?) OR (wamid IS NOT NULL AND ? IS NOT NULL AND wamid<>?)
           OR EXISTS(SELECT 1 FROM sarin_wa_delivery_targets other WHERE other.outbox_id<>? AND other.provider_id=?)
           OR (delivered_at IS NOT NULL AND ?='rejected'))`,x.outboxId,x.result.providerId??null,x.result.providerId??null,x.result.wamid??null,x.result.wamid??null,x.outboxId,x.result.providerId??null,next),
        s(`UPDATE sarin_wa_outbox SET provider_id=COALESCE(provider_id,?),wamid=COALESCE(wamid,?),
          state=CASE WHEN state IN('delivered','read','failed') THEN state WHEN state='sent' AND ?='accepted' THEN state ELSE ? END
          WHERE outbox_id=? AND conflict=0`,x.result.providerId??null,x.result.wamid??null,next,next,x.outboxId),
        s(`UPDATE sarin_wa_jobs SET state='completed',token=NULL,lease_until=NULL WHERE job_id=(SELECT job_id FROM sarin_wa_outbox WHERE outbox_id=?)`,x.outboxId),
        s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE peer_key=(SELECT peer_key FROM sarin_wa_outbox WHERE outbox_id=? AND context_id=sarin_wa_contexts.context_id AND (state IN('rejected','failed','send_uncertain') OR conflict=1))`,x.outboxId),
        settleLookup(x.outboxId,at),s('SELECT conflict,peer_key FROM sarin_wa_outbox WHERE outbox_id=?',x.outboxId)]);
      const o=results[results.length-1].results[0];
      requireThat(!o.conflict,'work_conflict',409);
      await api.reconcileConsent({peerKey:o.peer_key});return {status:next};
    }),
    applyStatus:guarded(/** @param {DeliveryObservation} event */event=>applyObservation(event)),
    listDispatchable:guarded(async({limit=100}={})=>{
      requireThat(Number.isInteger(limit)&&limit>0&&limit<=500);const at=clock();
      const rows=await read(`SELECT j.job_id,j.epoch ${FROM} WHERE ${LIVE} AND ((j.state='queued' AND j.inference_started_at IS NULL AND ${UNBLOCKED}
        AND NOT EXISTS(SELECT 1 FROM sarin_wa_jobs a WHERE a.peer_key=j.peer_key AND a.state IN('claimed','inference_started','ready'))
        AND NOT EXISTS(SELECT 1 FROM sarin_wa_jobs a WHERE a.peer_key=j.peer_key AND a.context_id=j.context_id AND a.state='queued'
          AND (a.created_at<j.created_at OR (a.created_at=j.created_at AND a.job_id<j.job_id))))
        OR (j.state='ready' AND (j.lease_until IS NULL OR j.lease_until<=t.at) AND EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=j.job_id AND o.state='ready' AND o.started_at IS NULL)))
        ORDER BY j.created_at,j.job_id LIMIT ?`,at,limit);
      return rows.map(r=>({jobId:r.job_id,epoch:r.epoch}));
    }),
    expireLeases:guarded(async({limit=100}={})=>{
      requireThat(Number.isInteger(limit)&&limit>0&&limit<=500);const at=clock();
      const jobs=await read(`SELECT job_id FROM sarin_wa_jobs WHERE (lease_until<=? AND state IN('claimed','inference_started','ready'))
        OR (expires_at<=? AND state IN('queued','claimed','inference_started','ready'))
        OR ((lease_until<=? OR expires_at<=?) AND EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id AND o.state='sending')) ORDER BY created_at,job_id LIMIT ?`,at,at,at,at,limit);
      for(const j of jobs)await batch([
        s(`UPDATE sarin_wa_outbox SET state='send_uncertain' WHERE job_id=? AND state='sending' AND EXISTS(SELECT 1 FROM sarin_wa_jobs WHERE job_id=? AND (lease_until<=? OR expires_at<=?))`,j.job_id,j.job_id,at,at),
        s(`UPDATE sarin_wa_jobs SET state=CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE job_id=? AND started_at IS NOT NULL) THEN 'completed'
          WHEN state='inference_started' THEN 'inference_uncertain' WHEN expires_at<=? THEN 'expired' WHEN state='claimed' THEN 'queued' ELSE state END,
          token=NULL,lease_until=NULL WHERE job_id=? AND (lease_until<=? OR expires_at<=?)`,j.job_id,at,j.job_id,at,at),
        s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE peer_key=(SELECT peer_key FROM sarin_wa_jobs WHERE job_id=? AND context_id=sarin_wa_contexts.context_id
          AND (state='inference_uncertain' OR EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE job_id=? AND state='send_uncertain')))`,j.job_id,j.job_id),
        s(`UPDATE sarin_wa_send_quota SET reserved=reserved-1 WHERE day_key=(SELECT quota_day FROM sarin_wa_jobs WHERE job_id=? AND quota_state='reserved' AND state IN('expired','inference_uncertain'))`,j.job_id),
        s(`UPDATE sarin_wa_jobs SET quota_state='released',reserved_bytes=CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE job_id=?) THEN reserved_bytes ELSE 0 END
          WHERE job_id=? AND quota_state='reserved' AND state IN('expired','inference_uncertain')`,j.job_id,j.job_id)]);
      return {processed:jobs.length};
    }),
    setPilotMode:guarded(async({enabled,expectedRevision,actor})=>{
      requireThat(typeof enabled==='boolean'&&integer(expectedRevision)&&id(actor));const at=clock(),epoch=crypto.randomUUID();
      await batch([guard('EXISTS(SELECT 1 FROM sarin_wa_pilot WHERE revision=?)',[expectedRevision],'conflict'),
        s('UPDATE sarin_wa_pilot SET enabled=?,revision=revision+1,epoch=?,activation_at=? WHERE id=1',Number(enabled),epoch,at),
        s(`UPDATE sarin_wa_send_quota SET reserved=0`),
        s(`UPDATE sarin_wa_outbox SET state='cancelled' WHERE state='ready'`),
        s(`UPDATE sarin_wa_jobs SET state=CASE WHEN state='inference_started' THEN 'inference_uncertain' ELSE 'cancelled' END,
          token=NULL,lease_until=NULL,quota_state=CASE WHEN quota_state='reserved' THEN 'released' ELSE quota_state END,
          reserved_bytes=CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id) THEN reserved_bytes ELSE 0 END
          WHERE state IN('queued','claimed','inference_started','ready') AND NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id AND o.started_at IS NOT NULL)`),
        s(`UPDATE sarin_wa_contexts SET context_id=lower(hex(randomblob(16))),activation_at=?,revision=revision+1,pending_acceptance_event_id=NULL,pending_accepted_at=NULL WHERE activation_at>0`,at),
        s('INSERT INTO sarin_wa_audit(audit_id,actor,action,revision,at) VALUES(?,?,?,?,?)',crypto.randomUUID(),actor,enabled?'enable':'disable',expectedRevision+1,at)]);
      return {enabled,revision:expectedRevision+1,epoch};
    }),
    pausePeer:guarded(async(x)=>control(x,true)),
    resumePeer:guarded(async(x)=>control(x,false)),
    listPeers:guarded(async({limit=100,cursor=''}={})=>{
      requireThat(Number.isInteger(limit)&&limit>0&&limit<=500&&(cursor===''||id(cursor)));
      const rows=await read(`SELECT ${PEER_SUMMARY} FROM sarin_wa_contexts c CROSS JOIN (SELECT ? AS at) t
        WHERE c.peer_key>? ORDER BY c.peer_key LIMIT ?`,clock(),cursor,limit);
      return {peers:rows,cursor:rows.length===limit?rows.at(-1).peer_key:null};
    }),
    getPeer:guarded(async({peerKey})=>{
      requireThat(id(peerKey));const at=clock();
      const peer=(await read(`SELECT ${PEER_SUMMARY} FROM sarin_wa_contexts c CROSS JOIN (SELECT ? AS at) t
        WHERE c.peer_key=?`,at,peerKey))[0];
      if(!peer)return null;
      const events=await read(`SELECT i.event_id,i.kind,i.media_type,COALESCE(i.text,a.transcript) AS text,i.sent_at,i.expires_at
        FROM sarin_wa_inbox i LEFT JOIN sarin_wa_audio a ON a.event_id=i.event_id WHERE i.peer_key=? AND i.expires_at>? ORDER BY i.received_at DESC LIMIT 20`,peerKey,at);
      const outputs=await read(`SELECT outbox_id,purpose,state,text,created_at,started_at,delivered_at,expires_at,conflict,reconcile_state,reconcile_attempts,reconcile_next_at,reconcile_last_result,reconcile_updated_at,
        (started_at IS NOT NULL AND provider_id IS NOT NULL AND conflict=0 AND reconcile_attempts<3
          AND state IN('sending','accepted','sent','send_uncertain') AND reconcile_state IN('idle','pending','claimed')
          AND created_at>=(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1)) AS reconcile_available FROM sarin_wa_outbox WHERE peer_key=? AND expires_at>? ORDER BY created_at DESC LIMIT 20`,peerKey,at);
      const alert=(await read(`SELECT state,conflict,created_at,started_at,delivered_at,expires_at,context_id,peer_revision
        FROM sarin_wa_handoff WHERE peer_key=? AND receipt_expires_at>? ORDER BY created_at DESC LIMIT 1`,peerKey,at))[0];
      let handoff;
      if(alert){
        const stale=!alert.started_at&&(alert.context_id!==peer.context_id||alert.peer_revision!==peer.revision||!peer.paused);
        const state=stale?'cancelled':!alert.started_at&&alert.expires_at<=at?'expired':alert.conflict?'send_uncertain':
          ({queued:'pending',sending:'pending',sent:'accepted',rejected:'failed',uncertain:'send_uncertain'}[alert.state]??alert.state);
        handoff={state,updatedAt:alert.delivered_at??alert.started_at??alert.created_at};
      }
      return {...peer,events,outputs,...(handoff?{handoff}:{})};
    }),
  };
  /** @param {any} x @param {boolean} paused */
  async function control(x,paused) {
    requireThat(x&&id(x.peerKey)&&integer(x.expectedRevision)&&id(x.actor));const at=clock(),contextId=crypto.randomUUID();
    await batch([guard('EXISTS(SELECT 1 FROM sarin_wa_contexts WHERE peer_key=? AND revision=?)',[x.peerKey,x.expectedRevision],'conflict'),
      s(`UPDATE sarin_wa_contexts SET paused=?,revision=revision+1,context_id=?,activation_at=?,pending_acceptance_event_id=NULL,pending_accepted_at=NULL WHERE peer_key=?`,Number(paused),contextId,at,x.peerKey),
      s(`UPDATE sarin_wa_send_quota SET reserved=reserved-(SELECT COUNT(*) FROM sarin_wa_jobs WHERE peer_key=? AND quota_state='reserved' AND quota_day=day_key)
        WHERE day_key IN(SELECT quota_day FROM sarin_wa_jobs WHERE peer_key=? AND quota_state='reserved')`,x.peerKey,x.peerKey),
      s(`UPDATE sarin_wa_outbox SET state='cancelled' WHERE peer_key=? AND state='ready'`,x.peerKey),
      s(`UPDATE sarin_wa_jobs SET state=CASE WHEN state='inference_started' THEN 'inference_uncertain' ELSE 'cancelled' END,
        token=NULL,lease_until=NULL,quota_state=CASE WHEN quota_state='reserved' THEN 'released' ELSE quota_state END,
        reserved_bytes=CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id) THEN reserved_bytes ELSE 0 END
        WHERE peer_key=? AND state IN('queued','claimed','inference_started','ready') AND NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id AND o.started_at IS NOT NULL)`,x.peerKey),
      s('INSERT INTO sarin_wa_audit(audit_id,actor,action,peer_key,revision,at) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),x.actor,paused?'pause':'resume',x.peerKey,x.expectedRevision+1,at)]);
    return {peerKey:x.peerKey,paused,revision:x.expectedRevision+1,contextId};
  }
  return api;
}
