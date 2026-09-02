'use server'

import { createStaffClient } from '@/lib/supabase/staff'
import { revalidatePath } from 'next/cache'
import { richiediStaff } from '@/lib/auth/staff'

export async function toggleCommunicationFlag(ticketId: string, flagType: string) {
  await richiediStaff()
  const supabase = await createStaffClient()

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
      sent_by: null,
      sent_at: new Date().toISOString(),
    })
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return { success: true }
}
