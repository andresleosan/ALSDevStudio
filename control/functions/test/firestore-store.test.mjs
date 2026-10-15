import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreStore } from '../src/firestore-store.mjs';

// El doble reproduce la restricción real: Firestore rechaza leer después de escribir.
function database() {
  const records = new Map([['subjects/a', { id: 'a', name: 'Original' }]]);
  let committed = 0;
  const db = {
    collection: (name) => ({
      doc: (id) => ({ path: `${name}/${id}` }),
      limit: (limit) => ({ collection: name, limit }),
    }),
    async runTransaction(callback) {
      let writing = false;
      const writes = new Map();
      const result = await callback({
        async get(ref) {
          assert.equal(writing, false, 'Lectura posterior a escritura Firestore');
          if (ref.collection) return { docs: [...records].filter(([key]) => key.startsWith(`${ref.collection}/`)).slice(0, ref.limit).map(([, value]) => ({ data: () => value })) };
          return { exists: records.has(ref.path), data: () => records.get(ref.path) };
        },
        set(ref, value) { writing = true; writes.set(ref.path, value); },
      });
      for (const [key, value] of writes) records.set(key, value);
      committed += writes.size;
      return result;
    },
  };
  return { db, records, get committed() { return committed; } };
}

test('difiere escrituras y conserva lecturas propias y listados del mismo callback', async () => {
  const fixture = database();
  const store = createFirestoreStore(fixture.db);
  await store.runTransaction(async (tx) => {
    await tx.set('subjects', 'a', { id: 'a', name: 'Nuevo' });
    assert.equal((await tx.get('subjects', 'a')).name, 'Nuevo');
    assert.equal(await tx.get('subjects', 'missing'), null);
    await tx.set('subjects', 'b', { id: 'b', name: 'Segundo' });
    assert.deepEqual((await tx.list('subjects', 10)).map((r) => r.name), ['Nuevo', 'Segundo']);
  });
  assert.equal(fixture.committed, 2);
  assert.equal(fixture.records.get('subjects/a').name, 'Nuevo');
});

test('un callback fallido no deja escrituras parciales', async () => {
  const fixture = database();
  await assert.rejects(createFirestoreStore(fixture.db).runTransaction(async (tx) => {
    await tx.set('subjects', 'b', { id: 'b' });
    throw new Error('cancelar');
  }), /cancelar/);
  assert.equal(fixture.committed, 0);
  assert.equal(fixture.records.has('subjects/b'), false);
});

test('rechaza rutas de documentos y límites que no son válidos', async () => {
  await createFirestoreStore(database().db).runTransaction(async (tx) => {
    await assert.rejects(tx.get('subjects/x', 'a'));
    await assert.rejects(tx.set('subjects', '../x', {}));
    await assert.rejects(tx.list('subjects', 0));
  });
});
