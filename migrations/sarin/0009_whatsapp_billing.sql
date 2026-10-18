-- Registro de cargos observados: no contiene teléfonos, mensajes ni nombres.
-- Aditiva para las tablas existentes. Antes de migrar, publicar detector,
-- retención y verificador de respaldos compatibles con esquemas8 y9.
-- Rollback operativo preferido: retirar captura/panel de consumo conservando
-- estas tablas y el detector compatible9; no requiere borrar recibos.
-- Ensayo de reversión física sólo en la fixture local en memoria:
-- DROP TABLE sarin_wa_billing_receipts;
-- DROP TABLE sarin_wa_billing_scopes;
-- No ejecutar esos DROP en producción: rollback mediante build compatible9.
CREATE TABLE sarin_wa_billing_scopes (
 scope_key TEXT PRIMARY KEY CHECK(length(scope_key)=64 AND scope_key NOT GLOB '*[^0-9a-f]*'),
 coverage_start INTEGER NOT NULL CHECK(coverage_start>=0),
 storage_limited INTEGER NOT NULL DEFAULT 0 CHECK(storage_limited IN(0,1)),
 receipt_rows INTEGER NOT NULL DEFAULT 0 CHECK(receipt_rows BETWEEN 0 AND 100000),
 lookup_minute INTEGER NOT NULL DEFAULT 0 CHECK(lookup_minute>=0),
 lookup_count INTEGER NOT NULL DEFAULT 0 CHECK(lookup_count BETWEEN 0 AND 3)
);
CREATE TRIGGER sarin_wa_billing_scopes_cap BEFORE INSERT ON sarin_wa_billing_scopes
 WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_billing_scopes WHERE scope_key=NEW.scope_key)
 AND (SELECT COUNT(*) FROM sarin_wa_billing_scopes)>=4
 BEGIN SELECT RAISE(ABORT,'wa_billing_scope_capacity'); END;
CREATE TABLE sarin_wa_billing_receipts (
 receipt_key TEXT PRIMARY KEY CHECK(length(receipt_key)=64 AND receipt_key NOT GLOB '*[^0-9a-f]*'),
 scope_key TEXT NOT NULL REFERENCES sarin_wa_billing_scopes(scope_key),
 month_key TEXT NOT NULL CHECK(length(month_key)=7 AND month_key GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(month_key,6,2) BETWEEN '01' AND '12'),
 delivered_at INTEGER,
 quality INTEGER NOT NULL CHECK(quality IN(0,1,2)),
 pricing_type TEXT CHECK(pricing_type IN('regular','free_customer_service','free_entry_point')),
 category TEXT CHECK(category IN('marketing','utility','authentication','authentication_international','service','referral_conversion')),
 amount_micros INTEGER CHECK(amount_micros IS NULL OR (typeof(amount_micros)='integer' AND amount_micros BETWEEN 0 AND 1000000000000)),
 currency TEXT CHECK(length(currency)=3 AND currency NOT GLOB '*[^A-Z]*'),
 first_seen INTEGER NOT NULL CHECK(first_seen>=0),
 last_seen INTEGER NOT NULL CHECK(last_seen>=first_seen),
 expires_at INTEGER NOT NULL CHECK(expires_at>0),
 CHECK(quality<>1 OR (delivered_at IS NOT NULL AND pricing_type IS NOT NULL AND category IS NOT NULL AND amount_micros IS NOT NULL AND currency IS NOT NULL))
);
CREATE INDEX sarin_wa_billing_receipts_month ON sarin_wa_billing_receipts(scope_key,month_key,quality);
CREATE INDEX sarin_wa_billing_receipts_expiry ON sarin_wa_billing_receipts(expires_at);
CREATE INDEX sarin_wa_billing_receipts_quality ON sarin_wa_billing_receipts(scope_key,quality,expires_at);
CREATE TRIGGER sarin_wa_billing_receipts_cap BEFORE INSERT ON sarin_wa_billing_receipts
 WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_billing_receipts WHERE receipt_key=NEW.receipt_key)
 AND (SELECT COALESCE(SUM(receipt_rows),0) FROM sarin_wa_billing_scopes)>=100000
 BEGIN SELECT RAISE(ABORT,'wa_billing_capacity'); END;
CREATE TRIGGER sarin_wa_billing_receipts_identity BEFORE UPDATE ON sarin_wa_billing_receipts
 WHEN NEW.receipt_key<>OLD.receipt_key OR NEW.scope_key<>OLD.scope_key
 BEGIN SELECT RAISE(ABORT,'wa_billing_identity'); END;
CREATE TRIGGER sarin_wa_billing_receipts_scope BEFORE INSERT ON sarin_wa_billing_receipts
 WHEN NOT EXISTS(SELECT 1 FROM sarin_wa_billing_scopes WHERE scope_key=NEW.scope_key)
 BEGIN SELECT RAISE(ABORT,'wa_billing_scope'); END;
CREATE TRIGGER sarin_wa_billing_receipts_insert AFTER INSERT ON sarin_wa_billing_receipts
 BEGIN UPDATE sarin_wa_billing_scopes SET receipt_rows=receipt_rows+1 WHERE scope_key=NEW.scope_key; END;
CREATE TRIGGER sarin_wa_billing_receipts_delete AFTER DELETE ON sarin_wa_billing_receipts
 BEGIN UPDATE sarin_wa_billing_scopes SET receipt_rows=receipt_rows-1 WHERE scope_key=OLD.scope_key; END;
CREATE TRIGGER sarin_wa_billing_scopes_identity BEFORE UPDATE OF scope_key ON sarin_wa_billing_scopes
 WHEN NEW.scope_key<>OLD.scope_key BEGIN SELECT RAISE(ABORT,'wa_billing_identity'); END;
