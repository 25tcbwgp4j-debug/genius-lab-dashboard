-- Restringe le policy RLS: DELETE solo per admin/manager
-- Prima: "Authenticated manage X" con USING(true) su ALL
-- Dopo: policy granulari per INSERT/UPDATE/DELETE

-- DEVICES
DROP POLICY IF EXISTS "Authenticated manage devices" ON devices;
CREATE POLICY "Authenticated insert devices" ON devices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update devices" ON devices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete devices" ON devices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')));

-- TICKETS
DROP POLICY IF EXISTS "Authenticated manage tickets" ON tickets;
CREATE POLICY "Authenticated insert tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update tickets" ON tickets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete tickets" ON tickets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')));

-- OPERATORS
DROP POLICY IF EXISTS "Authenticated manage operators" ON operators;
CREATE POLICY "Authenticated read operators" ON operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage operators" ON operators FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin update operators" ON operators FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin delete operators" ON operators FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
