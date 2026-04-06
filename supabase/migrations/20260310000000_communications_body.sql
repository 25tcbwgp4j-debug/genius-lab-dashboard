-- Store sent message body in communications for full audit trail
ALTER TABLE communications ADD COLUMN IF NOT EXISTS body TEXT;

COMMENT ON COLUMN communications.body IS 'Rendered message body (plain text) sent to recipient';
