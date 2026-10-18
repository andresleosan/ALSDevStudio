import { createWhatsAppIngressStore } from '../../server/sarin/whatsapp/ingress-store.js';
import { createWhatsAppWorkStore } from '../../server/sarin/whatsapp/work-store.js';
import { WHATSAPP_NOTICE_VERSION } from '../../server/sarin/whatsapp/consent.js';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
export const DAY=86400000, BASE=Date.UTC(2026,9,18,12);
export async function maintenanceFixture(t) {
 const f=await sqliteFixture({history:true,whatsapp:true,replies:true});t.after(f.close);
 let at=BASE,seq=0;
 const now=()=>at,store=createWhatsAppWorkStore({db:f.db,now}),ingress=createWhatsAppIngressStore({db:f.db,now});
 const row=table=>f.sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid DESC LIMIT 1').get();
 const capture=async(text='Consulta ficticia')=>{at+=1000;seq++;const e={kind:'inbound',eventId:'event_'+seq,messageId:'msg_'+seq,wamid:'wamid.'+seq,wabaId:'12345',from:'+573000000001',to:'+573000000002',sentAt:at,createdAt:at,mediaType:'text',text};await ingress.capture(e);return e;};
 await capture();const peerKey=row('sarin_wa_inbox').peer_key;
 await store.setPilotMode({enabled:true,expectedRevision:0,actor:'test'});
 await store.resumePeer({peerKey,expectedRevision:0,actor:'test'});
 const claim=async e=>{const j=f.sqlite.prepare('SELECT * FROM sarin_wa_jobs WHERE event_id=?').get(e.eventId),token=crypto.randomUUID();return {...await store.claimGeneration({jobId:j.job_id,epoch:j.epoch,token}),jobId:j.job_id,epoch:j.epoch,token};};
 const notice=async(send=true)=>{const c=await claim(await capture());const o=await store.createFixedReply({...c,purpose:'notice',text:'Aviso ficticio',version:WHATSAPP_NOTICE_VERSION,hash:'a'.repeat(64)});if(send){await store.beginSend({...o,token:c.token});await store.finishSend({...o,token:c.token,result:{status:'accepted',providerId:'notice-id'}});await store.applyStatus({eventId:'delivered',providerId:'notice-id',status:'delivered',at});}return {...o,...c};};
 const accept=async()=>{const e=await capture('ACEPTO');const c=await claim(e);await store.finishWithoutReply({...c,reason:'ignored'});return e;};
 return {...f,now,store,ingress,row,capture,claim,notice,accept,peerKey,setTime:v=>{at=v;}};
}
