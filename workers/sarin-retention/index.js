// @ts-check
import { createHistoryStore } from '../../server/sarin/history.js';
import { createWhatsAppIngressStore } from '../../server/sarin/whatsapp/ingress-store.js';

import { detectWhatsAppSchema } from '../../server/sarin/whatsapp/work-schema.js';
import { purgeWhatsAppWork } from '../../server/sarin/whatsapp/work-maintenance.js';
import { purgeWhatsAppHandoff } from '../../server/sarin/whatsapp/handoff-store.js';
import { purgeWhatsAppAudioQuota } from '../../server/sarin/whatsapp/audio-maintenance.js';
import { purgeWhatsAppBilling } from '../../server/sarin/whatsapp/billing.js';

const BATCH_SIZE = 100;
const MAX_BATCHES = 20;
/** @type {Array<'sessions'|'conversations'|'rejections'|'audits'|'counters'|'reservations'>} */
const COUNTERS = ['sessions', 'conversations', 'rejections', 'audits', 'counters', 'reservations'];
/** @type {Array<['inbox'|'receipts'|'peers','whatsappInbox'|'whatsappReceipts'|'whatsappPeers']>} */
const WHATSAPP_COUNTERS = [['inbox', 'whatsappInbox'], ['receipts', 'whatsappReceipts'], ['peers', 'whatsappPeers']];

/** @typedef {{SARIN_RETENTION_ENABLED?:string,SARIN_WHATSAPP_REPLIES_ENABLED?:string,SARIN_DB?:Parameters<typeof createHistoryStore>[0]['db']}} RetentionEnv */
/**
 * Operación interna del cron; no se expone como ruta HTTP.
 * @param {RetentionEnv} env
 * @param {{store?:Pick<ReturnType<typeof createHistoryStore>,'purge'>,now?:()=>number,maxBatches?:number}} [options]
 */
export async function runRetention(env, { store, now = () => Date.now(), maxBatches = MAX_BATCHES } = {}) {
  const totals = { sessions: 0, conversations: 0, rejections: 0, audits: 0, counters: 0, reservations: 0,
    whatsappInbox: 0, whatsappReceipts: 0, whatsappPeers: 0, whatsappJobs:0, whatsappOutbox:0, whatsappConsents:0, whatsappAudits:0, whatsappObservations:0,
    whatsappHandoff:0,whatsappAudioQuota:0,whatsappBillingReceipts:0 };
  if (env.SARIN_RETENTION_ENABLED !== 'true') return { status: 'disabled', batches: 0, ...totals, remaining: false };
  let batches = 0;
  try {
    if (!Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > MAX_BATCHES || typeof now !== 'function') throw new Error();
    const clock = () => {
      const at = now();
      if (!Number.isSafeInteger(at) || at < 0 || at > 8640000000000000 - 35 * 86400000) throw new Error();
      return at;
    };
    const startedAt = clock();
    let history = store;
    if (!history) {
      if (!env.SARIN_DB) throw new Error();
      history = createHistoryStore({ db: env.SARIN_DB, now: clock });
    }
    let whatsapp;
    let version=0;
    if (env.SARIN_DB) {
      // Desactivar recepción no elimina la obligación de purgar datos ya guardados.
      version=await detectWhatsAppSchema({db:env.SARIN_DB,repliesEnabled:env.SARIN_WHATSAPP_REPLIES_ENABLED==='true'});
      if(version>=4)whatsapp=createWhatsAppIngressStore({db:env.SARIN_DB,now:clock});
    }
    let remaining = true;
    while (remaining && batches < maxBatches) {
      batches++;
      const result = await history.purge({ limit: BATCH_SIZE });
      for (const key of COUNTERS) {
        if (!Number.isSafeInteger(result[key]) || result[key] < 0 || !Number.isSafeInteger(totals[key] + result[key])) throw new Error();
        totals[key] += result[key];
      }
      if (typeof result.remaining !== 'boolean') throw new Error();
      remaining = result.remaining;
      if(version>=5&&env.SARIN_DB){
        const work=await purgeWhatsAppWork({db:env.SARIN_DB,now:clock,limit:BATCH_SIZE});
        totals.whatsappJobs+=work.jobs;totals.whatsappOutbox+=work.outbox;totals.whatsappConsents+=work.consents;
        totals.whatsappAudits+=work.audits;totals.whatsappObservations+=work.observations;remaining ||= work.remaining;
      }
      if(version>=6&&env.SARIN_DB){
        const handoff=await purgeWhatsAppHandoff({db:env.SARIN_DB,now:clock,limit:BATCH_SIZE});
        totals.whatsappHandoff+=handoff.deleted;remaining ||= handoff.remaining;
      }
      if(version>=7&&env.SARIN_DB){
        const audio=await purgeWhatsAppAudioQuota({db:env.SARIN_DB,now:clock,limit:BATCH_SIZE});
        totals.whatsappAudioQuota+=audio.deleted;remaining ||= audio.remaining;
      }
      if(version>=9&&env.SARIN_DB){
        const billing=await purgeWhatsAppBilling({db:env.SARIN_DB,now:clock,limit:BATCH_SIZE});
        totals.whatsappBillingReceipts+=billing.deleted;remaining ||= billing.remaining;
      }
      if (whatsapp) {
        const captured = await whatsapp.purge({ limit: BATCH_SIZE });
        for (const [key, total] of WHATSAPP_COUNTERS) {
          if (!Number.isSafeInteger(captured[key]) || captured[key] < 0
            || !Number.isSafeInteger(totals[total] + captured[key])) throw new Error();
          totals[total] += captured[key];
        }
        if (typeof captured.remaining !== 'boolean') throw new Error();
        remaining ||= captured.remaining;
      }
    }
    const finishedAt = clock();
    console.log({ event: 'sarin_retention', status: 'ok', batches, ...totals, remaining: Number(remaining) });
    return { status: 'ok', batches, ...totals, remaining, startedAt, finishedAt };
  } catch {
    // Nunca registrar excepciones de D1: pueden incluir valores privados de SQL.
    console.error({ event: 'sarin_retention', status: 'error', batches, ...totals });
    throw new Error('sarin_retention_failed');
  }
}

export default {
  /** @param {unknown} _controller @param {RetentionEnv} env @param {unknown} _ctx */
  async scheduled(_controller, env, _ctx) {
    await runRetention(env);
  },
};
