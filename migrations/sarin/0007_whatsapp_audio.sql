-- Audio temporal: el binario nunca entra en D1. Cada fila reserva espacio máximo
-- para descriptor y transcripción; no hay segunda inferencia tras incertidumbre.
CREATE TABLE sarin_wa_audio (
 event_id TEXT PRIMARY KEY REFERENCES sarin_wa_inbox(event_id) ON DELETE CASCADE,
 descriptor TEXT CHECK(descriptor IS NULL OR length(descriptor)<=4096),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN('pending','started','transcribed','failed')),
 transcript TEXT CHECK(transcript IS NULL OR length(transcript) BETWEEN 1 AND 1200),
 started_at INTEGER, finished_at INTEGER, duration_seconds REAL CHECK(duration_seconds IS NULL OR duration_seconds BETWEEN 0 AND 120),
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 CHECK(expires_at=created_at+86400000)
);
CREATE TABLE sarin_wa_audio_quota (
 day_key TEXT PRIMARY KEY, month_key TEXT NOT NULL,
 consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed BETWEEN 0 AND 20)
);
CREATE INDEX sarin_wa_audio_month ON sarin_wa_audio_quota(month_key);
CREATE TRIGGER sarin_wa_audio_capacity BEFORE INSERT ON sarin_wa_audio BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_audio WHERE event_id=NEW.event_id) AND (SELECT COUNT(*) FROM sarin_wa_audio)>=1000 THEN RAISE(ABORT,'WA_CAPACITY') END;
END;
CREATE TRIGGER sarin_wa_audio_immutable BEFORE UPDATE ON sarin_wa_audio BEGIN
 SELECT CASE WHEN NEW.event_id IS NOT OLD.event_id OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at
   OR (OLD.started_at IS NOT NULL AND NEW.started_at IS NOT OLD.started_at)
   OR (OLD.state<>'pending' AND NEW.state='pending')
   OR (OLD.state IN('transcribed','failed') AND NEW.state<>OLD.state)
   THEN RAISE(ABORT,'WA_WORK_DENIED') END;
END;
CREATE TRIGGER sarin_wa_audio_capture AFTER INSERT ON sarin_wa_audio BEGIN
 INSERT INTO sarin_wa_jobs(job_id,event_id,peer_key,epoch,context_id,peer_revision,input_kind,created_at,expires_at)
 SELECT lower(hex(randomblob(16))),i.event_id,i.peer_key,p.epoch,c.context_id,c.revision,'text',i.received_at,i.expires_at
 FROM sarin_wa_inbox i JOIN sarin_wa_contexts c ON c.peer_key=i.peer_key CROSS JOIN sarin_wa_pilot p
 WHERE i.event_id=NEW.event_id AND p.enabled=1 AND c.paused=0 AND i.kind='inbound' AND i.media_type='audio'
   AND i.sent_at>MAX(p.activation_at,c.activation_at) AND i.created_at>MAX(p.activation_at,c.activation_at)
   AND EXISTS(SELECT 1 FROM sarin_wa_control_events v WHERE v.event_id=i.event_id AND v.context_id=c.context_id AND v.applied=1 AND v.classification='audio');
END;
-- Compatible también con los exports/restore que no habiliten foreign_keys.
CREATE TRIGGER sarin_wa_audio_delete AFTER DELETE ON sarin_wa_inbox BEGIN
 DELETE FROM sarin_wa_audio WHERE event_id=OLD.event_id;
END;
