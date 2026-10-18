import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGeneration} from '../../server/sarin/policy.js';

const message='Quiero un chat bot como Sarin Bot para mi tienda virtual y atender clientes por WhatsApp';
const input={message,history:[]};
const brief={business:'mi tienda virtual',need:'chatbot para ventas y atención',features:'atender clientes por WhatsApp',budget:'500000'};
const retained={business:'mi tienda virtual',features:'atender clientes por WhatsApp'};
const valid={reply:'Podemos ayudarte a definir un chatbot personalizado. ¿Qué consultas debería atender?',service:'chatbot',examples:[],brief};

test('consulta real conserva respuesta y campos literales, omite resumen y presupuesto inventados',()=>{
 const result=validateGeneration(valid,input);
 assert.equal(result.reply,valid.reply);assert.deepEqual(result.brief,retained);
 assert.doesNotMatch(JSON.stringify(result),/chatbot para ventas y atención|500000/);
 assert.deepEqual(valid.brief,brief,'No modifica la salida original del proveedor');
});

test('la corrección de confusión con SaaS también devuelve sólo el borrador verificado',()=>{
 const result=validateGeneration({...valid,reply:'Sarin Bot SaaS ayuda con citas. ¿Quieres conocerlo?',service:'application',examples:['sarinbotsaas']},input);
 assert.equal(result.service,'chatbot');assert.deepEqual(result.examples,[]);
 assert.match(result.reply,/chatbot personalizado/);assert.deepEqual(result.brief,retained);
 assert.doesNotMatch(JSON.stringify(result),/chatbot para ventas y atención|500000/);
});

test('sólo el historial del usuario aporta evidencia y conserva el valor literal sin reconstruirlo',()=>{
 const result=validateGeneration({...valid,brief:{business:'Mi Tienda',need:'soporte de inventario',timeline:'el viernes'}},{message:'Continuemos',history:[{role:'user',content:'Mi Tienda necesita soporte de inventario'},{role:'assistant',content:'La entrega es el viernes'}]});
 assert.deepEqual(result.brief,{business:'Mi Tienda',need:'soporte de inventario'});
});

for(const [name,changed] of [
 ['null',{need:null}],['objeto',{need:{text:'mi tienda virtual'}}],['array',{need:['mi tienda virtual']}],
 ['número',{budget:500000}],['vacío',{need:''}],['largo',{need:'x'.repeat(241)}],
 ['URL',{need:'https://example.com'}],['markup',{need:'<b>mi tienda virtual</b>'}],
 ['clave desconocida',{secret:'mi tienda virtual'}],['borrador null',null],
])test('la omisión no admite contrato o contenido inválido: '+name,()=>{
 assert.throws(()=>validateGeneration({...valid,brief:changed},input),{code:'invalid_output',diagnostic:'generation_contract'});
});

for(const [name,changed,diagnostic] of [
 ['precio',{reply:'El chatbot cuesta 500 pesos'},'reply_policy'],
 ['fecha',{reply:'Te lo entregamos el viernes'},'reply_policy'],
 ['preguntas',{reply:'¿Qué vendes? ¿Cuántos productos tienes?'},'reply_policy'],
 ['URL',{reply:'Visita https://example.com'},'reply_policy'],
 ['ejemplo desconocido',{examples:['inventado']},'unknown_example'],
])test('el resumen opcional no oculta una respuesta inválida: '+name,()=>{
 assert.throws(()=>validateGeneration({...valid,...changed},input),{code:'invalid_output',diagnostic});
});
