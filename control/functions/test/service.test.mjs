import test from 'node:test';
import assert from 'node:assert/strict';
import { createControlService } from '../src/service.mjs';
import { createMemoryStore } from '../src/memory-store.mjs';

const admin = {uid:'admin-local',email:'andres.san1404@gmail.com'};
const plan = {name:'Plan local',amountMinor:5000000,currency:'COP',billing:{mode:'fixedDays',days:30},trialDays:7};
function setup(initial) {
  let time = new Date('2026-01-31T14:00:00Z'), id = 0;
  const store = createMemoryStore(initial);
  const service = createControlService({store,now:()=>new Date(time),newId:()=>`id-${++id}`});
  const run = async (action,payload,requestId=`req-${++id}`) => (await service.execute({action,payload,requestId},admin)).result;
  return {store,service,run,setTime(value){time=new Date(value);}};
}
async function subscription(ctx,productId='laparada',customPlan=plan,kind='business') {
  await ctx.run('product.plan.save',{productId,plan:customPlan});
  const subject = await ctx.run('subject.create',{kind,name:'Negocio <img src=x>',email:'contacto@example.com'});
  return ctx.run('subscription.create',{productId,subjectId:subject.id});
}
const previewPayload = subscriptionId => ({subscriptionId,amountMinor:5000000,method:'nequi',reference:'ref-1',receivedAt:'2026-01-31T13:00:00.000Z'});
const error = code => value => value.code === code;

test('store revierte escrituras y entrega copias JSON aisladas', async () => {
  const store=createMemoryStore();
  await assert.rejects(store.runTransaction(async tx=>{await tx.set('a','1',{n:1});throw new Error('rollback');}));
  assert.equal(await store.runTransaction(tx=>tx.get('a','1')),null);
  const original={n:1}; await store.runTransaction(tx=>tx.set('a','1',original)); original.n=8;
  const read=await store.runTransaction(tx=>tx.get('a','1')); assert.equal(read.n,1); read.n=9;
  assert.equal((await store.runTransaction(tx=>tx.get('a','1'))).n,1);
});
test('estado inicial solo tiene catálogo, plan borrador no admite suscripción',async()=>{
  const ctx=setup(),state=await ctx.service.getState(admin);
  assert.equal(state.products.length,4); assert.equal(state.subjects.length,0);
  const subject=await ctx.run('subject.create',{kind:'business',name:'Local',email:'local@example.com'});
  await assert.rejects(ctx.run('subscription.create',{productId:'laparada',subjectId:subject.id}),error('PLAN_DRAFT'));
});
test('sujeto compatible, copia de plan y suscripción única',async()=>{
  const ctx=setup(),sub=await subscription(ctx);
  await ctx.run('product.plan.save',{productId:'laparada',plan:{...plan,amountMinor:9000000}});
  assert.equal(sub.plan.amountMinor,5000000);
  await assert.rejects(ctx.run('subscription.create',{productId:'laparada',subjectId:sub.subjectId}),error('SUBSCRIPTION_EXISTS'));
  const person=await ctx.run('subject.create',{kind:'person',name:'Persona',email:'person@example.com'});
  await assert.rejects(ctx.run('subscription.create',{productId:'laparada',subjectId:person.id}),error('SUBJECT_KIND'));
});
test('prueba única de 168 horas y configuraciones sin prueba',async()=>{
  const ctx=setup(),sub=await subscription(ctx);
  const trial=await ctx.run('subscription.trial.start',{subscriptionId:sub.id});
  assert.equal(trial.trialEndsAt,'2026-02-07T14:00:00.000Z'); assert.equal(trial.accessStatus,'trial');
  await assert.rejects(ctx.run('subscription.trial.start',{subscriptionId:sub.id}),error('TRIAL_UNAVAILABLE'));
  const other=await subscription(ctx,'dialon',{...plan,trialDays:0},'person');
  await assert.rejects(ctx.run('subscription.trial.start',{subscriptionId:other.id}),error('TRIAL_UNAVAILABLE'));
});
test('confirmación idempotente conserva pago, auditoría y orden absoluta',async()=>{
  const ctx=setup(),sub=await subscription(ctx);
  const quote=await ctx.run('payment.preview',previewPayload(sub.id));
  const payload={quoteId:quote.id,acceptAmountDifference:false};
  const [first,repeat]=await Promise.all([ctx.run('payment.confirm',payload,'pay-1'),ctx.run('payment.confirm',payload,'pay-1')]);
  assert.deepEqual(first,repeat); assert.equal(first.subscription.paidUntil,quote.periodEnd);
  const state=await ctx.service.getState(admin); assert.equal(state.payments.length,1);
  assert.equal(state.commands.length,1); assert.equal(state.commands[0].license.paidUntil,quote.periodEnd);
  assert.equal(state.commands[0].status,'pending'); assert.equal(first.subscription.confirmedVersion,null);
  assert.equal(state.auditEvents.filter(e=>e.action==='payment.confirm').length,1);
  await assert.rejects(ctx.run('payment.confirm',{...payload,acceptAmountDifference:true},'pay-1'),error('IDEMPOTENCY_CONFLICT'));
  await assert.rejects(ctx.run('payment.confirm',payload),error('QUOTE_CONSUMED'));
});
test('dos cotizaciones concurrentes rechazan stale y pago nuevo conserva ambas extensiones',async()=>{
  const ctx=setup(),sub=await subscription(ctx);
  const quotes=await Promise.all([ctx.run('payment.preview',previewPayload(sub.id)),ctx.run('payment.preview',{...previewPayload(sub.id),reference:'ref-2'})]);
  const outcomes=await Promise.allSettled(quotes.map(q=>ctx.run('payment.confirm',{quoteId:q.id,acceptAmountDifference:false})));
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(outcomes.find(r=>r.status==='rejected').reason.code,'QUOTE_STALE');
  const fresh=await ctx.run('payment.preview',{...previewPayload(sub.id),reference:'ref-2'});
  const second=await ctx.run('payment.confirm',{quoteId:fresh.id,acceptAmountDifference:false});
  assert.equal(second.subscription.paidUntil,'2026-04-01T14:00:00.000Z');
  assert.equal((await ctx.service.getState(admin)).payments.length,2);
});
test('diferencia de importe exige aceptación y errores no dejan escrituras',async()=>{
  const ctx=setup(),sub=await subscription(ctx);
  const quote=await ctx.run('payment.preview',{...previewPayload(sub.id),amountMinor:1000});
  assert.equal(quote.amountDifference,-4999000);
  const before=await ctx.service.getState(admin);
  await assert.rejects(ctx.run('payment.confirm',{quoteId:quote.id,acceptAmountDifference:false}),error('AMOUNT_DIFFERENCE'));
  assert.deepEqual(await ctx.service.getState(admin),before);
  const result=await ctx.run('payment.confirm',{quoteId:quote.id,acceptAmountDifference:true});
  assert.equal(result.payment.amountMinor,1000);
});
test('cotización caduca exactamente a diez minutos',async()=>{
  const ctx=setup(),sub=await subscription(ctx),quote=await ctx.run('payment.preview',previewPayload(sub.id));
  ctx.setTime(quote.expiresAt);
  await assert.rejects(ctx.run('payment.confirm',{quoteId:quote.id,acceptAmountDifference:false}),error('QUOTE_EXPIRED'));
  assert.equal((await ctx.service.getState(admin)).payments.length,0);
});
test('confirmación conserva fechas vistas aunque avance reloj sin alargar período',async()=>{
  const ctx=setup(),sub=await subscription(ctx),quote=await ctx.run('payment.preview',previewPayload(sub.id));
  ctx.setTime('2026-01-31T14:02:00Z');
  const result=await ctx.run('payment.confirm',{quoteId:quote.id,acceptAmountDifference:false});
  assert.equal(result.payment.periodStart,quote.periodStart);assert.equal(result.subscription.paidUntil,quote.periodEnd);
});
test('pagar conserva suspensión; reactivar calcula vigencia actual y no reinicia prueba',async()=>{
  const ctx=setup(),sub=await subscription(ctx);
  await ctx.run('subscription.trial.start',{subscriptionId:sub.id});
  await ctx.run('subscription.suspend',{subscriptionId:sub.id,reason:'Revisión manual'});
  const q=await ctx.run('payment.preview',previewPayload(sub.id));
  const paid=await ctx.run('payment.confirm',{quoteId:q.id,acceptAmountDifference:false});
  assert.equal(paid.subscription.accessStatus,'suspended');
  ctx.setTime('2027-01-01T00:00:00Z');
  const active=await ctx.run('subscription.reactivate',{subscriptionId:sub.id,reason:'Revisión terminada'});
  assert.equal(active.accessStatus,'expired'); assert.equal(active.trialEndsAt,'2026-02-07T14:00:00.000Z');
  assert.equal(active.desiredVersion,4);
});
test('validación estricta rechaza tipos, campos extra, importes y políticas inválidas',async()=>{
  const ctx=setup();
  for(const payload of [{kind:'company',name:'A',email:'a@b.co'},{kind:'person',name:'A',email:'bad'},{kind:'person',name:'A',email:'a@b.co',admin:true},{kind:'person',name:'x'.repeat(161),email:'a@b.co'}])
    await assert.rejects(ctx.run('subject.create',payload),error('VALIDATION'));
  for(const amountMinor of [0,-1,1.1,Number.MAX_SAFE_INTEGER+1,'500'])
    await assert.rejects(ctx.run('product.plan.save',{productId:'laparada',plan:{...plan,amountMinor}}),error('VALIDATION'));
  await assert.rejects(ctx.run('product.plan.save',{productId:'sarinbotsaas',plan:{...plan,billing:{mode:'calendarMonth',months:1}}}),error('VALIDATION'));
  await assert.rejects(ctx.run('product.plan.save',{productId:'laparada',plan:{...plan,trialDays:8}}),error('VALIDATION'));
});
test('snapshot limita 500 e informa truncamiento sin total ficticio',async()=>{
  const subjects=Object.fromEntries(Array.from({length:501},(_,i)=>[`s-${i}`,{id:`s-${i}`,name:'Persona'}]));
  const ctx=setup({subjects}),state=await ctx.service.getState(admin);
  assert.equal(state.subjects.length,500);assert.equal(state.meta.limit,500);assert.equal(state.meta.truncated.subjects,true);
});
test('IDs incompatibles con almacenamiento se rechazan como validación',async()=>{
  const ctx=setup();
  for(const requestId of ['req/1','req.1','req:1','x'.repeat(129)])
    await assert.rejects(ctx.run('subject.create',{kind:'person',name:'Persona',email:'p@example.com'},requestId),error('VALIDATION'));
});
test('reintento con claves en otro orden conserva respuesta original',async()=>{
  const ctx=setup(),first=await ctx.run('subject.create',{kind:'person',name:'Persona',email:'p@example.com'},'canonical');
  const retry=await ctx.run('subject.create',{email:'p@example.com',name:'Persona',kind:'person'},'canonical');
  assert.deepEqual(retry,first);assert.equal((await ctx.service.getState(admin)).subjects.length,1);
});
test('cambios de licencia invalidan cotización y no conceden pago',async()=>{
  const ctx=setup(),sub=await subscription(ctx),q=await ctx.run('payment.preview',previewPayload(sub.id));
  await ctx.run('subscription.trial.start',{subscriptionId:sub.id});
  await assert.rejects(ctx.run('payment.confirm',{quoteId:q.id,acceptAmountDifference:false}),error('QUOTE_STALE'));
  assert.equal((await ctx.service.getState(admin)).payments.length,0);
});
test('preview rechaza pagos incompletos y fechas inválidas sin efectos',async()=>{
  const ctx=setup(),sub=await subscription(ctx),before=await ctx.service.getState(admin);
  for(const change of [{receivedAt:'2026-02-30T00:00:00Z'},{receivedAt:'2027-01-01T00:00:00Z'},{receivedAt:'ayer'},{method:'cash'},{reference:' '},{amountMinor:NaN},{amountMinor:Infinity},{amountMinor:1.5},{extra:true}])
    await assert.rejects(ctx.run('payment.preview',{...previewPayload(sub.id),...change}),error('VALIDATION'));
  assert.deepEqual(await ctx.service.getState(admin),before);
});
test('store serializa actualizaciones concurrentes sin perder incrementos',async()=>{
  const store=createMemoryStore({counts:{one:{n:0}}});
  await Promise.all(Array.from({length:10},()=>store.runTransaction(async tx=>{
    const row=await tx.get('counts','one');await Promise.resolve();await tx.set('counts','one',{n:row.n+1});
  })));
  assert.equal((await store.runTransaction(tx=>tx.get('counts','one'))).n,10);
});
test('SemanControl permite prueba configurada y lectura recalcula vencimiento',async()=>{
  const ctx=setup(),sub=await subscription(ctx,'semancontrol',{...plan,trialDays:3});
  const trial=await ctx.run('subscription.trial.start',{subscriptionId:sub.id});
  assert.equal(trial.trialEndsAt,'2026-02-03T14:00:00.000Z');
  ctx.setTime(trial.trialEndsAt);
  const state=await ctx.service.getState(admin);
  assert.equal(state.subscriptions[0].accessStatus,'expired');
  assert.equal(state.subscriptions[0].desiredVersion,1);
});
