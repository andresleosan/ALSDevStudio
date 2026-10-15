import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPage, datasetLimited, totals, minorUnits, periodLabel } from '../web/scripts/render.mjs';

test('la búsqueda conserva filtros, ignora acentos y pagina de diez en diez', () => {
  const records = Array.from({ length: 25 }, (_, index) => ({ name: `Negócio ${index + 1}`, kind: index % 2 ? 'person' : 'business' }));
  const filtered = selectPage(records, { query: 'negocio', page: 2, searchable: row => row.name, test: row => row.kind === 'business' });
  assert.equal(filtered.count, 13);
  assert.equal(filtered.rows.length, 3);
  assert.equal(filtered.pages, 2);
  assert.equal(filtered.rows[0].name, 'Negócio 21');
  assert.equal(selectPage(records, { page: 99 }).page, 3);
  assert.equal(selectPage([], { page: 2 }).page, 1);
});

test('el aviso de conjunto limitado interpreta meta del contrato sin marcar otras colecciones', () => {
  const meta = { limit: 500, truncated: { payments: true, subjects: false }, hasTruncation: true, scope: 'loaded-records' };
  assert.equal(datasetLimited(meta, 'payments'), true);
  assert.equal(datasetLimited(meta, 'subjects'), false);
});

test('pagos recibidos y valor previsto no mezclan monedas ni períodos', () => {
  const plan = { amountMinor: 5000000, currency: 'COP', billing: { mode: 'fixedDays', days: 30 } };
  const result = totals({
    payments: [{ amountMinor: 12300, currency: 'COP' }, { amountMinor: 200, currency: 'USD' }],
    subscriptions: [{ plan, accessStatus: 'active' }, { plan, accessStatus: 'trial' }, { plan, accessStatus: 'suspended' }, { plan: { ...plan, billing: { mode: 'calendarMonth', months: 1 } }, accessStatus: 'active' }],
  });
  assert.deepEqual(result.received, { COP: 12300, USD: 200 });
  assert.deepEqual(result.recurring, { 'COP|Cada 30 días': 10000000, 'COP|Cada mes calendario': 5000000 });
  assert.equal(result.current, 3);
  assert.equal(result.suspended, 1);
});

test('el importe escrito conserva centavos sin redondeos flotantes', () => {
  assert.equal(minorUnits('50000'), 5000000);
  assert.equal(minorUnits('0.29'), 29);
  assert.equal(minorUnits('10,50'), 1050);
  for (const amount of ['0', '-10', '1.999', '1e3', '50.000.000', '9007199254740991']) assert.throws(() => minorUnits(amount));
  assert.equal(periodLabel(null), 'Plan por configurar');
});
