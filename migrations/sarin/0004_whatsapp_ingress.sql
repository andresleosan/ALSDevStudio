-- Recepción durable aislada: no genera turnos, reservas ni envíos.
-- Reversión manual, sólo con recepción deshabilitada y backup validado:
-- DROP VIEW sarin_wa_capture; DROP TABLE sarin_wa_inbox;
-- DROP TABLE sarin_wa_receipts; DROP TABLE sarin_wa_peers; DROP TABLE sarin_wa_state;
-- DROP elimina los triggers/índices asociados. Nunca ejecutar como limpieza de datos.
CREATE TABLE sarin_wa_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  inbox_rows INTEGER NOT NULL DEFAULT 0 CHECK (inbox_rows BETWEEN 0 AND 10000),
  receipt_rows INTEGER NOT NULL DEFAULT 0 CHECK (receipt_rows BETWEEN 0 AND 20000),
  content_bytes INTEGER NOT NULL DEFAULT 0 CHECK (content_bytes BETWEEN 0 AND 8388608),
  paused_all INTEGER NOT NULL DEFAULT 1 CHECK (paused_all IN (0,1)),
  replay_floor_at INTEGER NOT NULL DEFAULT 0,
  last_purge_at INTEGER,
  purge_remaining INTEGER NOT NULL DEFAULT 0 CHECK (purge_remaining IN (0,1))
);
INSERT INTO sarin_wa_state(id) VALUES (1);

-- Sólo hashes e identificadores opacos; no teléfonos, texto ni payload del proveedor.
-- Los alias no tienen FK: así la purga elimina como máximo limit filas por tabla.
CREATE TABLE sarin_wa_receipts (
  event_id TEXT PRIMARY KEY,
  event_hash TEXT NOT NULL,
  message_key TEXT NOT NULL,
  message_hash TEXT NOT NULL,
  peer_key TEXT NOT NULL,
  canonical_event_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('inbound','echo')),
  admission_token TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX sarin_wa_receipts_message ON sarin_wa_receipts(message_key) WHERE canonical_event_id IS NULL;
CREATE INDEX sarin_wa_receipts_expiry ON sarin_wa_receipts(expires_at,event_id);
CREATE INDEX sarin_wa_receipts_peer_rate ON sarin_wa_receipts(peer_key,received_at) WHERE kind = 'inbound' AND canonical_event_id IS NULL;
CREATE INDEX sarin_wa_receipts_global_rate ON sarin_wa_receipts(received_at) WHERE kind = 'inbound' AND canonical_event_id IS NULL;

CREATE TABLE sarin_wa_inbox (
  event_id TEXT PRIMARY KEY,
  peer_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('inbound','echo')),
  state TEXT NOT NULL DEFAULT 'captured' CHECK (state = 'captured'),
  message_id TEXT NOT NULL,
  wamid TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  peer_phone TEXT NOT NULL,
  media_type TEXT NOT NULL,
  text TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  stored_bytes INTEGER NOT NULL CHECK (stored_bytes > 0),
  CHECK (text IS NULL OR (kind = 'inbound' AND media_type = 'text'))
);
CREATE INDEX sarin_wa_inbox_expiry ON sarin_wa_inbox(expires_at,event_id);
CREATE INDEX sarin_wa_inbox_peer ON sarin_wa_inbox(peer_key,received_at,event_id);

CREATE TABLE sarin_wa_peers (
  peer_key TEXT PRIMARY KEY,
  paused INTEGER NOT NULL DEFAULT 1 CHECK (paused IN (0,1)),
  pause_revision INTEGER NOT NULL DEFAULT 0 CHECK (pause_revision >= 0),
  last_inbound_at INTEGER NOT NULL DEFAULT 0,
  last_human_at INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sarin_wa_peers_expiry ON sarin_wa_peers(expires_at,peer_key);

CREATE TRIGGER sarin_wa_receipt_added AFTER INSERT ON sarin_wa_receipts BEGIN
  UPDATE sarin_wa_state SET receipt_rows = receipt_rows + 1 WHERE id = 1;
END;
CREATE TRIGGER sarin_wa_receipt_removed AFTER DELETE ON sarin_wa_receipts BEGIN
  UPDATE sarin_wa_state SET receipt_rows = receipt_rows - 1 WHERE id = 1;
END;
CREATE TRIGGER sarin_wa_inbox_added AFTER INSERT ON sarin_wa_inbox BEGIN
  UPDATE sarin_wa_state SET inbox_rows = inbox_rows + 1, content_bytes = content_bytes + NEW.stored_bytes WHERE id = 1;
END;
CREATE TRIGGER sarin_wa_inbox_removed AFTER DELETE ON sarin_wa_inbox BEGIN
  UPDATE sarin_wa_state SET inbox_rows = inbox_rows - 1, content_bytes = content_bytes - OLD.stored_bytes WHERE id = 1;
END;

-- Comando sin almacenamiento propio. Todas las comprobaciones y efectos ocurren
-- dentro del mismo INSERT/transacción D1, incluyendo solicitudes concurrentes.
CREATE VIEW sarin_wa_capture AS SELECT
  NULL AS event_id, NULL AS event_hash, NULL AS message_key, NULL AS message_hash,
  NULL AS peer_key, NULL AS kind, NULL AS admission_token, NULL AS message_id,
  NULL AS wamid, NULL AS waba_id, NULL AS business_phone, NULL AS peer_phone,
  NULL AS media_type, NULL AS text, NULL AS created_at, NULL AS sent_at,
  NULL AS received_at, NULL AS stored_bytes, NULL AS max_inbox, NULL AS max_receipts,
  NULL AS max_bytes, NULL AS max_peers, NULL AS per_minute, NULL AS per_day,
  NULL AS global_minute, NULL AS global_day, NULL AS minute_start, NULL AS day_start;
CREATE TRIGGER sarin_wa_admit INSTEAD OF INSERT ON sarin_wa_capture BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_state WHERE id = 1)
    THEN RAISE(ABORT,'WA_UNAVAILABLE') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_receipts WHERE event_id = NEW.event_id AND event_hash <> NEW.event_hash)
    OR EXISTS(SELECT 1 FROM sarin_wa_receipts WHERE message_key = NEW.message_key AND canonical_event_id IS NULL AND message_hash <> NEW.message_hash)
    THEN RAISE(ABORT,'WA_CONFLICT') END;
  -- Reintento exacto: no requiere espacio, ni renueva caducidad o contadores.
  SELECT CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_receipts WHERE event_id = NEW.event_id)
    THEN RAISE(IGNORE) END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_receipts WHERE message_key = NEW.message_key AND canonical_event_id IS NULL)
    AND (NEW.created_at <= (SELECT replay_floor_at FROM sarin_wa_state WHERE id = 1)
      OR NEW.sent_at <= (SELECT replay_floor_at FROM sarin_wa_state WHERE id = 1)
      OR NEW.created_at < NEW.received_at - 28800000 OR NEW.sent_at < NEW.received_at - 28800000)
    THEN RAISE(ABORT,'WA_STALE') END;
  SELECT CASE WHEN (SELECT receipt_rows FROM sarin_wa_state WHERE id = 1) >= NEW.max_receipts
    THEN RAISE(ABORT,'WA_CAPACITY') END;
  -- Un nuevo ID del mismo mensaje conserva su propia identidad y apunta al original.
  INSERT INTO sarin_wa_receipts(event_id,event_hash,message_key,message_hash,peer_key,canonical_event_id,kind,admission_token,received_at,expires_at)
    SELECT NEW.event_id,NEW.event_hash,NEW.message_key,NEW.message_hash,NEW.peer_key,event_id,NEW.kind,NEW.admission_token,received_at,expires_at
    FROM sarin_wa_receipts WHERE message_key = NEW.message_key AND canonical_event_id IS NULL;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_receipts WHERE event_id = NEW.event_id)
    THEN RAISE(IGNORE) END;
  SELECT CASE WHEN (SELECT inbox_rows FROM sarin_wa_state WHERE id = 1) >= NEW.max_inbox
    OR (SELECT content_bytes FROM sarin_wa_state WHERE id = 1) + NEW.stored_bytes > NEW.max_bytes
    OR (NOT EXISTS(SELECT 1 FROM sarin_wa_peers WHERE peer_key = NEW.peer_key)
      AND (SELECT COUNT(*) FROM sarin_wa_peers) >= NEW.max_peers)
    THEN RAISE(ABORT,'WA_CAPACITY') END;
  SELECT CASE WHEN NEW.kind = 'inbound' AND (
    (SELECT COUNT(*) FROM sarin_wa_receipts WHERE peer_key = NEW.peer_key AND kind = 'inbound' AND canonical_event_id IS NULL AND received_at >= NEW.minute_start) >= NEW.per_minute
    OR (SELECT COUNT(*) FROM sarin_wa_receipts WHERE peer_key = NEW.peer_key AND kind = 'inbound' AND canonical_event_id IS NULL AND received_at >= NEW.day_start) >= NEW.per_day
    OR (SELECT COUNT(*) FROM sarin_wa_receipts WHERE kind = 'inbound' AND canonical_event_id IS NULL AND received_at >= NEW.minute_start) >= NEW.global_minute
    OR (SELECT COUNT(*) FROM sarin_wa_receipts WHERE kind = 'inbound' AND canonical_event_id IS NULL AND received_at >= NEW.day_start) >= NEW.global_day)
    THEN RAISE(ABORT,'WA_RATE') END;
  INSERT INTO sarin_wa_receipts(event_id,event_hash,message_key,message_hash,peer_key,kind,admission_token,received_at,expires_at)
    VALUES(NEW.event_id,NEW.event_hash,NEW.message_key,NEW.message_hash,NEW.peer_key,NEW.kind,NEW.admission_token,NEW.received_at,NEW.received_at + 172800000);
  INSERT INTO sarin_wa_inbox(event_id,peer_key,kind,message_id,wamid,waba_id,business_phone,peer_phone,media_type,text,created_at,sent_at,received_at,expires_at,stored_bytes)
    VALUES(NEW.event_id,NEW.peer_key,NEW.kind,NEW.message_id,NEW.wamid,NEW.waba_id,NEW.business_phone,NEW.peer_phone,NEW.media_type,NEW.text,NEW.created_at,NEW.sent_at,NEW.received_at,NEW.received_at + 86400000,NEW.stored_bytes);
  INSERT INTO sarin_wa_peers(peer_key,paused,pause_revision,last_inbound_at,last_human_at,expires_at)
    VALUES(NEW.peer_key,1,CASE WHEN NEW.kind = 'echo' THEN 1 ELSE 0 END,
      CASE WHEN NEW.kind = 'inbound' THEN NEW.sent_at ELSE 0 END,
      CASE WHEN NEW.kind = 'echo' THEN NEW.sent_at ELSE 0 END,NEW.received_at + 86400000)
    ON CONFLICT(peer_key) DO UPDATE SET
      paused = CASE WHEN NEW.kind = 'echo' THEN 1 ELSE paused END,
      pause_revision = pause_revision + CASE WHEN NEW.kind = 'echo' THEN 1 ELSE 0 END,
      last_inbound_at = MAX(last_inbound_at,excluded.last_inbound_at),
      last_human_at = MAX(last_human_at,excluded.last_human_at),
      expires_at = MAX(expires_at,excluded.expires_at);
END;
