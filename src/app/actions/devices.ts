'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUserAndProfile } from '@/lib/auth/require-auth'

export async function deleteDeviceAction(deviceId: string) {
  await requireUserAndProfile()
  const supabase = await createClient()

  // Verifica se ci sono ticket collegati (FK ON DELETE RESTRICT bloccherebbe)
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_number, status')
    .eq('device_id', deviceId)
    .limit(5)

  if (tickets && tickets.length > 0) {
    const nums = tickets.map(t => t.ticket_number).join(', ')
    return {
      error: `Impossibile eliminare: il dispositivo ha ${tickets.length} ticket collegati (${nums}). Elimina o scollega i ticket prima.`
    }
  }

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', deviceId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/devices')
  redirect('/dashboard/devices')
}
