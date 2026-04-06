-- Catalogo modelli dispositivi per autocomplete nel form
CREATE TABLE IF NOT EXISTS device_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Apple',
  model TEXT NOT NULL,
  year_from INT,
  year_to INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read device_models" ON device_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage device_models" ON device_models FOR ALL TO authenticated USING (true);
