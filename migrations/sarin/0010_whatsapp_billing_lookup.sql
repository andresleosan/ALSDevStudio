-- Distingue precio desconocido de una consulta GET ya reservada.
-- Los recibos históricos quedan en1: podrían haber agotado un intento sin precio.
-- El código nuevo inserta0 explícitamente sólo al observar un webhook nuevo.
-- Publicar primero lectores compatibles9/10; rollback mediante código compatible10,
-- conservando columna, índice e intentos. No reiniciar masivamente recibos anteriores.
ALTER TABLE sarin_wa_billing_receipts ADD COLUMN lookup_attempted INTEGER NOT NULL DEFAULT 1
 CHECK(lookup_attempted IN(0,1));
CREATE INDEX sarin_wa_billing_receipts_lookup
 ON sarin_wa_billing_receipts(scope_key,lookup_attempted,quality,expires_at);
