-- Migrazione catchup: colonne aggiunte direttamente su Supabase
-- che mancavano dai file di migrazione locali.
-- Usa IF NOT EXISTS per sicurezza (le colonne esistono gia su Supabase).

-- === TICKETS: colonne aggiuntive ===
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS estimate_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS final_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS warranty_first_year BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS warranty_second_year BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS shipping_type TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS accepted_items JSONB;

COMMENT ON COLUMN tickets.estimate_items IS 'Voci preventivo: [{description, amount, list_price}]';
COMMENT ON COLUMN tickets.final_items IS 'Voci consuntivo finale: [{description, amount}]';
COMMENT ON COLUMN tickets.warranty_first_year IS 'Coperto da garanzia primo anno';
COMMENT ON COLUMN tickets.warranty_second_year IS 'Coperto da garanzia secondo anno (conformita)';
COMMENT ON COLUMN tickets.shipping_type IS 'Tipo spedizione: corriere, mano, etc.';
COMMENT ON COLUMN tickets.recipient_email IS 'Email destinatario per comunicazioni spedizione';
COMMENT ON COLUMN tickets.metadata IS 'Dati aggiuntivi flessibili in formato JSON';
COMMENT ON COLUMN tickets.accepted_items IS 'Voci accettate dal cliente (subset di estimate_items)';

-- === DEVICES: colonne aggiuntive ===
ALTER TABLE devices ADD COLUMN IF NOT EXISTS apple_id TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS apple_id_password TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_password TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS special_notes TEXT;

COMMENT ON COLUMN devices.apple_id IS 'Apple ID associato al dispositivo';
COMMENT ON COLUMN devices.apple_id_password IS 'Password Apple ID (per sblocco iCloud/FindMy)';
COMMENT ON COLUMN devices.device_password IS 'Codice di sblocco del dispositivo';
COMMENT ON COLUMN devices.special_notes IS 'Note speciali sul dispositivo';
