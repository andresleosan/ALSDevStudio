import assert from 'node:assert/strict';
import test from 'node:test';

const ui = await import('../../scripts/modules/sarin-whatsapp-admin.js');

test('identidad usa nombre vigente y teléfono, o un único teléfono sin nombre',()=>{
 const peer={maskedPhone:'*** 0001',phone:'+573000000001',phoneExpiresAt:2000,fullName:'María Pérez',nameExpiresAt:1500};
 assert.equal(typeof ui.whatsAppPeerIdentity,'function');
 assert.deepEqual(ui.whatsAppPeerIdentity(peer,1000),{title:'María Pérez',subtitle:'+573000000001',nextExpiry:1500});
 assert.deepEqual(ui.whatsAppPeerIdentity(peer,1500),{title:'+573000000001',subtitle:'',nextExpiry:2000});
 assert.deepEqual(ui.whatsAppPeerIdentity(peer,2000),{title:'*** 0001',subtitle:'',nextExpiry:null});
 assert.deepEqual(ui.whatsAppPeerIdentity({maskedPhone:'*** 0001'},1000),{title:'*** 0001',subtitle:'',nextExpiry:null});
});

test('identidad no acepta un teléfono activo malformado ni texto de nombre de control',()=>{
 assert.equal(typeof ui.whatsAppPeerIdentity,'function');
 const peer={maskedPhone:'*** 0001',phone:'javascript:private',phoneExpiresAt:2000,fullName:'PRIVATE\u0000NAME',nameExpiresAt:2000};
 assert.deepEqual(ui.whatsAppPeerIdentity(peer,1000),{title:'*** 0001',subtitle:'',nextExpiry:null});
});

test('el enlace de una alerta sólo admite una huella de contacto completa y exacta', () => {
  assert.equal(typeof ui.whatsAppPeerFromHash, 'function');
  const key = 'a1'.repeat(32);
  assert.equal(ui.whatsAppPeerFromHash('#whatsapp=' + key), key);
  for (const hash of ['', '#whatsapp=', '#whatsapp=' + key + '&other=1', '#whatsapp=' + key.slice(1),
    '#whatsapp=' + 'A'.repeat(64), '#whatsapp=%61' + key.slice(1), '#whatsapp=../peers', '#whatsapp=<script>', null]) {
    assert.equal(ui.whatsAppPeerFromHash(hash), '', String(hash));
  }
});

test('una alerta aceptada por YCloud nunca se presenta como entregada', () => {
  assert.equal(typeof ui.whatsAppHandoffLabel, 'function');
  assert.match(ui.whatsAppHandoffLabel('accepted'), /entrega pendiente/);
  assert.doesNotMatch(ui.whatsAppHandoffLabel('accepted'), /Aviso entregado/);
  assert.match(ui.whatsAppHandoffLabel('waiting_template'), /plantilla aprobada/);
  assert.match(ui.whatsAppHandoffLabel('delivered'), /Aviso entregado/);
  assert.match(ui.whatsAppHandoffLabel('read'), /Aviso leído/);
  assert.match(ui.whatsAppHandoffLabel('send_uncertain'), /Puede haberse enviado/);
  for (const state of ['pending', 'failed', 'cancelled', 'expired'])assert.notEqual(ui.whatsAppHandoffLabel(state), 'Estado del aviso no disponible.');
  for (const state of ['__proto__', '<img>', null, undefined])assert.equal(ui.whatsAppHandoffLabel(state), 'Estado del aviso no disponible.');
});
