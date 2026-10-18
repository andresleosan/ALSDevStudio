// @ts-check
import { detectWhatsAppSchema } from './whatsapp/work-schema.js';
import { getWhatsAppWorkRecoveryStatements } from './whatsapp/work-maintenance.js';
import { getWhatsAppHandoffRecoveryStatements } from './whatsapp/handoff-store.js';
import { getWhatsAppRecoveryStatements } from './whatsapp/ingress-store.js';

/**
 * Limpieza conservadora posterior a restauración. Solo para mantenimiento privado;
 * el llamador debe detener chat/panel y drenar peticiones antes de pasar ambos true.
 * D1 batch ejecuta todo en una transacción y revierte si falla una sentencia.
 * @param {{db:Parameters<typeof import('./history.js').createHistoryStore>[0]['db'],maintenanceConfirmed:boolean,requestsDrained:boolean,now?:()=>number}} options
 */
export async function clearRestoredHistory({ db, maintenanceConfirmed, requestsDrained, now = Date.now }) {
  if (maintenanceConfirmed !== true || requestsDrained !== true) throw new Error('sarin_history_recovery_requires_maintenance');
  try {
    if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') throw new Error();
    if (typeof now !== 'function') throw new Error();
    const at = now();
    if (!Number.isSafeInteger(at) || at < 0 || at > 8640000000000000 - 35 * 86400000) throw new Error();
    const version=await detectWhatsAppSchema({db});
    const whatsapp=version>=4;
    const statements = [
      db.prepare(`SELECT
        (SELECT COUNT(*) FROM sarin_conversations) AS conversations,
        (SELECT COUNT(*) FROM sarin_turns) AS turns,
        (SELECT COUNT(*) FROM sarin_messages) AS messages,
        (SELECT COUNT(*) FROM sarin_consents) AS consents,
        (SELECT COUNT(*) FROM sarin_leads) AS leads,
        (SELECT COUNT(*) FROM sarin_turn_reservations) AS turnReservations,
        (SELECT COUNT(*) FROM sarin_events) AS events,
        (SELECT COUNT(*) FROM sarin_rejections) AS rejections,
        (SELECT COUNT(*) FROM sarin_admin_audit) AS audits,
        COALESCE((SELECT SUM(capacity_bytes) FROM sarin_conversations),0) AS capacityBytesReleased
        ${whatsapp ? `,(SELECT COUNT(*) FROM sarin_wa_inbox) AS whatsappInbox,
          (SELECT COUNT(*) FROM sarin_wa_receipts) AS whatsappReceipts,
          (SELECT COUNT(*) FROM sarin_wa_peers) AS whatsappPeers` : ''}
        ${version>=5?`,(SELECT COUNT(*) FROM sarin_wa_jobs) AS whatsappJobs,
          (SELECT COUNT(*) FROM sarin_wa_outbox) AS whatsappOutbox,
          (SELECT COUNT(*) FROM sarin_wa_consent_proofs) AS whatsappConsents,
          (SELECT COUNT(*) FROM sarin_wa_audit) AS whatsappAudits,
          ((SELECT COUNT(*) FROM sarin_wa_control_events)+(SELECT COUNT(*) FROM sarin_wa_delivery_observations)) AS whatsappObservations`:''}
        ${version>=6?`,(SELECT COUNT(*) FROM sarin_wa_handoff) AS whatsappHandoff`:''}
        ${version>=7?`,(SELECT COUNT(*) FROM sarin_wa_audio) AS whatsappAudio`:''}
        ${version>=8?`,(SELECT COUNT(*) FROM sarin_wa_profiles) AS whatsappProfiles`:''}`),
      // Corrige una capacidad restaurada discordante antes de que los triggers la resten.
      db.prepare('UPDATE sarin_history_state SET text_bytes = COALESCE((SELECT SUM(capacity_bytes) FROM sarin_conversations),0) WHERE singleton = 1'),
      db.prepare('DELETE FROM sarin_conversations'),
      // Borrado explícito de todas las tablas: incluye datos vigentes y remanentes.
      db.prepare('DELETE FROM sarin_turn_reservations'),
      db.prepare('DELETE FROM sarin_messages'),
      db.prepare('DELETE FROM sarin_turns'),
      db.prepare('DELETE FROM sarin_consents'),
      db.prepare('DELETE FROM sarin_leads'),
      db.prepare('DELETE FROM sarin_events'),
      db.prepare('DELETE FROM sarin_rejections'),
      db.prepare('DELETE FROM sarin_admin_audit'),
      db.prepare(`UPDATE sarin_history_state SET text_bytes = 0,rejection_overflow = 0,last_run_at = NULL,
        last_success_at = NULL,last_error_at = NULL,purge_status = 'never',purge_remaining = 0 WHERE singleton = 1`),
      // Incluye remanentes huérfanos de un restore que deshabilitó foreign_keys.
      ...(version>=8 ? [db.prepare('DELETE FROM sarin_wa_profiles')] : []),
      ...(version>=5 ? getWhatsAppWorkRecoveryStatements({db,at}) : []),
      ...(version>=6 ? getWhatsAppHandoffRecoveryStatements({db,at}) : []),
      ...(whatsapp ? getWhatsAppRecoveryStatements({ db, at }) : []),
    ];
    const results = await db.batch(statements);
    if (!Array.isArray(results) || results.length !== statements.length || results.some(result => result?.success !== true)) throw new Error();
    const counts = results[0].results?.[0];
    if (!counts) throw new Error();
    return { conversations: counts.conversations, turns: counts.turns, messages: counts.messages, consents: counts.consents, leads: counts.leads,
      turnReservations: counts.turnReservations, events: counts.events, rejections: counts.rejections, audits: counts.audits,
      capacityBytesReleased: counts.capacityBytesReleased, budgetReconciliationRequired: true,
      ...(version>=5?{whatsappJobs:counts.whatsappJobs,whatsappOutbox:counts.whatsappOutbox,whatsappConsents:counts.whatsappConsents,whatsappAudits:counts.whatsappAudits,whatsappObservations:counts.whatsappObservations}:{}),
      ...(version>=6?{whatsappHandoff:counts.whatsappHandoff}:{}),
      ...(version>=7?{whatsappAudio:counts.whatsappAudio}:{}),
      ...(version>=8?{whatsappProfiles:counts.whatsappProfiles}:{}),
      ...(whatsapp ? { whatsappInbox: counts.whatsappInbox, whatsappReceipts: counts.whatsappReceipts, whatsappPeers: counts.whatsappPeers } : {}) };
  } catch {
    // No adjuntar la excepción SQL, datos de filas ni causas con contenido restaurado.
    throw new Error('sarin_history_recovery_failed');
  }
}
