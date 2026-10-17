-- Migración incremental: no modifica cuotas ni guarda identidad de IP en el historial.
-- D1 exige foreign_keys; la fixture local lo activa explícitamente.
CREATE TABLE sarin_history_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  text_bytes INTEGER NOT NULL DEFAULT 0 CHECK (text_bytes >= 0),
  rejection_overflow INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER,
  last_success_at INTEGER,
  last_error_at INTEGER,
  purge_status TEXT NOT NULL DEFAULT 'never' CHECK (purge_status IN ('never','ok','error')),
  purge_remaining INTEGER NOT NULL DEFAULT 0 CHECK (purge_remaining IN (0,1))
);
INSERT INTO sarin_history_state(singleton) VALUES (1);

CREATE TABLE sarin_conversations (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  session_expires_at INTEGER NOT NULL,
  started_at INTEGER,
  expires_at INTEGER NOT NULL,
  service TEXT CHECK (service IS NULL OR service IN ('website','store','application','chatbot')),
  turns INTEGER NOT NULL DEFAULT 0 CHECK (turns BETWEEN 0 AND 15),
  reviewed_at INTEGER,
  blocked_until INTEGER,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty','active','pending','completed','out_of_scope','error','timeout')),
  out_of_scope_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  capacity_bytes INTEGER NOT NULL DEFAULT 0 CHECK (capacity_bytes >= 0),
  max_events INTEGER NOT NULL CHECK (max_events BETWEEN 1 AND 32)
);
CREATE INDEX sarin_conversations_expiry ON sarin_conversations(expires_at);
CREATE INDEX sarin_conversations_recent ON sarin_conversations(updated_at DESC,id DESC);

CREATE TABLE sarin_consents (
  conversation_id TEXT PRIMARY KEY REFERENCES sarin_conversations(id) ON DELETE CASCADE,
  notice_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  notice_hash TEXT NOT NULL,
  accepted_at INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method = 'checkbox_and_start')
);
CREATE TABLE sarin_turns (
  conversation_id TEXT NOT NULL REFERENCES sarin_conversations(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  turn INTEGER NOT NULL CHECK (turn BETWEEN 1 AND 15),
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  lease_expires_at INTEGER NOT NULL,
  finished_at INTEGER,
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','completed','out_of_scope','error','timeout')),
  reserved_bytes INTEGER NOT NULL CHECK (reserved_bytes >= 0),
  response_body TEXT,
  response_text TEXT,
  status_code INTEGER,
  service TEXT,
  PRIMARY KEY(conversation_id,request_id),
  UNIQUE(conversation_id,turn)
);
CREATE UNIQUE INDEX sarin_one_active_turn ON sarin_turns(conversation_id) WHERE outcome = 'pending';
CREATE INDEX sarin_turns_lease ON sarin_turns(lease_expires_at) WHERE outcome = 'pending';
CREATE TABLE sarin_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES sarin_conversations(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  at INTEGER NOT NULL,
  status TEXT NOT NULL,
  UNIQUE(conversation_id,turn,role)
);
CREATE INDEX sarin_messages_order ON sarin_messages(conversation_id,turn,role DESC);
CREATE TABLE sarin_turn_reservations (
  conversation_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY(conversation_id,request_id,reservation_id),
  FOREIGN KEY(conversation_id,request_id) REFERENCES sarin_turns(conversation_id,request_id) ON DELETE CASCADE
);
-- Sin FK hacia reservas: la retención de dinero y transcripciones es independiente.
CREATE TABLE sarin_events (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES sarin_conversations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('completed','out_of_scope','error','timeout','review','block','unblock')),
  at INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0),
  UNIQUE(conversation_id,kind)
);
CREATE TABLE sarin_rejections (
  minute INTEGER NOT NULL,
  code TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(minute,code)
);
CREATE INDEX sarin_rejections_expiry ON sarin_rejections(expires_at);
CREATE TABLE sarin_admin_audit (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('review','block','unblock','delete')),
  result TEXT NOT NULL CHECK (result = 'ok'),
  at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sarin_admin_audit_expiry ON sarin_admin_audit(expires_at);

CREATE TRIGGER sarin_history_capacity_update AFTER UPDATE OF capacity_bytes ON sarin_conversations
BEGIN
  UPDATE sarin_history_state SET text_bytes = text_bytes + NEW.capacity_bytes - OLD.capacity_bytes WHERE singleton = 1;
END;
CREATE TRIGGER sarin_history_capacity_delete AFTER DELETE ON sarin_conversations
BEGIN
  UPDATE sarin_history_state SET text_bytes = text_bytes - OLD.capacity_bytes WHERE singleton = 1;
END;

-- Vistas de comandos: entradas efímeras, nunca filas con pseudónimo IP.
CREATE VIEW sarin_session_commands AS SELECT NULL AS id,NULL AS token_hash,NULL AS at,NULL AS identity,
  NULL AS max_conversations,NULL AS per_minute,NULL AS per_day,NULL AS max_events;
CREATE TRIGGER sarin_history_session INSTEAD OF INSERT ON sarin_session_commands
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM sarin_conversations) >= NEW.max_conversations THEN RAISE(ABORT,'HISTORY_CAPACITY') END;
  SELECT CASE WHEN COALESCE((SELECT value FROM sarin_counters WHERE key = 'session-minute:' || NEW.identity || ':' || CAST(NEW.at / 60000 AS INTEGER) AND expires_at > NEW.at),0) >= NEW.per_minute
    OR COALESCE((SELECT value FROM sarin_counters WHERE key = 'session-day:' || NEW.identity || ':' || CAST(NEW.at / 86400000 AS INTEGER) AND expires_at > NEW.at),0) >= NEW.per_day
    THEN RAISE(ABORT,'HISTORY_SESSION_RATE') END;
  INSERT INTO sarin_counters(key,value,expires_at) VALUES ('session-minute:' || NEW.identity || ':' || CAST(NEW.at / 60000 AS INTEGER),1,NEW.at + 172800000)
    ON CONFLICT(key) DO UPDATE SET value = CASE WHEN expires_at > NEW.at THEN value ELSE 0 END + 1, expires_at = NEW.at + 172800000;
  INSERT INTO sarin_counters(key,value,expires_at) VALUES ('session-day:' || NEW.identity || ':' || CAST(NEW.at / 86400000 AS INTEGER),1,NEW.at + 172800000)
    ON CONFLICT(key) DO UPDATE SET value = CASE WHEN expires_at > NEW.at THEN value ELSE 0 END + 1, expires_at = NEW.at + 172800000;
  INSERT INTO sarin_conversations(id,token_hash,created_at,updated_at,session_expires_at,expires_at,max_events)
    VALUES (NEW.id,NEW.token_hash,NEW.at,NEW.at,NEW.at + 86400000,NEW.at + 86400000,NEW.max_events);
END;

CREATE VIEW sarin_event_commands AS SELECT NULL AS id,NULL AS conversation_id,NULL AS kind,NULL AS at;
CREATE TRIGGER sarin_history_event INSTEAD OF INSERT ON sarin_event_commands
BEGIN
  UPDATE sarin_events SET count = count + 1, at = NEW.at WHERE conversation_id = NEW.conversation_id AND kind = NEW.kind;
  INSERT INTO sarin_events(id,conversation_id,kind,at)
    SELECT NEW.id,NEW.conversation_id,NEW.kind,NEW.at
    WHERE NOT EXISTS (SELECT 1 FROM sarin_events WHERE conversation_id = NEW.conversation_id AND kind = NEW.kind)
      AND (SELECT COUNT(*) FROM sarin_events WHERE conversation_id = NEW.conversation_id) < (SELECT max_events FROM sarin_conversations WHERE id = NEW.conversation_id);
  UPDATE sarin_events SET count = count + 1, at = NEW.at WHERE id = (SELECT id FROM sarin_events WHERE conversation_id = NEW.conversation_id ORDER BY id LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM sarin_events WHERE conversation_id = NEW.conversation_id AND kind = NEW.kind);
END;

CREATE VIEW sarin_turn_commands AS SELECT NULL AS token_hash,NULL AS request_id,NULL AS message,NULL AS at,
  NULL AS max_turns,NULL AS max_text_bytes,NULL AS max_reply_bytes;
CREATE TRIGGER sarin_history_begin INSTEAD OF INSERT ON sarin_turn_commands
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM sarin_conversations WHERE token_hash = NEW.token_hash) THEN RAISE(ABORT,'HISTORY_SESSION_INVALID') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM sarin_conversations WHERE token_hash = NEW.token_hash AND (session_expires_at <= NEW.at OR expires_at <= NEW.at)) THEN RAISE(ABORT,'HISTORY_SESSION_EXPIRED') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM sarin_conversations WHERE token_hash = NEW.token_hash AND blocked_until > NEW.at) THEN RAISE(ABORT,'HISTORY_SESSION_BLOCKED') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id WHERE c.token_hash = NEW.token_hash AND t.request_id = NEW.request_id AND t.message != NEW.message) THEN RAISE(ABORT,'HISTORY_REQUEST_CONFLICT') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id WHERE c.token_hash = NEW.token_hash AND t.outcome = 'pending')
    AND NOT EXISTS (SELECT 1 FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id WHERE c.token_hash = NEW.token_hash AND t.request_id = NEW.request_id AND t.outcome != 'pending') THEN RAISE(ABORT,'HISTORY_TURN_ACTIVE') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id WHERE c.token_hash = NEW.token_hash AND t.request_id = NEW.request_id)
    AND EXISTS (SELECT 1 FROM sarin_conversations WHERE token_hash = NEW.token_hash AND turns >= NEW.max_turns) THEN RAISE(ABORT,'HISTORY_TURN_LIMIT') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id WHERE c.token_hash = NEW.token_hash AND t.request_id = NEW.request_id)
    AND (SELECT text_bytes FROM sarin_history_state WHERE singleton = 1) + length(CAST(NEW.message AS BLOB)) + NEW.max_reply_bytes > NEW.max_text_bytes THEN RAISE(ABORT,'HISTORY_CAPACITY') END;
  INSERT INTO sarin_turns(conversation_id,request_id,turn,message,created_at,lease_expires_at,reserved_bytes)
    SELECT id,NEW.request_id,turns + 1,NEW.message,NEW.at,NEW.at + 45000,NEW.max_reply_bytes FROM sarin_conversations c
    WHERE token_hash = NEW.token_hash AND NOT EXISTS (SELECT 1 FROM sarin_turns WHERE conversation_id = c.id AND request_id = NEW.request_id);
  -- changes() distingue la admisión nueva del replay sin una carrera de lectura/escritura.
  UPDATE sarin_conversations SET turns = turns + 1, started_at = COALESCE(started_at,NEW.at), expires_at = COALESCE(started_at,NEW.at) + 2592000000,
    updated_at = NEW.at,status = 'pending',capacity_bytes = capacity_bytes + length(CAST(NEW.message AS BLOB)) + NEW.max_reply_bytes
    WHERE token_hash = NEW.token_hash AND changes() = 1;
  INSERT INTO sarin_messages(id,conversation_id,turn,role,content,at,status)
    SELECT t.request_id || ':user:' || c.id,c.id,t.turn,'user',t.message,t.created_at,'pending'
    FROM sarin_turns t JOIN sarin_conversations c ON c.id = t.conversation_id
    WHERE c.token_hash = NEW.token_hash AND t.request_id = NEW.request_id AND t.outcome = 'pending'
      AND NOT EXISTS (SELECT 1 FROM sarin_messages WHERE conversation_id = c.id AND turn = t.turn AND role = 'user');
END;

CREATE TRIGGER sarin_history_finish BEFORE UPDATE OF outcome ON sarin_turns
WHEN OLD.outcome = 'pending' AND NEW.outcome != 'pending'
BEGIN
  SELECT CASE WHEN COALESCE(length(CAST(NEW.response_body AS BLOB)),0) > OLD.reserved_bytes THEN RAISE(ABORT,'HISTORY_RESPONSE_TOO_LARGE') END;
  SELECT CASE WHEN
    (json_extract(NEW.response_body,'$.conversationId') IS NOT NULL AND json_extract(NEW.response_body,'$.conversationId') != OLD.conversation_id) OR
    (json_extract(NEW.response_body,'$.requestId') IS NOT NULL AND json_extract(NEW.response_body,'$.requestId') != OLD.request_id) OR
    (json_extract(NEW.response_body,'$.turn') IS NOT NULL AND json_extract(NEW.response_body,'$.turn') != OLD.turn) OR
    (json_extract(NEW.response_body,'$.expiresAt') IS NOT NULL AND json_extract(NEW.response_body,'$.expiresAt') != (SELECT expires_at FROM sarin_conversations WHERE id = OLD.conversation_id))
    THEN RAISE(ABORT,'HISTORY_RESPONSE_METADATA') END;
  UPDATE sarin_conversations SET capacity_bytes = capacity_bytes - OLD.reserved_bytes + COALESCE(length(CAST(NEW.response_body AS BLOB)),0),
    updated_at = NEW.finished_at,status = NEW.outcome,service = COALESCE(NEW.service,service),
    out_of_scope_count = out_of_scope_count + (NEW.outcome = 'out_of_scope'),error_count = error_count + (NEW.outcome IN ('error','timeout'))
    WHERE id = OLD.conversation_id;
  UPDATE sarin_messages SET status = NEW.outcome WHERE conversation_id = OLD.conversation_id AND turn = OLD.turn AND role = 'user';
  INSERT INTO sarin_messages(id,conversation_id,turn,role,content,at,status)
    SELECT OLD.request_id || ':assistant:' || OLD.conversation_id,OLD.conversation_id,OLD.turn,'assistant',NEW.response_text,NEW.finished_at,NEW.outcome WHERE NEW.response_body IS NOT NULL;
  INSERT INTO sarin_event_commands(id,conversation_id,kind,at) VALUES (OLD.request_id || ':' || OLD.conversation_id,OLD.conversation_id,NEW.outcome,NEW.finished_at);
END;
