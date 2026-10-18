import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {processorFixture,latest} from './sarin-whatsapp-processor-fixture.mjs';
import {handleWhatsAppIngress} from '../../server/sarin/whatsapp/ingress.js';
import {processWhatsAppWork} from '../../server/sarin/whatsapp/processor.js';
import {reconcileWhatsAppWork} from '../../server/sarin/whatsapp/reconciliation.js';
import {createWhatsAppIngressStore} from '../../server/sarin/whatsapp/ingress-store.js';
import {WHATSAPP_NOTICE,WHATSAPP_NOTICE_VERSION} from '../../server/sarin/whatsapp/consent.js';

const BUSINESS='+573000000002', NEW_PEER='+573000000003', SECOND_PEER='+573000000004';
const SIGNING='synthetic-public-webhook';
async function setup(t){
 const f=await processorFixture(t);
 Object.assign(f.env,{SARIN_WHATSAPP_INGRESS_ENABLED:'true',SARIN_WHATSAPP_WEBHOOK_SECRET:SIGNING,
  SARIN_WHATSAPP_CAPTURE_SINCE:new Date(f.now()-3600000).toISOString(),SARIN_WHATSAPP_ACCESS_MODE:'public',
  SARIN_WHATSAPP_PUBLIC_SINCE:new Date(f.now()).toISOString()});
 delete f.env.SARIN_WHATSAPP_PILOT_PHONES;
 return f;
}
function signed(f,payload){
 const body=JSON.stringify(payload),timestamp=String(f.now()/1000);
 const signature=createHmac('sha256',SIGNING).update(timestamp+'.'+body).digest('hex');
 return new Request('https://example.test/api/sarin/whatsapp',{method:'POST',headers:{'Content-Type':'application/json','YCloud-Signature':`t=${timestamp},s=${signature}`},body});
}
async function incoming(f,text='Hola',peer=NEW_PEER,options={}){
 f.setTime(f.now()+1000);
 const id=options.id??crypto.randomUUID(),kind=options.kind??'inbound',at=options.at??f.now();
 const message={id:'message-'+id,wamid:'wamid.'+id,wabaId:options.wabaId??'12345',
  from:kind==='echo'?BUSINESS:peer,to:kind==='echo'?peer:BUSINESS,sendTime:new Date(at).toISOString(),type:'text',text:{body:text},...options.message};
 const payload={id,type:kind==='echo'?'whatsapp.smb.message.echoes':'whatsapp.inbound_message.received',apiVersion:'v2',createTime:new Date(at).toISOString(),
  [kind==='echo'?'whatsappMessage':'whatsappInboundMessage']:message};
 const request=signed(f,payload),response=await handleWhatsAppIngress(request,f.env,{now:f.now});
 const row=f.sqlite.prepare('SELECT job_id,epoch FROM sarin_wa_jobs WHERE event_id=?').get(id);
 return {response,request,id,job:row?{jobId:row.job_id,epoch:row.epoch}:null};
}
const run=(f,job,fetch=f.fetch)=>processWhatsAppWork(job,f.env,{store:f.store,now:f.now,fetch});
const posts=f=>f.calls.filter(c=>c.url==='https://api.ycloud.com/v2/whatsapp/messages');
async function deliver(f){const o=latest(f,'sarin_wa_outbox');await f.store.applyStatus({eventId:crypto.randomUUID(),providerId:o.provider_id,status:'delivered',at:f.now()});return o;}
const context=(f,peer=NEW_PEER)=>f.sqlite.prepare('SELECT c.* FROM sarin_wa_contexts c JOIN sarin_wa_inbox i ON i.peer_key=c.peer_key WHERE i.peer_phone=? LIMIT 1').get(peer);

test('public_first_hola_sends_notice_without_manual_resume_or_ai',async t=>{
 const f=await setup(t),first=await incoming(f);
 assert.equal(first.response.status,200);assert.ok(first.job);assert.equal(context(f).paused,0);
 assert.equal((await run(f,first.job)).status,'accepted');
 assert.equal(f.calls.length,1);assert.equal(posts(f).length,1);
 const body=JSON.parse(posts(f)[0].init.body);assert.equal(body.to,NEW_PEER);assert.equal(latest(f,'sarin_wa_outbox').purpose,'notice');
 await run(f,first.job);assert.equal(posts(f).length,1);
});

test('public_two_contacts_keep_notice_consent_reply_and_recipient_separate',async t=>{
 const f=await setup(t);
 for(const peer of [NEW_PEER,SECOND_PEER]){const first=await incoming(f,'Hola',peer);assert.ok(first.job);await run(f,first.job);await deliver(f);}
 assert.deepEqual(posts(f).map(c=>JSON.parse(c.init.body).to),[NEW_PEER,SECOND_PEER]);assert.equal(f.calls.length,2);
 const accept=await incoming(f,'ACEPTO',NEW_PEER);await run(f,accept.job);await deliver(f);
 assert.equal(context(f,NEW_PEER).accepted_at!==null,true);assert.equal(context(f,SECOND_PEER).accepted_at,null);
 const unaccepted=await incoming(f,'Necesito una tienda',SECOND_PEER);await run(f,unaccepted.job);assert.equal(f.calls.length,3);
 const query=await incoming(f,'Necesito una tienda de camisetas',NEW_PEER);await run(f,query.job);
 assert.equal(posts(f).length,4);assert.equal(JSON.parse(posts(f).at(-1).init.body).to,NEW_PEER);
 assert.equal(f.calls.filter(c=>c.url.includes('deepseek')).length,2);
});

for(const control of ['HUMANO','STOP','echo','manual'])test('public_hola_does_not_resume_'+control,async t=>{
 const f=await setup(t),first=await incoming(f);assert.ok(first.job);await run(f,first.job);await deliver(f);
 if(control==='manual')await f.store.pausePeer({peerKey:context(f).peer_key,expectedRevision:context(f).revision,actor:'test'});
 else await incoming(f,control==='echo'?'Continúo yo':control,NEW_PEER,{kind:control==='echo'?'echo':'inbound'});
 const before=posts(f).length,next=await incoming(f);assert.equal(context(f).paused,1);assert.equal(next.job,null);assert.equal(posts(f).length,before);
});

for(const mode of [undefined,'pilot','PUBLIC',' public ','','wrong',true])test('public_access_never_opens_implicitly_'+String(mode),async t=>{
 const f=await setup(t);f.env.SARIN_WHATSAPP_ACCESS_MODE=mode;f.env.SARIN_WHATSAPP_PILOT_PHONES='["+573000000001"]';
 const result=await incoming(f);assert.equal(result.response.status,mode===undefined||mode==='pilot'?200:503);assert.equal(result.job,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_inbox WHERE peer_phone=?').get(NEW_PEER).n,0);
});

for(const since of [undefined,'','2026-02-31T00:00:00.000Z','2026-10-19T00:00:00.000Z','2026-10-18T00:00:00Z'])test('public_requires_valid_reached_cutover_'+String(since),async t=>{
 const f=await setup(t);f.env.SARIN_WHATSAPP_PUBLIC_SINCE=since;const result=await incoming(f);assert.equal(result.response.status,503);assert.equal(result.request.bodyUsed,false);
});

test('public_old_inbound_and_echo_are_ignored_before_cutover',async t=>{
 const f=await setup(t),at=Date.parse(f.env.SARIN_WHATSAPP_PUBLIC_SINCE)-1;
 for(const kind of ['inbound','echo']){const result=await incoming(f,'Hola',NEW_PEER,{kind,at});assert.equal(result.response.status,200);assert.equal(result.job,null);}
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_inbox WHERE peer_phone=?').get(NEW_PEER).n,0);
});

test('public_does_not_relax_waba_business_or_self_identity',async t=>{
 const f=await setup(t);
 for(const options of [{wabaId:'99999'},{message:{to:'+573000000099'}},{message:{from:BUSINESS}}]){
  const result=await incoming(f,'Hola',NEW_PEER,options);assert.equal(result.response.status,200);assert.equal(result.job,null);
 }
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_inbox').get().n,1);
});

test('public_reconciliation_uses_durable_second_contact_identity',async t=>{
 const f=await setup(t),first=await incoming(f,'Hola',SECOND_PEER);assert.ok(first.job);await run(f,first.job);
 let gets=0;const response=await reconcileWhatsAppWork(f.env,{store:f.store,now:f.now,fetch:async(url,init)=>{
  gets++;assert.equal(init.method,'GET');return Response.json({id:'provider_1',status:'read',wabaId:'12345',from:BUSINESS,to:SECOND_PEER,externalId:latest(f,'sarin_wa_outbox').external_id});
 }});
 assert.equal(gets,1);assert.equal(response.status,'complete');assert.equal(latest(f,'sarin_wa_outbox').state,'read');
});

test('public_ready_output_cannot_send_after_returning_to_pilot',async t=>{
 const f=await setup(t),first=await incoming(f);assert.ok(first.job);const token=crypto.randomUUID();
 await f.store.claimGeneration({...first.job,token});await f.store.createFixedReply({...first.job,token,purpose:'notice',text:WHATSAPP_NOTICE,version:WHATSAPP_NOTICE_VERSION,hash:createHash('sha256').update(WHATSAPP_NOTICE).digest('hex')});
 f.setTime(f.now()+120001);await f.store.expireLeases({limit:1});f.env.SARIN_WHATSAPP_ACCESS_MODE='pilot';f.env.SARIN_WHATSAPP_PILOT_PHONES='["+573000000001"]';
 await run(f,first.job);assert.equal(f.calls.length,0);assert.equal(latest(f,'sarin_wa_send_quota').consumed,0);
});

test('public_capacity_accepts_eleventh_contact_but_pilot_stays_capped',async t=>{
 for(const publicMode of [false,true]){
  const f=await processorFixture(t),ingress=createWhatsAppIngressStore({db:f.db,now:f.now,publicMode,repliesEnabled:true});
  for(let index=0;index<10;index++){
   const event={kind:'inbound',eventId:'capacity_'+index,messageId:'message_'+index,wamid:'wamid.capacity.'+index,wabaId:'12345',from:'+573000001'+String(index).padStart(3,'0'),to:BUSINESS,sentAt:f.now(),createdAt:f.now(),mediaType:'text',text:'Hola'};
   if(index===9&&!publicMode)await assert.rejects(ingress.capture(event),error=>error.code==='ingress_capacity');else await ingress.capture(event);
  }
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_peers').get().n,publicMode?11:10);
 }
});

test('public_cutover_keeps_delivery_status_for_existing_output',async t=>{
 const f=await setup(t),first=await incoming(f);await run(f,first.job);
 const output=latest(f,'sarin_wa_outbox'),createdAt=f.now();f.setTime(f.now()+2000);f.env.SARIN_WHATSAPP_PUBLIC_SINCE=new Date(f.now()).toISOString();
 const payload={id:'precutover_delivery',type:'whatsapp.message.updated',apiVersion:'v2',createTime:new Date(createdAt).toISOString(),
  whatsappMessage:{id:output.provider_id,status:'delivered',from:BUSINESS,to:NEW_PEER,wabaId:'12345'}};
 const response=await handleWhatsAppIngress(signed(f,payload),f.env,{now:f.now});
 assert.equal(response.status,200);assert.equal(latest(f,'sarin_wa_outbox').state,'delivered');assert.equal(context(f).paused,0);
});

test('public_context_capacity_returns_429_without_creating_control_metadata',async t=>{
 const f=await setup(t),insert=f.sqlite.prepare('INSERT INTO sarin_wa_contexts(peer_key,context_id) VALUES(?,?)');
 for(let index=0;index<999;index++)insert.run('capacity_peer_'+index,crypto.randomUUID());
 const controls=f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_control_events').get().n;
 const result=await incoming(f);
 assert.equal(result.response.status,429);assert.deepEqual(await result.response.json(),{error:{code:'ingress_capacity'}});
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_contexts').get().n,1000);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sarin_wa_control_events').get().n,controls);
});
