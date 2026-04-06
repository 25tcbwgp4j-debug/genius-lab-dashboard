import { createClient } from '@/lib/supabase/server'

export async function getNextTicketNumber(): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('next_ticket_number')
  if (error) throw new Error('Failed to generate ticket number')
  return data as string
}
