-- Estimate notes (for PDF and display) and customer rejection note
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS estimate_notes TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS refused_note TEXT;
