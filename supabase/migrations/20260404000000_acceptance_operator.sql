-- Aggiunge campo operatore accettazione ai ticket (dropdown, non FK a profiles)
-- Usa TEXT semplice perché gli operatori sono nomi fissi senza account utente
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS acceptance_operator TEXT;

COMMENT ON COLUMN tickets.acceptance_operator IS 'Nome operatore che ha accettato il dispositivo in laboratorio';
