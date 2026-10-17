// @ts-check

/**
 * Limpieza conservadora posterior a restauración. Solo para mantenimiento privado;
 * el llamador debe detener chat/panel y drenar peticiones antes de pasar ambos true.
 * D1 batch ejecuta todo en una transacción y revierte si falla una sentencia.
 * @param {{db:Parameters<typeof import('./history.js').createHistoryStore>[0]['db'],maintenanceConfirmed:boolean,requestsDrained:boolean}} options
 */
export async function clearRestoredHistory({ db, maintenanceConfirmed, requestsDrained }) {
  if (maintenanceConfirmed !== true || requestsDrained !== true) throw new Error('sarin_history_recovery_requires_maintenance');
  try {
    if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') throw new Error();
    const statements = [
      db.prepare(`SELECT
        (SELECT COUNT(*) FROM sarin_conversations) AS conversations,
        (SELECT COUNT(*) FROM sarin_turns) AS turns,
        (SELECT COUNT(*) FROM sarin_messages) AS messages,
        (SELECT COUNT(*) FROM sarin_consents) AS consents,
        (SELECT COUNT(*) FROM sarin_turn_reservations) AS turnReservations,
        (SELECT COUNT(*) FROM sarin_events) AS events,
        (SELECT COUNT(*) FROM sarin_rejections) AS rejections,
        (SELECT COUNT(*) FROM sarin_admin_audit) AS audits,
        COALESCE((SELECT SUM(capacity_bytes) FROM sarin_conversations),0) AS capacityBytesReleased`),
      // Corrige una capacidad restaurada discordante antes de que los triggers la resten.
      db.prepare('UPDATE sarin_history_state SET text_bytes = COALESCE((SELECT SUM(capacity_bytes) FROM sarin_conversations),0) WHERE singleton = 1'),
      db.prepare('DELETE FROM sarin_conversations'),
      // Borrado explícito de todas las tablas: incluye datos vigentes y remanentes.
      db.prepare('DELETE FROM sarin_turn_reservations'),
      db.prepare('DELETE FROM sarin_messages'),
      db.prepare('DELETE FROM sarin_turns'),
      db.prepare('DELETE FROM sarin_consents'),
      db.prepare('DELETE FROM sarin_events'),
      db.prepare('DELETE FROM sarin_rejections'),
      db.prepare('DELETE FROM sarin_admin_audit'),
      db.prepare(`UPDATE sarin_history_state SET text_bytes = 0,rejection_overflow = 0,last_run_at = NULL,
        last_success_at = NULL,last_error_at = NULL,purge_status = 'never',purge_remaining = 0 WHERE singleton = 1`),
    ];
    const results = await db.batch(statements);
    if (!Array.isArray(results) || results.length !== statements.length || results.some(result => result?.success !== true)) throw new Error();
    const counts = results[0].results?.[0];
    if (!counts) throw new Error();
    return { conversations: counts.conversations, turns: counts.turns, messages: counts.messages, consents: counts.consents,
      turnReservations: counts.turnReservations, events: counts.events, rejections: counts.rejections, audits: counts.audits,
      capacityBytesReleased: counts.capacityBytesReleased, budgetReconciliationRequired: true };
  } catch {
    // No adjuntar la excepción SQL, datos de filas ni causas con contenido restaurado.
    throw new Error('sarin_history_recovery_failed');
  }
}
