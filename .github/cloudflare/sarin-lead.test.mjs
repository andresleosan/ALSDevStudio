import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SARIN_LEAD_LIMITS, validateSarinLead } from '../../scripts/modules/sarin-lead.js';

const lead = { firstName: 'María', lastName: 'O’Neill', email: 'maria+consulta@example.com' };

test('normaliza sólo los campos de contacto declarados y admite nombres Unicode', () => {
  assert.deepEqual(validateSarinLead({ firstName: '  Mari\u0301a   José  ', lastName: '  O’Neill-Sánchez ', email: ' Maria+Proyecto@EXAMPLE.COM ' }), {
    ok: true, lead: { firstName: 'María José', lastName: 'O’Neill-Sánchez', email: 'Maria+Proyecto@example.com' },
  });
  for (const name of ['李', 'A', 'محمد', 'Zoë', 'Jean-Luc', 'D\'Angelo', 'Ana·María']) {
    assert.equal(validateSarinLead({ ...lead, firstName: name }).ok, true, name);
  }
  assert.deepEqual(SARIN_LEAD_LIMITS, { firstName: 80, lastName: 80, email: 254 });
});

test('exige una forma cerrada sin convertir ni completar valores', () => {
  for (const invalid of [null, undefined, [], '', 1, { ...lead, extra: 'dato' }, { ...lead, firstName: 123 }, { ...lead, lastName: undefined }, { ...lead, email: null }]) {
    const result = validateSarinLead(invalid);
    assert.equal(result.ok, false);
    assert.equal(Object.hasOwn(result, 'lead'), false);
  }
  assert.equal(validateSarinLead({ ...lead }).ok, true);
  assert.deepEqual(lead, { firstName: 'María', lastName: 'O’Neill', email: 'maria+consulta@example.com' });
});

test('rechaza nombres vacíos, demasiado largos, controles, marcado y caracteres invisibles', () => {
  for (const value of ['', '   ', 'A'.repeat(81), '<script>', 'Ana\nMaría', 'Ana\rMaría', 'Ana\u0000', 'Ana\u202E', 'Ana\u200B', '1234', '\u0301Ana']) {
    for (const field of ['firstName', 'lastName']) {
      const result = validateSarinLead({ ...lead, [field]: value });
      assert.equal(result.ok, false, JSON.stringify(value));
      assert.equal(result.field, field);
      if (value.trim()) assert.equal(result.message.includes(value), false, 'el error no refleja valores personales');
    }
  }
  assert.equal(validateSarinLead({ ...lead, firstName: 'Á'.repeat(80) }).ok, true);
});

test('correo acotado, sin cabeceras, marcado ni formatos ambiguos; no afirma verificar su titular', () => {
  for (const email of ['', ' ', 'a', '@example.com', 'a@', 'a@@example.com', 'a b@example.com', '.a@example.com', 'a..b@example.com', 'a.@example.com', 'a@example', 'a@-example.com', 'a@example-.com', 'a@ex_ample.com', 'a@éxample.com', 'á@example.com', 'a@example.com\r\nBcc:x@example.com', '<a>@example.com', `${'a'.repeat(65)}@example.com`, `a@${'b'.repeat(64)}.com`, `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`]) {
    const result = validateSarinLead({ ...lead, email });
    assert.equal(result.ok, false, JSON.stringify(email));
    assert.equal(result.field, 'email');
  }
  for (const email of ['a@b.co', 'a.b+tag@example.co.uk', 'a@xn--exmple-cua.com']) {
    assert.equal(validateSarinLead({ ...lead, email }).ok, true, email);
  }
});
