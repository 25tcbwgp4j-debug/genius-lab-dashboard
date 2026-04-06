'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireUserAndProfile } from '@/lib/auth/require-auth'

export async function addOperatorAction(name: string) {
  await requireUserAndProfile()
  if (!name.trim()) return { error: 'Nome richiesto' }
  const supabase = await createClient()
  const { error } = await supabase.from('operators').insert({ name: name.trim().toUpperCase() })
  if (error) {
    if (error.code === '23505') return { error: 'Operatore già esistente' }
    return { error: error.message }
  }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function removeOperatorAction(id: string) {
  await requireUserAndProfile()
  const supabase = await createClient()
  const { error } = await supabase.from('operators').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function toggleOperatorAction(id: string, active: boolean) {
  await requireUserAndProfile()
  const supabase = await createClient()
  const { error } = await supabase.from('operators').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}
