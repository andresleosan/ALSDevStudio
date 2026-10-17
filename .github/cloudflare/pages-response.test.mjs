import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePagesResponse } from './pages-response.mjs';

const email = 'consulta@example.com';
const encoded = Buffer.from([201, ...Buffer.from(email)].map((byte, index) => index ? byte ^ 201 : byte)).toString('hex');
const anchor = `<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="${encoded}">[email&#160;protected]</a>`;
const decoder = '<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>';

test('compara el contenido original tras las dos transformaciones de correo conocidas de Cloudflare', () => {
  assert.equal(normalizePagesResponse(`<p>${anchor}</p>${decoder}\r\n`), `<p>${email}</p>\n`);
  assert.equal(normalizePagesResponse('<!--email_off-->correo<!--/email_off-->'), 'correo');
});

test('no oculta cambios de contenido, atributos, scripts o comentarios ajenos', () => {
  for (const value of ['<!--comentario original-->', '<script src="propio.js"></script>',
    anchor.replace('class="__cf_email__"', 'class="alterada"'), anchor.replace('class="__cf_email__"', 'class="__CF_EMAIL__"'), anchor.replace('[email&#160;protected]', 'contenido cambiado'),
    decoder.replace('5c5dd728', 'otra-version'), decoder.replace('></script>', ' data-extra="1"></script>')]) {
    assert.equal(normalizePagesResponse(value), value);
  }
});

test('un cifrado de correo malformado permanece visible para que la comparación falle', () => {
  for (const hex of ['a', '000', 'zz', '00ff', '003c7363726970743e']) {
    const value = anchor.replace(encoded, hex);
    assert.equal(normalizePagesResponse(value), value);
  }
});
