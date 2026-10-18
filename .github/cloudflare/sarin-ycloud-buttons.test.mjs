import test from 'node:test';
import assert from 'node:assert/strict';
import {createYCloudClient,YCloudClientError} from '../../server/sarin/whatsapp/ycloud-client.js';

const buttons=()=>[{id:'notice:accept:1',title:'Aceptar'},{id:'notice:human:1',title:'Hablar con Andrés'},{id:'notice:exit:1',title:'Salir'}];
const input=()=>({to:'+573000000001',text:'Aviso de datos. Responde 1, 2 o 3.',buttons:buttons(),externalId:'notice_1'});
const success=()=>Response.json({id:'provider_1',status:'accepted',from:'+573000000002',to:'+573000000001',externalId:'notice_1'});
function harness({fetcher,sendEnabled=true,timeoutMs=1000}={}) {
 const calls=[];const client=createYCloudClient({apiKey:'synthetic-private-key',businessPhone:'+573000000002',sendEnabled,timeoutMs,
  fetcher:async(...args)=>{calls.push(args);return fetcher?fetcher(...args):success();}});
 return {calls,client};
}
async function send(client,value=input()) { assert.equal(typeof client.sendButtons,'function','Falta transporte de botones');return client.sendButtons(value); }

test('envía un solo mensaje interactivo con tres botones y correlación durable',async()=>{
 const h=harness(),value=input();assert.deepEqual(await send(h.client,value),{providerId:'provider_1',status:'accepted'});
 assert.equal(h.calls.length,1);const [url,init]=h.calls[0];assert.equal(url,'https://api.ycloud.com/v2/whatsapp/messages');assert.equal(init.method,'POST');assert.equal(init.redirect,'manual');
 assert.deepEqual(JSON.parse(init.body),{from:'+573000000002',to:value.to,type:'interactive',interactive:{type:'button',body:{text:value.text},action:{buttons:value.buttons.map(reply=>({type:'reply',reply}))}},externalId:value.externalId});
 assert.equal(new Headers(init.headers).get('X-API-Key'),'synthetic-private-key');assert(init.signal instanceof AbortSignal);
});

test('acepta los límites exactos de cuerpo, título e ID sin cambiar la entrada',async()=>{
 const h=harness(),value=input();value.text='x'.repeat(1024);value.buttons=[{id:'i'.repeat(256),title:'t'.repeat(20)}];const original=structuredClone(value);
 await send(h.client,value);assert.deepEqual(value,original);assert.equal(h.calls.length,1);
});

const invalid=[
 ['cuerpo vacío',x=>({...x,text:'  '})],['cuerpo largo',x=>({...x,text:'x'.repeat(1025)})],['cuerpo no textual',x=>({...x,text:{}})],
 ['sin botones',x=>({...x,buttons:[]})],['más de tres',x=>({...x,buttons:[...x.buttons,{id:'four',title:'Cuatro'}]})],['no array',x=>({...x,buttons:{}})],
 ['array con hueco',x=>({...x,buttons:Array(1)})],
 ['ID duplicado',x=>({...x,buttons:[x.buttons[0],{id:x.buttons[0].id,title:'Otro'}]})],['título duplicado',x=>({...x,buttons:[x.buttons[0],{id:'other',title:x.buttons[0].title}]})],
 ['título vacío',x=>({...x,buttons:[{id:'id',title:''}]})],['título largo',x=>({...x,buttons:[{id:'id',title:'t'.repeat(21)}]})],
 ['título con salto',x=>({...x,buttons:[{id:'id',title:'Aceptar\n'}]})],['título no textual',x=>({...x,buttons:[{id:'id',title:1}]})],
 ['ID vacío',x=>({...x,buttons:[{id:'',title:'Aceptar'}]})],['ID largo',x=>({...x,buttons:[{id:'i'.repeat(257),title:'Aceptar'}]})],
 ['ID espacio extremo',x=>({...x,buttons:[{id:' id',title:'Aceptar'}]})],['ID control',x=>({...x,buttons:[{id:'id\u0000',title:'Aceptar'}]})],
 ['botón null',x=>({...x,buttons:[null]})],['botón extra',x=>({...x,buttons:[{...x.buttons[0],url:'https://example.invalid'}]})],
 ['extra raíz',x=>({...x,from:'+573000000099'})],['destino inválido',x=>({...x,to:'573000000001'})],
 ['correlación inválida',x=>({...x,externalId:''})],['signal inválida',x=>({...x,signal:{}})],
];
for(const [label,change] of invalid)test(`rechaza ${label} antes de POST`,async()=>{
 const h=harness();await assert.rejects(()=>send(h.client,change(input())),error=>error instanceof YCloudClientError&&error.code==='invalid_request'&&error.deliveryState==='not_sent');assert.equal(h.calls.length,0);
});

test('deshabilitado o abortado previamente no inicia POST',async()=>{
 const disabled=harness({sendEnabled:false});await assert.rejects(()=>send(disabled.client),{code:'send_disabled',deliveryState:'not_sent'});assert.equal(disabled.calls.length,0);
 const stopped=harness(),controller=new AbortController();controller.abort();await assert.rejects(()=>send(stopped.client,{...input(),signal:controller.signal}),{code:'cancelled',deliveryState:'not_sent'});assert.equal(stopped.calls.length,0);
});

for(const [status,code,state] of [[400,'provider_rejected','rejected'],[500,'provider_unavailable','uncertain'],[302,'provider_redirect','uncertain']])test(`HTTP ${status} no provoca reintento ni fallback de texto`,async()=>{
 const h=harness({fetcher:async()=>new Response('provider private detail',{status})});await assert.rejects(()=>send(h.client),error=>error.code===code&&error.deliveryState===state&&!error.message.includes('private'));assert.equal(h.calls.length,1);assert.equal(JSON.parse(h.calls[0][1].body).type,'interactive');
});

test('timeout del proveedor conserva un único POST y queda incierto',async()=>{
 const h=harness({timeoutMs:10,fetcher:async()=>new Promise(()=>{})});await assert.rejects(()=>send(h.client),{code:'timeout',deliveryState:'uncertain'});assert.equal(h.calls.length,1);assert.equal(h.calls[0][1].signal.aborted,true);
});

test('respuesta con identidad distinta se rechaza sin segundo envío',async()=>{
 const h=harness({fetcher:async()=>Response.json({id:'provider_1',status:'accepted',to:'+573000000099'})});await assert.rejects(()=>send(h.client),{code:'invalid_response',deliveryState:'uncertain'});assert.equal(h.calls.length,1);
});
