import assert from 'node:assert/strict';
import test from 'node:test';
import {consumptionSummary,createConsumptionController} from '../../scripts/modules/sarin-admin-consumption.js';

const summary=(overrides={})=>({available:true,status:'observed',source:'ycloud',month:'2026-10',groupingTimezone:'UTC',quotaTimezone:null,coverageStart:1792300000000,partial:true,freeServiceAllowance:1000,observedMessages:8,freeServiceObserved:5,freeEntryObserved:1,paidMessagesObserved:2,unknownPricingObserved:0,conflictingMessagesObserved:0,amounts:[{currency:'USD',amountMicros:'1234567'}],storageLimited:false,precisionDegraded:false,...overrides});
const deferred=()=>{let resolve;const promise=new Promise(value=>{resolve=value;});return {promise,resolve};};

test('el consumo separa monedas y conserva microunidades exactas superiores a Number seguro',()=>{
 const value=consumptionSummary({consumption:summary({amounts:[{currency:'USD',amountMicros:'1234567'},{currency:'COP',amountMicros:'9007199254740993123456'}]})});
 assert.equal(value.status,'observed');assert.match(value.period,/octubre.*2026.*UTC/);
 assert.deepEqual(value.amounts,['USD 1,234567','COP 9.007.199.254.740.993,123456']);
 assert.equal(value.freeService,'5 observados / 1.000 de referencia');
 assert.match(value.coverage,/Cobertura parcial/);assert.match(value.coverage,/histórico anterior pendiente/i);
 assert.match(value.limit,/restante exacto.*desconocido/i);
});
test('sin recibos y sin esquema no se presentan como cero gastos',()=>{
 const empty=consumptionSummary({consumption:summary({status:'empty',observedMessages:0,freeServiceObserved:0,freeEntryObserved:0,paidMessagesObserved:0,amounts:[]})});
 assert.equal(empty.status,'empty');assert.deepEqual(empty.amounts,[]);assert.equal(empty.freeService,null);assert.equal(empty.paid,null);
 assert.deepEqual(consumptionSummary({consumption:{available:false,status:'unavailable',partial:true}}),{status:'unavailable'});
});
test('recibos sin precio, conflictos y capacidad limitada permanecen visibles',()=>{
 const value=consumptionSummary({consumption:summary({amounts:[],unknownPricingObserved:2,conflictingMessagesObserved:1,storageLimited:true})});
 assert.deepEqual(value.amounts,[]);assert.match(value.warning,/2.*sin precio/);assert.match(value.warning,/1.*conflicto/);assert.match(value.warning,/capacidad/);
});
test('la incertidumbre de otros meses se advierte aunque este mes no tenga conflictos contados',()=>{
 const value=consumptionSummary({consumption:summary({precisionDegraded:true})});
 assert.match(value.warning,/datos incompletos o inconsistentes/i);
 assert.doesNotMatch(value.limit,/del plan/);
});
test('los recibos gratuitos confirmados muestran ausencia de cargos observados sin inventar moneda',()=>{
 const free=summary({freeServiceObserved:8,freeEntryObserved:0,paidMessagesObserved:0,amounts:[]});
 assert.equal(consumptionSummary({consumption:free}).costLabel,'Sin cargos en los registros observados');
 for(const patch of [{unknownPricingObserved:1},{conflictingMessagesObserved:1},{precisionDegraded:true}]){
  assert.equal(consumptionSummary({consumption:{...free,...patch}}).costLabel,'Sin importes confirmados');
 }
});
test('el DTO no acepta importes flotantes, moneda HTML, periodos o conteos inválidos',()=>{
 for(const overrides of [{month:'2026-13'},{coverageStart:null},{freeServiceObserved:-1},{amounts:[{currency:'<img>',amountMicros:'1'}]},{amounts:[{currency:'USD',amountMicros:'0.1'}]},{amounts:[{currency:'USD',amountMicros:'0'}]},{amounts:[{currency:'USD',amountMicros:'1'},{currency:'USD',amountMicros:'2'}]},{status:'empty'}]){
  assert.throws(()=>consumptionSummary({consumption:summary(overrides)}),/consumo/i);
 }
});
test('no consulta antes del acceso ni retiene una respuesta que llega tras cerrar sesión',async()=>{
 const pending=deferred(),states=[],requests=[];
 const controller=createConsumptionController({request:options=>{requests.push(options);return pending.promise;},onState:state=>states.push(state),fail:()=>assert.fail('no debe fallar')});
 await controller.setOpen(true);assert.equal(requests.length,0);
 controller.setReady(true);const loading=controller.setOpen(true);assert.equal(requests.length,1);assert.equal(states.at(-1).status,'loading');
 controller.clear();assert.equal(requests[0].signal.aborted,true);pending.resolve({consumption:summary()});await loading;
 assert.equal(states.at(-1).status,'hidden');assert.ok(!states.some(state=>state.status==='observed'));
});
test('cerrar y reabrir hace una lectura nueva; la respuesta vieja no pisa la actual',async()=>{
 const first=deferred(),second=deferred(),states=[];let calls=0;
 const controller=createConsumptionController({request:()=>++calls===1?first.promise:second.promise,onState:state=>states.push(state),fail:()=>{}});
 controller.setReady(true);const old=controller.setOpen(true);await controller.setOpen(false);const fresh=controller.setOpen(true);
 second.resolve({consumption:summary({freeServiceObserved:6})});await fresh;first.resolve({consumption:summary()});await old;
 assert.equal(calls,2);assert.equal(states.at(-1).freeService,'6 observados / 1.000 de referencia');
});
test('errores y expiración del acceso borran cifras y no exponen detalles de proveedor',async()=>{
 const states=[],failures=[];let code=503;
 const controller=createConsumptionController({request:async()=>{throw Object.assign(new Error('PRIVATE_PROVIDER_RESPONSE'),{status:code});},onState:state=>states.push(state),fail:error=>failures.push(error)});
 controller.setReady(true);await controller.setOpen(true);assert.deepEqual(states.at(-1),{status:'error'});assert.equal(failures.length,0);
 code=401;await controller.reload();assert.deepEqual(states.at(-1),{status:'hidden'});assert.equal(failures.length,1);
 assert.ok(!JSON.stringify(states).includes('PRIVATE_PROVIDER_RESPONSE'));
});
