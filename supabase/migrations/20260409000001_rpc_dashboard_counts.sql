-- Funzione RPC per contatori dashboard (1 query invece di 7)
CREATE OR REPLACE FUNCTION get_dashboard_counts()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'open', (SELECT COUNT(*) FROM tickets WHERE status NOT IN ('delivered', 'cancelled', 'unrepaired_returned')),
    'waiting_approval', (SELECT COUNT(*) FROM tickets WHERE status = 'waiting_customer_approval'),
    'waiting_parts', (SELECT COUNT(*) FROM tickets WHERE status = 'waiting_parts'),
    'in_repair', (SELECT COUNT(*) FROM tickets WHERE status = 'in_repair'),
    'ready', (SELECT COUNT(*) FROM tickets WHERE status IN ('ready_for_pickup', 'ready_for_shipping')),
    'today', (SELECT COUNT(*) FROM tickets WHERE created_at >= CURRENT_DATE)
  );
$$;
