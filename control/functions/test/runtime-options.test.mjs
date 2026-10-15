import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveRuntimeEnvironment, getRuntimeOptions } from '../src/runtime-options.mjs';

const production = { GCLOUD_PROJECT: 'alsdevstudio' };
const demo = {
  GCLOUD_PROJECT: 'demo-alsdevstudio',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085',
};

test('resuelve exclusivamente el proyecto real o la demostración con emuladores exactos', () => {
  assert.deepEqual(resolveRuntimeEnvironment(production), { projectId: 'alsdevstudio', demo: false, authEmulatorHost: undefined });
  assert.deepEqual(resolveRuntimeEnvironment(demo), { projectId: 'demo-alsdevstudio', demo: true, authEmulatorHost: '127.0.0.1:9099' });
  assert.equal(resolveRuntimeEnvironment({ GOOGLE_CLOUD_PROJECT: 'alsdevstudio' }).projectId, 'alsdevstudio');
});

test('rechaza proyecto ausente, ajeno o ambiguo antes de inicializar Firebase', () => {
  for (const env of [{}, { GCLOUD_PROJECT: 'sarinbotsaas' }, { GCLOUD_PROJECT: 'alsdevstudio', GOOGLE_CLOUD_PROJECT: 'other-project' }]) {
    assert.throws(() => resolveRuntimeEnvironment(env), /proyecto/i);
    assert.throws(() => getRuntimeOptions(env), /proyecto/i);
  }
});

test('la producción no puede redirigir Auth o Firestore hacia un emulador', () => {
  for (const field of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
    assert.throws(() => resolveRuntimeEnvironment({ ...production, [field]: '127.0.0.1:9099' }), /emulador/i);
    assert.throws(() => getRuntimeOptions({ ...production, [field]: 'emulator.example.com:8085' }), /emulador/i);
  }
});

test('la demostración exige ambos emuladores locales en sus puertos configurados', () => {
  for (const overrides of [
    { FIREBASE_AUTH_EMULATOR_HOST: undefined },
    { FIRESTORE_EMULATOR_HOST: undefined },
    { FIREBASE_AUTH_EMULATOR_HOST: 'localhost.attacker.test:9099' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
  ]) assert.throws(() => getRuntimeOptions({ ...demo, ...overrides }), /emulador/i);
});

test('emite la identidad dedicada real y límites de ejecución sin capacidad de sobreescritura por entorno', () => {
  const options = getRuntimeOptions({ ...production, CONTROL_SERVICE_ACCOUNT: 'broad-editor@example.com', CONTROL_MAX_INSTANCES: '100' });
  assert.equal(options.serviceAccount, 'als-control-api@alsdevstudio.iam.gserviceaccount.com');
  assert.equal(options.minInstances, 0);
  assert.equal(options.maxInstances, 1);
  assert.equal(options.invoker, 'public');
  assert.equal(options.region, 'us-central1');
  assert.equal(options.concurrency, 20);
  assert.equal(options.timeoutSeconds, 30);
  assert.equal(options.memory, '256MiB');
  assert.equal(options.cors, false);
});

test('la demostración no asume la cuenta de servicio real y conserva el límite de escalado', () => {
  const options = getRuntimeOptions(demo);
  assert.equal(Object.hasOwn(options, 'serviceAccount'), false);
  assert.equal(options.minInstances, 0);
  assert.equal(options.maxInstances, 1);
});
