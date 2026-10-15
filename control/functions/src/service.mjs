// @ts-check
import { createHash, randomUUID } from 'node:crypto';
import { initialProducts, renewalPeriod, accessStatus } from './domain.mjs';
import { ControlError } from './errors.mjs';

/** @typedef {Record<string, any>} Row */
/** @typedef {{ get(collection:string,id:string):Promise<any>, list(collection:string,limit:number):Promise<any[]>, set(collection:string,id:string,value:any):Promise<void> }} Transaction */
/** @param {string} code @param {string} message @param {number} [status] */
function fail(code, message, status = 400) { throw new ControlError(code, message, status); }
/** @param {unknown} value @param {string[]} keys @returns {asserts value is Row} */
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(value, key)))
    fail('VALIDATION', 'Los campos enviados no son válidos.');
}
/** @param {unknown} value @param {number} max @returns {string} */
function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value))
    fail('VALIDATION', 'El texto enviado no es válido.');
  return /** @type {string} */ (value).trim();
}
/** @param {unknown} value @returns {string} */
function id(value) {
  const result = text(value, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(result) || result !== value) fail('VALIDATION', 'El identificador no es válido.');
  return result;
}
/** @param {unknown} value @returns {number} */
function money(value) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) fail('VALIDATION', 'El importe debe ser un entero positivo en unidades menores.');
  return /** @type {number} */ (value);
}
/** @param {unknown} value @param {Date} current @returns {string} */
function receivedDate(value, current) {
  if (typeof value !== 'string' || value.length > 30 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value))
    fail('VALIDATION', 'La fecha recibida debe ser un instante ISO UTC.');
  const date = new Date(/** @type {string} */ (value));
  if (!Number.isFinite(date.getTime()) || date.toISOString().replace('.000Z','Z') !== String(value).replace('.000Z','Z') || date > current)
    fail('VALIDATION', 'La fecha recibida no es válida o está en el futuro.');
  return date.toISOString();
}
/** @param {Row} plan @param {Row} product */
function validatedPlan(plan, product) {
  object(plan, ['name','amountMinor','currency','billing','trialDays']);
  const name = text(plan.name, 100), amountMinor = money(plan.amountMinor);
  if (plan.currency !== 'COP') fail('VALIDATION', 'La moneda admitida es COP.');
  if (!Number.isSafeInteger(plan.trialDays) || plan.trialDays < 0 || plan.trialDays > 90 ||
    (['laparada','sarinbotsaas'].includes(product.id) && plan.trialDays !== 7))
    fail('VALIDATION', 'La duración de prueba no es válida para este producto.');
  const billing = plan.billing;
  if (billing?.mode === 'fixedDays') {
    object(billing, ['mode','days']);
    if (billing.days !== 30) fail('VALIDATION', 'La renovación fija debe ser de 30 días.');
  } else {
    object(billing, ['mode','months']);
    if (billing.mode !== 'calendarMonth' || billing.months !== 1 || product.id === 'sarinbotsaas')
      fail('VALIDATION', 'La política de renovación no es válida para este producto.');
  }
  return { name, amountMinor, currency:'COP', billing:{...billing}, trialDays:plan.trialDays };
}
/** @param {any} value @returns {string} */
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
/** @param {Transaction} tx @param {string} collection @param {unknown} key */
async function required(tx, collection, key) {
  const value = await tx.get(collection, id(key));
  if (!value) fail('NOT_FOUND', 'No se encontró el registro solicitado.', 404);
  return value;
}
/** @param {unknown} admin @returns {asserts admin is {uid:string,email:string}} */
function validateAdmin(admin) {
  if (!admin || typeof admin !== 'object' || !('uid' in admin) || !('email' in admin)) fail('UNAUTHORIZED', 'Se requiere una sesión administrativa.', 401);
  id(/** @type {Row} */ (admin).uid);
  text(/** @type {Row} */ (admin).email, 254);
}

/** @param {{store:{runTransaction<T>(callback:(tx:Transaction)=>Promise<T>):Promise<T>},now?:()=>Date,newId?:()=>string}} options */
export function createControlService({store, now = () => new Date(), newId = randomUUID}) {
  const nextId = () => id(newId());
  /** @param {Transaction} tx */
  async function seed(tx) {
    for (const product of initialProducts()) if (!await tx.get('products', String(product.id))) await tx.set('products', String(product.id), product);
  }
  /** @param {Transaction} tx @param {Row} subscription @param {Date} current */
  async function licenseChange(tx, subscription, current) {
    subscription.desiredVersion += 1;
    subscription.accessStatus = accessStatus(subscription, current);
    subscription.connectionStatus = 'disconnected';
    subscription.confirmedVersion = null;
    await tx.set('subscriptions', subscription.id, subscription);
    const commandId = nextId();
    await tx.set('commands', commandId, {
      id:commandId, subscriptionId:subscription.id, productId:subscription.productId, subjectId:subscription.subjectId,
      desiredVersion:subscription.desiredVersion, status:'pending', connectionStatus:'disconnected', attempts:0,
      createdAt:current.toISOString(), license:{
        trialEndsAt:subscription.trialEndsAt, paidUntil:subscription.paidUntil, suspendedAt:subscription.suspendedAt,
        accessStatus:subscription.accessStatus, desiredVersion:subscription.desiredVersion
      }
    });
  }

  return {
    /** @param {{uid:string,email:string}} admin */
    async getState(admin) {
      validateAdmin(admin);
      return store.runTransaction(async tx => {
        await seed(tx);
        const current = now();
        /** @type {Row} */
        const state = {serverTime:current.toISOString(), environment:'local',admin:{uid:admin.uid,email:admin.email}};
        /** @type {Record<string, boolean>} */
        const truncated = {};
        for (const collection of ['products','subjects','subscriptions','payments','auditEvents','commands']) {
          const rows = await tx.list(collection, 501);
          truncated[collection] = rows.length > 500;
          state[collection] = rows.slice(0,500).map(row => collection === 'subscriptions' ? {...row,accessStatus:accessStatus(row,current)} : row);
        }
        state.meta = {limit:500,truncated,hasTruncation:Object.values(truncated).some(Boolean),scope:'loaded-records'};
        return state;
      });
    },
    /** @param {{requestId:string,action:string,payload:Row}} command @param {{uid:string,email:string}} admin */
    async execute(command, admin) {
      validateAdmin(admin);
      object(command, ['requestId','action','payload']);
      const requestId = id(command.requestId), action = text(command.action, 64);
      let fingerprint;
      try {
        const serialized = canonical({action,payload:command.payload,uid:admin.uid});
        if (serialized.length > 16000) fail('VALIDATION', 'La operación excede el tamaño permitido.');
        fingerprint = createHash('sha256').update(serialized).digest('hex');
      } catch (error) { if (error instanceof ControlError) throw error; fail('VALIDATION','El contenido no es JSON válido.'); }
      return store.runTransaction(async tx => {
        const previous = await tx.get('requests',requestId);
        if (previous) {
          if (previous.fingerprint !== fingerprint) fail('IDEMPOTENCY_CONFLICT','Esta clave ya se usó para otra operación.',409);
          return previous.response;
        }
        await seed(tx);
        const current = now(), timestamp = current.toISOString(), payload = command.payload;
        /** @type {any} */
        let result;
        /** @type {any} */
        let before = null;
        let targetId;
        if (action === 'subject.create') {
          object(payload,['kind','name','email']);
          if (!['person','business'].includes(payload.kind)) fail('VALIDATION','El tipo de contratante no es válido.');
          const name=text(payload.name,160), email=text(payload.email,254).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) fail('VALIDATION','El correo no es válido.');
          result={id:nextId(),kind:payload.kind,name,email,createdAt:timestamp};
          await tx.set('subjects',result.id,result);
        } else if (action === 'product.plan.save') {
          object(payload,['productId','plan']);
          const product=await required(tx,'products',payload.productId);
          before=product;
          result={...product,plan:validatedPlan(payload.plan,product),updatedAt:timestamp};
          await tx.set('products',product.id,result);
        } else if (action === 'subscription.create') {
          object(payload,['productId','subjectId']);
          const product=await required(tx,'products',payload.productId), subject=await required(tx,'subjects',payload.subjectId);
          if (!product.plan) fail('PLAN_DRAFT','Configura el plan antes de asignar una suscripción.',409);
          if (product.subjectKind !== subject.kind) fail('SUBJECT_KIND','El producto no admite este tipo de contratante.');
          const subscriptionId=createHash('sha256').update(JSON.stringify([product.id,subject.id])).digest('hex');
          if (await tx.get('subscriptions',subscriptionId)) fail('SUBSCRIPTION_EXISTS','Este contratante ya tiene una suscripción de este producto.',409);
          result={id:subscriptionId,productId:product.id,subjectId:subject.id,plan:validatedPlan(product.plan,product),
            trialStartedAt:null,trialEndsAt:null,paidUntil:null,suspendedAt:null,calendarAnchorDay:null,
            desiredVersion:0,confirmedVersion:null,connectionStatus:'disconnected',accessStatus:'pending',createdAt:timestamp};
          await tx.set('subscriptions',result.id,result);
        } else if (action === 'payment.preview') {
          object(payload,['subscriptionId','amountMinor','method','reference','receivedAt']);
          const subscription=await required(tx,'subscriptions',payload.subscriptionId);
          const amountMinor=money(payload.amountMinor), reference=text(payload.reference,160), receivedAt=receivedDate(payload.receivedAt,current);
          if (!['nequi','transfer'].includes(payload.method)) fail('VALIDATION','El medio de pago no es válido.');
          result={id:nextId(),subscriptionId:subscription.id,amountMinor,currency:subscription.plan.currency,
            ...renewalPeriod(subscription,current),expiresAt:new Date(current.getTime()+600000).toISOString(),
            expectedVersion:subscription.desiredVersion,amountDifference:amountMinor-subscription.plan.amountMinor,
            method:payload.method,reference,receivedAt,createdAt:timestamp,consumedAt:null};
          await tx.set('paymentQuotes',result.id,result);
        } else if (action === 'payment.confirm') {
          object(payload,['quoteId','acceptAmountDifference']);
          if (typeof payload.acceptAmountDifference !== 'boolean') fail('VALIDATION','Confirma explícitamente la diferencia de importe.');
          const quote=await required(tx,'paymentQuotes',payload.quoteId);
          if (quote.consumedAt) fail('QUOTE_CONSUMED','Esta vista previa ya fue confirmada.',409);
          if (Date.parse(quote.expiresAt) <= current.getTime()) fail('QUOTE_EXPIRED','La vista previa venció; solicita una nueva.',409);
          const subscription=await required(tx,'subscriptions',quote.subscriptionId);
          if (subscription.desiredVersion !== quote.expectedVersion) fail('QUOTE_STALE','La suscripción cambió; solicita una vista previa nueva.',409);
          if (quote.amountDifference !== 0 && !payload.acceptAmountDifference) fail('AMOUNT_DIFFERENCE','Acepta la diferencia de importe y el período mostrado.',409);
          before={...subscription};
          subscription.paidUntil=quote.periodEnd;
          subscription.calendarAnchorDay=quote.calendarAnchorDay;
          await licenseChange(tx,subscription,current);
          const payment={id:nextId(),subscriptionId:subscription.id,productId:subscription.productId,subjectId:subscription.subjectId,
            quoteId:quote.id,amountMinor:quote.amountMinor,currency:quote.currency,method:quote.method,reference:quote.reference,
            receivedAt:quote.receivedAt,periodStart:quote.periodStart,periodEnd:quote.periodEnd,
            amountDifference:quote.amountDifference,acceptedAmountDifference:payload.acceptAmountDifference,confirmedAt:timestamp,
            confirmedBy:{uid:admin.uid,email:admin.email}};
          await tx.set('payments',payment.id,payment);
          await tx.set('paymentQuotes',quote.id,{...quote,consumedAt:timestamp,paymentId:payment.id});
          result={payment,subscription};targetId=subscription.id;
        } else if (['subscription.trial.start','subscription.suspend','subscription.reactivate'].includes(action)) {
          object(payload,action === 'subscription.trial.start' ? ['subscriptionId'] : ['subscriptionId','reason']);
          const subscription=await required(tx,'subscriptions',payload.subscriptionId);
          before={...subscription};
          if (action === 'subscription.trial.start') {
            if (subscription.trialStartedAt || subscription.paidUntil || !subscription.plan.trialDays) fail('TRIAL_UNAVAILABLE','La suscripción no dispone de una prueba nueva.',409);
            subscription.trialStartedAt=timestamp;
            subscription.trialEndsAt=new Date(current.getTime()+subscription.plan.trialDays*86400000).toISOString();
          } else {
            text(payload.reason,500);
            if (action === 'subscription.suspend') {
              if (subscription.suspendedAt) fail('ALREADY_SUSPENDED','La suscripción ya está suspendida.',409);
              subscription.suspendedAt=timestamp;
            } else {
              if (!subscription.suspendedAt) fail('NOT_SUSPENDED','La suscripción no está suspendida.',409);
              subscription.suspendedAt=null;
            }
          }
          await licenseChange(tx,subscription,current);result=subscription;
        } else fail('ACTION_UNKNOWN','La acción solicitada no está disponible.');
        const eventId=nextId();
        await tx.set('auditEvents',eventId,{id:eventId,requestId,action,targetId:targetId || result.id,
          actor:{uid:admin.uid,email:admin.email},createdAt:timestamp,reason:payload.reason || null,before,after:result});
        const response={result};
        await tx.set('requests',requestId,{id:requestId,fingerprint,response,createdAt:timestamp});
        return response;
      });
    }
  };
}
