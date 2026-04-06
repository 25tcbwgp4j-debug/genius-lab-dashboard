-- Flag comunicazioni inviate per ogni ticket
CREATE TABLE IF NOT EXISTS communication_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticket_id, flag_type)
);

ALTER TABLE communication_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage comm_flags" ON communication_flags FOR ALL TO authenticated USING (true);
