import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProducts, renewalPeriod, accessStatus } from '../src/domain.mjs';

const plan = billing => ({ name: 'Plan', amountMinor: 5000000, currency: 'COP', trialDays: 7, billing });
test('catálogo sin precios y modalidades por producto', () => {
  const products = initialProducts();
  assert.deepEqual(products.map(p => [p.id, p.subjectKind, p.trialDays, p.plan]), [
    ['laparada','business',7,null], ['sarinbotsaas','business',7,null], ['dialon','person',0,null], ['semancontrol','business',0,null]
  ]);
});
test('renovación anticipada respeta prueba y modalidad de 30 días', () => {
  const result = renewalPeriod({plan:plan({mode:'fixedDays',days:30}), trialEndsAt:'2026-02-07T13:00:00.000Z'}, new Date('2026-02-01T13:00:00Z'));
  assert.equal(result.periodStart,'2026-02-07T13:00:00.000Z');
  assert.equal(result.periodEnd,'2026-03-09T13:00:00.000Z');
});
test('fin de mes conserva ancla enero 31 febrero 28 marzo 31 sin horas de drift', () => {
  const sub = {plan:plan({mode:'calendarMonth',months:1})};
  const first = renewalPeriod(sub,new Date('2026-01-31T23:43:21.000Z'));
  assert.equal(first.periodEnd,'2026-02-28T23:43:21.000Z');
  const second = renewalPeriod({...sub,paidUntil:first.periodEnd,calendarAnchorDay:first.calendarAnchorDay},new Date('2026-02-10T00:00:00Z'));
  assert.equal(second.periodEnd,'2026-03-31T23:43:21.000Z');
});
test('calendario usa fecha Bogotá y año bisiesto', () => {
  const result = renewalPeriod({plan:plan({mode:'calendarMonth',months:1})},new Date('2024-02-01T03:00:00Z'));
  assert.equal(result.periodEnd,'2024-03-01T03:00:00.000Z');
  assert.equal(result.calendarAnchorDay,31);
});
test('el límite de día en Bogotá ocurre a las 05:00 UTC', () => {
  const sub={plan:plan({mode:'calendarMonth',months:1})};
  const before=renewalPeriod(sub,new Date('2026-02-01T04:59:59.000Z'));
  const after=renewalPeriod(sub,new Date('2026-02-01T05:00:00.000Z'));
  assert.equal(before.calendarAnchorDay,31);assert.equal(before.periodEnd,'2026-03-01T04:59:59.000Z');
  assert.equal(after.calendarAnchorDay,1);assert.equal(after.periodEnd,'2026-03-01T05:00:00.000Z');
});
test('vencida reinicia desde ahora y cambia ancla', () => {
  const result = renewalPeriod({plan:plan({mode:'calendarMonth',months:1}),paidUntil:'2026-02-28T13:00:00Z',calendarAnchorDay:31},new Date('2026-03-12T14:00:00Z'));
  assert.equal(result.periodStart,'2026-03-12T14:00:00.000Z');
  assert.equal(result.periodEnd,'2026-04-12T14:00:00.000Z');
  assert.equal(result.calendarAnchorDay,12);
});
test('renovar en instante exacto del vencimiento conserva ancla original', () => {
  const result = renewalPeriod({plan:plan({mode:'calendarMonth',months:1}),paidUntil:'2026-02-28T13:00:00.000Z',calendarAnchorDay:31},new Date('2026-02-28T13:00:00.000Z'));
  assert.equal(result.periodEnd,'2026-03-31T13:00:00.000Z');
});
test('suspensión tiene prioridad, vencimiento se calcula en lectura', () => {
  const sub = {paidUntil:'2026-03-01T00:00:00Z'};
  assert.equal(accessStatus(sub,new Date('2026-02-01')), 'active');
  assert.equal(accessStatus(sub,new Date('2026-03-01')), 'expired');
  assert.equal(accessStatus({...sub,suspendedAt:'2026-01-01'},new Date('2026-02-01')),'suspended');
});
