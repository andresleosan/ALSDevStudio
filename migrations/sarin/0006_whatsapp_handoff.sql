-- Avisos administrativos independientes de la conversación pausada.
-- Sin backfill: solo nuevas solicitudes HUMANO. Reversión: apagar HANDOFF_ENABLED;
-- conservar la tabla y su purga. Nunca borrar intentos consumidos para reintentar.
CREATE TABLE sarin_wa_handoff (
  alert_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, peer_key TEXT NOT NULL,
  context_id TEXT NOT NULL UNIQUE, peer_revision INTEGER NOT NULL, epoch TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN('queued','waiting_template','sending','accepted','sent','delivered','read','rejected','failed','uncertain','cancelled','expired')),
  external_id TEXT NOT NULL UNIQUE, provider_id TEXT UNIQUE, wamid TEXT,
  waba_id TEXT, business_phone TEXT, owner_phone TEXT, mode TEXT CHECK(mode IN('text','template')),
  started_at INTEGER, delivered_at INTEGER, conflict INTEGER NOT NULL DEFAULT 0 CHECK(conflict IN(0,1)),
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, receipt_expires_at INTEGER NOT NULL,
  CHECK(expires_at=created_at+3600000), CHECK(receipt_expires_at=created_at+86400000)
);
CREATE INDEX sarin_wa_handoff_dispatch ON sarin_wa_handoff(state,created_at,alert_id);
CREATE INDEX sarin_wa_handoff_expiry ON sarin_wa_handoff(receipt_expires_at,alert_id);
CREATE TRIGGER sarin_wa_handoff_request AFTER UPDATE OF applied ON sarin_wa_control_events
WHEN OLD.applied=0 AND NEW.applied=1 AND NEW.classification='human' BEGIN
  INSERT INTO sarin_wa_handoff(alert_id,event_id,peer_key,context_id,peer_revision,epoch,external_id,created_at,expires_at,receipt_expires_at)
    SELECT lower(hex(randomblob(16))),NEW.event_id,NEW.peer_key,NEW.context_id,c.revision,p.epoch,
      lower(hex(randomblob(16))),MIN(NEW.sent_at,NEW.observed_at),
      MIN(NEW.sent_at,NEW.observed_at)+3600000,MIN(NEW.sent_at,NEW.observed_at)+86400000
    FROM sarin_wa_contexts c CROSS JOIN sarin_wa_pilot p
    WHERE c.peer_key=NEW.peer_key AND c.context_id=NEW.context_id AND c.paused=1 AND p.enabled=1
      AND NEW.sent_at>MAX(c.activation_at,p.activation_at)
      AND NEW.sent_at>=(SELECT replay_floor_at FROM sarin_wa_state WHERE id=1)
      AND (EXISTS(SELECT 1 FROM sarin_wa_handoff WHERE context_id=NEW.context_id)
        OR (SELECT COUNT(*) FROM sarin_wa_handoff)<1000)
    ON CONFLICT(context_id) DO UPDATE SET peer_revision=excluded.peer_revision
      WHERE sarin_wa_handoff.started_at IS NULL AND sarin_wa_handoff.state IN('queued','waiting_template');
END;
CREATE TRIGGER sarin_wa_handoff_immutable BEFORE UPDATE ON sarin_wa_handoff BEGIN
  SELECT CASE WHEN NEW.alert_id IS NOT OLD.alert_id OR NEW.event_id IS NOT OLD.event_id
    OR NEW.peer_key IS NOT OLD.peer_key OR NEW.context_id IS NOT OLD.context_id OR NEW.epoch IS NOT OLD.epoch
    OR NEW.external_id IS NOT OLD.external_id OR NEW.created_at IS NOT OLD.created_at
    OR NEW.expires_at IS NOT OLD.expires_at OR NEW.receipt_expires_at IS NOT OLD.receipt_expires_at
    OR NEW.conflict<OLD.conflict
    OR (OLD.started_at IS NOT NULL AND (NEW.started_at IS NOT OLD.started_at OR NEW.waba_id IS NOT OLD.waba_id
      OR NEW.business_phone IS NOT OLD.business_phone OR NEW.owner_phone IS NOT OLD.owner_phone OR NEW.mode IS NOT OLD.mode
      OR NEW.state IN('queued','waiting_template')))
    OR (OLD.provider_id IS NOT NULL AND NEW.provider_id IS NOT OLD.provider_id)
    OR (OLD.wamid IS NOT NULL AND NEW.wamid IS NOT OLD.wamid)
    OR (OLD.delivered_at IS NOT NULL AND NEW.delivered_at IS NOT OLD.delivered_at)
    THEN RAISE(ABORT,'WA_HANDOFF_DENIED') END;
END;
