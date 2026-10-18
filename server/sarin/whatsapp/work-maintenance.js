// @ts-check
/** @typedef {import('./ingress-store.js').Database} Database */
/** @param {number} at */
function validTime(at){if(!Number.isSafeInteger(at)||at<0||at>8640000000000000-35*86400000)throw new Error('wa_maintenance_invalid');}
/** Borrado acotado: nunca salda ni reembolsa las reservas monetarias enlazadas.
 * @param {{db:Database,now?:()=>number,limit?:number}} options */
export async function purgeWhatsAppWork({db,now=Date.now,limit=100}) {
 const at=now();validTime(at);if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw new Error('wa_maintenance_invalid');
 const month=new Date(at).toISOString().slice(0,7);
 /** @param {string} sql @param {...any} args */
 const s=(sql,...args)=>db.prepare(sql).bind(...args);
 const selected=`SELECT job_id FROM sarin_wa_jobs WHERE expires_at<=? ORDER BY expires_at,job_id LIMIT ?`;
 // Marca transitoria dentro de UN batch: congela el conjunto sin tabla auxiliar ni tokens reutilizables.
 // Los vencimientos de contenido van primero y coinciden con el conjunto que se borrara abajo.
 const marker=crypto.randomUUID();
 const expiry=[
  s(`UPDATE sarin_wa_jobs SET token=? WHERE job_id IN(SELECT j.job_id FROM sarin_wa_jobs j
    WHERE expires_at<=? OR (lease_until<=? AND (state IN('claimed','inference_started','ready')
      OR EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=j.job_id AND o.state='sending')))
    ORDER BY CASE WHEN expires_at<=? THEN 0 ELSE 1 END,expires_at,job_id LIMIT ?)`,marker,at,at,at,limit),
  s(`UPDATE sarin_wa_outbox SET state='send_uncertain' WHERE state='sending'
    AND job_id IN(SELECT job_id FROM sarin_wa_jobs WHERE token=?)`,marker),
  s(`UPDATE sarin_wa_jobs SET state=CASE
    WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id AND o.started_at IS NOT NULL) THEN 'completed'
    WHEN state='inference_started' THEN 'inference_uncertain' WHEN expires_at<=? THEN 'expired'
    WHEN state='claimed' THEN 'queued' ELSE state END
    WHERE token=? AND state IN('queued','claimed','inference_started','ready')`,at,marker),
  s(`UPDATE sarin_wa_contexts SET paused=1,revision=revision+1 WHERE EXISTS(
    SELECT 1 FROM sarin_wa_jobs j WHERE j.token=? AND j.peer_key=sarin_wa_contexts.peer_key
      AND j.context_id=sarin_wa_contexts.context_id AND (j.state='inference_uncertain'
        OR EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=j.job_id AND o.state='send_uncertain')))`,marker),
  s(`UPDATE sarin_wa_send_quota SET reserved=reserved-(SELECT COUNT(*) FROM sarin_wa_jobs j
    WHERE j.token=? AND j.quota_day=day_key AND j.quota_state='reserved' AND j.state IN('expired','inference_uncertain'))`,marker),
  s(`UPDATE sarin_wa_jobs SET quota_state='released',reserved_bytes=CASE
    WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id) THEN reserved_bytes ELSE 0 END
    WHERE token=? AND quota_state='reserved' AND state IN('expired','inference_uncertain')`,marker),
  s('UPDATE sarin_wa_jobs SET token=NULL,lease_until=NULL WHERE token=?',marker),
  s(`UPDATE sarin_wa_outbox SET
    reconcile_state=CASE WHEN conflict=1 THEN 'conflict' WHEN state IN('delivered','read','failed','rejected') THEN 'complete'
      WHEN reconcile_attempts>=3 OR expires_at<=? OR created_at<(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1) THEN 'exhausted' ELSE 'pending' END,
    reconcile_next_at=reconcile_lease_until+60000,reconcile_token=NULL,reconcile_lease_until=NULL,
    reconcile_last_result='lease_expired',reconcile_updated_at=? WHERE outbox_id IN(SELECT outbox_id FROM sarin_wa_outbox
      WHERE reconcile_state='claimed' AND reconcile_lease_until<=? ORDER BY reconcile_lease_until,outbox_id LIMIT ?)`,at,at,at,limit)
 ];
 const all=await db.batch([...expiry,
  s(`UPDATE sarin_wa_send_quota SET reserved=reserved-(SELECT COUNT(*) FROM sarin_wa_jobs j
    WHERE j.quota_state='reserved' AND j.quota_day=day_key AND j.job_id IN(${selected}))`,at,limit),
  s(`UPDATE sarin_wa_jobs SET quota_state=CASE WHEN quota_state='reserved' THEN 'released' ELSE quota_state END,
    reserved_bytes=0,token=NULL,lease_until=NULL WHERE job_id IN(${selected})`,at,limit),
  s(`DELETE FROM sarin_wa_outbox WHERE job_id IN(${selected}) RETURNING outbox_id`,at,limit),
  s(`DELETE FROM sarin_wa_inference_reservations WHERE job_id IN(${selected})`,at,limit),
  s(`DELETE FROM sarin_wa_jobs WHERE job_id IN(${selected}) RETURNING job_id`,at,limit),
  s(`UPDATE sarin_wa_contexts SET context_id=lower(hex(randomblob(16))),revision=revision+1,activation_at=MAX(activation_at,?),
    pending_acceptance_event_id=NULL,pending_accepted_at=NULL,accepted_at=NULL,acceptance_event_id=NULL,consent_expires_at=NULL,
    consent_notice_id=NULL,consent_version=NULL,consent_hash=NULL WHERE peer_key IN(SELECT c.peer_key FROM sarin_wa_contexts c
      WHERE (c.acceptance_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sarin_wa_consent_proofs p
        WHERE p.acceptance_event_id=c.acceptance_event_id AND p.conflict=0 AND p.expires_at>? AND p.consent_expires_at>?))
        OR (c.acceptance_event_id IS NULL AND c.consent_notice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.outbox_id=c.consent_notice_id))
      ORDER BY c.peer_key LIMIT ?)`,at,at,at,limit),
  s(`UPDATE sarin_wa_contexts SET pending_acceptance_event_id=NULL,pending_accepted_at=NULL WHERE peer_key IN(
    SELECT peer_key FROM sarin_wa_contexts WHERE pending_acceptance_event_id IS NOT NULL
      AND (pending_accepted_at+86400000<=? OR NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.outbox_id=consent_notice_id AND o.expires_at>?)) LIMIT ?)`,at,at,limit),
  s(`DELETE FROM sarin_wa_consent_proofs WHERE acceptance_event_id IN(SELECT acceptance_event_id FROM sarin_wa_consent_proofs WHERE expires_at<=? ORDER BY expires_at LIMIT ?) RETURNING acceptance_event_id`,at,limit),
  s(`DELETE FROM sarin_wa_control_events WHERE event_id IN(SELECT event_id FROM sarin_wa_control_events WHERE expires_at<=? ORDER BY expires_at LIMIT ?) RETURNING event_id`,at,limit),
  s(`DELETE FROM sarin_wa_delivery_observations WHERE event_id IN(SELECT event_id FROM sarin_wa_delivery_observations WHERE expires_at<=? ORDER BY expires_at LIMIT ?) RETURNING event_id`,at,limit),
  s(`DELETE FROM sarin_wa_audit WHERE audit_id IN(SELECT audit_id FROM sarin_wa_audit WHERE at<=? ORDER BY at LIMIT ?) RETURNING audit_id`,at-172800000,limit),
  s(`DELETE FROM sarin_wa_send_quota WHERE day_key IN(SELECT day_key FROM sarin_wa_send_quota q WHERE month_key<? AND reserved=0
    AND NOT EXISTS(SELECT 1 FROM sarin_wa_jobs j WHERE j.quota_day=q.day_key AND j.quota_state='reserved') ORDER BY day_key LIMIT ?)`,month,limit),
  s(`SELECT EXISTS(SELECT 1 FROM sarin_wa_jobs WHERE expires_at<=?) OR EXISTS(SELECT 1 FROM sarin_wa_consent_proofs WHERE expires_at<=?)
    OR EXISTS(SELECT 1 FROM sarin_wa_control_events WHERE expires_at<=?) OR EXISTS(SELECT 1 FROM sarin_wa_delivery_observations WHERE expires_at<=?)
    OR EXISTS(SELECT 1 FROM sarin_wa_outbox WHERE reconcile_state='claimed' AND reconcile_lease_until<=?)
    OR EXISTS(SELECT 1 FROM sarin_wa_jobs j WHERE lease_until<=? AND (state IN('claimed','inference_started','ready')
      OR EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=j.job_id AND o.state='sending')))
    OR EXISTS(SELECT 1 FROM sarin_wa_audit WHERE at<=?) OR EXISTS(SELECT 1 FROM sarin_wa_send_quota q WHERE month_key<? AND reserved=0
      AND NOT EXISTS(SELECT 1 FROM sarin_wa_jobs j WHERE j.quota_day=q.day_key AND j.quota_state='reserved'))
    OR EXISTS(SELECT 1 FROM sarin_wa_contexts c WHERE (acceptance_event_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM sarin_wa_consent_proofs p WHERE p.acceptance_event_id=c.acceptance_event_id AND p.conflict=0 AND p.expires_at>? AND p.consent_expires_at>?))
      OR (c.acceptance_event_id IS NULL AND c.consent_notice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.outbox_id=c.consent_notice_id))
      OR (pending_acceptance_event_id IS NOT NULL AND (pending_accepted_at+86400000<=? OR NOT EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.outbox_id=c.consent_notice_id AND o.expires_at>?)))) AS remaining`,at,at,at,at,at,at,at-172800000,month,at,at,at,at)
 ]);
 if(all.length!==expiry.length+13||all.some(r=>r.success!==true||!Array.isArray(r.results)))throw new Error('wa_maintenance_failed');
 const result=all.slice(expiry.length);
 return {jobs:result[4].results.length,outbox:result[2].results.length,consents:result[7].results.length,
 audits:result[10].results.length,observations:result[8].results.length+result[9].results.length,remaining:Boolean(result[12].results[0]?.remaining)};
}
/** Solo compone el batch atomico de recuperacion; el llamador valida esquema y drena peticiones.
 * @param {{db:Database,at:number}} options */
export function getWhatsAppWorkRecoveryStatements({db,at}) {
 validTime(at);
 /** @param {string} sql @param {...any} args */
 const s=(sql,...args)=>db.prepare(sql).bind(...args);
 const day=new Date(at).toISOString().slice(0,10),month=day.slice(0,7);
 const endDay=Date.parse(day+'T00:00:00Z')+86400000;
 const endMonth=Date.parse(month+'-01T00:00:00Z');const d=new Date(endMonth);d.setUTCMonth(d.getUTCMonth()+1);
 return [
  s('UPDATE sarin_wa_pilot SET enabled=0,revision=revision+1,epoch=?,activation_at=MAX(activation_at,?) WHERE id=1',crypto.randomUUID(),at),
  ...[['day',day,endDay],['month',month,d.getTime()]].map(([scope,key,end])=>s(`INSERT INTO sarin_wa_send_closures(scope,period_key,closed_at,period_end_at,reason) VALUES(?,?,?,?,'restore')
    ON CONFLICT(scope,period_key) DO UPDATE SET period_end_at=MAX(period_end_at,excluded.period_end_at)`,scope,key,at,end)),
  s('UPDATE sarin_state SET blocked=1'),
  s(`UPDATE sarin_wa_send_quota SET reserved=reserved-(SELECT COUNT(*) FROM sarin_wa_jobs j WHERE j.quota_day=day_key AND j.quota_state='reserved')`),
  s('DELETE FROM sarin_wa_outbox'),s('DELETE FROM sarin_wa_inference_reservations'),s('DELETE FROM sarin_wa_jobs'),
  s('DELETE FROM sarin_wa_consent_proofs'),s('DELETE FROM sarin_wa_delivery_observations'),s('DELETE FROM sarin_wa_control_events'),
  s('DELETE FROM sarin_wa_contexts'),s('DELETE FROM sarin_wa_audit')
 ];
}
