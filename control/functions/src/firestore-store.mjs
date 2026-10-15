// @ts-check

const segment = /^[A-Za-z0-9_-]{1,180}$/;
function validateSegment(value) {
  if (typeof value !== 'string' || !segment.test(value)) throw new TypeError('Identificador de almacenamiento inválido.');
}

/** Adaptador transaccional: ninguna escritura llega a Firestore antes de concluir las lecturas. */
export function createFirestoreStore(db) {
  return {
    async runTransaction(callback) {
      return db.runTransaction(async (transaction) => {
        const pending = new Map();
        const keyFor = (collection, id) => { validateSegment(collection); validateSegment(id); return `${collection}/${id}`; };
        const result = await callback({
          async get(collection, id) {
            const key = keyFor(collection, id);
            if (pending.has(key)) return structuredClone(pending.get(key).value);
            const snapshot = await transaction.get(db.collection(collection).doc(id));
            return snapshot.exists ? structuredClone(snapshot.data()) : null;
          },
          async list(collection, limit = 500) {
            validateSegment(collection);
            if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw new TypeError('Límite de lectura inválido.');
            const snapshot = await transaction.get(db.collection(collection).limit(limit));
            const values = new Map(snapshot.docs.map((doc) => [doc.id ?? doc.data().id, doc.data()]));
            for (const entry of pending.values()) if (entry.collection === collection) values.set(entry.id, entry.value);
            return [...values.values()].slice(0, limit).map((value) => structuredClone(value));
          },
          async set(collection, id, value) {
            const key = keyFor(collection, id);
            if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Documento inválido.');
            pending.set(key, { collection, id, value: structuredClone(value) });
          },
        });
        for (const { collection, id, value } of pending.values()) transaction.set(db.collection(collection).doc(id), value);
        return result;
      });
    },
  };
}
