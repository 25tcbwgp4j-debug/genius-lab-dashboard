-- Allow authenticated users to read all profiles (for technician list and assignee display).
-- Write access remains restricted (own profile update only).
CREATE POLICY "Authenticated read all profiles" ON profiles FOR SELECT TO authenticated USING (true);
