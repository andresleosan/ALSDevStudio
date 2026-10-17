-- Ampliación aditiva: las conversaciones anteriores conservan ausencia de contacto.
-- La reversión operativa consiste en volver al código anterior sin borrar esta tabla.
CREATE TABLE sarin_leads (
  conversation_id TEXT NOT NULL PRIMARY KEY REFERENCES sarin_conversations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL CHECK (typeof(first_name) = 'text' AND length(first_name) BETWEEN 1 AND 80),
  last_name TEXT NOT NULL CHECK (typeof(last_name) = 'text' AND length(last_name) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (typeof(email) = 'text' AND length(email) BETWEEN 3 AND 254)
);

-- La vista recibe el límite validado sin persistir configuración ni identidad IP.
CREATE VIEW sarin_lead_commands AS SELECT NULL AS conversation_id,NULL AS first_name,
  NULL AS last_name,NULL AS email,NULL AS max_text_bytes;
CREATE TRIGGER sarin_history_lead INSTEAD OF INSERT ON sarin_lead_commands
BEGIN
  SELECT CASE WHEN typeof(NEW.max_text_bytes) NOT IN ('integer','real') OR NEW.max_text_bytes != CAST(NEW.max_text_bytes AS INTEGER)
    OR NEW.max_text_bytes < 1 OR NEW.max_text_bytes > 67108864
    OR COALESCE((SELECT text_bytes FROM sarin_history_state WHERE singleton = 1),67108864)
      + length(CAST(NEW.first_name AS BLOB)) + length(CAST(NEW.last_name AS BLOB)) + length(CAST(NEW.email AS BLOB)) > NEW.max_text_bytes
    THEN RAISE(ABORT,'HISTORY_CAPACITY') END;
  INSERT INTO sarin_leads(conversation_id,first_name,last_name,email)
    VALUES (NEW.conversation_id,NEW.first_name,NEW.last_name,NEW.email);
  -- El trigger de 0002 ajusta el agregado; al borrar el padre libera todo una vez.
  UPDATE sarin_conversations SET capacity_bytes = capacity_bytes + length(CAST(NEW.first_name AS BLOB))
    + length(CAST(NEW.last_name AS BLOB)) + length(CAST(NEW.email AS BLOB)) WHERE id = NEW.conversation_id;
END;
