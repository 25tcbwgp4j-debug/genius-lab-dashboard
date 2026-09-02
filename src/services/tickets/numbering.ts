import { createAdminClient } from '@/lib/supabase/admin'

export async function getNextTicketNumber(): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('next_ticket_number')
  if (error) throw new Error('Failed to generate ticket number')
  return data as string
}
