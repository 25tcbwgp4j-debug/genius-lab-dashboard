'use server'

import { createStaffClient } from '@/lib/supabase/staff'
import { revalidatePath } from 'next/cache'
import { richiediStaff } from '@/lib/auth/staff'

export async function addOperatorAction(name: string) {
  await richiediStaff()
  if (!name.trim()) return { error: 'Nome richiesto' }
  const supabase = await createStaffClient()
  const { error } = await supabase.from('operators').insert({ name: name.trim().toUpperCase() })
  if (error) {
    if (error.code === '23505') return { error: 'Operatore già esistente' }
    return { error: error.message }
  }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function removeOperatorAction(id: string) {
  await richiediStaff()
  const supabase = await createStaffClient()
  const { error } = await supabase.from('operators').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function toggleOperatorAction(id: string, active: boolean) {
  await richiediStaff()
  const supabase = await createStaffClient()
  const { error } = await supabase.from('operators').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}
