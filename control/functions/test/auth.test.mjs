import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertAdminClaims, createFirebaseVerifier } from '../src/auth.mjs';

const now = 1792022400000;
const production = {
  projectId: 'alsdevstudio', adminUid: 'owner-uid-123',
  adminEmail: 'andres.san1404@gmail.com', environment: 'production',
};
const token = (changes = {}) => ({
  uid: production.adminUid, sub: production.adminUid,
  aud: production.projectId, iss: `https://securetoken.google.com/${production.projectId}`,
  email: production.adminEmail, email_verified: true, admin: true,
  firebase: { sign_in_provider: 'google.com' }, exp: now / 1000 + 3600,
  ...changes,
});

test('autoriza exclusivamente UID, correo, proyecto y claim del titular', () => {
  assert.deepEqual(assertAdminClaims(token(), production, now), {
    uid: production.adminUid, email: production.adminEmail,
  });
});

for (const [label, change] of [
  ['otro UID con el mismo correo', { uid: 'another-owner', sub: 'another-owner' }],
  ['otro correo', { email: 'other@example.com' }],
  ['correo sin verificar', { email_verified: false }],
  ['claim falso', { admin: false }],
  ['claim como texto', { admin: 'true' }],
  ['audiencia de otro producto', { aud: 'sarinbotsaas' }],
  ['emisor diferente', { iss: 'https://securetoken.google.com/sarinbotsaas' }],
  ['proveedor custom en produccion', { firebase: { sign_in_provider: 'custom' } }],
  ['token vencido', { exp: now / 1000 - 1 }],
  ['sub distinto del UID', { sub: 'other-subject' }],
]) {
  test(`rechaza ${label}`, () => {
    assert.throws(() => assertAdminClaims(token(change), production, now), error => error.status === 403 || error.status === 401);
  });
}

test('falla cerrada sin UID administrativo o con configuracion insegura', () => {
  for (const invalid of [
    { ...production, adminUid: '' },
    { ...production, projectId: 'other-project' },
    { ...production, authEmulatorHost: '127.0.0.1:9099' },
    { ...production, environment: 'demo', projectId: 'alsdevstudio' },
  ]) assert.throws(() => assertAdminClaims(token(), invalid, now), error => error.status === 503);
});

test('identidad sintetica solo admite proyecto demo y Auth emulator loopback', () => {
  const demo = { ...production, environment: 'demo', projectId: 'demo-alsdevstudio', authEmulatorHost: '127.0.0.1:9099' };
  const decoded = token({ aud: demo.projectId, iss: `https://securetoken.google.com/${demo.projectId}`, firebase: { sign_in_provider: 'custom' } });
  assert.equal(assertAdminClaims(decoded, demo, now).uid, demo.adminUid);
  for (const host of ['', 'https://localhost:9099', 'emulator.example.com:9099', 'localhost.attacker.test:9099']) {
    assert.throws(() => assertAdminClaims(decoded, { ...demo, authEmulatorHost: host }, now), error => error.status === 503);
  }
});

test('verificador Firebase comprueba revocacion y no filtra errores del SDK', async () => {
  let checkedRevocation;
  const auth = { verifyIdToken: async (_token, revoked) => { checkedRevocation = revoked; return token({ exp: Date.now() / 1000 + 3600 }); } };
  const verify = createFirebaseVerifier({ auth, config: production });
  assert.equal((await verify('opaque-token')).uid, production.adminUid);
  assert.equal(checkedRevocation, true);
  const broken = createFirebaseVerifier({ auth: { verifyIdToken: async () => { throw new Error('SECRET INTERNAL TOKEN'); } }, config: production });
  await assert.rejects(broken('opaque-token'), error => error.status === 401 && !error.message.includes('SECRET'));
  await assert.rejects(verify(''), error => error.status === 401);
});
