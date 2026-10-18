-- Migración aditiva; sin backfill y apagada al instalarse.
-- Reversión operativa: enabled=0, detener consumidor y drenar; conservar estas
-- tablas y retención compatible. No borrar cuotas ni restaurar el ejecutor 0004.
-- En una base local vacía: eliminar trigger sarin_wa_work_capture, vista
-- sarin_wa_work_guard y tablas nuevas en orden inverso. Nunca como purga.
CREATE TABLE sarin_wa_pilot (
  id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
  revision INTEGER NOT NULL DEFAULT 0, epoch TEXT NOT NULL, activation_at INTEGER NOT NULL DEFAULT 0
);
INSERT INTO sarin_wa_pilot(id,epoch) VALUES(1,lower(hex(randomblob(16))));
CREATE TABLE sarin_wa_contexts (
  peer_key TEXT PRIMARY KEY, context_id TEXT NOT NULL UNIQUE,
  paused INTEGER NOT NULL DEFAULT 1 CHECK(paused IN(0,1)), revision INTEGER NOT NULL DEFAULT 0,
  activation_at INTEGER NOT NULL DEFAULT 0, last_inbound_at INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT, consent_hash TEXT, consent_notice_id TEXT, acceptance_event_id TEXT,
  accepted_at INTEGER, consent_expires_at INTEGER, pending_acceptance_event_id TEXT, pending_accepted_at INTEGER,
  CHECK(consent_expires_at IS NULL OR consent_expires_at <= accepted_at+86400000)
);
CREATE TABLE sarin_wa_jobs (
  job_id TEXT PRIMARY KEY, event_id TEXT NOT NULL UNIQUE, peer_key TEXT NOT NULL,
  epoch TEXT NOT NULL, context_id TEXT NOT NULL, peer_revision INTEGER NOT NULL,
  input_kind TEXT NOT NULL DEFAULT 'text' CHECK(input_kind IN('text','accept')),
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN('queued','claimed','inference_started','ready','completed','cancelled','expired','failed','inference_uncertain')),
  token TEXT, lease_until INTEGER, inference_started_at INTEGER, reservation_id TEXT,
  reserved_bytes INTEGER NOT NULL DEFAULT 0 CHECK(reserved_bytes BETWEEN 0 AND 4800),
  quota_day TEXT, quota_month TEXT, quota_state TEXT CHECK(quota_state IN('reserved','consumed','released')),
  deferred_reason TEXT CHECK(deferred_reason IN('waiting_notice','waiting_consent','waiting_delivery')),
  outcome TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX sarin_wa_one_owner ON sarin_wa_jobs(peer_key) WHERE state IN('claimed','inference_started','ready');
CREATE INDEX sarin_wa_jobs_dispatch ON sarin_wa_jobs(state,created_at,job_id);
CREATE INDEX sarin_wa_jobs_expiry ON sarin_wa_jobs(expires_at,job_id);
CREATE TABLE sarin_wa_inference_reservations (
  reservation_id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES sarin_wa_jobs(job_id), attached_at INTEGER NOT NULL
);
CREATE TABLE sarin_wa_outbox (
  outbox_id TEXT PRIMARY KEY, job_id TEXT NOT NULL UNIQUE REFERENCES sarin_wa_jobs(job_id),
  peer_key TEXT NOT NULL, context_id TEXT NOT NULL, epoch TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN('notice','accepted','reply')),
  text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 1200),
  stored_bytes INTEGER NOT NULL CHECK(stored_bytes BETWEEN 1 AND 4800),
  version TEXT, hash TEXT, external_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'ready' CHECK(state IN('ready','sending','accepted','sent','delivered','read','rejected','failed','send_uncertain','cancelled','expired')),
  provider_id TEXT UNIQUE, wamid TEXT, started_at INTEGER, delivered_at INTEGER,
  reconcile_state TEXT NOT NULL DEFAULT 'idle' CHECK(reconcile_state IN('idle','pending','claimed','complete','exhausted','conflict')),
  reconcile_attempts INTEGER NOT NULL DEFAULT 0 CHECK(reconcile_attempts BETWEEN 0 AND 3),
  reconcile_next_at INTEGER, reconcile_token TEXT, reconcile_lease_until INTEGER,
  reconcile_last_result TEXT, reconcile_updated_at INTEGER,
  conflict INTEGER NOT NULL DEFAULT 0 CHECK(conflict IN(0,1)), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX sarin_wa_outbox_reconcile ON sarin_wa_outbox(reconcile_state,reconcile_next_at);
CREATE UNIQUE INDEX sarin_wa_fixed_once ON sarin_wa_outbox(context_id,purpose) WHERE purpose IN('notice','accepted');
CREATE INDEX sarin_wa_outbox_peer ON sarin_wa_outbox(peer_key,state);
CREATE TRIGGER sarin_wa_job_transition BEFORE UPDATE ON sarin_wa_jobs BEGIN
  SELECT CASE WHEN OLD.state<>NEW.state AND NOT (
    (OLD.state='queued' AND NEW.state IN('claimed','cancelled','expired')) OR
    (OLD.state='claimed' AND NEW.state IN('queued','inference_started','ready','completed','cancelled','expired','failed','inference_uncertain')) OR
    (OLD.state='inference_started' AND NEW.state IN('ready','inference_uncertain')) OR
    (OLD.state='ready' AND NEW.state IN('completed','cancelled','expired')))
    THEN RAISE(ABORT,'WA_WORK_DENIED') END;
  SELECT CASE WHEN OLD.inference_started_at IS NOT NULL AND NEW.inference_started_at IS NOT OLD.inference_started_at
    THEN RAISE(ABORT,'WA_WORK_DENIED') END;
END;
CREATE TRIGGER sarin_wa_outbox_transition BEFORE UPDATE ON sarin_wa_outbox BEGIN
  SELECT CASE WHEN NEW.reconcile_attempts<OLD.reconcile_attempts THEN RAISE(ABORT,'WA_WORK_DENIED') END;
  SELECT CASE WHEN OLD.started_at IS NOT NULL AND (NEW.started_at IS NOT OLD.started_at OR NEW.state='ready')
    OR (OLD.wamid IS NOT NULL AND NEW.wamid IS NOT OLD.wamid)
    OR (OLD.provider_id IS NOT NULL AND NEW.provider_id IS NOT OLD.provider_id)
    OR (OLD.delivered_at IS NOT NULL AND NEW.delivered_at IS NOT OLD.delivered_at)
    OR (OLD.state<>NEW.state AND NOT (
      (OLD.state='ready' AND NEW.state IN('sending','cancelled','expired')) OR
      (OLD.state='sending' AND NEW.state IN('accepted','sent','delivered','read','rejected','failed','send_uncertain')) OR
      (OLD.state IN('accepted','sent','send_uncertain') AND NEW.state IN('sent','delivered','read','failed','send_uncertain','rejected')) OR
      (OLD.state='delivered' AND NEW.state='read')))
    THEN RAISE(ABORT,'WA_WORK_DENIED') END;
END;
CREATE TABLE sarin_wa_send_quota (
  day_key TEXT PRIMARY KEY, month_key TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed BETWEEN 0 AND 20),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0 AND consumed+reserved<=20)
);
CREATE INDEX sarin_wa_send_month ON sarin_wa_send_quota(month_key);
CREATE TABLE sarin_wa_delivery_observations (
  event_id TEXT PRIMARY KEY, outbox_id TEXT NOT NULL, provider_id TEXT,
  applied INTEGER NOT NULL DEFAULT 0, conflict INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN('accepted','sent','delivered','read','failed')),
  observed_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE sarin_wa_audit (
  audit_id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
  peer_key TEXT, revision INTEGER NOT NULL, at INTEGER NOT NULL
);
-- Guardias en el mismo batch: un permiso obsoleto revierte todos los writes.
CREATE VIEW sarin_wa_work_guard AS SELECT NULL AS code;
CREATE TRIGGER sarin_wa_guard INSTEAD OF INSERT ON sarin_wa_work_guard BEGIN
  SELECT CASE NEW.code WHEN 'quota' THEN RAISE(ABORT,'WA_WORK_QUOTA')
    WHEN 'capacity' THEN RAISE(ABORT,'WA_WORK_CAPACITY')
    WHEN 'conflict' THEN RAISE(ABORT,'WA_WORK_CONFLICT')
    ELSE RAISE(ABORT,'WA_WORK_DENIED') END;
END;
CREATE TRIGGER sarin_wa_work_capture AFTER INSERT ON sarin_wa_inbox BEGIN
  INSERT INTO sarin_wa_contexts(peer_key,context_id,last_inbound_at)
    VALUES(NEW.peer_key,lower(hex(randomblob(16))),CASE WHEN NEW.kind='inbound' THEN NEW.sent_at ELSE 0 END)
    ON CONFLICT(peer_key) DO UPDATE SET last_inbound_at=MAX(last_inbound_at,excluded.last_inbound_at);
  INSERT INTO sarin_wa_work_guard(code) SELECT 'capacity' WHERE
    (SELECT COUNT(*) FROM sarin_wa_jobs)>=10000 AND EXISTS(
      SELECT 1 FROM sarin_wa_pilot p,sarin_wa_contexts c WHERE p.enabled=1 AND c.peer_key=NEW.peer_key AND c.paused=0);
  INSERT INTO sarin_wa_jobs(job_id,event_id,peer_key,epoch,context_id,peer_revision,input_kind,created_at,expires_at)
    SELECT lower(hex(randomblob(16))),NEW.event_id,NEW.peer_key,p.epoch,c.context_id,c.revision,COALESCE((SELECT CASE WHEN classification='accept' THEN 'accept' ELSE 'text' END FROM sarin_wa_control_events WHERE event_id=NEW.event_id),'text'),NEW.received_at,NEW.expires_at
    FROM sarin_wa_pilot p,sarin_wa_contexts c WHERE p.enabled=1 AND c.peer_key=NEW.peer_key AND c.paused=0
      AND NEW.kind='inbound' AND NEW.media_type='text' AND NEW.sent_at>MAX(p.activation_at,c.activation_at)
      AND NEW.created_at>MAX(p.activation_at,c.activation_at)
      AND EXISTS(SELECT 1 FROM sarin_wa_control_events v WHERE v.event_id=NEW.event_id AND v.context_id=c.context_id AND v.applied=1 AND v.classification IN('text','accept'));
END;

-- Recibos minimos independientes del contenido, sin cuerpos ni telefonos.
CREATE TABLE sarin_wa_control_events (
  event_id TEXT PRIMARY KEY, message_key TEXT NOT NULL UNIQUE, event_hash TEXT NOT NULL,
  message_hash TEXT NOT NULL, peer_key TEXT NOT NULL, context_id TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0, classification TEXT NOT NULL, sent_at INTEGER NOT NULL, observed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sarin_wa_control_expiry ON sarin_wa_control_events(expires_at);
CREATE TRIGGER sarin_wa_context_invalidate AFTER UPDATE OF revision,context_id ON sarin_wa_contexts
WHEN OLD.revision<>NEW.revision OR OLD.context_id<>NEW.context_id BEGIN
  UPDATE sarin_wa_send_quota SET reserved=reserved-(SELECT COUNT(*) FROM sarin_wa_jobs j
    WHERE j.peer_key=NEW.peer_key AND j.quota_state='reserved' AND j.quota_day=day_key)
    WHERE day_key IN(SELECT quota_day FROM sarin_wa_jobs WHERE peer_key=NEW.peer_key AND quota_state='reserved');
  UPDATE sarin_wa_outbox SET state='cancelled' WHERE peer_key=NEW.peer_key AND state='ready';
  UPDATE sarin_wa_jobs SET
    state=CASE WHEN state='inference_started' THEN 'inference_uncertain'
      WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id AND o.started_at IS NOT NULL) THEN 'completed' ELSE 'cancelled' END,
    quota_state=CASE WHEN quota_state='reserved' THEN 'released' ELSE quota_state END,
    reserved_bytes=CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id) THEN reserved_bytes ELSE 0 END
    WHERE peer_key=NEW.peer_key AND state IN('queued','claimed','inference_started','ready');
  UPDATE sarin_wa_jobs SET quota_state='released',reserved_bytes=CASE WHEN EXISTS(SELECT 1 FROM sarin_wa_outbox o WHERE o.job_id=sarin_wa_jobs.job_id) THEN reserved_bytes ELSE 0 END WHERE peer_key=NEW.peer_key AND quota_state='reserved';
END;

-- Prueba minima sin texto, telefonos ni FK hacia contenido efimero.
CREATE TABLE sarin_wa_consent_proofs (
 acceptance_event_id TEXT PRIMARY KEY, notice_id TEXT NOT NULL, peer_key TEXT NOT NULL,
 notice_context_id TEXT NOT NULL, notice_epoch TEXT NOT NULL, version TEXT NOT NULL, hash TEXT NOT NULL,
 started_at INTEGER NOT NULL, delivered_at INTEGER NOT NULL, accepted_at INTEGER NOT NULL,
 consent_expires_at INTEGER NOT NULL, recorded_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 external_id TEXT NOT NULL, provider_id TEXT, wamid TEXT,
 waba_hash TEXT NOT NULL, from_hash TEXT NOT NULL, to_hash TEXT NOT NULL,
 conflict INTEGER NOT NULL DEFAULT 0 CHECK(conflict IN(0,1)),
 CHECK(expires_at=recorded_at+172800000),
 CHECK(consent_expires_at>accepted_at AND consent_expires_at<=accepted_at+86400000 AND consent_expires_at<=expires_at)
);
CREATE INDEX sarin_wa_proofs_expiry ON sarin_wa_consent_proofs(expires_at);
CREATE INDEX sarin_wa_proofs_provider ON sarin_wa_consent_proofs(provider_id);
CREATE INDEX sarin_wa_proofs_external ON sarin_wa_consent_proofs(external_id);
CREATE INDEX sarin_wa_proofs_notice ON sarin_wa_consent_proofs(notice_id);
CREATE TRIGGER sarin_wa_proof_immutable BEFORE UPDATE ON sarin_wa_consent_proofs BEGIN
 SELECT CASE WHEN NEW.acceptance_event_id IS NOT OLD.acceptance_event_id OR NEW.notice_id IS NOT OLD.notice_id
 OR NEW.peer_key IS NOT OLD.peer_key OR NEW.notice_context_id IS NOT OLD.notice_context_id OR NEW.notice_epoch IS NOT OLD.notice_epoch
 OR NEW.version IS NOT OLD.version OR NEW.hash IS NOT OLD.hash OR NEW.started_at IS NOT OLD.started_at
 OR NEW.delivered_at IS NOT OLD.delivered_at OR NEW.accepted_at IS NOT OLD.accepted_at
 OR NEW.consent_expires_at IS NOT OLD.consent_expires_at OR NEW.recorded_at IS NOT OLD.recorded_at OR NEW.expires_at IS NOT OLD.expires_at
 OR NEW.external_id IS NOT OLD.external_id OR NEW.waba_hash IS NOT OLD.waba_hash OR NEW.from_hash IS NOT OLD.from_hash OR NEW.to_hash IS NOT OLD.to_hash
 OR (OLD.provider_id IS NOT NULL AND NEW.provider_id IS NOT OLD.provider_id) OR (OLD.wamid IS NOT NULL AND NEW.wamid IS NOT OLD.wamid)
 OR NEW.conflict<OLD.conflict THEN RAISE(ABORT,'WA_WORK_DENIED') END;
END;
CREATE TRIGGER sarin_wa_proof_sync AFTER UPDATE ON sarin_wa_outbox BEGIN
 UPDATE sarin_wa_consent_proofs SET conflict=MAX(conflict,NEW.conflict,
   CASE WHEN (provider_id IS NOT NULL AND NEW.provider_id IS NOT NULL AND provider_id<>NEW.provider_id)
   OR (wamid IS NOT NULL AND NEW.wamid IS NOT NULL AND wamid<>NEW.wamid) THEN 1 ELSE 0 END),
   provider_id=COALESCE(provider_id,NEW.provider_id),wamid=COALESCE(wamid,NEW.wamid)
 WHERE notice_id=NEW.outbox_id;
END;
CREATE VIEW sarin_wa_delivery_targets AS
 SELECT o.outbox_id,o.peer_key,o.context_id,o.provider_id,o.external_id,o.wamid,o.started_at,o.delivered_at,o.state,o.conflict,o.expires_at,
 i.waba_id,i.business_phone,i.peer_phone,NULL AS waba_hash,NULL AS from_hash,NULL AS to_hash
 FROM sarin_wa_outbox o JOIN sarin_wa_jobs j ON j.job_id=o.job_id JOIN sarin_wa_inbox i ON i.event_id=j.event_id
 WHERE NOT EXISTS(SELECT 1 FROM sarin_wa_consent_proofs p WHERE p.notice_id=o.outbox_id)
 UNION ALL
 SELECT p.notice_id,p.peer_key,p.notice_context_id,p.provider_id,p.external_id,p.wamid,p.started_at,p.delivered_at,'delivered',p.conflict,p.expires_at,
 NULL,NULL,NULL,p.waba_hash,p.from_hash,p.to_hash FROM sarin_wa_consent_proofs p;
CREATE TABLE sarin_wa_send_closures (
 scope TEXT NOT NULL CHECK(scope IN('day','month')), period_key TEXT NOT NULL,
 closed_at INTEGER NOT NULL CHECK(closed_at>=0), period_end_at INTEGER NOT NULL,
 reason TEXT NOT NULL CHECK(reason='restore'), PRIMARY KEY(scope,period_key),
 CHECK((scope='day' AND length(period_key)=10 AND strftime('%Y-%m-%d',period_key) IS NOT NULL AND strftime('%Y-%m-%d',period_key)=period_key
   AND period_end_at=CAST(strftime('%s',period_key,'+1 day') AS INTEGER)*1000)
 OR (scope='month' AND length(period_key)=7 AND strftime('%Y-%m',period_key||'-01') IS NOT NULL AND strftime('%Y-%m',period_key||'-01')=period_key
   AND period_end_at=CAST(strftime('%s',period_key||'-01','+1 month') AS INTEGER)*1000)),
 CHECK(period_end_at>closed_at)
);
