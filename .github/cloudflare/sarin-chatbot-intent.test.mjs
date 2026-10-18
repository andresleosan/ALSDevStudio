import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGeneration} from '../../server/sarin/policy.js';

const mistaken={reply:'Sarin Bot es un producto para gestionar citas y reservas. ¿Quieres conocerlo?',service:'application',examples:['sarinbotsaas'],brief:{}};
const input=(message,history=[])=>({message,history});
const pair=(user,assistant='¿En qué canal quieres usarlo?')=>[{role:'user',content:user},{role:'assistant',content:assistant}];

for(const message of [
 'Quiero un chatbot como Sarin',
 'Quiero un bot como este',
 'Me gustaría un bot como tú para mi negocio',
 'Quiero un chatbot como este para agendar citas en mi barbería',
 'No quiero Sarin Bot SaaS, sino un chatbot como este',
])test('una solicitud de chatbot personalizado no recibe el producto de citas: '+message,()=>{
 const result=validateGeneration(mistaken,input(message));
 assert.equal(result.service,'chatbot');assert.deepEqual(result.examples,[]);
 assert.match(result.reply,/chatbot personalizado/i);assert.match(result.reply,/canal/i);
 assert.doesNotMatch(result.reply,/SaaS|barber|reservas/i);
 assert.equal((result.reply.match(/\?/g)||[]).length,1);
});

test('la confusión en el texto se corrige aunque no incluya enlace al catálogo',()=>{
 const result=validateGeneration({...mistaken,examples:[]},input('Quiero un chatbot como este'));
 assert.equal(result.service,'chatbot');assert.match(result.reply,/chatbot personalizado/i);
});

test('un seguimiento de canal conserva la intención aportada por el usuario',()=>{
 const result=validateGeneration(mistaken,input('En WhatsApp',pair('Quiero un chatbot como este')));
 assert.equal(result.service,'chatbot');assert.deepEqual(result.examples,[]);
 assert.match(result.reply,/tarea|necesidad|resolver/i);assert.doesNotMatch(result.reply,/qué canal/i);
});

test('una respuesta correcta de chatbot se conserva sin repetir una aclaración fija',()=>{
 const good={reply:'Para tu chatbot personalizado podemos revisar el alcance. ¿Qué consultas debería atender?',service:'chatbot',examples:[],brief:{need:'chatbot como este'}};
 assert.deepEqual(validateGeneration(good,input('Quiero un chatbot como este')),good);
});

test('una respuesta que distingue ambos productos no se reemplaza por otra aclaración',()=>{
 const good={reply:'Sarin Bot SaaS es un producto distinto para citas. Para tu chatbot, ¿qué tarea necesitas resolver?',service:'chatbot',examples:[],brief:{}};
 assert.deepEqual(validateGeneration(good,input('Quiero un chatbot como este')),good);
});

for(const message of [
 'Quiero conocer Sarin Bot SaaS',
 'No quiero un chatbot como este, quiero Sarin Bot SaaS',
 'Busco una agenda de citas para mi barbería',
])test('se conserva la consulta explícita del producto o agenda: '+message,()=>{
 const result=validateGeneration(mistaken,input(message));
 assert.equal(result.reply,mistaken.reply);assert.equal(result.service,'application');
 assert.equal(result.examples[0].id,'sarinbotsaas');
});

test('un cambio explícito a SaaS prevalece sobre la solicitud anterior de chatbot',()=>{
 const result=validateGeneration(mistaken,input('Ahora quiero conocer Sarin Bot SaaS',pair('Quiero un chatbot como este')));
 assert.equal(result.reply,mistaken.reply);assert.equal(result.examples[0].id,'sarinbotsaas');
});

test('una nueva consulta de agenda puede cambiar el tema anterior de chatbot',()=>{
 const result=validateGeneration(mistaken,input('Ahora busco una agenda de citas',pair('Quiero un chatbot como este')));
 assert.equal(result.reply,mistaken.reply);assert.equal(result.examples[0].id,'sarinbotsaas');
});

test('negar el chatbot actual no recupera la intención afirmada en turnos antiguos',()=>{
 const result=validateGeneration(mistaken,input('Ya no quiero un chatbot como este',pair('Quiero un chatbot como este')));
 assert.equal(result.reply,mistaken.reply);
});

test('una mención de SaaS introducida por el asistente no cambia la intención del usuario',()=>{
 const history=pair('Quiero un bot como este','Tenemos Sarin Bot SaaS para citas. ¿En qué canal lo necesitas?');
 const result=validateGeneration(mistaken,input('En WhatsApp',history));
 assert.equal(result.service,'chatbot');assert.deepEqual(result.examples,[]);
});

test('el resguardo conserva el borrador literal y no elude política de precios ni contratos',()=>{
 const user=input('Quiero un chatbot como este para mi tienda');
 const result=validateGeneration({...mistaken,brief:{business:'mi tienda'}},user);
 assert.deepEqual(result.brief,{business:'mi tienda'});
 assert.throws(()=>validateGeneration({...mistaken,reply:'Sarin Bot cuesta 500 pesos'},user),{diagnostic:'reply_policy'});
 assert.throws(()=>validateGeneration({...mistaken,brief:{business:'una barbería'}},user),{diagnostic:'brief_not_literal'});
 assert.throws(()=>validateGeneration({...mistaken,examples:['inventado']},user),{diagnostic:'unknown_example'});
});
