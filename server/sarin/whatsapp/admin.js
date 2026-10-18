// @ts-check
import {AdminError,adminError,adminResponse} from '../access.js';
import {readBoundedJson} from '../policy.js';

const opaque=/^[A-Za-z0-9_-]{1,128}$/;
const outputId=/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
const consentStates=['pending','pending_delivery','accepted','expired','revoked'];
const reconciliationStates=['idle','pending','claimed','complete','exhausted','conflict'];
const handoffStates=['pending','waiting_template','accepted','delivered','read','failed','send_uncertain','cancelled','expired'];
/** @param {unknown} value @returns {Record<string,any>} */
const record=value=>value && typeof value==='object' && !Array.isArray(value)?value:{};
/** @param {unknown} value */
const integer=value=>Number.isSafeInteger(value) && Number(value)>=0;
/** @param {unknown} value */
const timestamp=value=>integer(value) && Number(value)<=8640000000000000;
/** @param {unknown} value @returns {number|null} */
const nullableTime=value=>value===null || value===undefined?null:timestamp(value)?Number(value):null;
/** @param {unknown} condition @param {number} [status] @param {string} [code] @returns {asserts condition} */
function requireThat(condition,status=503,code='unavailable'){if(!condition)throw new AdminError(status,code);}
/** @param {Record<string,any>} value @param {string[]} fields */
const exact=(value,fields)=>Object.keys(value).length===fields.length && fields.every(field=>Object.hasOwn(value,field));
/** Cursor versionado: sólo representa una clave hash, nunca un teléfono ni un offset libre.
 * @param {string} key */
const encodeCursor=key=>'wa1_'+btoa(key).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
/** @param {URL} url */
function readCursor(url){
  if(!url.search)return '';
  const values=url.searchParams.getAll('cursor');
  requireThat(values.length===1 && [...url.searchParams.keys()].length===1 && /^wa1_[A-Za-z0-9_-]{86}$/.test(values[0]),400,'invalid_request');
  let key;try{key=atob(values[0].slice(4).replace(/-/g,'+').replace(/_/g,'/')+'==');}catch{throw new AdminError(400,'invalid_request');}
  requireThat(/^[a-f0-9]{64}$/.test(key) && encodeCursor(key)===values[0],400,'invalid_request');return key;
}

/** Sólo renombra el estado de consentimiento acreditado por el store; expires_at por sí solo no lo acredita.
 * @param {Record<string,any>} value @param {number} now */
function summary(value,now){
  requireThat(typeof value.peer_key==='string' && opaque.test(value.peer_key) && integer(value.revision)
    && [0,1,false,true].includes(value.paused) && timestamp(value.updated_at)
    && typeof value.masked_phone==='string' && value.masked_phone.length<=40 && /[•*…]/u.test(value.masked_phone)
    && (value.masked_phone.match(/\d/g)||[]).length<=6);
  let status=consentStates.includes(value.consent_status)?value.consent_status:'pending';
  const expiresAt=nullableTime(value.consent_expires_at);
  if(status==='accepted' && !(Number(expiresAt)>now))status='expired';
  let phone=null,phoneExpiresAt=null,fullName=null,nameExpiresAt=null;
  if(value.phone!=null && Number(nullableTime(value.phone_expires_at))>now){
    requireThat(typeof value.phone==='string' && /^\+[1-9]\d{1,14}$/.test(value.phone));
    phone=value.phone;phoneExpiresAt=value.phone_expires_at;
  }
  if(value.full_name!=null && Number(nullableTime(value.name_expires_at))>now){
    requireThat(typeof value.full_name==='string' && value.full_name.trim().length>0 && value.full_name.length<=160
      && !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value.full_name));
    fullName=value.full_name;nameExpiresAt=value.name_expires_at;
  }
  return {peerKey:value.peer_key,maskedPhone:value.masked_phone,phone,phoneExpiresAt,fullName,nameExpiresAt,
    revision:value.revision,paused:Boolean(value.paused),updatedAt:value.updated_at,consent:{status,expiresAt}};
}
/** @param {Record<string,any>} value @param {number} now */
function detail(value,now){
  requireThat(Array.isArray(value.events) && value.events.length<=100 && Array.isArray(value.outputs) && value.outputs.length<=100);
  const events=[];
  for(const raw of value.events){
    const entry=record(raw);if(!timestamp(entry.expires_at) || entry.expires_at<=now)continue;
    requireThat(typeof entry.event_id==='string' && opaque.test(entry.event_id) && timestamp(entry.sent_at));
    if(entry.kind==='echo')events.push({id:entry.event_id,kind:'echo',at:entry.sent_at,expiresAt:entry.expires_at});
    else if(entry.kind==='inbound' && entry.media_type==='text' && typeof entry.text==='string')events.push({id:entry.event_id,kind:'message',role:'user',content:entry.text.slice(0,4000),at:entry.sent_at,expiresAt:entry.expires_at});
    else if(entry.kind==='inbound' && entry.media_type==='audio' && typeof entry.text==='string' && entry.text.length)events.push({id:entry.event_id,kind:'message',role:'user',mediaType:'audio',content:entry.text.slice(0,1200),at:entry.sent_at,expiresAt:entry.expires_at});
  }
  const outputs=[];
  for(const raw of value.outputs){
    const entry=record(raw);if(!timestamp(entry.expires_at) || entry.expires_at<=now)continue;
    requireThat(typeof entry.outbox_id==='string' && outputId.test(entry.outbox_id) && timestamp(entry.created_at)
      && typeof entry.state==='string' && reconciliationStates.includes(entry.reconcile_state)
      && integer(entry.reconcile_attempts) && entry.reconcile_attempts<=3);
    if(typeof entry.text==='string' && entry.text.length)events.push({id:entry.outbox_id,kind:'message',role:'assistant',content:entry.text.slice(0,1200),at:entry.created_at,expiresAt:entry.expires_at});
    outputs.push({id:entry.outbox_id,status:entry.conflict?'send_uncertain':entry.state,
      updatedAt:nullableTime(entry.reconcile_updated_at)??nullableTime(entry.delivered_at)??nullableTime(entry.started_at)??entry.created_at,
      canReconcile:entry.reconcile_available===1,
      reconciliation:{status:entry.conflict?'conflict':entry.reconcile_state,attempts:entry.reconcile_attempts,nextAt:nullableTime(entry.reconcile_next_at)}});
  }
  events.sort((a,b)=>a.at-b.at || a.id.localeCompare(b.id));
  requireThat(events.length<=100);
  const handoff=record(value.handoff);
  if(value.handoff!=null)requireThat(handoffStates.includes(handoff.state) && timestamp(handoff.updatedAt));
  return {...summary(value,now),events,outputs,...(value.handoff!=null?{handoff:{state:handoff.state,updatedAt:handoff.updatedAt}}:{})};
}

/** Sólo se invoca desde admin.js tras autenticar y verificar Origin/CSRF para POST.
 * El store/reloj son dependencias internas; nunca se obtienen del body.
 * @param {Request} request @param {Record<string,any>} env
 * @param {{admin:any,actor:string,now:number,store?:any}} options */
export async function handleWhatsAppAdmin(request,env,{admin,actor,now,store}){
  try{
    requireThat(admin && /^[a-f0-9]{64}$/.test(actor),403,'forbidden');
    const url=new URL(request.url),route=/^\/api\/control-sarin\/whatsapp\/(peers(?:\/([A-Za-z0-9_-]{1,128})(?:\/(action))?)?|pilot|outbox\/([A-Za-z0-9_-]{1,128})\/reconcile)\/?$/.exec(url.pathname);
    requireThat(route,404,'not_found');
    const cursor=route[1]==='peers'?readCursor(url):'';
    if(route[1]!=='peers')requireThat(!url.search,400,'invalid_request');
    const method=route[1]==='peers' || (route[2] && !route[3])?'GET':'POST';
    if(request.method!==method)return adminResponse({error:{code:'method_not_allowed',message:'Método no permitido.'}},405,{Allow:method});
    const peerKey=route[2],outbox=route[4];
    if(outbox)requireThat(outputId.test(outbox),400,'invalid_request');
    /** @type {Record<string,any>} */let body={};
    if(method==='POST'){
      const length=request.headers.get('Content-Length');requireThat(!length || /^\d+$/.test(length) && Number(length)<=256,413,'body_too_large');
      let parsed;
      try{parsed=await readBoundedJson(request.body,256,request.signal);}catch(error){throw new AdminError(record(error).status===413?413:400,record(error).status===413?'body_too_large':'invalid_request');}
      requireThat(parsed && typeof parsed==='object' && !Array.isArray(parsed),400,'invalid_request');body=parsed;
      if(route[3])requireThat(exact(body,['action','revision']) && ['pause','resume'].includes(body.action) && integer(body.revision),400,'invalid_request');
      else if(route[1]==='pilot'){
        requireThat(exact(body,['enabled','revision']) && typeof body.enabled==='boolean' && integer(body.revision),400,'invalid_request');
        if(body.enabled)requireThat(env.SARIN_WHATSAPP_REPLIES_ENABLED==='true',503,'whatsapp_replies_disabled');
      }else requireThat(exact(body,[]),400,'invalid_request');
    }
    if(!store){
      requireThat(typeof env.SARIN_DB?.prepare==='function' && typeof env.SARIN_DB?.batch==='function');
      store=(await import('./work-store.js')).createWhatsAppWorkStore({db:env.SARIN_DB,now:()=>now});
    }
    if(method==='GET'){
      if(peerKey){const value=await store.getPeer({peerKey});requireThat(value,404,'not_found');return adminResponse({peer:detail(value,now)});}
      const pilot=record(await store.getPilot()),closure=record(await store.getSendClosure()),listed=record(await store.listPeers({limit:100,cursor}));
      requireThat([0,1,false,true].includes(pilot.enabled) && integer(pilot.revision) && timestamp(pilot.activation_at)
        && Array.isArray(listed.peers) && listed.peers.length<=100 && typeof closure.closed==='boolean' && Array.isArray(closure.closures));
      const ends=closure.closures.map((/** @type {unknown} */item)=>record(item).period_end_at);requireThat(ends.every((/** @type {number} */value)=>timestamp(value) && value>now) && (!closure.closed || ends.length>0));
      requireThat(listed.cursor===null || (listed.peers.length===100 && typeof listed.cursor==='string' && /^[a-f0-9]{64}$/.test(listed.cursor)
        && listed.cursor===record(listed.peers.at(-1)).peer_key && listed.cursor>cursor));
      const items=listed.peers.map((/** @type {unknown} */value)=>summary(record(value),now));
      requireThat(new Set(items.map((/** @type {Record<string,any>} */item)=>item.peerKey)).size===items.length);
      return adminResponse({pilot:{enabled:Boolean(pilot.enabled),revision:pilot.revision,updatedAt:pilot.activation_at,
        recoveryBlockedUntil:closure.closed?Math.max(...ends):null,repliesEnabled:env.SARIN_WHATSAPP_REPLIES_ENABLED==='true'},items,nextCursor:listed.cursor===null?null:encodeCursor(listed.cursor)});
    }
    if(peerKey){await store[body.action==='pause'?'pausePeer':'resumePeer']({peerKey,expectedRevision:body.revision,actor});return adminResponse({ok:true});}
    if(route[1]==='pilot'){await store.setPilotMode({enabled:body.enabled,expectedRevision:body.revision,actor});return adminResponse({ok:true});}
    const result=record(await store.requestReconciliation({outboxId:outbox,actor}));
    requireThat(reconciliationStates.includes(result.status) && result.status!=='idle' && integer(result.attempts) && result.attempts<=3);
    return adminResponse({status:result.status,attempts:result.attempts,nextAt:nullableTime(result.nextAt)},202);
  }catch(error){
    const value=record(error);
    /** @type {Record<string,number>} */const codes={invalid_request:400,work_conflict:409,work_denied:409,work_quota:429,work_capacity:429,work_unavailable:503,work_config_invalid:503};
    return adminError(error instanceof AdminError?error:Object.hasOwn(codes,value.code) && codes[value.code]===value.status?new AdminError(value.status,value.code):new AdminError(503,'unavailable'));
  }
}
