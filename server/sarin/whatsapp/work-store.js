// @ts-check
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
const CONSENT = `c.accepted_at IS NOT NULL AND c.accepted_at<i.sent_at AND c.consent_expires_at>t.at
  AND c.acceptance_event_id IS NOT NULL AND EXISTS(SELECT 1 FROM sarin_wa_outbox n
    WHERE n.outbox_id=c.consent_notice_id AND n.context_id=c.context_id AND n.purpose='notice'
      AND n.delivered_at IS NOT NULL AND n.version=c.consent_version AND n.hash=c.consent_hash AND n.conflict=0)`;
const FROM = `FROM sarin_wa_jobs j JOIN sarin_wa_inbox i ON i.event_id=j.event_id
  JOIN sarin_wa_contexts c ON c.peer_key=j.peer_key CROSS JOIN sarin_wa_pilot p CROSS JOIN (SELECT ? AS at) t`;
const UNBLOCKED = `NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.peer_key=j.peer_key AND o.context_id=j.context_id
  AND o.job_id<>j.job_id AND o.state NOT IN('delivered','read','cancelled','expired'))
  AND (j.deferred_reason IS NULL OR (j.deferred_reason='waiting_consent' AND (${CONSENT}))
    OR (j.deferred_reason='waiting_notice' AND EXISTS(SELECT 1 FROM sarin_wa_outbox n WHERE n.context_id=j.context_id AND n.purpose='notice' AND n.delivered_at IS NOT NULL))
    OR j.deferred_reason='waiting_delivery')`;

/** @param {{db:Database,now?:()=>number,limits?:Partial<typeof DEFAULTS>}} options */
export function createWhatsAppWorkStore({db,now=()=>Date.now(),limits={}}) {
  const config={...DEFAULTS,...limits};
  const keys=/** @type {(keyof WorkLimits)[]} */(Object.keys(DEFAULTS));
  requireThat(db && typeof db.prepare==='function' && typeof db.batch==='function' && typeof now==='function'
    && Object.keys(limits).every(k=>k in DEFAULTS)
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
  /** @param {any} x @param {number} at @param {string} states @param {boolean} [consent] */
  const permission=(x,at,states,consent=false)=>guard(`EXISTS(SELECT 1 ${FROM} WHERE j.job_id=? AND j.token=? AND j.lease_until>t.at
    AND j.state IN(${states}) AND ${LIVE}${consent?` AND (${CONSENT})`:''})`,[at,x.jobId,x.token]);
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
  /** @param {any} x @param {number} at @param {number} bytes */
  function reserve(x,at,bytes) {
    const {day,month}=periods(at);
    return [guard(`(SELECT COUNT(*) FROM sarin_wa_jobs WHERE reserved_bytes>0)< ?
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
    const r=(await read(`SELECT i.*,c.*,p.revision AS pilot_revision,(${CONSENT}) AS consent ${FROM} WHERE j.job_id=?`,at,j.job_id))[0];
    const n=(await read(`SELECT * FROM sarin_wa_outbox WHERE context_id=? AND purpose='notice'`,j.context_id))[0];
    const pairs=await read(`SELECT i.text AS input,o.text AS reply FROM sarin_wa_outbox o
      JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
      WHERE o.context_id=? AND o.purpose='reply' AND o.delivered_at IS NOT NULL AND o.conflict=0
        AND o.expires_at>? AND i.expires_at>? ORDER BY o.created_at DESC,o.outbox_id DESC LIMIT 4`,j.context_id,at,at);
    return {jobId:j.job_id,eventId:j.event_id,epoch:j.epoch,contextId:j.context_id,peerKey:j.peer_key,peerRevision:j.peer_revision,
      pilotRevision:r.pilot_revision,input:r.text,decision:r.consent?'generate':!n?'notice':r.text.trim().toUpperCase()==='ACEPTO'?'accept_pending':'ignore',
      history:pairs.reverse().flatMap(p=>[{role:'user',content:p.input},{role:'assistant',content:p.reply}]),
      recipient:{wabaId:r.waba_id,from:r.business_phone,to:r.peer_phone},expiresAt:j.expires_at,leaseUntil:j.lease_until};
  }
  /** @param {any} x @param {string} purpose @param {string} text @param {string|null} version @param {string|null} hash */
  async function output(x,purpose,text,version,hash) {
    own(x);requireThat(typeof text==='string'&&text.trim().length>0&&text.length<=1200&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text));
    const at=clock(),outboxId=crypto.randomUUID(),externalId=crypto.randomUUID(),bytes=encoder.encode(text).byteLength;
    const fixed=purpose!=='reply';
    await batch([permission(x,at,fixed?"'claimed'":"'inference_started'",purpose!=='notice'),
      ...(fixed?[guard(`NOT EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE context_id=(SELECT context_id FROM sarin_wa_jobs WHERE job_id=?) AND purpose=?)`,[x.jobId,purpose],'conflict'),...reserve(x,at,bytes)]:[]),
      s(`INSERT INTO sarin_wa_outbox(outbox_id,job_id,peer_key,context_id,epoch,purpose,text,stored_bytes,version,hash,external_id,created_at,expires_at)
        SELECT ?,job_id,peer_key,context_id,epoch,?,?,?,?,?,?,?,expires_at FROM sarin_wa_jobs WHERE job_id=?`,outboxId,purpose,text,bytes,version,hash,externalId,at,x.jobId),
      s(`UPDATE sarin_wa_jobs SET state='ready',reserved_bytes=?,outcome=? WHERE job_id=?`,bytes,fixed?purpose:x.outcome,x.jobId)]);
    return {outboxId};
  }
  const api={
    // La creación sólo ocurre en el trigger de captura, nunca tras ACK ni por backfill.
    admitJob:guarded(async({eventId,epoch})=>{
      requireThat(id(eventId)&&randomId(epoch));
      const j=(await read('SELECT job_id,epoch FROM sarin_wa_jobs WHERE event_id=?',eventId))[0];
      return j&&j.epoch===epoch?{status:'existing',jobId:j.job_id}:{status:'ignored'};
    }),
    claimGeneration:guarded(async(x)=>{
      own(x);requireThat(randomId(x.epoch));const at=clock();
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
    createFixedReply:guarded(async(x)=>{
      requireThat(['notice','accepted'].includes(x.purpose)&&id(x.version)&&typeof x.hash==='string'&&/^[a-f0-9]{64}$/.test(x.hash));
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
        AND ${LIVE}) RETURNING job_id`,x.token,at+LEASE,at,x.jobId,x.epoch);
      if(!rows[0])return {status:'busy'};
      const o=(await read('SELECT outbox_id FROM sarin_wa_outbox WHERE job_id=?',x.jobId))[0];
      return {status:'claimed',outboxId:o.outbox_id};
    }),
    beginSend:guarded(async(x)=>{
      requireThat(x&&randomId(x.outboxId)&&randomId(x.token));const at=clock(),{day,month}=periods(at);
      const o=(await read('SELECT * FROM sarin_wa_outbox WHERE outbox_id=?',x.outboxId))[0];requireThat(o,'work_denied',409);
      const ownX={jobId:o.job_id,token:x.token};
      const result=await batch([permission(ownX,at,"'ready'",o.purpose!=='notice'),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE outbox_id=? AND state='ready' AND started_at IS NULL AND expires_at>?)`,[x.outboxId,at]),
        guard(`EXISTS(SELECT 1 FROM sarin_wa_jobs WHERE job_id=? AND quota_state='reserved')`,[o.job_id]),
        // Cambiar de día/mes no conserva un cupo del periodo anterior.
        ...release(o.job_id),
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
      return /** @type {SendPermit} */({outboxId:r.outbox_id,externalId:r.external_id,text:r.text,wabaId:r.waba_id,from:r.business_phone,to:r.peer_phone,expiresAt:r.expires_at});
    }),
    finishSend:guarded(async(x)=>{
      requireThat(x&&randomId(x.outboxId)&&randomId(x.token)&&x.result&&['accepted','rejected','uncertain'].includes(x.result.status)
        && (x.result.status!=='accepted'||id(x.result.providerId)) && (x.result.wamid===undefined||id(x.result.wamid)));
      const at=clock(),next=x.result.status==='uncertain'?'send_uncertain':x.result.status;
      await batch([guard(`EXISTS(SELECT 1 FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id WHERE o.outbox_id=?
        AND j.token=? AND j.lease_until>? AND o.started_at IS NOT NULL AND o.state IN('sending','sent','delivered','read','failed'))`,[x.outboxId,x.token,at]),
        guard(`NOT EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE outbox_id=? AND provider_id IS NOT NULL AND ? IS NOT NULL AND provider_id<>?)`,[x.outboxId,x.result.providerId??null,x.result.providerId??null],'conflict'),
        s(`UPDATE sarin_wa_outbox SET provider_id=COALESCE(provider_id,?),wamid=COALESCE(wamid,?),
          state=CASE WHEN state IN('delivered','read','failed') THEN state WHEN state='sent' AND ?='accepted' THEN state ELSE ? END,
          conflict=CASE WHEN delivered_at IS NOT NULL AND ?='rejected' THEN 1 ELSE conflict END WHERE outbox_id=?`,x.result.providerId??null,x.result.wamid??null,next,next,next,x.outboxId),
        s(`UPDATE sarin_wa_jobs SET state='completed',token=NULL,lease_until=NULL WHERE job_id=(SELECT job_id FROM sarin_wa_outbox WHERE outbox_id=?)`,x.outboxId),
        s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE peer_key=(SELECT peer_key FROM sarin_wa_outbox WHERE outbox_id=? AND context_id=sarin_wa_contexts.context_id AND (state IN('rejected','failed','send_uncertain') OR conflict=1))`,x.outboxId)]);
      return {status:next};
    }),
    applyStatus:guarded(/** @param {DeliveryObservation} event */async(event)=>{
      requireThat(event&&id(event.eventId)&&['sent','delivered','read','failed'].includes(event.status)&&integer(event.at)
        && (id(event.providerId)||randomId(event.externalId)));
      const at=clock();requireThat(event.at<=at+300000);
      const o=(await read(`SELECT o.*,i.waba_id,i.business_phone,i.peer_phone FROM sarin_wa_outbox o
        JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
        WHERE o.started_at IS NOT NULL AND ((? IS NOT NULL AND o.provider_id=?) OR (? IS NOT NULL AND o.external_id=?))`,
      event.providerId??null,event.providerId??null,event.externalId??null,event.externalId??null))[0];
      if(!o)return {status:'ignored'};
      const mismatch=(event.providerId&&o.provider_id&&event.providerId!==o.provider_id)
        || (event.externalId&&event.externalId!==o.external_id)||(event.wabaId&&event.wabaId!==o.waba_id)
        ||(event.from&&event.from!==o.business_phone)||(event.to&&event.to!==o.peer_phone);
      if(mismatch){await batch([s('UPDATE sarin_wa_outbox SET conflict=1 WHERE outbox_id=?',o.outbox_id),
        s('UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE peer_key=? AND context_id=?',o.peer_key,o.context_id)]);return {status:'ignored'};}
      const results=await batch([
        s(`INSERT INTO sarin_wa_delivery_observations(event_id,outbox_id,provider_id,status,observed_at,expires_at)
          VALUES(?,?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,event.eventId,o.outbox_id,event.providerId??null,event.status,event.at,at+2*DAY),
        s(`UPDATE sarin_wa_outbox SET provider_id=COALESCE(provider_id,?),
          delivered_at=CASE WHEN ? IN('delivered','read') THEN COALESCE(delivered_at,?) ELSE delivered_at END,
          conflict=CASE WHEN (?='failed' AND delivered_at IS NOT NULL) OR (? IN('delivered','read') AND state IN('failed','rejected')) THEN 1 ELSE conflict END,
          state=CASE WHEN state IN('failed','rejected','cancelled','expired') THEN state WHEN ?='failed' AND delivered_at IS NOT NULL THEN state
            WHEN state='read' THEN state WHEN state='delivered' AND ?='sent' THEN state ELSE ? END
          WHERE changes()=1 AND outbox_id=? AND conflict=0 AND (provider_id IS NULL OR ? IS NULL OR provider_id=?)`,event.providerId??null,event.status,event.at,event.status,event.status,event.status,event.status,event.status,o.outbox_id,event.providerId??null,event.providerId??null),
        s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE changes()=1 AND peer_key=(SELECT peer_key FROM sarin_wa_outbox WHERE outbox_id=? AND context_id=sarin_wa_contexts.context_id AND (state='failed' OR conflict=1))`,o.outbox_id)]);
      return {status:results[0].results.length?'applied':'duplicate'};
    }),
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
        OR (expires_at<=? AND state IN('queued','claimed','inference_started','ready')) ORDER BY created_at,job_id LIMIT ?`,at,at,limit);
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
        s('INSERT INTO sarin_wa_audit(audit_id,actor,action,revision,at) VALUES(?,?,?,?,?)',crypto.randomUUID(),actor,enabled?'enable':'disable',expectedRevision+1,at)]);
      return {enabled,revision:expectedRevision+1,epoch};
    }),
    pausePeer:guarded(async(x)=>control(x,true)),
    resumePeer:guarded(async(x)=>control(x,false)),
    listPeers:guarded(async({limit=100,cursor=''}={})=>{
      requireThat(Number.isInteger(limit)&&limit>0&&limit<=500&&(cursor===''||id(cursor)));
      const rows=await read(`SELECT c.peer_key,c.paused,c.revision,c.context_id,c.last_inbound_at,
        CASE WHEN c.consent_expires_at>? THEN c.consent_expires_at ELSE NULL END AS consent_expires_at
        FROM sarin_wa_contexts c WHERE c.peer_key>? ORDER BY c.peer_key LIMIT ?`,clock(),cursor,limit);
      return {peers:rows,cursor:rows.length===limit?rows.at(-1).peer_key:null};
    }),
    getPeer:guarded(async({peerKey})=>{
      requireThat(id(peerKey));const at=clock();
      const peer=(await read(`SELECT peer_key,paused,revision,context_id,last_inbound_at,
        CASE WHEN consent_expires_at>? THEN consent_expires_at ELSE NULL END AS consent_expires_at FROM sarin_wa_contexts WHERE peer_key=?`,at,peerKey))[0];
      if(!peer)return null;
      const events=await read(`SELECT event_id,kind,media_type,text,sent_at FROM sarin_wa_inbox WHERE peer_key=? AND expires_at>? ORDER BY received_at DESC LIMIT 20`,peerKey,at);
      const outputs=await read(`SELECT outbox_id,purpose,state,text,delivered_at,conflict FROM sarin_wa_outbox WHERE peer_key=? AND expires_at>? ORDER BY created_at DESC LIMIT 20`,peerKey,at);
      return {...peer,events,outputs};
    }),
  };
  /** @param {any} x @param {boolean} paused */
  async function control(x,paused) {
    requireThat(x&&id(x.peerKey)&&integer(x.expectedRevision)&&id(x.actor));const at=clock(),contextId=crypto.randomUUID();
    await batch([guard('EXISTS(SELECT 1 FROM sarin_wa_contexts WHERE peer_key=? AND revision=?)',[x.peerKey,x.expectedRevision],'conflict'),
      s(`UPDATE sarin_wa_contexts SET paused=?,revision=revision+1,context_id=?,activation_at=?,consent_version=NULL,
        consent_hash=NULL,consent_notice_id=NULL,acceptance_event_id=NULL,accepted_at=NULL,consent_expires_at=NULL,pending_acceptance_event_id=NULL WHERE peer_key=?`,Number(paused),contextId,at,x.peerKey),
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
