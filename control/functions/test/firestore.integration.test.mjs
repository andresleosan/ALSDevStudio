import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { createFirestoreStore } from '../src/firestore-store.mjs';
import { createControlService } from '../src/service.mjs';

const enabled = process.env.GCLOUD_PROJECT === 'demo-alsdevstudio' && process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8085';
test('Firestore real emulado conserva pago único, concurrencia, rollback y niega acceso directo', { skip: !enabled }, async () => {
  const app = initializeApp({ projectId: 'demo-alsdevstudio' }, `integration-${randomUUID()}`);
  const database = getFirestore(app);
  try {
    const admin = { uid: 'andres-demo-admin', email: 'andres.san1404@gmail.com' };
    const store = createFirestoreStore(database);
    const service = createControlService({ store });
    const run = async (action, payload, requestId = randomUUID()) => (await service.execute({ action, payload, requestId }, admin)).result;
    await run('product.plan.save', { productId: 'laparada', plan: { name: 'Prueba técnica local', amountMinor: 5000000, currency: 'COP', billing: { mode: 'fixedDays', days: 30 }, trialDays: 7 } });
    const subject = await run('subject.create', { kind: 'business', name: `Integración ${randomUUID()}`, email: 'integration@example.test' });
    const subscription = await run('subscription.create', { productId: 'laparada', subjectId: subject.id });
    const payload = { subscriptionId: subscription.id, amountMinor: 5000000, method: 'nequi', reference: 'integración local', receivedAt: new Date(Date.now() - 60000).toISOString() };
    const quote = await run('payment.preview', payload);
    const confirmation = { quoteId: quote.id, acceptAmountDifference: false };
    const requestId = randomUUID();
    const [first, retry] = await Promise.all([run('payment.confirm', confirmation, requestId), run('payment.confirm', confirmation, requestId)]);
    assert.deepEqual(first, retry);
    assert.equal(first.subscription.paidUntil, quote.periodEnd);
    const restarted = createControlService({ store: createFirestoreStore(database) });
    const state = await restarted.getState(admin);
    assert.equal(state.payments.filter((payment) => payment.subscriptionId === subscription.id).length, 1);

    const quotes = await Promise.all([run('payment.preview', payload), run('payment.preview', payload)]);
    const results = await Promise.allSettled(quotes.map((item) => run('payment.confirm', { quoteId: item.id, acceptAmountDifference: false })));
    assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(results.find((item) => item.status === 'rejected').reason.code, 'QUOTE_STALE');
    const snapshot = await service.getState(admin);
    assert.equal(snapshot.payments.filter((payment) => payment.subscriptionId === subscription.id).length, 2);
    assert.equal(snapshot.commands.filter((command) => command.subscriptionId === subscription.id).length, 2);

    const rollbackId = `rollback-${randomUUID()}`;
    await assert.rejects(store.runTransaction(async (tx) => { await tx.set('subjects', rollbackId, { id: rollbackId }); await tx.get('products', 'laparada'); throw new Error('rollback'); }));
    assert.equal(await store.runTransaction((tx) => tx.get('subjects', rollbackId)), null);
    const denied = await fetch('http://127.0.0.1:8085/v1/projects/demo-alsdevstudio/databases/(default)/documents/subjects');
    assert.equal(denied.status, 403);
    const deniedWrite = await fetch('http://127.0.0.1:8085/v1/projects/demo-alsdevstudio/databases/(default)/documents/subjects?documentId=forbidden-client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: 'denied' } } }) });
    assert.equal(deniedWrite.status, 403);
    const auth = getAuth(app);
    try { await auth.createUser({ uid: admin.uid, email: admin.email, emailVerified: true }); }
    catch (error) { if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error; }
    const customToken = await auth.createCustomToken(admin.uid, { admin: false });
    const sessionResponse = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
    assert.equal(sessionResponse.status, 200);
    const { idToken } = await sessionResponse.json();
    const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url'));
    assert.equal(claims.user_id, admin.uid);
    assert.equal(claims.admin, false);
    const unprivileged = await fetch('http://127.0.0.1:8085/v1/projects/demo-alsdevstudio/databases/(default)/documents/subjects', { headers: { Authorization: `Bearer ${idToken}` } });
    assert.equal(unprivileged.status, 403);
  } finally { await database.terminate(); await deleteApp(app); }
});
