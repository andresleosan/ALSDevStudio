-- Perfil opcional temporal, sin copiar el teléfono ni cambiar el consentimiento.
-- Reversión operativa: detener captura de perfiles y conservar esta ampliación y
-- su retención compatible. No revertir a un detector que rechace schema 0008.
-- En base local vacía, eliminar sus cinco triggers, índice y tabla; nunca usar
-- ese procedimiento como purga de producción ni borrar cuotas para revertir.
CREATE TABLE sarin_wa_profiles (
 peer_key TEXT PRIMARY KEY REFERENCES sarin_wa_contexts(peer_key) ON DELETE CASCADE,
 context_id TEXT NOT NULL,
 source_event_id TEXT NOT NULL UNIQUE REFERENCES sarin_wa_inbox(event_id) ON DELETE CASCADE,
 full_name TEXT NOT NULL CHECK(typeof(full_name)='text' AND length(full_name) BETWEEN 3 AND 160),
 stored_bytes INTEGER NOT NULL CHECK(stored_bytes BETWEEN 3 AND 640 AND stored_bytes=length(CAST(full_name AS BLOB))),
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 CHECK(expires_at=created_at+86400000)
);
CREATE INDEX sarin_wa_profile_expiry ON sarin_wa_profiles(expires_at);
CREATE TRIGGER sarin_wa_profile_capacity BEFORE INSERT ON sarin_wa_profiles BEGIN
 SELECT CASE WHEN (NOT EXISTS(SELECT 1 FROM sarin_wa_profiles WHERE peer_key=NEW.peer_key) AND (SELECT COUNT(*) FROM sarin_wa_profiles)>=1000)
   OR COALESCE((SELECT SUM(stored_bytes) FROM sarin_wa_profiles),0)-COALESCE((SELECT stored_bytes FROM sarin_wa_profiles WHERE peer_key=NEW.peer_key),0)+NEW.stored_bytes>640000
   THEN RAISE(ABORT,'WA_WORK_CAPACITY') END;
END;
CREATE TRIGGER sarin_wa_profile_validate_insert BEFORE INSERT ON sarin_wa_profiles BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_inbox i JOIN sarin_wa_jobs j ON j.event_id=i.event_id
   JOIN sarin_wa_contexts c ON c.peer_key=i.peer_key WHERE i.event_id=NEW.source_event_id AND i.peer_key=NEW.peer_key
     AND j.context_id=NEW.context_id AND c.context_id=NEW.context_id AND i.kind='inbound' AND i.media_type='text'
     AND i.received_at=NEW.created_at AND i.expires_at=NEW.expires_at)
   THEN RAISE(ABORT,'WA_WORK_DENIED') END;
END;
CREATE TRIGGER sarin_wa_profile_validate_update BEFORE UPDATE ON sarin_wa_profiles BEGIN
 SELECT CASE WHEN NEW.peer_key IS NOT OLD.peer_key OR NEW.created_at<OLD.created_at
   OR COALESCE((SELECT SUM(stored_bytes) FROM sarin_wa_profiles),0)-OLD.stored_bytes+NEW.stored_bytes>640000
   OR NOT EXISTS(SELECT 1 FROM sarin_wa_inbox i JOIN sarin_wa_jobs j ON j.event_id=i.event_id
     JOIN sarin_wa_contexts c ON c.peer_key=i.peer_key WHERE i.event_id=NEW.source_event_id AND i.peer_key=NEW.peer_key
       AND j.context_id=NEW.context_id AND c.context_id=NEW.context_id AND i.kind='inbound' AND i.media_type='text'
       AND i.received_at=NEW.created_at AND i.expires_at=NEW.expires_at)
   THEN RAISE(ABORT,'WA_WORK_DENIED') END;
END;
-- Los exports/restores que no habilitan foreign_keys conservan el borrado ligado.
CREATE TRIGGER sarin_wa_profile_inbox_delete AFTER DELETE ON sarin_wa_inbox BEGIN
 DELETE FROM sarin_wa_profiles WHERE source_event_id=OLD.event_id;
END;
CREATE TRIGGER sarin_wa_profile_context_delete AFTER DELETE ON sarin_wa_contexts BEGIN
 DELETE FROM sarin_wa_profiles WHERE peer_key=OLD.peer_key;
END;
