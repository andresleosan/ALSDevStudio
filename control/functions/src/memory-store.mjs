// @ts-check
/** @template T @param {T} value @returns {T} */
const clone = value => JSON.parse(JSON.stringify(value));

/** Almacén local con instantáneas aisladas, serialización y rollback completo.
 * @param {Record<string, Record<string, any>>} [initial]
 */
export function createMemoryStore(initial = {}) {
  let data = new Map(Object.entries(clone(initial)).map(([name, values]) => [name, new Map(Object.entries(values))]));
  let queue = Promise.resolve();
  return {
    /** @template T @param {(tx: {get(collection:string,id:string):Promise<any>,list(collection:string,limit?:number):Promise<any[]>,set(collection:string,id:string,value:any):Promise<void>}) => Promise<T>} callback */
    async runTransaction(callback) {
      const previous = queue;
      /** @type {() => void} */
      let release = () => {};
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      const pending = new Map([...data].map(([name, rows]) => [name, new Map([...rows].map(([id, value]) => [id, clone(value)]))]));
      let active = true;
      const ensureActive = () => { if (!active) throw new Error('Transacción finalizada.'); };
      try {
        const result = await callback({
          async get(collection, id) { ensureActive(); return clone(pending.get(collection)?.get(id) ?? null); },
          async list(collection, limit = 501) { ensureActive(); return clone([...(pending.get(collection)?.values() ?? [])].slice(0, limit)); },
          async set(collection, id, value) {
            ensureActive();
            if (!pending.has(collection)) pending.set(collection, new Map());
            pending.get(collection)?.set(id, clone(value));
          }
        });
        const detached = result === undefined ? result : clone(result);
        data = pending;
        return detached;
      } finally { active = false; release(); }
    }
  };
}
