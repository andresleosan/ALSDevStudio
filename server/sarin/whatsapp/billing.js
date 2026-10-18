// @ts-check
/** Precios finales observados en webhooks firmados de YCloud. No es una factura
 * ni permite deducir el saldo mensual: los eventos anteriores pueden faltar.
 * La zona de la cuota del proveedor no está verificada; agrupamos por UTC. */
const MAX_RECEIPTS=100000;
const TYPES=new Set(['regular','free_customer_service','free_entry_point']);
const CATEGORIES=new Set(['marketing','utility','authentication','authentication_international','service','referral_conversion']);
const unavailable=()=>({available:false,status:'unavailable',partial:true});
const CANDIDATES=`WITH t AS(SELECT ? AS at,? AS business,? AS waba),candidates AS(
 SELECT 'outbox' AS source_type,o.outbox_id AS source_id,o.provider_id AS message_id,o.external_id,
  o.state AS status,o.started_at,o.delivered_at,i.peer_phone AS to_phone
 FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id CROSS JOIN t
 WHERE o.state IN('delivered','read') AND o.conflict=0 AND o.started_at IS NOT NULL AND o.delivered_at>=o.started_at AND o.delivered_at<=t.at
  AND o.provider_id IS NOT NULL AND o.expires_at>t.at AND j.expires_at>t.at AND i.expires_at>t.at AND i.kind='inbound'
  AND j.peer_key=o.peer_key AND j.context_id=o.context_id AND j.epoch=o.epoch AND i.peer_key=o.peer_key
  AND i.business_phone=t.business AND i.waba_id=t.waba
 UNION ALL
 SELECT 'handoff',h.alert_id,h.provider_id,h.external_id,h.state,h.started_at,h.delivered_at,h.owner_phone
 FROM sarin_wa_handoff h CROSS JOIN t WHERE h.state IN('delivered','read') AND h.conflict=0 AND h.started_at IS NOT NULL
  AND h.delivered_at>=h.started_at AND h.delivered_at<=t.at AND h.provider_id IS NOT NULL AND h.receipt_expires_at>t.at
  AND h.business_phone=t.business AND h.waba_id=t.waba)`;
/** @typedef {import('./ingress-store.js').Database} Database */
/** @typedef {{db:Database,now?:()=>number,businessPhone:string,wabaId:string}} Options */
/** @typedef {{messageId?:unknown,status?:unknown,createdAt?:unknown,from?:unknown,wabaId?:unknown,pricing?:unknown}} BillingEvent */
/** @param {unknown} value @returns {value is number} */
function timestamp(value){return Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<253339228800000;}
/** @param {string} value */
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
/** Conversión decimal exacta; nunca redondea un precio no verificable.
 * @param {unknown} value */
function micros(value){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1000000)return null;
 const match=String(value).match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/);if(!match)return null;
 const digits=BigInt(match[1]+(match[2]||'')),scale=6+Number(match[3]||0)-(match[2]||'').length;
 if(scale<0){const divisor=10n**BigInt(-scale);return digits%divisor===0n?Number(digits/divisor):null;}
 return Number(digits*10n**BigInt(scale));
}
/** @param {unknown} input @param {number} eventAt */
function pricing(input,eventAt){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const p=/** @type {Record<string,unknown>} */(input),amount=micros(p.totalPrice);
 if(p.pricingModel!=='PMP'||typeof p.pricingType!=='string'||!TYPES.has(p.pricingType)
  ||typeof p.pricingCategory!=='string'||!CATEGORIES.has(p.pricingCategory)||amount===null
  ||typeof p.currency!=='string'||!/^[A-Z]{3}$/.test(p.currency)||!timestamp(p.deliverTime)||p.deliverTime>eventAt+300000)return null;
 if(p.pricingType==='free_customer_service'&&(p.pricingCategory!=='service'||amount!==0))return null;
 if(p.pricingType==='free_entry_point'&&(p.pricingCategory!=='referral_conversion'||amount!==0))return null;
 if(p.pricingType==='regular'&&p.pricingCategory==='referral_conversion')return null;
 return {type:p.pricingType,category:p.pricingCategory,amount,currency:p.currency,deliveredAt:p.deliverTime};
}
/** Trece meses completos desde la entrega, ajustando días al fin del mes.
 * @param {number} at */
function expiry(at){const d=new Date(at),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+13);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.getTime();}
/** @param {Database} db */
async function available(db){const r=await db.batch([db.prepare(`SELECT COUNT(*) AS n,
 EXISTS(SELECT 1 FROM pragma_table_info('sarin_wa_billing_receipts') WHERE name='lookup_attempted') AS has_lookup
 FROM sqlite_master WHERE type='table' AND name IN('sarin_wa_billing_scopes','sarin_wa_billing_receipts')`)]);
 return r[0]?.success===true&&r[0]?.results?.[0]?.n===2?(r[0].results[0].has_lookup===1?10:9):0;}
/** @param {Options} options */
export function createWhatsAppBillingStore({db,now=Date.now,businessPhone,wabaId}){
 if(!db||typeof now!=='function'||!/^\+[1-9]\d{7,14}$/.test(businessPhone)||!/^\d{1,64}$/.test(wabaId))throw new Error('wa_billing_invalid');
 const scopePromise=hash(JSON.stringify(['ycloud',businessPhone,wabaId]));
 const clock=()=>{const at=now();if(!timestamp(at))throw new Error('wa_billing_invalid');return at;};
 /** @param {string} scope @param {number} at */
 const initialize=(scope,at)=>db.prepare(`INSERT INTO sarin_wa_billing_scopes(scope_key,coverage_start) SELECT ?,?
  WHERE (SELECT COUNT(*) FROM sarin_wa_billing_scopes)<4 OR EXISTS(SELECT 1 FROM sarin_wa_billing_scopes WHERE scope_key=?)
  ON CONFLICT(scope_key) DO NOTHING`).bind(scope,at,scope);
 return {
  /** El llamador verifica firma y frescura antes de invocar esta operación.
   * @param {BillingEvent} event */
  async observe(event){
   const at=clock();if(!['delivered','read'].includes(String(event.status))||event.from!==businessPhone
    ||(event.wabaId!==undefined&&event.wabaId!==wabaId)||typeof event.messageId!=='string'||! /^[\x21-\x7e]{1,256}$/.test(event.messageId)
    ||!timestamp(event.createdAt))return {available:true,recorded:false};
   const schema=await available(db);if(!schema)return unavailable();
   const scope=await scopePromise,key=await hash(JSON.stringify([scope,event.messageId])),p=pricing(event.pricing,event.createdAt);
   const date=p?.deliveredAt??event.createdAt,expires=expiry(date);if(expires<=at)return {available:true,recorded:false};
   const month=new Date(date).toISOString().slice(0,7);
   const r=await db.batch([
    initialize(scope,at),
    db.prepare(`INSERT INTO sarin_wa_billing_receipts(receipt_key,scope_key,month_key,delivered_at,quality,pricing_type,category,amount_micros,currency,first_seen,last_seen,expires_at${schema>=10?',lookup_attempted':''})
     SELECT ?,?,?,?,?,?,?,?,?,?,?,?${schema>=10?',0':''} WHERE EXISTS(SELECT 1 FROM sarin_wa_billing_scopes WHERE scope_key=?)
      AND ((SELECT COALESCE(SUM(receipt_rows),0) FROM sarin_wa_billing_scopes)<? OR EXISTS(SELECT 1 FROM sarin_wa_billing_receipts WHERE receipt_key=?))
     ON CONFLICT(receipt_key) DO UPDATE SET
      quality=CASE WHEN sarin_wa_billing_receipts.quality=2 OR (sarin_wa_billing_receipts.quality=1 AND excluded.quality=1 AND
       NOT(sarin_wa_billing_receipts.delivered_at=excluded.delivered_at AND sarin_wa_billing_receipts.pricing_type=excluded.pricing_type
        AND sarin_wa_billing_receipts.category=excluded.category AND sarin_wa_billing_receipts.amount_micros=excluded.amount_micros
        AND sarin_wa_billing_receipts.currency=excluded.currency)) THEN 2 ELSE MAX(sarin_wa_billing_receipts.quality,excluded.quality) END,
      month_key=CASE WHEN sarin_wa_billing_receipts.quality=0 AND excluded.quality=1 THEN excluded.month_key ELSE sarin_wa_billing_receipts.month_key END,
      delivered_at=COALESCE(sarin_wa_billing_receipts.delivered_at,excluded.delivered_at),
      pricing_type=COALESCE(sarin_wa_billing_receipts.pricing_type,excluded.pricing_type),category=COALESCE(sarin_wa_billing_receipts.category,excluded.category),
      amount_micros=COALESCE(sarin_wa_billing_receipts.amount_micros,excluded.amount_micros),currency=COALESCE(sarin_wa_billing_receipts.currency,excluded.currency),
      expires_at=CASE WHEN sarin_wa_billing_receipts.quality=0 AND excluded.quality=1 THEN excluded.expires_at ELSE sarin_wa_billing_receipts.expires_at END,
      last_seen=MAX(sarin_wa_billing_receipts.last_seen,excluded.last_seen) RETURNING receipt_key,quality`).bind(key,scope,month,p?.deliveredAt??null,p?1:0,p?.type??null,p?.category??null,p?.amount??null,p?.currency??null,at,at,expires,scope,MAX_RECEIPTS,key),
    db.prepare(`UPDATE sarin_wa_billing_scopes SET storage_limited=1 WHERE scope_key=?
     AND NOT EXISTS(SELECT 1 FROM sarin_wa_billing_receipts WHERE receipt_key=?)`).bind(scope,key),
   ]);
   if(r.length!==3||r.some(row=>row.success!==true))throw new Error('wa_billing_failed');
   return {available:true,recorded:r[1].results.length===1,verified:r[1].results[0]?.quality===1};
  },
  /** @param {string} messageId */
  async receiptState(messageId){
   if(typeof messageId!=='string'||! /^[\x21-\x7e]{1,256}$/.test(messageId))throw new Error('wa_billing_invalid');
   const at=clock();if(!await available(db))return {state:'unavailable'};
   const key=await hash(JSON.stringify([await scopePromise,messageId]));
   const r=await db.batch([db.prepare('SELECT quality,expires_at FROM sarin_wa_billing_receipts WHERE receipt_key=?').bind(key)]);
   if(r[0]?.success!==true)throw new Error('wa_billing_failed');const row=r[0].results[0];
   return {state:!row?'missing':row.expires_at<=at?'expired':row.quality===1?'verified':row.quality===2?'conflict':'unknown'};
  },
  /** Reserva una única consulta por mensaje antes del GET externo. Un fallo de
   * red conserva lookup_attempted=1; sólo un webhook posterior puede completarlo.
   * Los unknown de webhooks nuevos permiten su primer intento. En schema9 el
   * barrido espera la migración, sin interrumpir captura ni resumen del consumo.
   * Tres reservas por minuto UTC y negocio; nunca consume cuota de mensajes.
   * @param {{limit?:number}} [options] */
  async claimMissing({limit=1}={}){
   if(!Number.isSafeInteger(limit)||limit<1||limit>3)throw new Error('wa_billing_invalid');
   const at=clock();if(await available(db)<10)return [];
   const scope=await scopePromise,minute=Math.floor(at/60000);
   const scan=await db.batch([initialize(scope,at),
    db.prepare('UPDATE sarin_wa_billing_scopes SET lookup_minute=?,lookup_count=0 WHERE scope_key=? AND lookup_minute<?').bind(minute,scope,minute),
    db.prepare('SELECT lookup_minute,lookup_count FROM sarin_wa_billing_scopes WHERE scope_key=?').bind(scope),
    db.prepare(`${CANDIDATES} SELECT * FROM candidates ORDER BY delivered_at DESC,source_id LIMIT 100`).bind(at,businessPhone,wabaId)]);
   if(scan.length!==4||scan.some(row=>row.success!==true))throw new Error('wa_billing_failed');
   const budget=scan[2].results[0];if(!budget||budget.lookup_minute!==minute||budget.lookup_count>=3)return [];
   const candidates=await Promise.all(scan[3].results.filter(row=>typeof row.message_id==='string'&&/^[\x21-\x7e]{1,256}$/.test(row.message_id)
    &&typeof row.external_id==='string'&&row.external_id.length>=1&&row.external_id.length<=128&&!/[\u0000-\u0020\u007f-\u009f]/.test(row.external_id)
    &&typeof row.to_phone==='string'&&/^\+[1-9]\d{1,14}$/.test(row.to_phone)&&timestamp(row.delivered_at)&&timestamp(row.started_at))
    .map(async row=>({...row,key:await hash(JSON.stringify([scope,row.message_id]))})));
   if(!candidates.length)return [];
   // D1 Free admite50 parámetros por sentencia; cada lectura usa como máximo41.
   const chunks=[];for(let i=0;i<candidates.length;i+=40)chunks.push(candidates.slice(i,i+40));
   const known=await db.batch(chunks.map(chunk=>db.prepare(`SELECT receipt_key FROM sarin_wa_billing_receipts WHERE receipt_key IN(${chunk.map(()=>'?').join(',')})
    AND (quality<>0 OR lookup_attempted<>0 OR expires_at<=?)`).bind(...chunk.map(row=>row.key),at)));
   if(known.some(row=>row.success!==true))throw new Error('wa_billing_failed');
   const seen=new Set(known.flatMap(row=>row.results.map(item=>item.receipt_key))),claims=[];
   for(const row of candidates){
    if(seen.has(row.key))continue;
    const r=await db.batch([
     db.prepare(`${CANDIDATES} INSERT INTO sarin_wa_billing_receipts(receipt_key,scope_key,month_key,quality,first_seen,last_seen,expires_at,lookup_attempted)
      SELECT ?,?,?,0,?,?,?,1 FROM sarin_wa_billing_scopes s WHERE s.scope_key=? AND s.lookup_minute=? AND s.lookup_count<3
       AND ((SELECT COALESCE(SUM(receipt_rows),0) FROM sarin_wa_billing_scopes)<? OR EXISTS(SELECT 1 FROM sarin_wa_billing_receipts WHERE receipt_key=?))
       AND EXISTS(SELECT 1 FROM candidates c WHERE c.source_type=? AND c.source_id=? AND c.message_id=? AND c.external_id=?
        AND c.to_phone=? AND c.started_at=? AND c.delivered_at=? AND c.status=?)
      ON CONFLICT(receipt_key) DO UPDATE SET lookup_attempted=1
       WHERE sarin_wa_billing_receipts.quality=0 AND sarin_wa_billing_receipts.lookup_attempted=0 AND sarin_wa_billing_receipts.expires_at>?
      RETURNING receipt_key`).bind(at,businessPhone,wabaId,row.key,scope,new Date(row.delivered_at).toISOString().slice(0,7),at,at,expiry(row.delivered_at),
       scope,minute,MAX_RECEIPTS,row.key,row.source_type,row.source_id,row.message_id,row.external_id,row.to_phone,row.started_at,row.delivered_at,row.status,at),
     db.prepare('UPDATE sarin_wa_billing_scopes SET lookup_count=lookup_count+1 WHERE scope_key=? AND changes()=1').bind(scope),
     db.prepare(`UPDATE sarin_wa_billing_scopes SET storage_limited=1 WHERE scope_key=? AND
      (SELECT COALESCE(SUM(receipt_rows),0) FROM sarin_wa_billing_scopes)>=?`).bind(scope,MAX_RECEIPTS),
     db.prepare(`SELECT lookup_count,(SELECT COALESCE(SUM(receipt_rows),0) FROM sarin_wa_billing_scopes) AS capacity
      FROM sarin_wa_billing_scopes WHERE scope_key=?`).bind(scope),
    ]);
    if(r.length!==4||r.some(item=>item.success!==true))throw new Error('wa_billing_failed');
    if(r[0].results.length){seen.add(row.key);claims.push({messageId:row.message_id,from:businessPhone,to:row.to_phone,wabaId,externalId:row.external_id,status:row.status,deliveredAt:row.delivered_at});}
    if(claims.length>=limit||r[3].results[0]?.lookup_count>=3||r[3].results[0]?.capacity>=MAX_RECEIPTS)break;
   }
   return claims;
  },
  async summary(){
   const at=clock();if(!await available(db))return unavailable();const scope=await scopePromise,month=new Date(at).toISOString().slice(0,7);
   const r=await db.batch([initialize(scope,at),db.prepare(`SELECT coverage_start,storage_limited,
    EXISTS(SELECT 1 FROM sarin_wa_billing_receipts r WHERE r.scope_key=s.scope_key AND r.quality=2 AND r.expires_at>?) AS conflicts
    FROM sarin_wa_billing_scopes s WHERE scope_key=?`).bind(at,scope),
    db.prepare(`SELECT COUNT(*) AS observed,COALESCE(SUM(quality<>1),0) AS unknown,COALESCE(SUM(quality=2),0) AS conflicts,
     COALESCE(SUM(quality=1 AND pricing_type='free_customer_service'),0) AS free_service,
     COALESCE(SUM(quality=1 AND pricing_type='free_entry_point'),0) AS free_entry,
     COALESCE(SUM(quality=1 AND amount_micros>0),0) AS paid FROM sarin_wa_billing_receipts WHERE scope_key=? AND month_key=? AND expires_at>?`).bind(scope,month,at),
    db.prepare(`SELECT currency,CAST(SUM(amount_micros) AS TEXT) AS amount FROM sarin_wa_billing_receipts
     WHERE scope_key=? AND month_key=? AND expires_at>? AND quality=1 AND amount_micros>0 GROUP BY currency ORDER BY currency`).bind(scope,month,at)]);
   if(r.length!==4||r.some(row=>row.success!==true))throw new Error('wa_billing_failed');
   const state=r[1].results[0],counts=r[2].results[0];if(!state)return unavailable();
   return {available:true,status:counts.observed?'observed':'empty',source:'ycloud',month,groupingTimezone:'UTC',quotaTimezone:null,
    coverageStart:state.coverage_start,partial:true,freeServiceAllowance:1000,observedMessages:counts.observed,freeServiceObserved:counts.free_service,
    freeEntryObserved:counts.free_entry,paidMessagesObserved:counts.paid,unknownPricingObserved:counts.unknown,conflictingMessagesObserved:counts.conflicts,
    amounts:r[3].results.map(row=>({currency:row.currency,amountMicros:row.amount})),storageLimited:state.storage_limited===1,
    precisionDegraded:state.storage_limited===1||state.conflicts===1||counts.unknown>0};
  },
 };
}
/** @param {Database} db @param {Omit<Options,'db'>&{event:BillingEvent}} options */
export async function recordWhatsAppBilling(db,{event,...options}){return createWhatsAppBillingStore({db,...options}).observe(event);}
/** @param {Database} db @param {Omit<Options,'db'>} options */
export async function getWhatsAppBillingUsage(db,options){return createWhatsAppBillingStore({db,...options}).summary();}
/** @param {{db:Database,now?:()=>number,limit?:number}} options */
export async function purgeWhatsAppBilling({db,now=Date.now,limit=100}){
 const at=now();if(!timestamp(at)||!Number.isSafeInteger(limit)||limit<1||limit>500)throw new Error('wa_billing_invalid');
 const r=await db.batch([db.prepare(`DELETE FROM sarin_wa_billing_receipts WHERE receipt_key IN
  (SELECT receipt_key FROM sarin_wa_billing_receipts WHERE expires_at<=? ORDER BY expires_at LIMIT ?) RETURNING receipt_key`).bind(at,limit),
 db.prepare('SELECT EXISTS(SELECT 1 FROM sarin_wa_billing_receipts WHERE expires_at<=?) AS remaining').bind(at)]);
 if(r.length!==2||r.some(row=>row.success!==true))throw new Error('wa_billing_failed');return {deleted:r[0].results.length,remaining:r[1].results[0]?.remaining===1};
}
