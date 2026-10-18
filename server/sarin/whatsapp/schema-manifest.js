// Generado por .github/cloudflare/generate-wa-schema.mjs; no editar manualmente.
export const schemas = {
  "0004": {
    "identifiers": [
      "admission_token",
      "business_phone",
      "canonical_event_id",
      "content_bytes",
      "created_at",
      "day_start",
      "event_hash",
      "event_id",
      "expires_at",
      "global_day",
      "global_minute",
      "id",
      "inbox_rows",
      "kind",
      "last_human_at",
      "last_inbound_at",
      "last_purge_at",
      "max_bytes",
      "max_inbox",
      "max_peers",
      "max_receipts",
      "media_type",
      "message_hash",
      "message_id",
      "message_key",
      "minute_start",
      "new",
      "old",
      "pause_revision",
      "paused",
      "paused_all",
      "peer_key",
      "peer_phone",
      "per_day",
      "per_minute",
      "purge_remaining",
      "receipt_rows",
      "received_at",
      "replay_floor_at",
      "sarin_wa_admit",
      "sarin_wa_capture",
      "sarin_wa_inbox",
      "sarin_wa_inbox_added",
      "sarin_wa_inbox_expiry",
      "sarin_wa_inbox_peer",
      "sarin_wa_inbox_removed",
      "sarin_wa_peers",
      "sarin_wa_peers_expiry",
      "sarin_wa_receipt_added",
      "sarin_wa_receipt_removed",
      "sarin_wa_receipts",
      "sarin_wa_receipts_expiry",
      "sarin_wa_receipts_global_rate",
      "sarin_wa_receipts_message",
      "sarin_wa_receipts_peer_rate",
      "sarin_wa_state",
      "sent_at",
      "state",
      "stored_bytes",
      "text",
      "waba_id",
      "wamid"
    ],
    "objects": [
      {
        "name": "sarin_wa_admit",
        "type": "trigger",
        "table": "sarin_wa_capture",
        "hash": "ad02bc5ab1080c1c0d0f59703023d44220cf8cfb64dd1441623218456879b2d0"
      },
      {
        "name": "sarin_wa_capture",
        "type": "view",
        "table": "sarin_wa_capture",
        "hash": "15990955dee31cd5316f5e9deae82cb986e0a3d70e1f0f78e251f22ccb3805b7"
      },
      {
        "name": "sarin_wa_inbox",
        "type": "table",
        "table": "sarin_wa_inbox",
        "hash": "85062eb3d573cae2e07325bd4bed8ee6bb5a70edc8d0e0d77a6904714370db2c"
      },
      {
        "name": "sarin_wa_inbox_added",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "431645409d63f372dd9abc0cd0e8adbe3ddca14042881a425b5042dd510730f8"
      },
      {
        "name": "sarin_wa_inbox_expiry",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "bfeb395d689f5a43f8fe103e197ae92bf9b7c069005fac3293eb2078ce20717a"
      },
      {
        "name": "sarin_wa_inbox_peer",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "a713cb3d9be7072176150793bb1b6e149ddd259380483e8bc5c35ea358b2469d"
      },
      {
        "name": "sarin_wa_inbox_removed",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "bfa22657d1e1fcc0eca17d6c3ebc05e9160e98b027788c1245088e52f1c305f6"
      },
      {
        "name": "sarin_wa_peers",
        "type": "table",
        "table": "sarin_wa_peers",
        "hash": "d80177cf886578d2b89f5091cd21237de392cac56c31b6213fa98d3c4070be38"
      },
      {
        "name": "sarin_wa_peers_expiry",
        "type": "index",
        "table": "sarin_wa_peers",
        "hash": "2b8cba8a5290b4f4164e4fd586284b2520fd47f59a9037dfbbe1a9a6268c180a"
      },
      {
        "name": "sarin_wa_receipt_added",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "761a58bd9b62269a33acb3cb20e7cd6ebc213a299347fc66d4487cdbac3eb067"
      },
      {
        "name": "sarin_wa_receipt_removed",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "2b6351b06df7a0255a50cc1f6fa47bf4906a9dbb0521c1bcdcc0be7067bd5120"
      },
      {
        "name": "sarin_wa_receipts",
        "type": "table",
        "table": "sarin_wa_receipts",
        "hash": "f53c4ef5c492b865732a2edf202517bb997a616e9194a5881e172d2d37135217"
      },
      {
        "name": "sarin_wa_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b3cc7f89498ec9e328dada83bb0c9b2dde998a09c028cac15c5d1ce092c8737d"
      },
      {
        "name": "sarin_wa_receipts_global_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b62914887705e521f4dc94e9425c604ba56272609e837ffab0e0643944d5fd13"
      },
      {
        "name": "sarin_wa_receipts_message",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "7f5b4a2fc05a238a138fc6496250924904283f6574e3df40d5c366f5afac4a19"
      },
      {
        "name": "sarin_wa_receipts_peer_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b30385715fb946a3e7fb52abd8853f8012241832ae68e831fd51143d282346c5"
      },
      {
        "name": "sarin_wa_state",
        "type": "table",
        "table": "sarin_wa_state",
        "hash": "ec2dfba9b5cfe6531cb9a28736dbfde9f18a31d0bff4e6d6e1ffad4414bf4016"
      }
    ]
  },
  "0005": {
    "identifiers": [
      "acceptance_event_id",
      "accepted_at",
      "action",
      "activation_at",
      "actor",
      "admission_token",
      "applied",
      "at",
      "attached_at",
      "audit_id",
      "business_phone",
      "canonical_event_id",
      "classification",
      "closed_at",
      "code",
      "conflict",
      "consent_expires_at",
      "consent_hash",
      "consent_notice_id",
      "consent_version",
      "consumed",
      "content_bytes",
      "context_id",
      "created_at",
      "day_key",
      "day_start",
      "deferred_reason",
      "delivered_at",
      "enabled",
      "epoch",
      "event_hash",
      "event_id",
      "expires_at",
      "external_id",
      "from_hash",
      "global_day",
      "global_minute",
      "hash",
      "id",
      "inbox_rows",
      "inference_started_at",
      "input_kind",
      "job_id",
      "kind",
      "last_human_at",
      "last_inbound_at",
      "last_purge_at",
      "lease_until",
      "max_bytes",
      "max_inbox",
      "max_peers",
      "max_receipts",
      "media_type",
      "message_hash",
      "message_id",
      "message_key",
      "minute_start",
      "month_key",
      "new",
      "notice_context_id",
      "notice_epoch",
      "notice_id",
      "observed_at",
      "old",
      "outbox_id",
      "outcome",
      "pause_revision",
      "paused",
      "paused_all",
      "peer_key",
      "peer_phone",
      "peer_revision",
      "pending_acceptance_event_id",
      "pending_accepted_at",
      "per_day",
      "per_minute",
      "period_end_at",
      "period_key",
      "provider_id",
      "purge_remaining",
      "purpose",
      "quota_day",
      "quota_month",
      "quota_state",
      "reason",
      "receipt_rows",
      "received_at",
      "reconcile_attempts",
      "reconcile_last_result",
      "reconcile_lease_until",
      "reconcile_next_at",
      "reconcile_state",
      "reconcile_token",
      "reconcile_updated_at",
      "recorded_at",
      "replay_floor_at",
      "reservation_id",
      "reserved",
      "reserved_bytes",
      "revision",
      "sarin_wa_admit",
      "sarin_wa_audit",
      "sarin_wa_capture",
      "sarin_wa_consent_proofs",
      "sarin_wa_context_invalidate",
      "sarin_wa_contexts",
      "sarin_wa_control_events",
      "sarin_wa_control_expiry",
      "sarin_wa_delivery_observations",
      "sarin_wa_delivery_targets",
      "sarin_wa_fixed_once",
      "sarin_wa_guard",
      "sarin_wa_inbox",
      "sarin_wa_inbox_added",
      "sarin_wa_inbox_expiry",
      "sarin_wa_inbox_peer",
      "sarin_wa_inbox_removed",
      "sarin_wa_inference_reservations",
      "sarin_wa_job_transition",
      "sarin_wa_jobs",
      "sarin_wa_jobs_dispatch",
      "sarin_wa_jobs_expiry",
      "sarin_wa_one_owner",
      "sarin_wa_outbox",
      "sarin_wa_outbox_peer",
      "sarin_wa_outbox_reconcile",
      "sarin_wa_outbox_transition",
      "sarin_wa_peers",
      "sarin_wa_peers_expiry",
      "sarin_wa_pilot",
      "sarin_wa_proof_immutable",
      "sarin_wa_proof_sync",
      "sarin_wa_proofs_expiry",
      "sarin_wa_proofs_external",
      "sarin_wa_proofs_notice",
      "sarin_wa_proofs_provider",
      "sarin_wa_receipt_added",
      "sarin_wa_receipt_removed",
      "sarin_wa_receipts",
      "sarin_wa_receipts_expiry",
      "sarin_wa_receipts_global_rate",
      "sarin_wa_receipts_message",
      "sarin_wa_receipts_peer_rate",
      "sarin_wa_send_closures",
      "sarin_wa_send_month",
      "sarin_wa_send_quota",
      "sarin_wa_state",
      "sarin_wa_work_capture",
      "sarin_wa_work_guard",
      "scope",
      "sent_at",
      "started_at",
      "state",
      "status",
      "stored_bytes",
      "text",
      "to_hash",
      "token",
      "version",
      "waba_hash",
      "waba_id",
      "wamid"
    ],
    "objects": [
      {
        "name": "sarin_wa_admit",
        "type": "trigger",
        "table": "sarin_wa_capture",
        "hash": "ad02bc5ab1080c1c0d0f59703023d44220cf8cfb64dd1441623218456879b2d0"
      },
      {
        "name": "sarin_wa_audit",
        "type": "table",
        "table": "sarin_wa_audit",
        "hash": "f5d810a8bf822af0224da4d9f2775cf9b715558f0fe208999133224cdb24eddb"
      },
      {
        "name": "sarin_wa_capture",
        "type": "view",
        "table": "sarin_wa_capture",
        "hash": "15990955dee31cd5316f5e9deae82cb986e0a3d70e1f0f78e251f22ccb3805b7"
      },
      {
        "name": "sarin_wa_consent_proofs",
        "type": "table",
        "table": "sarin_wa_consent_proofs",
        "hash": "58f4bb088501064474f828899f90e09159d09939443c6e1a2365616697867d4c"
      },
      {
        "name": "sarin_wa_context_invalidate",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "79adb966f951b332fc440b0113d7756ef2a9c6f20d3c1b2ff65996e84951c74b"
      },
      {
        "name": "sarin_wa_contexts",
        "type": "table",
        "table": "sarin_wa_contexts",
        "hash": "9e5edd0c93bdde10f2226fbc7a9f6186e2eff266a8239d326a46ff6549033902"
      },
      {
        "name": "sarin_wa_control_events",
        "type": "table",
        "table": "sarin_wa_control_events",
        "hash": "4a60f091bccb0dc73ab91b866646aa806c849a3b9c0b5f8fad3a9334e6308ba0"
      },
      {
        "name": "sarin_wa_control_expiry",
        "type": "index",
        "table": "sarin_wa_control_events",
        "hash": "9a13a112565a93670a9384c27b9fadb227724e4dc6af7aad0816153422e3c412"
      },
      {
        "name": "sarin_wa_delivery_observations",
        "type": "table",
        "table": "sarin_wa_delivery_observations",
        "hash": "b927730d6d8465a8b248821f7613aef42b3e37c424dbefeeb660b4c93b6a6644"
      },
      {
        "name": "sarin_wa_delivery_targets",
        "type": "view",
        "table": "sarin_wa_delivery_targets",
        "hash": "d06983e48ed1773266c23714dab39c57b61e56a49eec744eb85b5cb332084bbe"
      },
      {
        "name": "sarin_wa_fixed_once",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d384e3b458b997afad4683f728a087893dfc726e25e118710209bca2cb0d6ba3"
      },
      {
        "name": "sarin_wa_guard",
        "type": "trigger",
        "table": "sarin_wa_work_guard",
        "hash": "5f0f0f81013454410722d99c9ef9e279223dd6feb6bacd2917910efdd40b89be"
      },
      {
        "name": "sarin_wa_inbox",
        "type": "table",
        "table": "sarin_wa_inbox",
        "hash": "85062eb3d573cae2e07325bd4bed8ee6bb5a70edc8d0e0d77a6904714370db2c"
      },
      {
        "name": "sarin_wa_inbox_added",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "431645409d63f372dd9abc0cd0e8adbe3ddca14042881a425b5042dd510730f8"
      },
      {
        "name": "sarin_wa_inbox_expiry",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "bfeb395d689f5a43f8fe103e197ae92bf9b7c069005fac3293eb2078ce20717a"
      },
      {
        "name": "sarin_wa_inbox_peer",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "a713cb3d9be7072176150793bb1b6e149ddd259380483e8bc5c35ea358b2469d"
      },
      {
        "name": "sarin_wa_inbox_removed",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "bfa22657d1e1fcc0eca17d6c3ebc05e9160e98b027788c1245088e52f1c305f6"
      },
      {
        "name": "sarin_wa_inference_reservations",
        "type": "table",
        "table": "sarin_wa_inference_reservations",
        "hash": "0c8b9a182c9921c8cc55fde674e73682980612aa152324a83ced249570807226"
      },
      {
        "name": "sarin_wa_job_transition",
        "type": "trigger",
        "table": "sarin_wa_jobs",
        "hash": "288f4f13063e95e291b9dc27210f5c4fd1a5abcae7840c68355cda50e93bbcd7"
      },
      {
        "name": "sarin_wa_jobs",
        "type": "table",
        "table": "sarin_wa_jobs",
        "hash": "91b4800a604cc771e5fb8cd0859fc82962ec5e606f0cd6b5bbacf26d2d411753"
      },
      {
        "name": "sarin_wa_jobs_dispatch",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "74df902a7c2df67c952ca77c0375b81142c6e8ccf26520e97816150389dbf6a7"
      },
      {
        "name": "sarin_wa_jobs_expiry",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "da016c51398986285204961f4d25b20051bbb3a41ede3d5b89f65dd7513fc615"
      },
      {
        "name": "sarin_wa_one_owner",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "bf20091e9b99364cbe4038e2de8688aa444e97e94070e97f2683c7f63df2c850"
      },
      {
        "name": "sarin_wa_outbox",
        "type": "table",
        "table": "sarin_wa_outbox",
        "hash": "723ef90f165aa39097e38b1e95b348c47f860f3a5568aaf0ff722d55a5176d43"
      },
      {
        "name": "sarin_wa_outbox_peer",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d72585d9e514cd5284cac95548b86bd797db665bcbedbd657e073a22e2cf0620"
      },
      {
        "name": "sarin_wa_outbox_reconcile",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "6bc4123b51cceff6dac94fa098c41f7a7063c3720de29ffa81acb378f5a232e9"
      },
      {
        "name": "sarin_wa_outbox_transition",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "1b9643abaeeafa1834616dd0a0e8995b4d62b4f5f1b56f50bb9b79ff1e74b5f8"
      },
      {
        "name": "sarin_wa_peers",
        "type": "table",
        "table": "sarin_wa_peers",
        "hash": "d80177cf886578d2b89f5091cd21237de392cac56c31b6213fa98d3c4070be38"
      },
      {
        "name": "sarin_wa_peers_expiry",
        "type": "index",
        "table": "sarin_wa_peers",
        "hash": "2b8cba8a5290b4f4164e4fd586284b2520fd47f59a9037dfbbe1a9a6268c180a"
      },
      {
        "name": "sarin_wa_pilot",
        "type": "table",
        "table": "sarin_wa_pilot",
        "hash": "6ebb4baebaa45d0565518478db2c9c69edefdb0751da0c050e10848f7ceb00bd"
      },
      {
        "name": "sarin_wa_proof_immutable",
        "type": "trigger",
        "table": "sarin_wa_consent_proofs",
        "hash": "e5810c37d9837ab3faecfb3d617658c9879fa5f927847ccdc3cb0434eba757cf"
      },
      {
        "name": "sarin_wa_proof_sync",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "ac8231652a2e878d89b2fcba7e2e2fb35fd47f1d2ae2bbe612eb43e0c80f0b7a"
      },
      {
        "name": "sarin_wa_proofs_expiry",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "2920d0c05b581ca2dde6dac1313c6596f3d7e893878f11d8f16f4062e486d280"
      },
      {
        "name": "sarin_wa_proofs_external",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "69c5412c424aed51616f28a37e4fb0c1ad020c694f5fdf356e977634e2fb33e7"
      },
      {
        "name": "sarin_wa_proofs_notice",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "8ed704aa56160feee50fe97a3ac6b99978a830698f94eba3213a60e530dea0fd"
      },
      {
        "name": "sarin_wa_proofs_provider",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "6021f60c91f77aab8e25509972b81c3e49db1ef858596e71a2b36b60c047b1ff"
      },
      {
        "name": "sarin_wa_receipt_added",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "761a58bd9b62269a33acb3cb20e7cd6ebc213a299347fc66d4487cdbac3eb067"
      },
      {
        "name": "sarin_wa_receipt_removed",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "2b6351b06df7a0255a50cc1f6fa47bf4906a9dbb0521c1bcdcc0be7067bd5120"
      },
      {
        "name": "sarin_wa_receipts",
        "type": "table",
        "table": "sarin_wa_receipts",
        "hash": "f53c4ef5c492b865732a2edf202517bb997a616e9194a5881e172d2d37135217"
      },
      {
        "name": "sarin_wa_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b3cc7f89498ec9e328dada83bb0c9b2dde998a09c028cac15c5d1ce092c8737d"
      },
      {
        "name": "sarin_wa_receipts_global_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b62914887705e521f4dc94e9425c604ba56272609e837ffab0e0643944d5fd13"
      },
      {
        "name": "sarin_wa_receipts_message",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "7f5b4a2fc05a238a138fc6496250924904283f6574e3df40d5c366f5afac4a19"
      },
      {
        "name": "sarin_wa_receipts_peer_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b30385715fb946a3e7fb52abd8853f8012241832ae68e831fd51143d282346c5"
      },
      {
        "name": "sarin_wa_send_closures",
        "type": "table",
        "table": "sarin_wa_send_closures",
        "hash": "a85e29fefcde16f266cd527efa6fdae328a13bdae8a1f582de8ee53a8055df5d"
      },
      {
        "name": "sarin_wa_send_month",
        "type": "index",
        "table": "sarin_wa_send_quota",
        "hash": "a353a52c613524c0562a6b7f90c8ee536a921ed060cfaefc4b3a727216803c2a"
      },
      {
        "name": "sarin_wa_send_quota",
        "type": "table",
        "table": "sarin_wa_send_quota",
        "hash": "9faa550d8417da0fdbdedce7ff615683fefbd3b85df54225b83ac106493ce14f"
      },
      {
        "name": "sarin_wa_state",
        "type": "table",
        "table": "sarin_wa_state",
        "hash": "ec2dfba9b5cfe6531cb9a28736dbfde9f18a31d0bff4e6d6e1ffad4414bf4016"
      },
      {
        "name": "sarin_wa_work_capture",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "a8acc5816a08db47c44936b2bf74409d66e69da072cd04f7101fcb7850a7c679"
      },
      {
        "name": "sarin_wa_work_guard",
        "type": "view",
        "table": "sarin_wa_work_guard",
        "hash": "e4d7740a70a1f449eac62a3481e36bbcb36120f4ab37648d4b9fcca2085de814"
      }
    ]
  },
  "0006": {
    "identifiers": [
      "acceptance_event_id",
      "accepted_at",
      "action",
      "activation_at",
      "actor",
      "admission_token",
      "alert_id",
      "applied",
      "at",
      "attached_at",
      "audit_id",
      "business_phone",
      "canonical_event_id",
      "classification",
      "closed_at",
      "code",
      "conflict",
      "consent_expires_at",
      "consent_hash",
      "consent_notice_id",
      "consent_version",
      "consumed",
      "content_bytes",
      "context_id",
      "created_at",
      "day_key",
      "day_start",
      "deferred_reason",
      "delivered_at",
      "enabled",
      "epoch",
      "event_hash",
      "event_id",
      "expires_at",
      "external_id",
      "from_hash",
      "global_day",
      "global_minute",
      "hash",
      "id",
      "inbox_rows",
      "inference_started_at",
      "input_kind",
      "job_id",
      "kind",
      "last_human_at",
      "last_inbound_at",
      "last_purge_at",
      "lease_until",
      "max_bytes",
      "max_inbox",
      "max_peers",
      "max_receipts",
      "media_type",
      "message_hash",
      "message_id",
      "message_key",
      "minute_start",
      "mode",
      "month_key",
      "new",
      "notice_context_id",
      "notice_epoch",
      "notice_id",
      "observed_at",
      "old",
      "outbox_id",
      "outcome",
      "owner_phone",
      "pause_revision",
      "paused",
      "paused_all",
      "peer_key",
      "peer_phone",
      "peer_revision",
      "pending_acceptance_event_id",
      "pending_accepted_at",
      "per_day",
      "per_minute",
      "period_end_at",
      "period_key",
      "provider_id",
      "purge_remaining",
      "purpose",
      "quota_day",
      "quota_month",
      "quota_state",
      "reason",
      "receipt_expires_at",
      "receipt_rows",
      "received_at",
      "reconcile_attempts",
      "reconcile_last_result",
      "reconcile_lease_until",
      "reconcile_next_at",
      "reconcile_state",
      "reconcile_token",
      "reconcile_updated_at",
      "recorded_at",
      "replay_floor_at",
      "reservation_id",
      "reserved",
      "reserved_bytes",
      "revision",
      "sarin_wa_admit",
      "sarin_wa_audit",
      "sarin_wa_capture",
      "sarin_wa_consent_proofs",
      "sarin_wa_context_invalidate",
      "sarin_wa_contexts",
      "sarin_wa_control_events",
      "sarin_wa_control_expiry",
      "sarin_wa_delivery_observations",
      "sarin_wa_delivery_targets",
      "sarin_wa_fixed_once",
      "sarin_wa_guard",
      "sarin_wa_handoff",
      "sarin_wa_handoff_dispatch",
      "sarin_wa_handoff_expiry",
      "sarin_wa_handoff_immutable",
      "sarin_wa_handoff_request",
      "sarin_wa_inbox",
      "sarin_wa_inbox_added",
      "sarin_wa_inbox_expiry",
      "sarin_wa_inbox_peer",
      "sarin_wa_inbox_removed",
      "sarin_wa_inference_reservations",
      "sarin_wa_job_transition",
      "sarin_wa_jobs",
      "sarin_wa_jobs_dispatch",
      "sarin_wa_jobs_expiry",
      "sarin_wa_one_owner",
      "sarin_wa_outbox",
      "sarin_wa_outbox_peer",
      "sarin_wa_outbox_reconcile",
      "sarin_wa_outbox_transition",
      "sarin_wa_peers",
      "sarin_wa_peers_expiry",
      "sarin_wa_pilot",
      "sarin_wa_proof_immutable",
      "sarin_wa_proof_sync",
      "sarin_wa_proofs_expiry",
      "sarin_wa_proofs_external",
      "sarin_wa_proofs_notice",
      "sarin_wa_proofs_provider",
      "sarin_wa_receipt_added",
      "sarin_wa_receipt_removed",
      "sarin_wa_receipts",
      "sarin_wa_receipts_expiry",
      "sarin_wa_receipts_global_rate",
      "sarin_wa_receipts_message",
      "sarin_wa_receipts_peer_rate",
      "sarin_wa_send_closures",
      "sarin_wa_send_month",
      "sarin_wa_send_quota",
      "sarin_wa_state",
      "sarin_wa_work_capture",
      "sarin_wa_work_guard",
      "scope",
      "sent_at",
      "started_at",
      "state",
      "status",
      "stored_bytes",
      "text",
      "to_hash",
      "token",
      "version",
      "waba_hash",
      "waba_id",
      "wamid"
    ],
    "objects": [
      {
        "name": "sarin_wa_admit",
        "type": "trigger",
        "table": "sarin_wa_capture",
        "hash": "ad02bc5ab1080c1c0d0f59703023d44220cf8cfb64dd1441623218456879b2d0"
      },
      {
        "name": "sarin_wa_audit",
        "type": "table",
        "table": "sarin_wa_audit",
        "hash": "f5d810a8bf822af0224da4d9f2775cf9b715558f0fe208999133224cdb24eddb"
      },
      {
        "name": "sarin_wa_capture",
        "type": "view",
        "table": "sarin_wa_capture",
        "hash": "15990955dee31cd5316f5e9deae82cb986e0a3d70e1f0f78e251f22ccb3805b7"
      },
      {
        "name": "sarin_wa_consent_proofs",
        "type": "table",
        "table": "sarin_wa_consent_proofs",
        "hash": "58f4bb088501064474f828899f90e09159d09939443c6e1a2365616697867d4c"
      },
      {
        "name": "sarin_wa_context_invalidate",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "79adb966f951b332fc440b0113d7756ef2a9c6f20d3c1b2ff65996e84951c74b"
      },
      {
        "name": "sarin_wa_contexts",
        "type": "table",
        "table": "sarin_wa_contexts",
        "hash": "9e5edd0c93bdde10f2226fbc7a9f6186e2eff266a8239d326a46ff6549033902"
      },
      {
        "name": "sarin_wa_control_events",
        "type": "table",
        "table": "sarin_wa_control_events",
        "hash": "4a60f091bccb0dc73ab91b866646aa806c849a3b9c0b5f8fad3a9334e6308ba0"
      },
      {
        "name": "sarin_wa_control_expiry",
        "type": "index",
        "table": "sarin_wa_control_events",
        "hash": "9a13a112565a93670a9384c27b9fadb227724e4dc6af7aad0816153422e3c412"
      },
      {
        "name": "sarin_wa_delivery_observations",
        "type": "table",
        "table": "sarin_wa_delivery_observations",
        "hash": "b927730d6d8465a8b248821f7613aef42b3e37c424dbefeeb660b4c93b6a6644"
      },
      {
        "name": "sarin_wa_delivery_targets",
        "type": "view",
        "table": "sarin_wa_delivery_targets",
        "hash": "d06983e48ed1773266c23714dab39c57b61e56a49eec744eb85b5cb332084bbe"
      },
      {
        "name": "sarin_wa_fixed_once",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d384e3b458b997afad4683f728a087893dfc726e25e118710209bca2cb0d6ba3"
      },
      {
        "name": "sarin_wa_guard",
        "type": "trigger",
        "table": "sarin_wa_work_guard",
        "hash": "5f0f0f81013454410722d99c9ef9e279223dd6feb6bacd2917910efdd40b89be"
      },
      {
        "name": "sarin_wa_handoff",
        "type": "table",
        "table": "sarin_wa_handoff",
        "hash": "bc1d6054d979076abd947b5296a2eb22489c009060244a7f676bd7465944ef87"
      },
      {
        "name": "sarin_wa_handoff_dispatch",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "66cb80f278c560b06f25d318e17d782c3fcf7b37564515f754eb8d14648f1cc1"
      },
      {
        "name": "sarin_wa_handoff_expiry",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "dab305c7811b81d3eafc68a1ea5f7e1e2406f837e6abbab7861657e38728e097"
      },
      {
        "name": "sarin_wa_handoff_immutable",
        "type": "trigger",
        "table": "sarin_wa_handoff",
        "hash": "773a9176125bc8c61e1bf28a7f72a41ecf4d43d6895b5880459e5c4f97af0cea"
      },
      {
        "name": "sarin_wa_handoff_request",
        "type": "trigger",
        "table": "sarin_wa_control_events",
        "hash": "f87102e0ebb5b5f04ee33197a5c2985d64c29ecdfa5d430e5cd59844e420260c"
      },
      {
        "name": "sarin_wa_inbox",
        "type": "table",
        "table": "sarin_wa_inbox",
        "hash": "85062eb3d573cae2e07325bd4bed8ee6bb5a70edc8d0e0d77a6904714370db2c"
      },
      {
        "name": "sarin_wa_inbox_added",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "431645409d63f372dd9abc0cd0e8adbe3ddca14042881a425b5042dd510730f8"
      },
      {
        "name": "sarin_wa_inbox_expiry",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "bfeb395d689f5a43f8fe103e197ae92bf9b7c069005fac3293eb2078ce20717a"
      },
      {
        "name": "sarin_wa_inbox_peer",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "a713cb3d9be7072176150793bb1b6e149ddd259380483e8bc5c35ea358b2469d"
      },
      {
        "name": "sarin_wa_inbox_removed",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "bfa22657d1e1fcc0eca17d6c3ebc05e9160e98b027788c1245088e52f1c305f6"
      },
      {
        "name": "sarin_wa_inference_reservations",
        "type": "table",
        "table": "sarin_wa_inference_reservations",
        "hash": "0c8b9a182c9921c8cc55fde674e73682980612aa152324a83ced249570807226"
      },
      {
        "name": "sarin_wa_job_transition",
        "type": "trigger",
        "table": "sarin_wa_jobs",
        "hash": "288f4f13063e95e291b9dc27210f5c4fd1a5abcae7840c68355cda50e93bbcd7"
      },
      {
        "name": "sarin_wa_jobs",
        "type": "table",
        "table": "sarin_wa_jobs",
        "hash": "91b4800a604cc771e5fb8cd0859fc82962ec5e606f0cd6b5bbacf26d2d411753"
      },
      {
        "name": "sarin_wa_jobs_dispatch",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "74df902a7c2df67c952ca77c0375b81142c6e8ccf26520e97816150389dbf6a7"
      },
      {
        "name": "sarin_wa_jobs_expiry",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "da016c51398986285204961f4d25b20051bbb3a41ede3d5b89f65dd7513fc615"
      },
      {
        "name": "sarin_wa_one_owner",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "bf20091e9b99364cbe4038e2de8688aa444e97e94070e97f2683c7f63df2c850"
      },
      {
        "name": "sarin_wa_outbox",
        "type": "table",
        "table": "sarin_wa_outbox",
        "hash": "723ef90f165aa39097e38b1e95b348c47f860f3a5568aaf0ff722d55a5176d43"
      },
      {
        "name": "sarin_wa_outbox_peer",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d72585d9e514cd5284cac95548b86bd797db665bcbedbd657e073a22e2cf0620"
      },
      {
        "name": "sarin_wa_outbox_reconcile",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "6bc4123b51cceff6dac94fa098c41f7a7063c3720de29ffa81acb378f5a232e9"
      },
      {
        "name": "sarin_wa_outbox_transition",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "1b9643abaeeafa1834616dd0a0e8995b4d62b4f5f1b56f50bb9b79ff1e74b5f8"
      },
      {
        "name": "sarin_wa_peers",
        "type": "table",
        "table": "sarin_wa_peers",
        "hash": "d80177cf886578d2b89f5091cd21237de392cac56c31b6213fa98d3c4070be38"
      },
      {
        "name": "sarin_wa_peers_expiry",
        "type": "index",
        "table": "sarin_wa_peers",
        "hash": "2b8cba8a5290b4f4164e4fd586284b2520fd47f59a9037dfbbe1a9a6268c180a"
      },
      {
        "name": "sarin_wa_pilot",
        "type": "table",
        "table": "sarin_wa_pilot",
        "hash": "6ebb4baebaa45d0565518478db2c9c69edefdb0751da0c050e10848f7ceb00bd"
      },
      {
        "name": "sarin_wa_proof_immutable",
        "type": "trigger",
        "table": "sarin_wa_consent_proofs",
        "hash": "e5810c37d9837ab3faecfb3d617658c9879fa5f927847ccdc3cb0434eba757cf"
      },
      {
        "name": "sarin_wa_proof_sync",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "ac8231652a2e878d89b2fcba7e2e2fb35fd47f1d2ae2bbe612eb43e0c80f0b7a"
      },
      {
        "name": "sarin_wa_proofs_expiry",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "2920d0c05b581ca2dde6dac1313c6596f3d7e893878f11d8f16f4062e486d280"
      },
      {
        "name": "sarin_wa_proofs_external",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "69c5412c424aed51616f28a37e4fb0c1ad020c694f5fdf356e977634e2fb33e7"
      },
      {
        "name": "sarin_wa_proofs_notice",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "8ed704aa56160feee50fe97a3ac6b99978a830698f94eba3213a60e530dea0fd"
      },
      {
        "name": "sarin_wa_proofs_provider",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "6021f60c91f77aab8e25509972b81c3e49db1ef858596e71a2b36b60c047b1ff"
      },
      {
        "name": "sarin_wa_receipt_added",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "761a58bd9b62269a33acb3cb20e7cd6ebc213a299347fc66d4487cdbac3eb067"
      },
      {
        "name": "sarin_wa_receipt_removed",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "2b6351b06df7a0255a50cc1f6fa47bf4906a9dbb0521c1bcdcc0be7067bd5120"
      },
      {
        "name": "sarin_wa_receipts",
        "type": "table",
        "table": "sarin_wa_receipts",
        "hash": "f53c4ef5c492b865732a2edf202517bb997a616e9194a5881e172d2d37135217"
      },
      {
        "name": "sarin_wa_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b3cc7f89498ec9e328dada83bb0c9b2dde998a09c028cac15c5d1ce092c8737d"
      },
      {
        "name": "sarin_wa_receipts_global_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b62914887705e521f4dc94e9425c604ba56272609e837ffab0e0643944d5fd13"
      },
      {
        "name": "sarin_wa_receipts_message",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "7f5b4a2fc05a238a138fc6496250924904283f6574e3df40d5c366f5afac4a19"
      },
      {
        "name": "sarin_wa_receipts_peer_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b30385715fb946a3e7fb52abd8853f8012241832ae68e831fd51143d282346c5"
      },
      {
        "name": "sarin_wa_send_closures",
        "type": "table",
        "table": "sarin_wa_send_closures",
        "hash": "a85e29fefcde16f266cd527efa6fdae328a13bdae8a1f582de8ee53a8055df5d"
      },
      {
        "name": "sarin_wa_send_month",
        "type": "index",
        "table": "sarin_wa_send_quota",
        "hash": "a353a52c613524c0562a6b7f90c8ee536a921ed060cfaefc4b3a727216803c2a"
      },
      {
        "name": "sarin_wa_send_quota",
        "type": "table",
        "table": "sarin_wa_send_quota",
        "hash": "9faa550d8417da0fdbdedce7ff615683fefbd3b85df54225b83ac106493ce14f"
      },
      {
        "name": "sarin_wa_state",
        "type": "table",
        "table": "sarin_wa_state",
        "hash": "ec2dfba9b5cfe6531cb9a28736dbfde9f18a31d0bff4e6d6e1ffad4414bf4016"
      },
      {
        "name": "sarin_wa_work_capture",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "a8acc5816a08db47c44936b2bf74409d66e69da072cd04f7101fcb7850a7c679"
      },
      {
        "name": "sarin_wa_work_guard",
        "type": "view",
        "table": "sarin_wa_work_guard",
        "hash": "e4d7740a70a1f449eac62a3481e36bbcb36120f4ab37648d4b9fcca2085de814"
      }
    ]
  },
  "0007": {
    "identifiers": [
      "acceptance_event_id",
      "accepted_at",
      "action",
      "activation_at",
      "actor",
      "admission_token",
      "alert_id",
      "applied",
      "at",
      "attached_at",
      "audit_id",
      "business_phone",
      "canonical_event_id",
      "classification",
      "closed_at",
      "code",
      "conflict",
      "consent_expires_at",
      "consent_hash",
      "consent_notice_id",
      "consent_version",
      "consumed",
      "content_bytes",
      "context_id",
      "created_at",
      "day_key",
      "day_start",
      "deferred_reason",
      "delivered_at",
      "descriptor",
      "duration_seconds",
      "enabled",
      "epoch",
      "event_hash",
      "event_id",
      "expires_at",
      "external_id",
      "finished_at",
      "from_hash",
      "global_day",
      "global_minute",
      "hash",
      "id",
      "inbox_rows",
      "inference_started_at",
      "input_kind",
      "job_id",
      "kind",
      "last_human_at",
      "last_inbound_at",
      "last_purge_at",
      "lease_until",
      "max_bytes",
      "max_inbox",
      "max_peers",
      "max_receipts",
      "media_type",
      "message_hash",
      "message_id",
      "message_key",
      "minute_start",
      "mode",
      "month_key",
      "new",
      "notice_context_id",
      "notice_epoch",
      "notice_id",
      "observed_at",
      "old",
      "outbox_id",
      "outcome",
      "owner_phone",
      "pause_revision",
      "paused",
      "paused_all",
      "peer_key",
      "peer_phone",
      "peer_revision",
      "pending_acceptance_event_id",
      "pending_accepted_at",
      "per_day",
      "per_minute",
      "period_end_at",
      "period_key",
      "provider_id",
      "purge_remaining",
      "purpose",
      "quota_day",
      "quota_month",
      "quota_state",
      "reason",
      "receipt_expires_at",
      "receipt_rows",
      "received_at",
      "reconcile_attempts",
      "reconcile_last_result",
      "reconcile_lease_until",
      "reconcile_next_at",
      "reconcile_state",
      "reconcile_token",
      "reconcile_updated_at",
      "recorded_at",
      "replay_floor_at",
      "reservation_id",
      "reserved",
      "reserved_bytes",
      "revision",
      "sarin_wa_admit",
      "sarin_wa_audio",
      "sarin_wa_audio_capacity",
      "sarin_wa_audio_capture",
      "sarin_wa_audio_delete",
      "sarin_wa_audio_immutable",
      "sarin_wa_audio_month",
      "sarin_wa_audio_quota",
      "sarin_wa_audit",
      "sarin_wa_capture",
      "sarin_wa_consent_proofs",
      "sarin_wa_context_invalidate",
      "sarin_wa_contexts",
      "sarin_wa_control_events",
      "sarin_wa_control_expiry",
      "sarin_wa_delivery_observations",
      "sarin_wa_delivery_targets",
      "sarin_wa_fixed_once",
      "sarin_wa_guard",
      "sarin_wa_handoff",
      "sarin_wa_handoff_dispatch",
      "sarin_wa_handoff_expiry",
      "sarin_wa_handoff_immutable",
      "sarin_wa_handoff_request",
      "sarin_wa_inbox",
      "sarin_wa_inbox_added",
      "sarin_wa_inbox_expiry",
      "sarin_wa_inbox_peer",
      "sarin_wa_inbox_removed",
      "sarin_wa_inference_reservations",
      "sarin_wa_job_transition",
      "sarin_wa_jobs",
      "sarin_wa_jobs_dispatch",
      "sarin_wa_jobs_expiry",
      "sarin_wa_one_owner",
      "sarin_wa_outbox",
      "sarin_wa_outbox_peer",
      "sarin_wa_outbox_reconcile",
      "sarin_wa_outbox_transition",
      "sarin_wa_peers",
      "sarin_wa_peers_expiry",
      "sarin_wa_pilot",
      "sarin_wa_proof_immutable",
      "sarin_wa_proof_sync",
      "sarin_wa_proofs_expiry",
      "sarin_wa_proofs_external",
      "sarin_wa_proofs_notice",
      "sarin_wa_proofs_provider",
      "sarin_wa_receipt_added",
      "sarin_wa_receipt_removed",
      "sarin_wa_receipts",
      "sarin_wa_receipts_expiry",
      "sarin_wa_receipts_global_rate",
      "sarin_wa_receipts_message",
      "sarin_wa_receipts_peer_rate",
      "sarin_wa_send_closures",
      "sarin_wa_send_month",
      "sarin_wa_send_quota",
      "sarin_wa_state",
      "sarin_wa_work_capture",
      "sarin_wa_work_guard",
      "scope",
      "sent_at",
      "started_at",
      "state",
      "status",
      "stored_bytes",
      "text",
      "to_hash",
      "token",
      "transcript",
      "version",
      "waba_hash",
      "waba_id",
      "wamid"
    ],
    "objects": [
      {
        "name": "sarin_wa_admit",
        "type": "trigger",
        "table": "sarin_wa_capture",
        "hash": "ad02bc5ab1080c1c0d0f59703023d44220cf8cfb64dd1441623218456879b2d0"
      },
      {
        "name": "sarin_wa_audio",
        "type": "table",
        "table": "sarin_wa_audio",
        "hash": "c14ff4754154cfb0470ebae0191257485dc62b7c82cdadf8917c08626e99a7e3"
      },
      {
        "name": "sarin_wa_audio_capacity",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "40ecfb0a934eb956e3a42fec68f45eecff1e7bb2211dacd6b0f95e996aa2b1d3"
      },
      {
        "name": "sarin_wa_audio_capture",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "4bbb4c3a13e5b0faeccd269bb8c3963bbbf5e18c75b9c881a3959dcb552d3fe7"
      },
      {
        "name": "sarin_wa_audio_delete",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "6e1a83123a8e317a273fcd41bdae207f7803707d6d1d220c23d627260c1cad53"
      },
      {
        "name": "sarin_wa_audio_immutable",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "8499c987debde3210fcfeca11ce855e53da53d8f355ebd1f6ea4f0b0c67adbe5"
      },
      {
        "name": "sarin_wa_audio_month",
        "type": "index",
        "table": "sarin_wa_audio_quota",
        "hash": "d34fc725870450b915a5e538ac0fa35a58747d10bb19391c2c6ac525c1dd215b"
      },
      {
        "name": "sarin_wa_audio_quota",
        "type": "table",
        "table": "sarin_wa_audio_quota",
        "hash": "d86fee423b6d73e7913164f5b52b634b184ff4c1a55ee900a18a8ae06195a072"
      },
      {
        "name": "sarin_wa_audit",
        "type": "table",
        "table": "sarin_wa_audit",
        "hash": "f5d810a8bf822af0224da4d9f2775cf9b715558f0fe208999133224cdb24eddb"
      },
      {
        "name": "sarin_wa_capture",
        "type": "view",
        "table": "sarin_wa_capture",
        "hash": "15990955dee31cd5316f5e9deae82cb986e0a3d70e1f0f78e251f22ccb3805b7"
      },
      {
        "name": "sarin_wa_consent_proofs",
        "type": "table",
        "table": "sarin_wa_consent_proofs",
        "hash": "58f4bb088501064474f828899f90e09159d09939443c6e1a2365616697867d4c"
      },
      {
        "name": "sarin_wa_context_invalidate",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "79adb966f951b332fc440b0113d7756ef2a9c6f20d3c1b2ff65996e84951c74b"
      },
      {
        "name": "sarin_wa_contexts",
        "type": "table",
        "table": "sarin_wa_contexts",
        "hash": "9e5edd0c93bdde10f2226fbc7a9f6186e2eff266a8239d326a46ff6549033902"
      },
      {
        "name": "sarin_wa_control_events",
        "type": "table",
        "table": "sarin_wa_control_events",
        "hash": "4a60f091bccb0dc73ab91b866646aa806c849a3b9c0b5f8fad3a9334e6308ba0"
      },
      {
        "name": "sarin_wa_control_expiry",
        "type": "index",
        "table": "sarin_wa_control_events",
        "hash": "9a13a112565a93670a9384c27b9fadb227724e4dc6af7aad0816153422e3c412"
      },
      {
        "name": "sarin_wa_delivery_observations",
        "type": "table",
        "table": "sarin_wa_delivery_observations",
        "hash": "b927730d6d8465a8b248821f7613aef42b3e37c424dbefeeb660b4c93b6a6644"
      },
      {
        "name": "sarin_wa_delivery_targets",
        "type": "view",
        "table": "sarin_wa_delivery_targets",
        "hash": "d06983e48ed1773266c23714dab39c57b61e56a49eec744eb85b5cb332084bbe"
      },
      {
        "name": "sarin_wa_fixed_once",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d384e3b458b997afad4683f728a087893dfc726e25e118710209bca2cb0d6ba3"
      },
      {
        "name": "sarin_wa_guard",
        "type": "trigger",
        "table": "sarin_wa_work_guard",
        "hash": "5f0f0f81013454410722d99c9ef9e279223dd6feb6bacd2917910efdd40b89be"
      },
      {
        "name": "sarin_wa_handoff",
        "type": "table",
        "table": "sarin_wa_handoff",
        "hash": "bc1d6054d979076abd947b5296a2eb22489c009060244a7f676bd7465944ef87"
      },
      {
        "name": "sarin_wa_handoff_dispatch",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "66cb80f278c560b06f25d318e17d782c3fcf7b37564515f754eb8d14648f1cc1"
      },
      {
        "name": "sarin_wa_handoff_expiry",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "dab305c7811b81d3eafc68a1ea5f7e1e2406f837e6abbab7861657e38728e097"
      },
      {
        "name": "sarin_wa_handoff_immutable",
        "type": "trigger",
        "table": "sarin_wa_handoff",
        "hash": "773a9176125bc8c61e1bf28a7f72a41ecf4d43d6895b5880459e5c4f97af0cea"
      },
      {
        "name": "sarin_wa_handoff_request",
        "type": "trigger",
        "table": "sarin_wa_control_events",
        "hash": "f87102e0ebb5b5f04ee33197a5c2985d64c29ecdfa5d430e5cd59844e420260c"
      },
      {
        "name": "sarin_wa_inbox",
        "type": "table",
        "table": "sarin_wa_inbox",
        "hash": "85062eb3d573cae2e07325bd4bed8ee6bb5a70edc8d0e0d77a6904714370db2c"
      },
      {
        "name": "sarin_wa_inbox_added",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "431645409d63f372dd9abc0cd0e8adbe3ddca14042881a425b5042dd510730f8"
      },
      {
        "name": "sarin_wa_inbox_expiry",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "bfeb395d689f5a43f8fe103e197ae92bf9b7c069005fac3293eb2078ce20717a"
      },
      {
        "name": "sarin_wa_inbox_peer",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "a713cb3d9be7072176150793bb1b6e149ddd259380483e8bc5c35ea358b2469d"
      },
      {
        "name": "sarin_wa_inbox_removed",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "bfa22657d1e1fcc0eca17d6c3ebc05e9160e98b027788c1245088e52f1c305f6"
      },
      {
        "name": "sarin_wa_inference_reservations",
        "type": "table",
        "table": "sarin_wa_inference_reservations",
        "hash": "0c8b9a182c9921c8cc55fde674e73682980612aa152324a83ced249570807226"
      },
      {
        "name": "sarin_wa_job_transition",
        "type": "trigger",
        "table": "sarin_wa_jobs",
        "hash": "288f4f13063e95e291b9dc27210f5c4fd1a5abcae7840c68355cda50e93bbcd7"
      },
      {
        "name": "sarin_wa_jobs",
        "type": "table",
        "table": "sarin_wa_jobs",
        "hash": "91b4800a604cc771e5fb8cd0859fc82962ec5e606f0cd6b5bbacf26d2d411753"
      },
      {
        "name": "sarin_wa_jobs_dispatch",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "74df902a7c2df67c952ca77c0375b81142c6e8ccf26520e97816150389dbf6a7"
      },
      {
        "name": "sarin_wa_jobs_expiry",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "da016c51398986285204961f4d25b20051bbb3a41ede3d5b89f65dd7513fc615"
      },
      {
        "name": "sarin_wa_one_owner",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "bf20091e9b99364cbe4038e2de8688aa444e97e94070e97f2683c7f63df2c850"
      },
      {
        "name": "sarin_wa_outbox",
        "type": "table",
        "table": "sarin_wa_outbox",
        "hash": "723ef90f165aa39097e38b1e95b348c47f860f3a5568aaf0ff722d55a5176d43"
      },
      {
        "name": "sarin_wa_outbox_peer",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d72585d9e514cd5284cac95548b86bd797db665bcbedbd657e073a22e2cf0620"
      },
      {
        "name": "sarin_wa_outbox_reconcile",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "6bc4123b51cceff6dac94fa098c41f7a7063c3720de29ffa81acb378f5a232e9"
      },
      {
        "name": "sarin_wa_outbox_transition",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "1b9643abaeeafa1834616dd0a0e8995b4d62b4f5f1b56f50bb9b79ff1e74b5f8"
      },
      {
        "name": "sarin_wa_peers",
        "type": "table",
        "table": "sarin_wa_peers",
        "hash": "d80177cf886578d2b89f5091cd21237de392cac56c31b6213fa98d3c4070be38"
      },
      {
        "name": "sarin_wa_peers_expiry",
        "type": "index",
        "table": "sarin_wa_peers",
        "hash": "2b8cba8a5290b4f4164e4fd586284b2520fd47f59a9037dfbbe1a9a6268c180a"
      },
      {
        "name": "sarin_wa_pilot",
        "type": "table",
        "table": "sarin_wa_pilot",
        "hash": "6ebb4baebaa45d0565518478db2c9c69edefdb0751da0c050e10848f7ceb00bd"
      },
      {
        "name": "sarin_wa_proof_immutable",
        "type": "trigger",
        "table": "sarin_wa_consent_proofs",
        "hash": "e5810c37d9837ab3faecfb3d617658c9879fa5f927847ccdc3cb0434eba757cf"
      },
      {
        "name": "sarin_wa_proof_sync",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "ac8231652a2e878d89b2fcba7e2e2fb35fd47f1d2ae2bbe612eb43e0c80f0b7a"
      },
      {
        "name": "sarin_wa_proofs_expiry",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "2920d0c05b581ca2dde6dac1313c6596f3d7e893878f11d8f16f4062e486d280"
      },
      {
        "name": "sarin_wa_proofs_external",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "69c5412c424aed51616f28a37e4fb0c1ad020c694f5fdf356e977634e2fb33e7"
      },
      {
        "name": "sarin_wa_proofs_notice",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "8ed704aa56160feee50fe97a3ac6b99978a830698f94eba3213a60e530dea0fd"
      },
      {
        "name": "sarin_wa_proofs_provider",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "6021f60c91f77aab8e25509972b81c3e49db1ef858596e71a2b36b60c047b1ff"
      },
      {
        "name": "sarin_wa_receipt_added",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "761a58bd9b62269a33acb3cb20e7cd6ebc213a299347fc66d4487cdbac3eb067"
      },
      {
        "name": "sarin_wa_receipt_removed",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "2b6351b06df7a0255a50cc1f6fa47bf4906a9dbb0521c1bcdcc0be7067bd5120"
      },
      {
        "name": "sarin_wa_receipts",
        "type": "table",
        "table": "sarin_wa_receipts",
        "hash": "f53c4ef5c492b865732a2edf202517bb997a616e9194a5881e172d2d37135217"
      },
      {
        "name": "sarin_wa_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b3cc7f89498ec9e328dada83bb0c9b2dde998a09c028cac15c5d1ce092c8737d"
      },
      {
        "name": "sarin_wa_receipts_global_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b62914887705e521f4dc94e9425c604ba56272609e837ffab0e0643944d5fd13"
      },
      {
        "name": "sarin_wa_receipts_message",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "7f5b4a2fc05a238a138fc6496250924904283f6574e3df40d5c366f5afac4a19"
      },
      {
        "name": "sarin_wa_receipts_peer_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b30385715fb946a3e7fb52abd8853f8012241832ae68e831fd51143d282346c5"
      },
      {
        "name": "sarin_wa_send_closures",
        "type": "table",
        "table": "sarin_wa_send_closures",
        "hash": "a85e29fefcde16f266cd527efa6fdae328a13bdae8a1f582de8ee53a8055df5d"
      },
      {
        "name": "sarin_wa_send_month",
        "type": "index",
        "table": "sarin_wa_send_quota",
        "hash": "a353a52c613524c0562a6b7f90c8ee536a921ed060cfaefc4b3a727216803c2a"
      },
      {
        "name": "sarin_wa_send_quota",
        "type": "table",
        "table": "sarin_wa_send_quota",
        "hash": "9faa550d8417da0fdbdedce7ff615683fefbd3b85df54225b83ac106493ce14f"
      },
      {
        "name": "sarin_wa_state",
        "type": "table",
        "table": "sarin_wa_state",
        "hash": "ec2dfba9b5cfe6531cb9a28736dbfde9f18a31d0bff4e6d6e1ffad4414bf4016"
      },
      {
        "name": "sarin_wa_work_capture",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "a8acc5816a08db47c44936b2bf74409d66e69da072cd04f7101fcb7850a7c679"
      },
      {
        "name": "sarin_wa_work_guard",
        "type": "view",
        "table": "sarin_wa_work_guard",
        "hash": "e4d7740a70a1f449eac62a3481e36bbcb36120f4ab37648d4b9fcca2085de814"
      }
    ]
  },
  "0008": {
    "identifiers": [
      "acceptance_event_id",
      "accepted_at",
      "action",
      "activation_at",
      "actor",
      "admission_token",
      "alert_id",
      "applied",
      "at",
      "attached_at",
      "audit_id",
      "business_phone",
      "canonical_event_id",
      "classification",
      "closed_at",
      "code",
      "conflict",
      "consent_expires_at",
      "consent_hash",
      "consent_notice_id",
      "consent_version",
      "consumed",
      "content_bytes",
      "context_id",
      "created_at",
      "day_key",
      "day_start",
      "deferred_reason",
      "delivered_at",
      "descriptor",
      "duration_seconds",
      "enabled",
      "epoch",
      "event_hash",
      "event_id",
      "expires_at",
      "external_id",
      "finished_at",
      "from_hash",
      "full_name",
      "global_day",
      "global_minute",
      "hash",
      "id",
      "inbox_rows",
      "inference_started_at",
      "input_kind",
      "job_id",
      "kind",
      "last_human_at",
      "last_inbound_at",
      "last_purge_at",
      "lease_until",
      "max_bytes",
      "max_inbox",
      "max_peers",
      "max_receipts",
      "media_type",
      "message_hash",
      "message_id",
      "message_key",
      "minute_start",
      "mode",
      "month_key",
      "new",
      "notice_context_id",
      "notice_epoch",
      "notice_id",
      "observed_at",
      "old",
      "outbox_id",
      "outcome",
      "owner_phone",
      "pause_revision",
      "paused",
      "paused_all",
      "peer_key",
      "peer_phone",
      "peer_revision",
      "pending_acceptance_event_id",
      "pending_accepted_at",
      "per_day",
      "per_minute",
      "period_end_at",
      "period_key",
      "provider_id",
      "purge_remaining",
      "purpose",
      "quota_day",
      "quota_month",
      "quota_state",
      "reason",
      "receipt_expires_at",
      "receipt_rows",
      "received_at",
      "reconcile_attempts",
      "reconcile_last_result",
      "reconcile_lease_until",
      "reconcile_next_at",
      "reconcile_state",
      "reconcile_token",
      "reconcile_updated_at",
      "recorded_at",
      "replay_floor_at",
      "reservation_id",
      "reserved",
      "reserved_bytes",
      "revision",
      "sarin_wa_admit",
      "sarin_wa_audio",
      "sarin_wa_audio_capacity",
      "sarin_wa_audio_capture",
      "sarin_wa_audio_delete",
      "sarin_wa_audio_immutable",
      "sarin_wa_audio_month",
      "sarin_wa_audio_quota",
      "sarin_wa_audit",
      "sarin_wa_capture",
      "sarin_wa_consent_proofs",
      "sarin_wa_context_invalidate",
      "sarin_wa_contexts",
      "sarin_wa_control_events",
      "sarin_wa_control_expiry",
      "sarin_wa_delivery_observations",
      "sarin_wa_delivery_targets",
      "sarin_wa_fixed_once",
      "sarin_wa_guard",
      "sarin_wa_handoff",
      "sarin_wa_handoff_dispatch",
      "sarin_wa_handoff_expiry",
      "sarin_wa_handoff_immutable",
      "sarin_wa_handoff_request",
      "sarin_wa_inbox",
      "sarin_wa_inbox_added",
      "sarin_wa_inbox_expiry",
      "sarin_wa_inbox_peer",
      "sarin_wa_inbox_removed",
      "sarin_wa_inference_reservations",
      "sarin_wa_job_transition",
      "sarin_wa_jobs",
      "sarin_wa_jobs_dispatch",
      "sarin_wa_jobs_expiry",
      "sarin_wa_one_owner",
      "sarin_wa_outbox",
      "sarin_wa_outbox_peer",
      "sarin_wa_outbox_reconcile",
      "sarin_wa_outbox_transition",
      "sarin_wa_peers",
      "sarin_wa_peers_expiry",
      "sarin_wa_pilot",
      "sarin_wa_profile_capacity",
      "sarin_wa_profile_context_delete",
      "sarin_wa_profile_expiry",
      "sarin_wa_profile_inbox_delete",
      "sarin_wa_profile_validate_insert",
      "sarin_wa_profile_validate_update",
      "sarin_wa_profiles",
      "sarin_wa_proof_immutable",
      "sarin_wa_proof_sync",
      "sarin_wa_proofs_expiry",
      "sarin_wa_proofs_external",
      "sarin_wa_proofs_notice",
      "sarin_wa_proofs_provider",
      "sarin_wa_receipt_added",
      "sarin_wa_receipt_removed",
      "sarin_wa_receipts",
      "sarin_wa_receipts_expiry",
      "sarin_wa_receipts_global_rate",
      "sarin_wa_receipts_message",
      "sarin_wa_receipts_peer_rate",
      "sarin_wa_send_closures",
      "sarin_wa_send_month",
      "sarin_wa_send_quota",
      "sarin_wa_state",
      "sarin_wa_work_capture",
      "sarin_wa_work_guard",
      "scope",
      "sent_at",
      "source_event_id",
      "started_at",
      "state",
      "status",
      "stored_bytes",
      "text",
      "to_hash",
      "token",
      "transcript",
      "version",
      "waba_hash",
      "waba_id",
      "wamid"
    ],
    "objects": [
      {
        "name": "sarin_wa_admit",
        "type": "trigger",
        "table": "sarin_wa_capture",
        "hash": "ad02bc5ab1080c1c0d0f59703023d44220cf8cfb64dd1441623218456879b2d0"
      },
      {
        "name": "sarin_wa_audio",
        "type": "table",
        "table": "sarin_wa_audio",
        "hash": "c14ff4754154cfb0470ebae0191257485dc62b7c82cdadf8917c08626e99a7e3"
      },
      {
        "name": "sarin_wa_audio_capacity",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "40ecfb0a934eb956e3a42fec68f45eecff1e7bb2211dacd6b0f95e996aa2b1d3"
      },
      {
        "name": "sarin_wa_audio_capture",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "4bbb4c3a13e5b0faeccd269bb8c3963bbbf5e18c75b9c881a3959dcb552d3fe7"
      },
      {
        "name": "sarin_wa_audio_delete",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "6e1a83123a8e317a273fcd41bdae207f7803707d6d1d220c23d627260c1cad53"
      },
      {
        "name": "sarin_wa_audio_immutable",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "8499c987debde3210fcfeca11ce855e53da53d8f355ebd1f6ea4f0b0c67adbe5"
      },
      {
        "name": "sarin_wa_audio_month",
        "type": "index",
        "table": "sarin_wa_audio_quota",
        "hash": "d34fc725870450b915a5e538ac0fa35a58747d10bb19391c2c6ac525c1dd215b"
      },
      {
        "name": "sarin_wa_audio_quota",
        "type": "table",
        "table": "sarin_wa_audio_quota",
        "hash": "d86fee423b6d73e7913164f5b52b634b184ff4c1a55ee900a18a8ae06195a072"
      },
      {
        "name": "sarin_wa_audit",
        "type": "table",
        "table": "sarin_wa_audit",
        "hash": "f5d810a8bf822af0224da4d9f2775cf9b715558f0fe208999133224cdb24eddb"
      },
      {
        "name": "sarin_wa_capture",
        "type": "view",
        "table": "sarin_wa_capture",
        "hash": "15990955dee31cd5316f5e9deae82cb986e0a3d70e1f0f78e251f22ccb3805b7"
      },
      {
        "name": "sarin_wa_consent_proofs",
        "type": "table",
        "table": "sarin_wa_consent_proofs",
        "hash": "58f4bb088501064474f828899f90e09159d09939443c6e1a2365616697867d4c"
      },
      {
        "name": "sarin_wa_context_invalidate",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "79adb966f951b332fc440b0113d7756ef2a9c6f20d3c1b2ff65996e84951c74b"
      },
      {
        "name": "sarin_wa_contexts",
        "type": "table",
        "table": "sarin_wa_contexts",
        "hash": "9e5edd0c93bdde10f2226fbc7a9f6186e2eff266a8239d326a46ff6549033902"
      },
      {
        "name": "sarin_wa_control_events",
        "type": "table",
        "table": "sarin_wa_control_events",
        "hash": "4a60f091bccb0dc73ab91b866646aa806c849a3b9c0b5f8fad3a9334e6308ba0"
      },
      {
        "name": "sarin_wa_control_expiry",
        "type": "index",
        "table": "sarin_wa_control_events",
        "hash": "9a13a112565a93670a9384c27b9fadb227724e4dc6af7aad0816153422e3c412"
      },
      {
        "name": "sarin_wa_delivery_observations",
        "type": "table",
        "table": "sarin_wa_delivery_observations",
        "hash": "b927730d6d8465a8b248821f7613aef42b3e37c424dbefeeb660b4c93b6a6644"
      },
      {
        "name": "sarin_wa_delivery_targets",
        "type": "view",
        "table": "sarin_wa_delivery_targets",
        "hash": "d06983e48ed1773266c23714dab39c57b61e56a49eec744eb85b5cb332084bbe"
      },
      {
        "name": "sarin_wa_fixed_once",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d384e3b458b997afad4683f728a087893dfc726e25e118710209bca2cb0d6ba3"
      },
      {
        "name": "sarin_wa_guard",
        "type": "trigger",
        "table": "sarin_wa_work_guard",
        "hash": "5f0f0f81013454410722d99c9ef9e279223dd6feb6bacd2917910efdd40b89be"
      },
      {
        "name": "sarin_wa_handoff",
        "type": "table",
        "table": "sarin_wa_handoff",
        "hash": "bc1d6054d979076abd947b5296a2eb22489c009060244a7f676bd7465944ef87"
      },
      {
        "name": "sarin_wa_handoff_dispatch",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "66cb80f278c560b06f25d318e17d782c3fcf7b37564515f754eb8d14648f1cc1"
      },
      {
        "name": "sarin_wa_handoff_expiry",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "dab305c7811b81d3eafc68a1ea5f7e1e2406f837e6abbab7861657e38728e097"
      },
      {
        "name": "sarin_wa_handoff_immutable",
        "type": "trigger",
        "table": "sarin_wa_handoff",
        "hash": "773a9176125bc8c61e1bf28a7f72a41ecf4d43d6895b5880459e5c4f97af0cea"
      },
      {
        "name": "sarin_wa_handoff_request",
        "type": "trigger",
        "table": "sarin_wa_control_events",
        "hash": "f87102e0ebb5b5f04ee33197a5c2985d64c29ecdfa5d430e5cd59844e420260c"
      },
      {
        "name": "sarin_wa_inbox",
        "type": "table",
        "table": "sarin_wa_inbox",
        "hash": "85062eb3d573cae2e07325bd4bed8ee6bb5a70edc8d0e0d77a6904714370db2c"
      },
      {
        "name": "sarin_wa_inbox_added",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "431645409d63f372dd9abc0cd0e8adbe3ddca14042881a425b5042dd510730f8"
      },
      {
        "name": "sarin_wa_inbox_expiry",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "bfeb395d689f5a43f8fe103e197ae92bf9b7c069005fac3293eb2078ce20717a"
      },
      {
        "name": "sarin_wa_inbox_peer",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "a713cb3d9be7072176150793bb1b6e149ddd259380483e8bc5c35ea358b2469d"
      },
      {
        "name": "sarin_wa_inbox_removed",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "bfa22657d1e1fcc0eca17d6c3ebc05e9160e98b027788c1245088e52f1c305f6"
      },
      {
        "name": "sarin_wa_inference_reservations",
        "type": "table",
        "table": "sarin_wa_inference_reservations",
        "hash": "0c8b9a182c9921c8cc55fde674e73682980612aa152324a83ced249570807226"
      },
      {
        "name": "sarin_wa_job_transition",
        "type": "trigger",
        "table": "sarin_wa_jobs",
        "hash": "288f4f13063e95e291b9dc27210f5c4fd1a5abcae7840c68355cda50e93bbcd7"
      },
      {
        "name": "sarin_wa_jobs",
        "type": "table",
        "table": "sarin_wa_jobs",
        "hash": "91b4800a604cc771e5fb8cd0859fc82962ec5e606f0cd6b5bbacf26d2d411753"
      },
      {
        "name": "sarin_wa_jobs_dispatch",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "74df902a7c2df67c952ca77c0375b81142c6e8ccf26520e97816150389dbf6a7"
      },
      {
        "name": "sarin_wa_jobs_expiry",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "da016c51398986285204961f4d25b20051bbb3a41ede3d5b89f65dd7513fc615"
      },
      {
        "name": "sarin_wa_one_owner",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "bf20091e9b99364cbe4038e2de8688aa444e97e94070e97f2683c7f63df2c850"
      },
      {
        "name": "sarin_wa_outbox",
        "type": "table",
        "table": "sarin_wa_outbox",
        "hash": "723ef90f165aa39097e38b1e95b348c47f860f3a5568aaf0ff722d55a5176d43"
      },
      {
        "name": "sarin_wa_outbox_peer",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d72585d9e514cd5284cac95548b86bd797db665bcbedbd657e073a22e2cf0620"
      },
      {
        "name": "sarin_wa_outbox_reconcile",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "6bc4123b51cceff6dac94fa098c41f7a7063c3720de29ffa81acb378f5a232e9"
      },
      {
        "name": "sarin_wa_outbox_transition",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "1b9643abaeeafa1834616dd0a0e8995b4d62b4f5f1b56f50bb9b79ff1e74b5f8"
      },
      {
        "name": "sarin_wa_peers",
        "type": "table",
        "table": "sarin_wa_peers",
        "hash": "d80177cf886578d2b89f5091cd21237de392cac56c31b6213fa98d3c4070be38"
      },
      {
        "name": "sarin_wa_peers_expiry",
        "type": "index",
        "table": "sarin_wa_peers",
        "hash": "2b8cba8a5290b4f4164e4fd586284b2520fd47f59a9037dfbbe1a9a6268c180a"
      },
      {
        "name": "sarin_wa_pilot",
        "type": "table",
        "table": "sarin_wa_pilot",
        "hash": "6ebb4baebaa45d0565518478db2c9c69edefdb0751da0c050e10848f7ceb00bd"
      },
      {
        "name": "sarin_wa_profile_capacity",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "90fcfba9744fa7d1d3e8b3643e6893a759151842b00c374977bb73d8fb96f3b4"
      },
      {
        "name": "sarin_wa_profile_context_delete",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "f2f5a51996ce44e963caa310528d6af2b121522f802d9d348b7178421f76a867"
      },
      {
        "name": "sarin_wa_profile_expiry",
        "type": "index",
        "table": "sarin_wa_profiles",
        "hash": "3d0f2d4b052a0d99ed8023a37fd007b832bb11a18f246beaf39d72c74eaeac01"
      },
      {
        "name": "sarin_wa_profile_inbox_delete",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "10c38cfe983d706748319cfa5031cc76974dc62b839ab1d5a687c547797c42c5"
      },
      {
        "name": "sarin_wa_profile_validate_insert",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "0dac840a27e1b98c5dfcba069ab3acef6260ef785af4e44cc6c91c6dc896c75d"
      },
      {
        "name": "sarin_wa_profile_validate_update",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "d2fedf1885da35cfec02b70cf3fa94c4c85cc144a90b937055af5f7bca2ccc2c"
      },
      {
        "name": "sarin_wa_profiles",
        "type": "table",
        "table": "sarin_wa_profiles",
        "hash": "88303ac38cd79bc6fc2bb0f3cb4797b05fe28a5fd77a84d69ab7bc3b0622b054"
      },
      {
        "name": "sarin_wa_proof_immutable",
        "type": "trigger",
        "table": "sarin_wa_consent_proofs",
        "hash": "e5810c37d9837ab3faecfb3d617658c9879fa5f927847ccdc3cb0434eba757cf"
      },
      {
        "name": "sarin_wa_proof_sync",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "ac8231652a2e878d89b2fcba7e2e2fb35fd47f1d2ae2bbe612eb43e0c80f0b7a"
      },
      {
        "name": "sarin_wa_proofs_expiry",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "2920d0c05b581ca2dde6dac1313c6596f3d7e893878f11d8f16f4062e486d280"
      },
      {
        "name": "sarin_wa_proofs_external",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "69c5412c424aed51616f28a37e4fb0c1ad020c694f5fdf356e977634e2fb33e7"
      },
      {
        "name": "sarin_wa_proofs_notice",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "8ed704aa56160feee50fe97a3ac6b99978a830698f94eba3213a60e530dea0fd"
      },
      {
        "name": "sarin_wa_proofs_provider",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "6021f60c91f77aab8e25509972b81c3e49db1ef858596e71a2b36b60c047b1ff"
      },
      {
        "name": "sarin_wa_receipt_added",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "761a58bd9b62269a33acb3cb20e7cd6ebc213a299347fc66d4487cdbac3eb067"
      },
      {
        "name": "sarin_wa_receipt_removed",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "2b6351b06df7a0255a50cc1f6fa47bf4906a9dbb0521c1bcdcc0be7067bd5120"
      },
      {
        "name": "sarin_wa_receipts",
        "type": "table",
        "table": "sarin_wa_receipts",
        "hash": "f53c4ef5c492b865732a2edf202517bb997a616e9194a5881e172d2d37135217"
      },
      {
        "name": "sarin_wa_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b3cc7f89498ec9e328dada83bb0c9b2dde998a09c028cac15c5d1ce092c8737d"
      },
      {
        "name": "sarin_wa_receipts_global_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b62914887705e521f4dc94e9425c604ba56272609e837ffab0e0643944d5fd13"
      },
      {
        "name": "sarin_wa_receipts_message",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "7f5b4a2fc05a238a138fc6496250924904283f6574e3df40d5c366f5afac4a19"
      },
      {
        "name": "sarin_wa_receipts_peer_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b30385715fb946a3e7fb52abd8853f8012241832ae68e831fd51143d282346c5"
      },
      {
        "name": "sarin_wa_send_closures",
        "type": "table",
        "table": "sarin_wa_send_closures",
        "hash": "a85e29fefcde16f266cd527efa6fdae328a13bdae8a1f582de8ee53a8055df5d"
      },
      {
        "name": "sarin_wa_send_month",
        "type": "index",
        "table": "sarin_wa_send_quota",
        "hash": "a353a52c613524c0562a6b7f90c8ee536a921ed060cfaefc4b3a727216803c2a"
      },
      {
        "name": "sarin_wa_send_quota",
        "type": "table",
        "table": "sarin_wa_send_quota",
        "hash": "9faa550d8417da0fdbdedce7ff615683fefbd3b85df54225b83ac106493ce14f"
      },
      {
        "name": "sarin_wa_state",
        "type": "table",
        "table": "sarin_wa_state",
        "hash": "ec2dfba9b5cfe6531cb9a28736dbfde9f18a31d0bff4e6d6e1ffad4414bf4016"
      },
      {
        "name": "sarin_wa_work_capture",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "a8acc5816a08db47c44936b2bf74409d66e69da072cd04f7101fcb7850a7c679"
      },
      {
        "name": "sarin_wa_work_guard",
        "type": "view",
        "table": "sarin_wa_work_guard",
        "hash": "e4d7740a70a1f449eac62a3481e36bbcb36120f4ab37648d4b9fcca2085de814"
      }
    ]
  },
  "0009": {
    "identifiers": [
      "acceptance_event_id",
      "accepted_at",
      "action",
      "activation_at",
      "actor",
      "admission_token",
      "alert_id",
      "amount_micros",
      "applied",
      "at",
      "attached_at",
      "audit_id",
      "business_phone",
      "canonical_event_id",
      "category",
      "classification",
      "closed_at",
      "code",
      "conflict",
      "consent_expires_at",
      "consent_hash",
      "consent_notice_id",
      "consent_version",
      "consumed",
      "content_bytes",
      "context_id",
      "coverage_start",
      "created_at",
      "currency",
      "day_key",
      "day_start",
      "deferred_reason",
      "delivered_at",
      "descriptor",
      "duration_seconds",
      "enabled",
      "epoch",
      "event_hash",
      "event_id",
      "expires_at",
      "external_id",
      "finished_at",
      "first_seen",
      "from_hash",
      "full_name",
      "global_day",
      "global_minute",
      "hash",
      "id",
      "inbox_rows",
      "inference_started_at",
      "input_kind",
      "job_id",
      "kind",
      "last_human_at",
      "last_inbound_at",
      "last_purge_at",
      "last_seen",
      "lease_until",
      "lookup_count",
      "lookup_minute",
      "max_bytes",
      "max_inbox",
      "max_peers",
      "max_receipts",
      "media_type",
      "message_hash",
      "message_id",
      "message_key",
      "minute_start",
      "mode",
      "month_key",
      "new",
      "notice_context_id",
      "notice_epoch",
      "notice_id",
      "observed_at",
      "old",
      "outbox_id",
      "outcome",
      "owner_phone",
      "pause_revision",
      "paused",
      "paused_all",
      "peer_key",
      "peer_phone",
      "peer_revision",
      "pending_acceptance_event_id",
      "pending_accepted_at",
      "per_day",
      "per_minute",
      "period_end_at",
      "period_key",
      "pricing_type",
      "provider_id",
      "purge_remaining",
      "purpose",
      "quality",
      "quota_day",
      "quota_month",
      "quota_state",
      "reason",
      "receipt_expires_at",
      "receipt_key",
      "receipt_rows",
      "received_at",
      "reconcile_attempts",
      "reconcile_last_result",
      "reconcile_lease_until",
      "reconcile_next_at",
      "reconcile_state",
      "reconcile_token",
      "reconcile_updated_at",
      "recorded_at",
      "replay_floor_at",
      "reservation_id",
      "reserved",
      "reserved_bytes",
      "revision",
      "sarin_wa_admit",
      "sarin_wa_audio",
      "sarin_wa_audio_capacity",
      "sarin_wa_audio_capture",
      "sarin_wa_audio_delete",
      "sarin_wa_audio_immutable",
      "sarin_wa_audio_month",
      "sarin_wa_audio_quota",
      "sarin_wa_audit",
      "sarin_wa_billing_receipts",
      "sarin_wa_billing_receipts_cap",
      "sarin_wa_billing_receipts_delete",
      "sarin_wa_billing_receipts_expiry",
      "sarin_wa_billing_receipts_identity",
      "sarin_wa_billing_receipts_insert",
      "sarin_wa_billing_receipts_month",
      "sarin_wa_billing_receipts_quality",
      "sarin_wa_billing_receipts_scope",
      "sarin_wa_billing_scopes",
      "sarin_wa_billing_scopes_cap",
      "sarin_wa_billing_scopes_identity",
      "sarin_wa_capture",
      "sarin_wa_consent_proofs",
      "sarin_wa_context_invalidate",
      "sarin_wa_contexts",
      "sarin_wa_control_events",
      "sarin_wa_control_expiry",
      "sarin_wa_delivery_observations",
      "sarin_wa_delivery_targets",
      "sarin_wa_fixed_once",
      "sarin_wa_guard",
      "sarin_wa_handoff",
      "sarin_wa_handoff_dispatch",
      "sarin_wa_handoff_expiry",
      "sarin_wa_handoff_immutable",
      "sarin_wa_handoff_request",
      "sarin_wa_inbox",
      "sarin_wa_inbox_added",
      "sarin_wa_inbox_expiry",
      "sarin_wa_inbox_peer",
      "sarin_wa_inbox_removed",
      "sarin_wa_inference_reservations",
      "sarin_wa_job_transition",
      "sarin_wa_jobs",
      "sarin_wa_jobs_dispatch",
      "sarin_wa_jobs_expiry",
      "sarin_wa_one_owner",
      "sarin_wa_outbox",
      "sarin_wa_outbox_peer",
      "sarin_wa_outbox_reconcile",
      "sarin_wa_outbox_transition",
      "sarin_wa_peers",
      "sarin_wa_peers_expiry",
      "sarin_wa_pilot",
      "sarin_wa_profile_capacity",
      "sarin_wa_profile_context_delete",
      "sarin_wa_profile_expiry",
      "sarin_wa_profile_inbox_delete",
      "sarin_wa_profile_validate_insert",
      "sarin_wa_profile_validate_update",
      "sarin_wa_profiles",
      "sarin_wa_proof_immutable",
      "sarin_wa_proof_sync",
      "sarin_wa_proofs_expiry",
      "sarin_wa_proofs_external",
      "sarin_wa_proofs_notice",
      "sarin_wa_proofs_provider",
      "sarin_wa_receipt_added",
      "sarin_wa_receipt_removed",
      "sarin_wa_receipts",
      "sarin_wa_receipts_expiry",
      "sarin_wa_receipts_global_rate",
      "sarin_wa_receipts_message",
      "sarin_wa_receipts_peer_rate",
      "sarin_wa_send_closures",
      "sarin_wa_send_month",
      "sarin_wa_send_quota",
      "sarin_wa_state",
      "sarin_wa_work_capture",
      "sarin_wa_work_guard",
      "scope",
      "scope_key",
      "sent_at",
      "source_event_id",
      "started_at",
      "state",
      "status",
      "storage_limited",
      "stored_bytes",
      "text",
      "to_hash",
      "token",
      "transcript",
      "version",
      "waba_hash",
      "waba_id",
      "wamid"
    ],
    "objects": [
      {
        "name": "sarin_wa_admit",
        "type": "trigger",
        "table": "sarin_wa_capture",
        "hash": "ad02bc5ab1080c1c0d0f59703023d44220cf8cfb64dd1441623218456879b2d0"
      },
      {
        "name": "sarin_wa_audio",
        "type": "table",
        "table": "sarin_wa_audio",
        "hash": "c14ff4754154cfb0470ebae0191257485dc62b7c82cdadf8917c08626e99a7e3"
      },
      {
        "name": "sarin_wa_audio_capacity",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "40ecfb0a934eb956e3a42fec68f45eecff1e7bb2211dacd6b0f95e996aa2b1d3"
      },
      {
        "name": "sarin_wa_audio_capture",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "4bbb4c3a13e5b0faeccd269bb8c3963bbbf5e18c75b9c881a3959dcb552d3fe7"
      },
      {
        "name": "sarin_wa_audio_delete",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "6e1a83123a8e317a273fcd41bdae207f7803707d6d1d220c23d627260c1cad53"
      },
      {
        "name": "sarin_wa_audio_immutable",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "8499c987debde3210fcfeca11ce855e53da53d8f355ebd1f6ea4f0b0c67adbe5"
      },
      {
        "name": "sarin_wa_audio_month",
        "type": "index",
        "table": "sarin_wa_audio_quota",
        "hash": "d34fc725870450b915a5e538ac0fa35a58747d10bb19391c2c6ac525c1dd215b"
      },
      {
        "name": "sarin_wa_audio_quota",
        "type": "table",
        "table": "sarin_wa_audio_quota",
        "hash": "d86fee423b6d73e7913164f5b52b634b184ff4c1a55ee900a18a8ae06195a072"
      },
      {
        "name": "sarin_wa_audit",
        "type": "table",
        "table": "sarin_wa_audit",
        "hash": "f5d810a8bf822af0224da4d9f2775cf9b715558f0fe208999133224cdb24eddb"
      },
      {
        "name": "sarin_wa_billing_receipts",
        "type": "table",
        "table": "sarin_wa_billing_receipts",
        "hash": "35e75bd2bc90df2dcdff3def1c78e1833b3713478d3c36468f5ae99991e88f75"
      },
      {
        "name": "sarin_wa_billing_receipts_cap",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "d2d1e5e0bb6d906017467449e68ad5e877c7c21eec5807d40989b7c0db7401a8"
      },
      {
        "name": "sarin_wa_billing_receipts_delete",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "8869f29c9f5c89172286b5eeea15ebd2df8083f4866498021f43b0efd93ad751"
      },
      {
        "name": "sarin_wa_billing_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_billing_receipts",
        "hash": "59c533df17449ba01e6cfc6785bc91991d3089beb21d59de45cb78cce547516b"
      },
      {
        "name": "sarin_wa_billing_receipts_identity",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "c1b2056236207541875cb23388a993d9396b726a1b3a72b8a9cfb06cd0b89be6"
      },
      {
        "name": "sarin_wa_billing_receipts_insert",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "be5438ccccd2d2ca811d3145bf1a94138cd49063080c2206ffcf52435186728a"
      },
      {
        "name": "sarin_wa_billing_receipts_month",
        "type": "index",
        "table": "sarin_wa_billing_receipts",
        "hash": "ec479b8ebb084603eba75b9779d24151b22236baccd5a658c209fe30e7b99eda"
      },
      {
        "name": "sarin_wa_billing_receipts_quality",
        "type": "index",
        "table": "sarin_wa_billing_receipts",
        "hash": "e3039e05c67b44d92a8b883be4a2bc697ef46d1fc4d4d33826706cc52a3c77b8"
      },
      {
        "name": "sarin_wa_billing_receipts_scope",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "44932880d6316439f5e896665692222dca856754520fcd2d39a9f94d65471de6"
      },
      {
        "name": "sarin_wa_billing_scopes",
        "type": "table",
        "table": "sarin_wa_billing_scopes",
        "hash": "8e6b62ec7aeaab1d909e41d47f15706d8b83db889e225f8a745fadeff244deb0"
      },
      {
        "name": "sarin_wa_billing_scopes_cap",
        "type": "trigger",
        "table": "sarin_wa_billing_scopes",
        "hash": "63671845e04d2e2c998a711341c8ef3aab299f061e780814fd841fd065f5b3c4"
      },
      {
        "name": "sarin_wa_billing_scopes_identity",
        "type": "trigger",
        "table": "sarin_wa_billing_scopes",
        "hash": "a78b16b28ba368c30da8f6f1e5cd123c2d794c5f52939e2d84df9236a87b09fb"
      },
      {
        "name": "sarin_wa_capture",
        "type": "view",
        "table": "sarin_wa_capture",
        "hash": "15990955dee31cd5316f5e9deae82cb986e0a3d70e1f0f78e251f22ccb3805b7"
      },
      {
        "name": "sarin_wa_consent_proofs",
        "type": "table",
        "table": "sarin_wa_consent_proofs",
        "hash": "58f4bb088501064474f828899f90e09159d09939443c6e1a2365616697867d4c"
      },
      {
        "name": "sarin_wa_context_invalidate",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "79adb966f951b332fc440b0113d7756ef2a9c6f20d3c1b2ff65996e84951c74b"
      },
      {
        "name": "sarin_wa_contexts",
        "type": "table",
        "table": "sarin_wa_contexts",
        "hash": "9e5edd0c93bdde10f2226fbc7a9f6186e2eff266a8239d326a46ff6549033902"
      },
      {
        "name": "sarin_wa_control_events",
        "type": "table",
        "table": "sarin_wa_control_events",
        "hash": "4a60f091bccb0dc73ab91b866646aa806c849a3b9c0b5f8fad3a9334e6308ba0"
      },
      {
        "name": "sarin_wa_control_expiry",
        "type": "index",
        "table": "sarin_wa_control_events",
        "hash": "9a13a112565a93670a9384c27b9fadb227724e4dc6af7aad0816153422e3c412"
      },
      {
        "name": "sarin_wa_delivery_observations",
        "type": "table",
        "table": "sarin_wa_delivery_observations",
        "hash": "b927730d6d8465a8b248821f7613aef42b3e37c424dbefeeb660b4c93b6a6644"
      },
      {
        "name": "sarin_wa_delivery_targets",
        "type": "view",
        "table": "sarin_wa_delivery_targets",
        "hash": "d06983e48ed1773266c23714dab39c57b61e56a49eec744eb85b5cb332084bbe"
      },
      {
        "name": "sarin_wa_fixed_once",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d384e3b458b997afad4683f728a087893dfc726e25e118710209bca2cb0d6ba3"
      },
      {
        "name": "sarin_wa_guard",
        "type": "trigger",
        "table": "sarin_wa_work_guard",
        "hash": "5f0f0f81013454410722d99c9ef9e279223dd6feb6bacd2917910efdd40b89be"
      },
      {
        "name": "sarin_wa_handoff",
        "type": "table",
        "table": "sarin_wa_handoff",
        "hash": "bc1d6054d979076abd947b5296a2eb22489c009060244a7f676bd7465944ef87"
      },
      {
        "name": "sarin_wa_handoff_dispatch",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "66cb80f278c560b06f25d318e17d782c3fcf7b37564515f754eb8d14648f1cc1"
      },
      {
        "name": "sarin_wa_handoff_expiry",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "dab305c7811b81d3eafc68a1ea5f7e1e2406f837e6abbab7861657e38728e097"
      },
      {
        "name": "sarin_wa_handoff_immutable",
        "type": "trigger",
        "table": "sarin_wa_handoff",
        "hash": "773a9176125bc8c61e1bf28a7f72a41ecf4d43d6895b5880459e5c4f97af0cea"
      },
      {
        "name": "sarin_wa_handoff_request",
        "type": "trigger",
        "table": "sarin_wa_control_events",
        "hash": "f87102e0ebb5b5f04ee33197a5c2985d64c29ecdfa5d430e5cd59844e420260c"
      },
      {
        "name": "sarin_wa_inbox",
        "type": "table",
        "table": "sarin_wa_inbox",
        "hash": "85062eb3d573cae2e07325bd4bed8ee6bb5a70edc8d0e0d77a6904714370db2c"
      },
      {
        "name": "sarin_wa_inbox_added",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "431645409d63f372dd9abc0cd0e8adbe3ddca14042881a425b5042dd510730f8"
      },
      {
        "name": "sarin_wa_inbox_expiry",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "bfeb395d689f5a43f8fe103e197ae92bf9b7c069005fac3293eb2078ce20717a"
      },
      {
        "name": "sarin_wa_inbox_peer",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "a713cb3d9be7072176150793bb1b6e149ddd259380483e8bc5c35ea358b2469d"
      },
      {
        "name": "sarin_wa_inbox_removed",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "bfa22657d1e1fcc0eca17d6c3ebc05e9160e98b027788c1245088e52f1c305f6"
      },
      {
        "name": "sarin_wa_inference_reservations",
        "type": "table",
        "table": "sarin_wa_inference_reservations",
        "hash": "0c8b9a182c9921c8cc55fde674e73682980612aa152324a83ced249570807226"
      },
      {
        "name": "sarin_wa_job_transition",
        "type": "trigger",
        "table": "sarin_wa_jobs",
        "hash": "288f4f13063e95e291b9dc27210f5c4fd1a5abcae7840c68355cda50e93bbcd7"
      },
      {
        "name": "sarin_wa_jobs",
        "type": "table",
        "table": "sarin_wa_jobs",
        "hash": "91b4800a604cc771e5fb8cd0859fc82962ec5e606f0cd6b5bbacf26d2d411753"
      },
      {
        "name": "sarin_wa_jobs_dispatch",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "74df902a7c2df67c952ca77c0375b81142c6e8ccf26520e97816150389dbf6a7"
      },
      {
        "name": "sarin_wa_jobs_expiry",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "da016c51398986285204961f4d25b20051bbb3a41ede3d5b89f65dd7513fc615"
      },
      {
        "name": "sarin_wa_one_owner",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "bf20091e9b99364cbe4038e2de8688aa444e97e94070e97f2683c7f63df2c850"
      },
      {
        "name": "sarin_wa_outbox",
        "type": "table",
        "table": "sarin_wa_outbox",
        "hash": "723ef90f165aa39097e38b1e95b348c47f860f3a5568aaf0ff722d55a5176d43"
      },
      {
        "name": "sarin_wa_outbox_peer",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d72585d9e514cd5284cac95548b86bd797db665bcbedbd657e073a22e2cf0620"
      },
      {
        "name": "sarin_wa_outbox_reconcile",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "6bc4123b51cceff6dac94fa098c41f7a7063c3720de29ffa81acb378f5a232e9"
      },
      {
        "name": "sarin_wa_outbox_transition",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "1b9643abaeeafa1834616dd0a0e8995b4d62b4f5f1b56f50bb9b79ff1e74b5f8"
      },
      {
        "name": "sarin_wa_peers",
        "type": "table",
        "table": "sarin_wa_peers",
        "hash": "d80177cf886578d2b89f5091cd21237de392cac56c31b6213fa98d3c4070be38"
      },
      {
        "name": "sarin_wa_peers_expiry",
        "type": "index",
        "table": "sarin_wa_peers",
        "hash": "2b8cba8a5290b4f4164e4fd586284b2520fd47f59a9037dfbbe1a9a6268c180a"
      },
      {
        "name": "sarin_wa_pilot",
        "type": "table",
        "table": "sarin_wa_pilot",
        "hash": "6ebb4baebaa45d0565518478db2c9c69edefdb0751da0c050e10848f7ceb00bd"
      },
      {
        "name": "sarin_wa_profile_capacity",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "90fcfba9744fa7d1d3e8b3643e6893a759151842b00c374977bb73d8fb96f3b4"
      },
      {
        "name": "sarin_wa_profile_context_delete",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "f2f5a51996ce44e963caa310528d6af2b121522f802d9d348b7178421f76a867"
      },
      {
        "name": "sarin_wa_profile_expiry",
        "type": "index",
        "table": "sarin_wa_profiles",
        "hash": "3d0f2d4b052a0d99ed8023a37fd007b832bb11a18f246beaf39d72c74eaeac01"
      },
      {
        "name": "sarin_wa_profile_inbox_delete",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "10c38cfe983d706748319cfa5031cc76974dc62b839ab1d5a687c547797c42c5"
      },
      {
        "name": "sarin_wa_profile_validate_insert",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "0dac840a27e1b98c5dfcba069ab3acef6260ef785af4e44cc6c91c6dc896c75d"
      },
      {
        "name": "sarin_wa_profile_validate_update",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "d2fedf1885da35cfec02b70cf3fa94c4c85cc144a90b937055af5f7bca2ccc2c"
      },
      {
        "name": "sarin_wa_profiles",
        "type": "table",
        "table": "sarin_wa_profiles",
        "hash": "88303ac38cd79bc6fc2bb0f3cb4797b05fe28a5fd77a84d69ab7bc3b0622b054"
      },
      {
        "name": "sarin_wa_proof_immutable",
        "type": "trigger",
        "table": "sarin_wa_consent_proofs",
        "hash": "e5810c37d9837ab3faecfb3d617658c9879fa5f927847ccdc3cb0434eba757cf"
      },
      {
        "name": "sarin_wa_proof_sync",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "ac8231652a2e878d89b2fcba7e2e2fb35fd47f1d2ae2bbe612eb43e0c80f0b7a"
      },
      {
        "name": "sarin_wa_proofs_expiry",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "2920d0c05b581ca2dde6dac1313c6596f3d7e893878f11d8f16f4062e486d280"
      },
      {
        "name": "sarin_wa_proofs_external",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "69c5412c424aed51616f28a37e4fb0c1ad020c694f5fdf356e977634e2fb33e7"
      },
      {
        "name": "sarin_wa_proofs_notice",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "8ed704aa56160feee50fe97a3ac6b99978a830698f94eba3213a60e530dea0fd"
      },
      {
        "name": "sarin_wa_proofs_provider",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "6021f60c91f77aab8e25509972b81c3e49db1ef858596e71a2b36b60c047b1ff"
      },
      {
        "name": "sarin_wa_receipt_added",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "761a58bd9b62269a33acb3cb20e7cd6ebc213a299347fc66d4487cdbac3eb067"
      },
      {
        "name": "sarin_wa_receipt_removed",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "2b6351b06df7a0255a50cc1f6fa47bf4906a9dbb0521c1bcdcc0be7067bd5120"
      },
      {
        "name": "sarin_wa_receipts",
        "type": "table",
        "table": "sarin_wa_receipts",
        "hash": "f53c4ef5c492b865732a2edf202517bb997a616e9194a5881e172d2d37135217"
      },
      {
        "name": "sarin_wa_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b3cc7f89498ec9e328dada83bb0c9b2dde998a09c028cac15c5d1ce092c8737d"
      },
      {
        "name": "sarin_wa_receipts_global_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b62914887705e521f4dc94e9425c604ba56272609e837ffab0e0643944d5fd13"
      },
      {
        "name": "sarin_wa_receipts_message",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "7f5b4a2fc05a238a138fc6496250924904283f6574e3df40d5c366f5afac4a19"
      },
      {
        "name": "sarin_wa_receipts_peer_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b30385715fb946a3e7fb52abd8853f8012241832ae68e831fd51143d282346c5"
      },
      {
        "name": "sarin_wa_send_closures",
        "type": "table",
        "table": "sarin_wa_send_closures",
        "hash": "a85e29fefcde16f266cd527efa6fdae328a13bdae8a1f582de8ee53a8055df5d"
      },
      {
        "name": "sarin_wa_send_month",
        "type": "index",
        "table": "sarin_wa_send_quota",
        "hash": "a353a52c613524c0562a6b7f90c8ee536a921ed060cfaefc4b3a727216803c2a"
      },
      {
        "name": "sarin_wa_send_quota",
        "type": "table",
        "table": "sarin_wa_send_quota",
        "hash": "9faa550d8417da0fdbdedce7ff615683fefbd3b85df54225b83ac106493ce14f"
      },
      {
        "name": "sarin_wa_state",
        "type": "table",
        "table": "sarin_wa_state",
        "hash": "ec2dfba9b5cfe6531cb9a28736dbfde9f18a31d0bff4e6d6e1ffad4414bf4016"
      },
      {
        "name": "sarin_wa_work_capture",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "a8acc5816a08db47c44936b2bf74409d66e69da072cd04f7101fcb7850a7c679"
      },
      {
        "name": "sarin_wa_work_guard",
        "type": "view",
        "table": "sarin_wa_work_guard",
        "hash": "e4d7740a70a1f449eac62a3481e36bbcb36120f4ab37648d4b9fcca2085de814"
      }
    ]
  },
  "0010": {
    "identifiers": [
      "acceptance_event_id",
      "accepted_at",
      "action",
      "activation_at",
      "actor",
      "admission_token",
      "alert_id",
      "amount_micros",
      "applied",
      "at",
      "attached_at",
      "audit_id",
      "business_phone",
      "canonical_event_id",
      "category",
      "classification",
      "closed_at",
      "code",
      "conflict",
      "consent_expires_at",
      "consent_hash",
      "consent_notice_id",
      "consent_version",
      "consumed",
      "content_bytes",
      "context_id",
      "coverage_start",
      "created_at",
      "currency",
      "day_key",
      "day_start",
      "deferred_reason",
      "delivered_at",
      "descriptor",
      "duration_seconds",
      "enabled",
      "epoch",
      "event_hash",
      "event_id",
      "expires_at",
      "external_id",
      "finished_at",
      "first_seen",
      "from_hash",
      "full_name",
      "global_day",
      "global_minute",
      "hash",
      "id",
      "inbox_rows",
      "inference_started_at",
      "input_kind",
      "job_id",
      "kind",
      "last_human_at",
      "last_inbound_at",
      "last_purge_at",
      "last_seen",
      "lease_until",
      "lookup_attempted",
      "lookup_count",
      "lookup_minute",
      "max_bytes",
      "max_inbox",
      "max_peers",
      "max_receipts",
      "media_type",
      "message_hash",
      "message_id",
      "message_key",
      "minute_start",
      "mode",
      "month_key",
      "new",
      "notice_context_id",
      "notice_epoch",
      "notice_id",
      "observed_at",
      "old",
      "outbox_id",
      "outcome",
      "owner_phone",
      "pause_revision",
      "paused",
      "paused_all",
      "peer_key",
      "peer_phone",
      "peer_revision",
      "pending_acceptance_event_id",
      "pending_accepted_at",
      "per_day",
      "per_minute",
      "period_end_at",
      "period_key",
      "pricing_type",
      "provider_id",
      "purge_remaining",
      "purpose",
      "quality",
      "quota_day",
      "quota_month",
      "quota_state",
      "reason",
      "receipt_expires_at",
      "receipt_key",
      "receipt_rows",
      "received_at",
      "reconcile_attempts",
      "reconcile_last_result",
      "reconcile_lease_until",
      "reconcile_next_at",
      "reconcile_state",
      "reconcile_token",
      "reconcile_updated_at",
      "recorded_at",
      "replay_floor_at",
      "reservation_id",
      "reserved",
      "reserved_bytes",
      "revision",
      "sarin_wa_admit",
      "sarin_wa_audio",
      "sarin_wa_audio_capacity",
      "sarin_wa_audio_capture",
      "sarin_wa_audio_delete",
      "sarin_wa_audio_immutable",
      "sarin_wa_audio_month",
      "sarin_wa_audio_quota",
      "sarin_wa_audit",
      "sarin_wa_billing_receipts",
      "sarin_wa_billing_receipts_cap",
      "sarin_wa_billing_receipts_delete",
      "sarin_wa_billing_receipts_expiry",
      "sarin_wa_billing_receipts_identity",
      "sarin_wa_billing_receipts_insert",
      "sarin_wa_billing_receipts_lookup",
      "sarin_wa_billing_receipts_month",
      "sarin_wa_billing_receipts_quality",
      "sarin_wa_billing_receipts_scope",
      "sarin_wa_billing_scopes",
      "sarin_wa_billing_scopes_cap",
      "sarin_wa_billing_scopes_identity",
      "sarin_wa_capture",
      "sarin_wa_consent_proofs",
      "sarin_wa_context_invalidate",
      "sarin_wa_contexts",
      "sarin_wa_control_events",
      "sarin_wa_control_expiry",
      "sarin_wa_delivery_observations",
      "sarin_wa_delivery_targets",
      "sarin_wa_fixed_once",
      "sarin_wa_guard",
      "sarin_wa_handoff",
      "sarin_wa_handoff_dispatch",
      "sarin_wa_handoff_expiry",
      "sarin_wa_handoff_immutable",
      "sarin_wa_handoff_request",
      "sarin_wa_inbox",
      "sarin_wa_inbox_added",
      "sarin_wa_inbox_expiry",
      "sarin_wa_inbox_peer",
      "sarin_wa_inbox_removed",
      "sarin_wa_inference_reservations",
      "sarin_wa_job_transition",
      "sarin_wa_jobs",
      "sarin_wa_jobs_dispatch",
      "sarin_wa_jobs_expiry",
      "sarin_wa_one_owner",
      "sarin_wa_outbox",
      "sarin_wa_outbox_peer",
      "sarin_wa_outbox_reconcile",
      "sarin_wa_outbox_transition",
      "sarin_wa_peers",
      "sarin_wa_peers_expiry",
      "sarin_wa_pilot",
      "sarin_wa_profile_capacity",
      "sarin_wa_profile_context_delete",
      "sarin_wa_profile_expiry",
      "sarin_wa_profile_inbox_delete",
      "sarin_wa_profile_validate_insert",
      "sarin_wa_profile_validate_update",
      "sarin_wa_profiles",
      "sarin_wa_proof_immutable",
      "sarin_wa_proof_sync",
      "sarin_wa_proofs_expiry",
      "sarin_wa_proofs_external",
      "sarin_wa_proofs_notice",
      "sarin_wa_proofs_provider",
      "sarin_wa_receipt_added",
      "sarin_wa_receipt_removed",
      "sarin_wa_receipts",
      "sarin_wa_receipts_expiry",
      "sarin_wa_receipts_global_rate",
      "sarin_wa_receipts_message",
      "sarin_wa_receipts_peer_rate",
      "sarin_wa_send_closures",
      "sarin_wa_send_month",
      "sarin_wa_send_quota",
      "sarin_wa_state",
      "sarin_wa_work_capture",
      "sarin_wa_work_guard",
      "scope",
      "scope_key",
      "sent_at",
      "source_event_id",
      "started_at",
      "state",
      "status",
      "storage_limited",
      "stored_bytes",
      "text",
      "to_hash",
      "token",
      "transcript",
      "version",
      "waba_hash",
      "waba_id",
      "wamid"
    ],
    "objects": [
      {
        "name": "sarin_wa_admit",
        "type": "trigger",
        "table": "sarin_wa_capture",
        "hash": "ad02bc5ab1080c1c0d0f59703023d44220cf8cfb64dd1441623218456879b2d0"
      },
      {
        "name": "sarin_wa_audio",
        "type": "table",
        "table": "sarin_wa_audio",
        "hash": "c14ff4754154cfb0470ebae0191257485dc62b7c82cdadf8917c08626e99a7e3"
      },
      {
        "name": "sarin_wa_audio_capacity",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "40ecfb0a934eb956e3a42fec68f45eecff1e7bb2211dacd6b0f95e996aa2b1d3"
      },
      {
        "name": "sarin_wa_audio_capture",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "4bbb4c3a13e5b0faeccd269bb8c3963bbbf5e18c75b9c881a3959dcb552d3fe7"
      },
      {
        "name": "sarin_wa_audio_delete",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "6e1a83123a8e317a273fcd41bdae207f7803707d6d1d220c23d627260c1cad53"
      },
      {
        "name": "sarin_wa_audio_immutable",
        "type": "trigger",
        "table": "sarin_wa_audio",
        "hash": "8499c987debde3210fcfeca11ce855e53da53d8f355ebd1f6ea4f0b0c67adbe5"
      },
      {
        "name": "sarin_wa_audio_month",
        "type": "index",
        "table": "sarin_wa_audio_quota",
        "hash": "d34fc725870450b915a5e538ac0fa35a58747d10bb19391c2c6ac525c1dd215b"
      },
      {
        "name": "sarin_wa_audio_quota",
        "type": "table",
        "table": "sarin_wa_audio_quota",
        "hash": "d86fee423b6d73e7913164f5b52b634b184ff4c1a55ee900a18a8ae06195a072"
      },
      {
        "name": "sarin_wa_audit",
        "type": "table",
        "table": "sarin_wa_audit",
        "hash": "f5d810a8bf822af0224da4d9f2775cf9b715558f0fe208999133224cdb24eddb"
      },
      {
        "name": "sarin_wa_billing_receipts",
        "type": "table",
        "table": "sarin_wa_billing_receipts",
        "hash": "46241ef84fad55e9a0077477bae6858654b2265490729f8e8007de9de9b8181a"
      },
      {
        "name": "sarin_wa_billing_receipts_cap",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "d2d1e5e0bb6d906017467449e68ad5e877c7c21eec5807d40989b7c0db7401a8"
      },
      {
        "name": "sarin_wa_billing_receipts_delete",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "8869f29c9f5c89172286b5eeea15ebd2df8083f4866498021f43b0efd93ad751"
      },
      {
        "name": "sarin_wa_billing_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_billing_receipts",
        "hash": "59c533df17449ba01e6cfc6785bc91991d3089beb21d59de45cb78cce547516b"
      },
      {
        "name": "sarin_wa_billing_receipts_identity",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "c1b2056236207541875cb23388a993d9396b726a1b3a72b8a9cfb06cd0b89be6"
      },
      {
        "name": "sarin_wa_billing_receipts_insert",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "be5438ccccd2d2ca811d3145bf1a94138cd49063080c2206ffcf52435186728a"
      },
      {
        "name": "sarin_wa_billing_receipts_lookup",
        "type": "index",
        "table": "sarin_wa_billing_receipts",
        "hash": "59c4175d42fc5d9cf0b26e4295c441c7ac730fa6ef4d54a9402894b7eeade843"
      },
      {
        "name": "sarin_wa_billing_receipts_month",
        "type": "index",
        "table": "sarin_wa_billing_receipts",
        "hash": "ec479b8ebb084603eba75b9779d24151b22236baccd5a658c209fe30e7b99eda"
      },
      {
        "name": "sarin_wa_billing_receipts_quality",
        "type": "index",
        "table": "sarin_wa_billing_receipts",
        "hash": "e3039e05c67b44d92a8b883be4a2bc697ef46d1fc4d4d33826706cc52a3c77b8"
      },
      {
        "name": "sarin_wa_billing_receipts_scope",
        "type": "trigger",
        "table": "sarin_wa_billing_receipts",
        "hash": "44932880d6316439f5e896665692222dca856754520fcd2d39a9f94d65471de6"
      },
      {
        "name": "sarin_wa_billing_scopes",
        "type": "table",
        "table": "sarin_wa_billing_scopes",
        "hash": "8e6b62ec7aeaab1d909e41d47f15706d8b83db889e225f8a745fadeff244deb0"
      },
      {
        "name": "sarin_wa_billing_scopes_cap",
        "type": "trigger",
        "table": "sarin_wa_billing_scopes",
        "hash": "63671845e04d2e2c998a711341c8ef3aab299f061e780814fd841fd065f5b3c4"
      },
      {
        "name": "sarin_wa_billing_scopes_identity",
        "type": "trigger",
        "table": "sarin_wa_billing_scopes",
        "hash": "a78b16b28ba368c30da8f6f1e5cd123c2d794c5f52939e2d84df9236a87b09fb"
      },
      {
        "name": "sarin_wa_capture",
        "type": "view",
        "table": "sarin_wa_capture",
        "hash": "15990955dee31cd5316f5e9deae82cb986e0a3d70e1f0f78e251f22ccb3805b7"
      },
      {
        "name": "sarin_wa_consent_proofs",
        "type": "table",
        "table": "sarin_wa_consent_proofs",
        "hash": "58f4bb088501064474f828899f90e09159d09939443c6e1a2365616697867d4c"
      },
      {
        "name": "sarin_wa_context_invalidate",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "79adb966f951b332fc440b0113d7756ef2a9c6f20d3c1b2ff65996e84951c74b"
      },
      {
        "name": "sarin_wa_contexts",
        "type": "table",
        "table": "sarin_wa_contexts",
        "hash": "9e5edd0c93bdde10f2226fbc7a9f6186e2eff266a8239d326a46ff6549033902"
      },
      {
        "name": "sarin_wa_control_events",
        "type": "table",
        "table": "sarin_wa_control_events",
        "hash": "4a60f091bccb0dc73ab91b866646aa806c849a3b9c0b5f8fad3a9334e6308ba0"
      },
      {
        "name": "sarin_wa_control_expiry",
        "type": "index",
        "table": "sarin_wa_control_events",
        "hash": "9a13a112565a93670a9384c27b9fadb227724e4dc6af7aad0816153422e3c412"
      },
      {
        "name": "sarin_wa_delivery_observations",
        "type": "table",
        "table": "sarin_wa_delivery_observations",
        "hash": "b927730d6d8465a8b248821f7613aef42b3e37c424dbefeeb660b4c93b6a6644"
      },
      {
        "name": "sarin_wa_delivery_targets",
        "type": "view",
        "table": "sarin_wa_delivery_targets",
        "hash": "d06983e48ed1773266c23714dab39c57b61e56a49eec744eb85b5cb332084bbe"
      },
      {
        "name": "sarin_wa_fixed_once",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d384e3b458b997afad4683f728a087893dfc726e25e118710209bca2cb0d6ba3"
      },
      {
        "name": "sarin_wa_guard",
        "type": "trigger",
        "table": "sarin_wa_work_guard",
        "hash": "5f0f0f81013454410722d99c9ef9e279223dd6feb6bacd2917910efdd40b89be"
      },
      {
        "name": "sarin_wa_handoff",
        "type": "table",
        "table": "sarin_wa_handoff",
        "hash": "bc1d6054d979076abd947b5296a2eb22489c009060244a7f676bd7465944ef87"
      },
      {
        "name": "sarin_wa_handoff_dispatch",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "66cb80f278c560b06f25d318e17d782c3fcf7b37564515f754eb8d14648f1cc1"
      },
      {
        "name": "sarin_wa_handoff_expiry",
        "type": "index",
        "table": "sarin_wa_handoff",
        "hash": "dab305c7811b81d3eafc68a1ea5f7e1e2406f837e6abbab7861657e38728e097"
      },
      {
        "name": "sarin_wa_handoff_immutable",
        "type": "trigger",
        "table": "sarin_wa_handoff",
        "hash": "773a9176125bc8c61e1bf28a7f72a41ecf4d43d6895b5880459e5c4f97af0cea"
      },
      {
        "name": "sarin_wa_handoff_request",
        "type": "trigger",
        "table": "sarin_wa_control_events",
        "hash": "f87102e0ebb5b5f04ee33197a5c2985d64c29ecdfa5d430e5cd59844e420260c"
      },
      {
        "name": "sarin_wa_inbox",
        "type": "table",
        "table": "sarin_wa_inbox",
        "hash": "85062eb3d573cae2e07325bd4bed8ee6bb5a70edc8d0e0d77a6904714370db2c"
      },
      {
        "name": "sarin_wa_inbox_added",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "431645409d63f372dd9abc0cd0e8adbe3ddca14042881a425b5042dd510730f8"
      },
      {
        "name": "sarin_wa_inbox_expiry",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "bfeb395d689f5a43f8fe103e197ae92bf9b7c069005fac3293eb2078ce20717a"
      },
      {
        "name": "sarin_wa_inbox_peer",
        "type": "index",
        "table": "sarin_wa_inbox",
        "hash": "a713cb3d9be7072176150793bb1b6e149ddd259380483e8bc5c35ea358b2469d"
      },
      {
        "name": "sarin_wa_inbox_removed",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "bfa22657d1e1fcc0eca17d6c3ebc05e9160e98b027788c1245088e52f1c305f6"
      },
      {
        "name": "sarin_wa_inference_reservations",
        "type": "table",
        "table": "sarin_wa_inference_reservations",
        "hash": "0c8b9a182c9921c8cc55fde674e73682980612aa152324a83ced249570807226"
      },
      {
        "name": "sarin_wa_job_transition",
        "type": "trigger",
        "table": "sarin_wa_jobs",
        "hash": "288f4f13063e95e291b9dc27210f5c4fd1a5abcae7840c68355cda50e93bbcd7"
      },
      {
        "name": "sarin_wa_jobs",
        "type": "table",
        "table": "sarin_wa_jobs",
        "hash": "91b4800a604cc771e5fb8cd0859fc82962ec5e606f0cd6b5bbacf26d2d411753"
      },
      {
        "name": "sarin_wa_jobs_dispatch",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "74df902a7c2df67c952ca77c0375b81142c6e8ccf26520e97816150389dbf6a7"
      },
      {
        "name": "sarin_wa_jobs_expiry",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "da016c51398986285204961f4d25b20051bbb3a41ede3d5b89f65dd7513fc615"
      },
      {
        "name": "sarin_wa_one_owner",
        "type": "index",
        "table": "sarin_wa_jobs",
        "hash": "bf20091e9b99364cbe4038e2de8688aa444e97e94070e97f2683c7f63df2c850"
      },
      {
        "name": "sarin_wa_outbox",
        "type": "table",
        "table": "sarin_wa_outbox",
        "hash": "723ef90f165aa39097e38b1e95b348c47f860f3a5568aaf0ff722d55a5176d43"
      },
      {
        "name": "sarin_wa_outbox_peer",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "d72585d9e514cd5284cac95548b86bd797db665bcbedbd657e073a22e2cf0620"
      },
      {
        "name": "sarin_wa_outbox_reconcile",
        "type": "index",
        "table": "sarin_wa_outbox",
        "hash": "6bc4123b51cceff6dac94fa098c41f7a7063c3720de29ffa81acb378f5a232e9"
      },
      {
        "name": "sarin_wa_outbox_transition",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "1b9643abaeeafa1834616dd0a0e8995b4d62b4f5f1b56f50bb9b79ff1e74b5f8"
      },
      {
        "name": "sarin_wa_peers",
        "type": "table",
        "table": "sarin_wa_peers",
        "hash": "d80177cf886578d2b89f5091cd21237de392cac56c31b6213fa98d3c4070be38"
      },
      {
        "name": "sarin_wa_peers_expiry",
        "type": "index",
        "table": "sarin_wa_peers",
        "hash": "2b8cba8a5290b4f4164e4fd586284b2520fd47f59a9037dfbbe1a9a6268c180a"
      },
      {
        "name": "sarin_wa_pilot",
        "type": "table",
        "table": "sarin_wa_pilot",
        "hash": "6ebb4baebaa45d0565518478db2c9c69edefdb0751da0c050e10848f7ceb00bd"
      },
      {
        "name": "sarin_wa_profile_capacity",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "90fcfba9744fa7d1d3e8b3643e6893a759151842b00c374977bb73d8fb96f3b4"
      },
      {
        "name": "sarin_wa_profile_context_delete",
        "type": "trigger",
        "table": "sarin_wa_contexts",
        "hash": "f2f5a51996ce44e963caa310528d6af2b121522f802d9d348b7178421f76a867"
      },
      {
        "name": "sarin_wa_profile_expiry",
        "type": "index",
        "table": "sarin_wa_profiles",
        "hash": "3d0f2d4b052a0d99ed8023a37fd007b832bb11a18f246beaf39d72c74eaeac01"
      },
      {
        "name": "sarin_wa_profile_inbox_delete",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "10c38cfe983d706748319cfa5031cc76974dc62b839ab1d5a687c547797c42c5"
      },
      {
        "name": "sarin_wa_profile_validate_insert",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "0dac840a27e1b98c5dfcba069ab3acef6260ef785af4e44cc6c91c6dc896c75d"
      },
      {
        "name": "sarin_wa_profile_validate_update",
        "type": "trigger",
        "table": "sarin_wa_profiles",
        "hash": "d2fedf1885da35cfec02b70cf3fa94c4c85cc144a90b937055af5f7bca2ccc2c"
      },
      {
        "name": "sarin_wa_profiles",
        "type": "table",
        "table": "sarin_wa_profiles",
        "hash": "88303ac38cd79bc6fc2bb0f3cb4797b05fe28a5fd77a84d69ab7bc3b0622b054"
      },
      {
        "name": "sarin_wa_proof_immutable",
        "type": "trigger",
        "table": "sarin_wa_consent_proofs",
        "hash": "e5810c37d9837ab3faecfb3d617658c9879fa5f927847ccdc3cb0434eba757cf"
      },
      {
        "name": "sarin_wa_proof_sync",
        "type": "trigger",
        "table": "sarin_wa_outbox",
        "hash": "ac8231652a2e878d89b2fcba7e2e2fb35fd47f1d2ae2bbe612eb43e0c80f0b7a"
      },
      {
        "name": "sarin_wa_proofs_expiry",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "2920d0c05b581ca2dde6dac1313c6596f3d7e893878f11d8f16f4062e486d280"
      },
      {
        "name": "sarin_wa_proofs_external",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "69c5412c424aed51616f28a37e4fb0c1ad020c694f5fdf356e977634e2fb33e7"
      },
      {
        "name": "sarin_wa_proofs_notice",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "8ed704aa56160feee50fe97a3ac6b99978a830698f94eba3213a60e530dea0fd"
      },
      {
        "name": "sarin_wa_proofs_provider",
        "type": "index",
        "table": "sarin_wa_consent_proofs",
        "hash": "6021f60c91f77aab8e25509972b81c3e49db1ef858596e71a2b36b60c047b1ff"
      },
      {
        "name": "sarin_wa_receipt_added",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "761a58bd9b62269a33acb3cb20e7cd6ebc213a299347fc66d4487cdbac3eb067"
      },
      {
        "name": "sarin_wa_receipt_removed",
        "type": "trigger",
        "table": "sarin_wa_receipts",
        "hash": "2b6351b06df7a0255a50cc1f6fa47bf4906a9dbb0521c1bcdcc0be7067bd5120"
      },
      {
        "name": "sarin_wa_receipts",
        "type": "table",
        "table": "sarin_wa_receipts",
        "hash": "f53c4ef5c492b865732a2edf202517bb997a616e9194a5881e172d2d37135217"
      },
      {
        "name": "sarin_wa_receipts_expiry",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b3cc7f89498ec9e328dada83bb0c9b2dde998a09c028cac15c5d1ce092c8737d"
      },
      {
        "name": "sarin_wa_receipts_global_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b62914887705e521f4dc94e9425c604ba56272609e837ffab0e0643944d5fd13"
      },
      {
        "name": "sarin_wa_receipts_message",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "7f5b4a2fc05a238a138fc6496250924904283f6574e3df40d5c366f5afac4a19"
      },
      {
        "name": "sarin_wa_receipts_peer_rate",
        "type": "index",
        "table": "sarin_wa_receipts",
        "hash": "b30385715fb946a3e7fb52abd8853f8012241832ae68e831fd51143d282346c5"
      },
      {
        "name": "sarin_wa_send_closures",
        "type": "table",
        "table": "sarin_wa_send_closures",
        "hash": "a85e29fefcde16f266cd527efa6fdae328a13bdae8a1f582de8ee53a8055df5d"
      },
      {
        "name": "sarin_wa_send_month",
        "type": "index",
        "table": "sarin_wa_send_quota",
        "hash": "a353a52c613524c0562a6b7f90c8ee536a921ed060cfaefc4b3a727216803c2a"
      },
      {
        "name": "sarin_wa_send_quota",
        "type": "table",
        "table": "sarin_wa_send_quota",
        "hash": "9faa550d8417da0fdbdedce7ff615683fefbd3b85df54225b83ac106493ce14f"
      },
      {
        "name": "sarin_wa_state",
        "type": "table",
        "table": "sarin_wa_state",
        "hash": "ec2dfba9b5cfe6531cb9a28736dbfde9f18a31d0bff4e6d6e1ffad4414bf4016"
      },
      {
        "name": "sarin_wa_work_capture",
        "type": "trigger",
        "table": "sarin_wa_inbox",
        "hash": "a8acc5816a08db47c44936b2bf74409d66e69da072cd04f7101fcb7850a7c679"
      },
      {
        "name": "sarin_wa_work_guard",
        "type": "view",
        "table": "sarin_wa_work_guard",
        "hash": "e4d7740a70a1f449eac62a3481e36bbcb36120f4ab37648d4b9fcca2085de814"
      }
    ]
  }
};
