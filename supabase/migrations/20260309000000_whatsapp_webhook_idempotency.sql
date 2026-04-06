-- Idempotency for WhatsApp webhook delivery/read callbacks.
-- Prevents processing the same provider event twice (e.g. duplicate status callbacks).
CREATE TABLE whatsapp_webhook_events (
  idempotency_key TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_webhook_events_created ON whatsapp_webhook_events(created_at);

COMMENT ON TABLE whatsapp_webhook_events IS 'Processed WhatsApp webhook events; key = provider_message_id:normalized_status for idempotency';

-- Index for webhook status updates (safe-update lookup by provider_message_id)
CREATE INDEX IF NOT EXISTS idx_communications_provider_message_id ON communications(provider_message_id) WHERE provider_message_id IS NOT NULL;
