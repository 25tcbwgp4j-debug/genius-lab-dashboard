-- Tabella operatori per dropdown accettazione/tecnico
CREATE TABLE IF NOT EXISTS operators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage operators" ON operators FOR ALL TO authenticated USING (true);

INSERT INTO operators (name) VALUES
('CHRISTIAN'), ('VALENTINA'), ('ROBERTO'), ('ALEX'), ('MARCO'), ('DUMY'), ('FRANCESCA')
ON CONFLICT (name) DO NOTHING;
