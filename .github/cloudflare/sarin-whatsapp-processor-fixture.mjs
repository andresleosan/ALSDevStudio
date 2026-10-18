import assert from 'node:assert/strict';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';
import { createWhatsAppIngressStore } from '../../server/sarin/whatsapp/ingress-store.js';
import { createWhatsAppWorkStore } from '../../server/sarin/whatsapp/work-store.js';
export const latest=(f,table)=>f.sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid DESC LIMIT 1').get();
export async function processorFixture(t) {
 const f=await sqliteFixture({whatsapp:true,replies:true});t.after(f.close);
 let at=Date.UTC(2026,9,18,12),seq=0;
 const counts={bindings:0,sql:0,fetch:0,queue:0};
 const db={...f.db,batch:async s=>{counts.bindings++;counts.sql+=s.length;return f.db.batch(s);}};
 const now=()=>at,store=createWhatsAppWorkStore({db,now}),ingress=createWhatsAppIngressStore({db,now});
 const capture=async(text='Necesito una tienda ficticia')=>{at+=1000;seq++;await ingress.capture({kind:'inbound',eventId:'event_'+seq,messageId:'msg_'+seq,wamid:'wamid.'+seq,wabaId:'12345',from:'+573000000001',to:'+573000000002',sentAt:at,createdAt:at,mediaType:'text',text});const j=latest(f,'sarin_wa_jobs');return j?{jobId:j.job_id,epoch:j.epoch}:null;};
 await capture();const peerKey=latest(f,'sarin_wa_inbox').peer_key;
 await store.setPilotMode({enabled:true,expectedRevision:0,actor:'test'});await store.resumePeer({peerKey,expectedRevision:0,actor:'test'});
 const env={SARIN_DB:db,SARIN_WHATSAPP_REPLIES_ENABLED:'true',SARIN_WHATSAPP_SEND_ENABLED:'true',SARIN_WHATSAPP_API_KEY:'synthetic-key',SARIN_WHATSAPP_BUSINESS_PHONE:'+573000000002',SARIN_WHATSAPP_WABA_ID:'12345',SARIN_WHATSAPP_PILOT_PHONES:'["+573000000001"]',SARIN_IP_SECRET:'s'.repeat(40),DEEPSEEK_API_KEY:'synthetic-ai',SARIN_INPUT_PRICE_MICROS:'300000',SARIN_OUTPUT_PRICE_MICROS:'1200000',SARIN_DAILY_BUDGET_MICROS:'1000000',SARIN_MONTHLY_BUDGET_MICROS:'10000000',SARIN_WHATSAPP_QUEUE:{send:async hint=>{counts.queue++;hints.push(hint);}}};
 const calls=[],hints=[];let providerSequence=0;
 const fetcher=async(url,init)=>{counts.fetch++;calls.push({url,init});if(url==='https://api.ycloud.com/v2/whatsapp/messages')return Response.json({id:'provider_'+(++providerSequence),status:'accepted'});assert.equal(url,'https://api.deepseek.com/chat/completions');const body=JSON.parse(init.body),generation=body.max_tokens===512;return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(generation?{reply:'Podemos orientar tu tienda. ¿Qué productos vendes?',service:'store',examples:[],brief:{need:'una tienda'}}:{inScope:true})},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120}});};
 return {...f,db,store,now,env,capture,peerKey,calls,hints,counts,fetch:fetcher,setTime:v=>{at=v;},reset:()=>{for(const k of Object.keys(counts))counts[k]=0;calls.length=0;},pause:()=>store.pausePeer({peerKey,expectedRevision:latest(f,'sarin_wa_contexts').revision,actor:'test'})};
}
export async function establishConsent(f,process) {
 await process(await f.capture(),f.env,{store:f.store,now:f.now,fetch:f.fetch});
 let out=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'notice_delivery',providerId:out.provider_id,status:'delivered',at:f.now()});
 await process(await f.capture('ACEPTO'),f.env,{store:f.store,now:f.now,fetch:f.fetch});
 out=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:'confirm_delivery',providerId:out.provider_id,status:'delivered',at:f.now()});f.reset();
}
