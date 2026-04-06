'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireUserAndProfile } from '@/lib/auth/require-auth'

export async function toggleCommunicationFlag(ticketId: string, flagType: string) {
  const { user } = await requireUserAndProfile()
  const supabase = await createClient()

  // Controlla se il flag esiste già
  const { data: existing } = await supabase
    .from('communication_flags')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('flag_type', flagType)
    .single()

  if (existing) {
    // Rimuovi il flag
    await supabase.from('communication_flags').delete().eq('id', existing.id)
  } else {
    // Crea il flag
    await supabase.from('communication_flags').insert({
      ticket_id: ticketId,
      flag_type: flagType,
      sent_by: user.id,
      sent_at: new Date().toISOString(),
    })
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return { success: true }
}
