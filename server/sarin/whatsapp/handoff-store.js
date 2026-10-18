// @ts-check
/** @typedef {import('./ingress-store.js').Database} Database */
/** @typedef {{wabaId:string,businessPhone:string,ownerPhone:string}} HandoffIdentity */
const DAY = 86400000;
const validTime = value => Number.isSafeInteger(value) && value >= 0 && value < 8640000000000000 - 2 * DAY;
const phone = value => typeof value === 'string' && /^\+[1-9]\d{1,14}$/.test(value);
const id = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const providerId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const contactLabel = value => value.length>=7?'*** '+value.slice(-4):'***';
const LIVE = `h.started_at IS NULL AND h.conflict=0 AND h.state IN('queued','waiting_template') AND h.expires_at>t.at
  AND h.created_at>=(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1)
  AND c.context_id=h.context_id AND c.revision=h.peer_revision AND c.paused=1
  AND p.enabled=1 AND p.epoch=h.epoch AND i.kind='inbound' AND i.expires_at>t.at
  AND i.sent_at>MAX(c.activation_at,p.activation_at) AND i.created_at>MAX(c.activation_at,p.activation_at)
  AND i.waba_id=? AND i.business_phone=?`;
const SOURCE = `FROM sarin_wa_handoff h JOIN sarin_wa_contexts c ON c.peer_key=h.peer_key
  JOIN sarin_wa_inbox i ON i.event_id=h.event_id CROSS JOIN sarin_wa_pilot p CROSS JOIN(SELECT ? AS at) t`;
const WINDOW = `EXISTS(SELECT 1 FROM sarin_wa_inbox owner WHERE owner.kind='inbound'
  AND owner.waba_id=? AND owner.business_phone=? AND owner.peer_phone=? AND owner.expires_at>?
  AND owner.sent_at>? AND owner.sent_at<=? AND owner.created_at<=?)`;
export class HandoffStoreError extends Error {
  constructor(code) { super(code); this.name='HandoffStoreError'; this.code=code; }
}
function requireThat(test, code='handoff_invalid') { if (!test) throw new HandoffStoreError(code); }
function identity(value) { requireThat(value && typeof value.wabaId==='string' && /^[1-9]\d{0,31}$/.test(value.wabaId)
  && phone(value.businessPhone) && phone(value.ownerPhone) && value.businessPhone!==value.ownerPhone); }
/** @param {{db:Database,now?:()=>number}} options */
export function createWhatsAppHandoffStore({db,now=Date.now}) {
  requireThat(db && typeof db.prepare==='function' && typeof db.batch==='function' && typeof now==='function');
  const at=()=>{const value=now();requireThat(validTime(value));return value;};
  const s=(sql,...values)=>db.prepare(sql).bind(...values);
  async function batch(statements) {
    try {
      const result=await db.batch(statements);
      requireThat(result.length===statements.length && result.every(r=>r.success===true && Array.isArray(r.results)),'handoff_unavailable');
      return result;
    } catch(error) {
      if(error instanceof HandoffStoreError)throw error;
      const message=error instanceof Error?error.message:'';
      throw new HandoffStoreError(message.includes('WA_WORK_QUOTA')?'handoff_quota'
        :message.includes('WA_WORK_DENIED')||message.includes('WA_HANDOFF_DENIED')?'handoff_denied':'handoff_unavailable');
    }
  }
  const guard=(condition,values,code='denied')=>s(`INSERT INTO sarin_wa_work_guard(code) SELECT '${code}' WHERE NOT (${condition})`,...values);
  const windowValues=(x,time)=>[x.wabaId,x.businessPhone,x.ownerPhone,time,time-DAY,time,time];
  return {
    /** @param {HandoffIdentity} x */
    async next(x) {
      identity(x);const time=at();
      const result=await batch([s(`SELECT h.alert_id,i.peer_phone,(${WINDOW}) AS owner_open ${SOURCE}
        WHERE ${LIVE} ORDER BY h.created_at,h.alert_id LIMIT 1`,...windowValues(x,time),time,x.wabaId,x.businessPhone)]);
      const row=result[0].results[0];
      return row?{alertId:row.alert_id,contactLabel:contactLabel(row.peer_phone),
        ownerWindowOpen:row.owner_open===1}:null;
    },
    /** @param {{alertId:string}} x */
    async waitForTemplate(x) {
      requireThat(id(x?.alertId));
      await batch([s(`UPDATE sarin_wa_handoff SET state='waiting_template' WHERE alert_id=? AND state='queued' AND started_at IS NULL`,x.alertId)]);
    },
    /** @param {HandoffIdentity & {alertId:string,mode:'text'|'template'}} x */
    async beginSend(x) {
      identity(x);requireThat(id(x.alertId)&&['text','template'].includes(x.mode));const time=at();
      const day=new Date(time).toISOString().slice(0,10),month=day.slice(0,7);
      const result=await batch([
        guard(`EXISTS(SELECT 1 ${SOURCE} WHERE h.alert_id=? AND ${LIVE})`,[time,x.alertId,x.wabaId,x.businessPhone]),
        ...(x.mode==='text'?[guard(WINDOW,windowValues(x,time))]:[]),
        guard(`NOT EXISTS(SELECT 1 FROM sarin_wa_send_closures WHERE period_end_at>?
          AND ((scope='day' AND period_key=?) OR (scope='month' AND period_key=?)))`,[time,day,month],'quota'),
        guard(`COALESCE((SELECT consumed+reserved FROM sarin_wa_send_quota WHERE day_key=?),0)<20
          AND COALESCE((SELECT SUM(consumed+reserved) FROM sarin_wa_send_quota WHERE month_key=?),0)<100`,[day,month],'quota'),
        s(`INSERT INTO sarin_wa_send_quota(day_key,month_key,consumed) VALUES(?,?,1)
          ON CONFLICT(day_key) DO UPDATE SET consumed=consumed+1`,day,month),
        s(`UPDATE sarin_wa_handoff SET state='sending',started_at=?,waba_id=?,business_phone=?,owner_phone=?,mode=? WHERE alert_id=?`,time,x.wabaId,x.businessPhone,x.ownerPhone,x.mode,x.alertId),
        s(`SELECT h.alert_id,h.external_id,h.peer_key,i.peer_phone,h.owner_phone,h.business_phone,h.waba_id
          FROM sarin_wa_handoff h JOIN sarin_wa_inbox i ON i.event_id=h.event_id WHERE h.alert_id=?`,x.alertId),
      ]);
      const row=result.at(-1).results[0];requireThat(row,'handoff_unavailable');
      return {alertId:row.alert_id,externalId:row.external_id,to:row.owner_phone,from:row.business_phone,wabaId:row.waba_id,
        contactLabel:contactLabel(row.peer_phone),panelUrl:'https://www.alsdevstudio.com/control-sarin/#whatsapp='+row.peer_key};
    },
    /** @param {{alertId:string,result:{status:'accepted'|'rejected'|'uncertain',providerId?:string,wamid?:string}}} x */
    async finishSend(x) {
      requireThat(id(x?.alertId)&&['accepted','rejected','uncertain'].includes(x?.result?.status));
      if(x.result.status==='accepted')requireThat(providerId(x.result.providerId));
      if(x.result.wamid!==undefined)requireThat(typeof x.result.wamid==='string'&&/^[\x21-\x7e]{1,512}$/.test(x.result.wamid));
      await batch([s(`UPDATE sarin_wa_handoff SET conflict=MAX(conflict,CASE
          WHEN provider_id IS NOT NULL AND ? IS NOT NULL AND provider_id<>? THEN 1
          WHEN wamid IS NOT NULL AND ? IS NOT NULL AND wamid<>? THEN 1 ELSE 0 END),
        provider_id=COALESCE(provider_id,?),wamid=COALESCE(wamid,?),
        state=CASE WHEN state='sending' THEN ? ELSE state END
        WHERE alert_id=? AND started_at IS NOT NULL AND receipt_expires_at>?`,x.result.providerId??null,x.result.providerId??null,
        x.result.wamid??null,x.result.wamid??null,x.result.providerId??null,x.result.wamid??null,x.result.status,x.alertId,at())]);
    },
    /** @param {import('./work-contracts.js').DeliveryObservation} x */
    async applyStatus(x) {
      requireThat(x && ['accepted','sent','delivered','read','failed'].includes(x.status) && validTime(x.at)
        && (x.providerId===undefined||providerId(x.providerId)) && (x.providerId!==undefined||typeof x.externalId==='string'));
      const time=at();if(x.at>time+300000)return {status:'ignored'};
      const rows=(await batch([s(`SELECT * FROM sarin_wa_handoff WHERE started_at IS NOT NULL AND receipt_expires_at>?
        AND (provider_id=? OR external_id=?)`,time,x.providerId??null,x.externalId??null)]))[0].results;
      if(rows.length!==1)return {status:'ignored'};const row=rows[0];
      if((x.providerId!==undefined&&row.provider_id!==null&&row.provider_id!==x.providerId)
        ||(x.externalId!==undefined&&row.external_id!==x.externalId)
        ||(x.wabaId!==undefined&&row.waba_id!==x.wabaId)||(x.from!==undefined&&row.business_phone!==x.from)
        ||(x.to!==undefined&&row.owner_phone!==x.to)||x.at<row.started_at
        ||(x.wamid!==undefined&&(typeof x.wamid!=='string'||!/^[\x21-\x7e]{1,512}$/.test(x.wamid)
          ||(row.wamid!==null&&row.wamid!==x.wamid))))return {status:'ignored'};
      await batch([s(`UPDATE sarin_wa_handoff SET provider_id=COALESCE(provider_id,?),wamid=COALESCE(wamid,?),
        delivered_at=CASE WHEN ? IN('delivered','read') THEN COALESCE(delivered_at,?) ELSE delivered_at END,
        state=CASE WHEN state='read' THEN state WHEN state='delivered' AND ?<>'read' THEN state
          WHEN ?='accepted' AND state IN('sent','failed','rejected') THEN state
          WHEN ?='sent' AND state IN('failed','rejected') THEN state ELSE ? END
        WHERE alert_id=? AND started_at IS NOT NULL AND receipt_expires_at>? AND conflict=0
          AND (provider_id IS NULL OR provider_id=?) AND (wamid IS NULL OR ? IS NULL OR wamid=?)`,
        x.providerId??null,x.wamid??null,x.status,x.at,x.status,x.status,x.status,x.status,row.alert_id,time,
        x.providerId??row.provider_id,x.wamid??null,x.wamid??null)]);
      return {status:'observed'};
    },
  };
}
/** @param {{db:Database,now?:()=>number,limit?:number}} options */
export async function purgeWhatsAppHandoff({db,now=Date.now,limit=100}) {
  const time=now();requireThat(validTime(time)&&Number.isSafeInteger(limit)&&limit>=1&&limit<=500);
  const result=await db.batch([
    db.prepare(`UPDATE sarin_wa_handoff SET state=CASE WHEN started_at IS NULL THEN 'expired' ELSE 'uncertain' END
      WHERE alert_id IN(SELECT alert_id FROM sarin_wa_handoff WHERE (expires_at<=? AND state IN('queued','waiting_template'))
        OR (state='sending' AND started_at<=?) ORDER BY created_at LIMIT ?)`).bind(time,time-60000,limit),
    db.prepare(`DELETE FROM sarin_wa_handoff WHERE alert_id IN(SELECT alert_id FROM sarin_wa_handoff
      WHERE receipt_expires_at<=? ORDER BY receipt_expires_at LIMIT ?) RETURNING alert_id`).bind(time,limit),
    db.prepare(`SELECT EXISTS(SELECT 1 FROM sarin_wa_handoff WHERE receipt_expires_at<=?
      OR (expires_at<=? AND state IN('queued','waiting_template'))
      OR (state='sending' AND started_at<=?)) AS remaining`).bind(time,time,time-60000),
  ]);
  requireThat(result.length===3&&result.every(r=>r.success&&Array.isArray(r.results)),'handoff_unavailable');
  return {deleted:result[1].results.length,remaining:result[2].results[0]?.remaining===1};
}
/** Se incorpora al batch de recuperación existente; no reduce cuotas.
 * @param {{db:Database,at:number}} options */
export function getWhatsAppHandoffRecoveryStatements({db,at}) {
  requireThat(validTime(at));
  return [db.prepare(`UPDATE sarin_wa_handoff SET state=CASE WHEN started_at IS NULL THEN 'cancelled' ELSE 'uncertain' END
    WHERE state IN('queued','waiting_template','sending')`)];
}
