import { createClient } from '@/lib/supabase/server'
import { getProfileOrThrow } from '@/lib/auth/profile'
import type { Profile } from '@/types/database'

export type AuthUser = { id: string }

/**
 * Returns current user and profile. Throws if not authenticated or profile missing.
 * Use in server actions to enforce auth and then check RBAC with can* functions.
 */
export async function requireUserAndProfile(): Promise<{ user: AuthUser; profile: Profile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  const profile = await getProfileOrThrow(user.id)
  return { user: { id: user.id }, profile }
}
