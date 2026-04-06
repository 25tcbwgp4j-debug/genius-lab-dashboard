import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/session'
import { getProfile } from '@/lib/auth/profile'
import type { AppRole } from '@/types/database'

/**
 * Ensures the current user is authenticated and has a profile with a role that passes the predicate.
 * Use in dashboard pages that are restricted by role (e.g. settings = admin only).
 * Redirects to /login if not authenticated, to /dashboard if role not allowed.
 */
export async function requireRole(allowed: (role: AppRole) => boolean): Promise<{ role: AppRole }> {
  const user = await getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')
  if (!allowed(profile.role)) redirect('/dashboard')
  return { role: profile.role }
}
