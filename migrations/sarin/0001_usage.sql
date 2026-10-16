-- Contrato y reversión documentados en README.md. Sin conversaciones ni IP cruda.
CREATE TABLE sarin_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0, 1))
);
INSERT INTO sarin_state(singleton, blocked) VALUES (1, 0);

CREATE TABLE sarin_counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL CHECK (typeof(value) = 'integer' AND value >= 0),
  expires_at INTEGER NOT NULL
);
CREATE INDEX sarin_counters_expiry ON sarin_counters(expires_at);

CREATE TABLE sarin_reservations (
  id TEXT PRIMARY KEY,
  stage TEXT NOT NULL CHECK (stage IN ('classification', 'generation')),
  reserved_micros INTEGER NOT NULL CHECK (typeof(reserved_micros) = 'integer' AND reserved_micros > 0),
  actual_micros INTEGER CHECK (actual_micros IS NULL OR (typeof(actual_micros) = 'integer' AND actual_micros >= 0)),
  daily_key TEXT NOT NULL,
  monthly_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  settled_at INTEGER
);
CREATE INDEX sarin_reservations_expiry ON sarin_reservations(expires_at);

-- La vista transporta identidad/límites al trigger sin almacenarlos en reservas.
CREATE VIEW sarin_requests AS
SELECT id, stage, reserved_micros, daily_key, monthly_key, created_at, expires_at,
  NULL AS identity, NULL AS per_minute, NULL AS per_day,
  NULL AS daily_limit, NULL AS monthly_limit
FROM sarin_reservations;

CREATE TRIGGER sarin_reserve INSTEAD OF INSERT ON sarin_requests
WHEN NOT EXISTS (SELECT 1 FROM sarin_reservations WHERE id = NEW.id)
BEGIN
  SELECT CASE WHEN COALESCE((SELECT blocked FROM sarin_state WHERE singleton = 1), 1) != 0
    THEN RAISE(ABORT, 'SARIN_BLOCKED') END;
  SELECT CASE WHEN NEW.stage = 'classification' AND (
    COALESCE((SELECT value FROM sarin_counters
      WHERE key = 'minute:' || NEW.identity || ':' || CAST(NEW.created_at / 60000 AS INTEGER)
        AND expires_at > NEW.created_at), 0) >= NEW.per_minute OR
    COALESCE((SELECT value FROM sarin_counters
      WHERE key = 'ip:' || NEW.identity || ':' || NEW.daily_key
        AND expires_at > NEW.created_at), 0) >= NEW.per_day)
    THEN RAISE(ABORT, 'SARIN_RATE_LIMIT') END;
  SELECT CASE WHEN
    COALESCE((SELECT value FROM sarin_counters WHERE key = NEW.daily_key AND expires_at > NEW.created_at), 0)
      + NEW.reserved_micros > NEW.daily_limit OR
    COALESCE((SELECT value FROM sarin_counters WHERE key = NEW.monthly_key AND expires_at > NEW.created_at), 0)
      + NEW.reserved_micros > NEW.monthly_limit
    THEN RAISE(ABORT, 'SARIN_BUDGET_LIMIT') END;

  INSERT INTO sarin_counters(key, value, expires_at)
    VALUES(NEW.daily_key, NEW.reserved_micros, NEW.expires_at)
    ON CONFLICT(key) DO UPDATE SET
      value = CASE WHEN expires_at > NEW.created_at THEN value ELSE 0 END + NEW.reserved_micros,
      expires_at = CASE WHEN expires_at > NEW.created_at THEN expires_at ELSE NEW.expires_at END;
  INSERT INTO sarin_counters(key, value, expires_at)
    VALUES(NEW.monthly_key, NEW.reserved_micros, NEW.expires_at)
    ON CONFLICT(key) DO UPDATE SET
      value = CASE WHEN expires_at > NEW.created_at THEN value ELSE 0 END + NEW.reserved_micros,
      expires_at = CASE WHEN expires_at > NEW.created_at THEN expires_at ELSE NEW.expires_at END;

  INSERT INTO sarin_counters(key, value, expires_at)
    SELECT 'minute:' || NEW.identity || ':' || CAST(NEW.created_at / 60000 AS INTEGER), 1, NEW.created_at + 172800000
    WHERE NEW.stage = 'classification'
    ON CONFLICT(key) DO UPDATE SET
      value = CASE WHEN expires_at > NEW.created_at THEN value ELSE 0 END + 1,
      expires_at = CASE WHEN expires_at > NEW.created_at THEN expires_at ELSE NEW.created_at + 172800000 END;
  INSERT INTO sarin_counters(key, value, expires_at)
    SELECT 'ip:' || NEW.identity || ':' || NEW.daily_key, 1, NEW.created_at + 172800000
    WHERE NEW.stage = 'classification'
    ON CONFLICT(key) DO UPDATE SET
      value = CASE WHEN expires_at > NEW.created_at THEN value ELSE 0 END + 1,
      expires_at = CASE WHEN expires_at > NEW.created_at THEN expires_at ELSE NEW.created_at + 172800000 END;

  INSERT INTO sarin_reservations(id, stage, reserved_micros, daily_key, monthly_key, created_at, expires_at)
    VALUES(NEW.id, NEW.stage, NEW.reserved_micros, NEW.daily_key, NEW.monthly_key, NEW.created_at, NEW.expires_at);
END;

CREATE TRIGGER sarin_settle AFTER UPDATE OF actual_micros ON sarin_reservations
WHEN OLD.actual_micros IS NULL AND NEW.actual_micros IS NOT NULL
BEGIN
  UPDATE sarin_state SET blocked = 1 WHERE singleton = 1 AND NEW.actual_micros > NEW.reserved_micros;
  UPDATE sarin_counters SET value = value - (NEW.reserved_micros - NEW.actual_micros)
    WHERE key IN (NEW.daily_key, NEW.monthly_key) AND expires_at > NEW.settled_at
      AND NEW.actual_micros <= NEW.reserved_micros;
END;
