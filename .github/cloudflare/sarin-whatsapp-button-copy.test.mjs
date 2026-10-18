import assert from 'node:assert/strict';
import test from 'node:test';
import {WHATSAPP_NOTICE,WHATSAPP_NOTICE_VERSION,WHATSAPP_ACCEPTED} from '../../server/sarin/whatsapp/consent.js';
import {WHATSAPP_PROFILE_SAVED,WHATSAPP_PROFILE_INVALID} from '../../server/sarin/whatsapp/profile.js';

for(const [name,copy] of [['aviso',WHATSAPP_NOTICE],['aceptación',WHATSAPP_ACCEPTED],['nombre guardado',WHATSAPP_PROFILE_SAVED],['nombre inválido',WHATSAPP_PROFILE_INVALID]]){
 test(name+' cabe en el cuerpo interactivo y no ofrece números o comandos de control escritos',()=>{
  assert.ok(copy.length>0&&copy.length<=1024);
  assert.doesNotMatch(copy,/\b(?:ACEPTO|HUMANO|STOP|SALIR|PARAR)\b|\([123]\)/u);
  assert.match(copy,/Hablar con Andrés/u);assert.match(copy,/Salir/u);
 });
}
test('aceptación mantiene el nombre opcional y el aviso conserva su autorización v3',()=>{
 assert.equal(WHATSAPP_NOTICE_VERSION,'whatsapp-service-2026-10-18-v3');
 assert.match(WHATSAPP_NOTICE,/Aceptar para autorizar/u);
 assert.match(WHATSAPP_ACCEPTED,/NOMBRE: Ana Pérez/u);assert.match(WHATSAPP_ACCEPTED,/Es opcional/u);
});
test('aviso distingue contenido y recibos operativos del registro seudonimizado de costos',()=>{
 assert.match(WHATSAPP_NOTICE,/contenido hasta 24 horas y los recibos operativos hasta 48 horas/u);
 assert.match(WHATSAPP_NOTICE,/Para controlar costos conserva hasta 13 meses importes, fechas y una huella del identificador del mensaje, sin contenido ni número/u);
 assert.match(WHATSAPP_NOTICE,/Estos plazos no cubren a los proveedores/u);
 assert.ok(WHATSAPP_NOTICE.length<=1024);
});
