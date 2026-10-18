import assert from 'node:assert/strict';
import test from 'node:test';
import { handleWhatsAppAdmin } from '../../server/sarin/whatsapp/admin.js';

const now = Date.UTC(2026,9,18,12), key = 'a'.repeat(64);
const row = {peer_key:key,masked_phone:'*** 0001',revision:1,paused:1,updated_at:now,
  consent_status:'pending',consent_expires_at:null,outputs:[]};
const audio = {event_id:'audio_1',kind:'inbound',media_type:'audio',text:'<img src=x> Quiero una tienda.',
  sent_at:now,expires_at:now+86400000,media_url:'https://secret.invalid/audio',peer_phone:'+573000000001'};
const get = value => handleWhatsAppAdmin(new Request('https://example.test/api/control-sarin/whatsapp/peers/'+key),{},
  {admin:{id:'owner'},actor:'b'.repeat(64),now,store:{getPeer:async()=>({...row,...value})}});

test('admin muestra una transcripción vigente como audio, sin enlace, binario ni metadatos privados',async()=>{
  const response = await get({events:[audio,{...audio,event_id:'expired',text:'CADUCADO',expires_at:now},
    {...audio,event_id:'echo',kind:'echo',text:'ECO_PRIVADO'}]});
  assert.equal(response.status,200);
  const body = await response.json();
  assert.deepEqual(body.peer.events.find(event=>event.id==='audio_1'),{id:'audio_1',kind:'message',role:'user',
    mediaType:'audio',content:audio.text,at:now,expiresAt:now+86400000});
  assert.doesNotMatch(JSON.stringify(body),/secret.invalid|573000000001|CADUCADO|ECO_PRIVADO|media_url/);
  const bounded = await (await get({events:[{...audio,text:'x'.repeat(2000)}]})).json();
  assert.equal(bounded.peer.events[0].content.length,1200);
});

test('admin sólo expone el estado y fecha del aviso a Andrés; accepted no se transforma en delivered',async()=>{
  for(const state of ['pending','waiting_template','accepted','delivered','read','failed','send_uncertain','cancelled','expired']){
    const response = await get({events:[],handoff:{state,updatedAt:now,recipient:'+573000000001',providerId:'PRIVATE'}});
    assert.equal(response.status,200);const body=await response.json();
    assert.deepEqual(body.peer.handoff,{state,updatedAt:now});
    assert.doesNotMatch(JSON.stringify(body),/PRIVATE|recipient|573000000001/);
  }
  for(const handoff of [{state:'__proto__',updatedAt:now},{state:'accepted',updatedAt:'yesterday'}]){
    assert.equal((await get({events:[],handoff})).status,503);
  }
});
