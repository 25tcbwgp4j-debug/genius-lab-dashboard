import { requireAuth } from '@/lib/auth/session'
import { getProfile } from '@/lib/auth/profile'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const user = await requireAuth()
  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')
  return <DashboardShell profile={profile}>{children}</DashboardShell>
}
