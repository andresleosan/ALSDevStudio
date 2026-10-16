// @ts-check

const DAY_MS = 86400000;
const RETENTION_MS = 35 * DAY_MS;
const MAX_MICROS = 10000000000;
const DEFAULT_LIMITS = { perMinute: 10, perDay: 50, dailyMicros: 1000000, monthlyMicros: 10000000 };

export class QuotaError extends Error {
  /** @param {429|503} status @param {string} code */
  constructor(status, code) {
    super(status === 429 ? 'Límite de uso alcanzado.' : 'El asistente no está disponible.');
    this.name = 'QuotaError';
    this.status = status;
    this.code = code;
  }
}

/** @param {unknown} value @param {number} maximum @param {number} [minimum] */
function integer(value, maximum, minimum = 1) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

/** @param {unknown} value */
function validTime(value) {
  return integer(value, 8640000000000000 - RETENTION_MS, 0);
}

/** @param {unknown} error */
function publicError(error) {
  if (error instanceof QuotaError) return error;
  const message = error instanceof Error ? error.message : '';
  if (message.includes('SARIN_RATE_LIMIT')) return new QuotaError(429, 'rate_limit');
  if (message.includes('SARIN_BUDGET_LIMIT')) return new QuotaError(429, 'budget_limit');
  if (message.includes('SARIN_BLOCKED')) return new QuotaError(503, 'quota_blocked');
  return new QuotaError(503, 'quota_unavailable');
}

/** @param {string} ip @param {string} secret @param {number} nowMs */
export async function pseudonymizeIp(ip, secret, nowMs) {
  if (typeof ip !== 'string' || ip.length < 2 || ip.length > 64 || !/^[0-9a-fA-F:.]+$/.test(ip)
      || typeof secret !== 'string' || secret.length < 32 || secret.length > 4096 || !validTime(nowMs)) {
    throw new QuotaError(503, 'quota_config_invalid');
  }
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const day = new Date(nowMs).toISOString().slice(0, 10);
    const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${day}\n${ip.toLowerCase()}`));
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  } catch {
    throw new QuotaError(503, 'quota_unavailable');
  }
}

/**
 * @typedef {{bind: (...values: any[]) => Statement}} Statement
 * @typedef {{success: boolean, results: any[]}} Result
 * @typedef {{prepare: (sql: string) => Statement, batch: (statements: Statement[]) => Promise<Result[]>}} Database
 * @param {{db: Database, identity: string, now?: () => number, limits?: typeof DEFAULT_LIMITS}} options
 */
export function createQuota({ db, identity, now = () => Date.now(), limits = DEFAULT_LIMITS }) {
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function'
      || typeof identity !== 'string' || !/^[a-f0-9]{64}$/.test(identity) || typeof now !== 'function'
      || !limits || !integer(limits.perMinute, 100) || !integer(limits.perDay, 10000)
      || !integer(limits.dailyMicros, MAX_MICROS) || !integer(limits.monthlyMicros, MAX_MICROS)) {
    throw new QuotaError(503, 'quota_config_invalid');
  }
  // Copiar configuración impide que una mutación posterior eluda su validación.
  const config = { ...limits };
  /** @param {string} sql @param {...any} values */
  const statement = (sql, ...values) => db.prepare(sql).bind(...values);
  function clock() {
    const value = now();
    if (!validTime(value)) throw new QuotaError(503, 'quota_config_invalid');
    return value;
  }
  /** @param {Statement[]} statements */
  async function batch(statements) {
    const results = await db.batch(statements);
    if (!Array.isArray(results) || results.length !== statements.length || results.some(result => result?.success !== true || !Array.isArray(result.results))) {
      throw new QuotaError(503, 'quota_unavailable');
    }
    return results;
  }
  /** @param {string} id */
  function validId(id) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new QuotaError(503, 'quota_config_invalid');
  }

  return {
    /** @param {{id: string, stage: 'classification'|'generation', amountMicros: number}} request */
    async reserve({ id, stage, amountMicros }) {
      try {
        validId(id);
        if (!['classification', 'generation'].includes(stage) || !integer(amountMicros, MAX_MICROS)) throw new QuotaError(503, 'quota_config_invalid');
        const timestamp = clock();
        const date = new Date(timestamp).toISOString();
        const results = await batch([
          // La purga acotada no participa en los cálculos de vigencia lógica.
          statement('DELETE FROM sarin_counters WHERE key IN (SELECT key FROM sarin_counters WHERE expires_at <= ? ORDER BY expires_at LIMIT 100)', timestamp),
          statement('DELETE FROM sarin_reservations WHERE id IN (SELECT id FROM sarin_reservations WHERE expires_at <= ? ORDER BY expires_at LIMIT 100)', timestamp),
          statement('DELETE FROM sarin_reservations WHERE id = ? AND expires_at <= ?', id, timestamp),
          statement(`INSERT INTO sarin_requests(id, stage, reserved_micros, daily_key, monthly_key, created_at, expires_at, identity, per_minute, per_day, daily_limit, monthly_limit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, stage, amountMicros, `day:${date.slice(0, 10)}`, `month:${date.slice(0, 7)}`, timestamp, timestamp + RETENTION_MS, identity, config.perMinute, config.perDay, config.dailyMicros, config.monthlyMicros),
          statement('SELECT id, stage, reserved_micros FROM sarin_reservations WHERE id = ? AND expires_at > ?', id, timestamp),
          statement('SELECT blocked FROM sarin_state WHERE singleton = 1'),
        ]);
        if (results[5].results[0]?.blocked !== 0) throw new QuotaError(503, 'quota_blocked');
        const row = results[4].results[0];
        if (!row || row.id !== id || row.stage !== stage || row.reserved_micros !== amountMicros) throw new QuotaError(503, 'quota_unavailable');
        return { id, reservedMicros: row.reserved_micros };
      } catch (error) {
        throw publicError(error);
      }
    },

    /** @param {string} id @param {number} actualMicros */
    async settle(id, actualMicros) {
      try {
        validId(id);
        if (!integer(actualMicros, Number.MAX_SAFE_INTEGER, 0)) throw new QuotaError(503, 'quota_unavailable');
        const timestamp = clock();
        const results = await batch([
          statement(`UPDATE sarin_reservations SET actual_micros = ?, settled_at = ?
            WHERE id = ? AND actual_micros IS NULL AND expires_at > ?`, actualMicros, timestamp, id, timestamp),
          statement('SELECT reserved_micros, actual_micros FROM sarin_reservations WHERE id = ? AND expires_at > ?', id, timestamp),
          statement('SELECT blocked FROM sarin_state WHERE singleton = 1'),
        ]);
        const row = results[1].results[0];
        if (!row || row.actual_micros === null) throw new QuotaError(503, 'quota_unavailable');
        if (row.actual_micros > row.reserved_micros || results[2].results[0]?.blocked !== 0) throw new QuotaError(503, 'quota_blocked');
      } catch (error) {
        throw publicError(error);
      }
    },

    async block() {
      try {
        const results = await batch([
          statement('UPDATE sarin_state SET blocked = 1 WHERE singleton = 1'),
          statement('SELECT blocked FROM sarin_state WHERE singleton = 1'),
        ]);
        if (results[1].results[0]?.blocked !== 1) throw new QuotaError(503, 'quota_unavailable');
      } catch (error) {
        throw publicError(error);
      }
    },
  };
}
