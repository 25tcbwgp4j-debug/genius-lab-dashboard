import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Profile
}

export async function getProfileOrThrow(userId: string): Promise<Profile> {
  const profile = await getProfile(userId)
  if (!profile) throw new Error('Profile not found')
  return profile
}
