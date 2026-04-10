import { DashboardShell } from '@/components/layout/dashboard-shell'
import type { Profile } from '@/types/database'

// Layout dashboard semplificato: auth password-based via proxy.ts + cookie HMAC.
// Il proxy ha gia' bloccato l'accesso se il token non e' valido, quindi qui
// possiamo passare un profilo "staff" fisso (sistema mono-utente come Tarature).
// RBAC disattivato: un solo ruolo "admin" con accesso completo.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const staffProfile: Profile = {
    id: 'staff',
    role: 'admin',
    display_name: 'Staff Genius Lab',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return <DashboardShell profile={staffProfile}>{children}</DashboardShell>
}
