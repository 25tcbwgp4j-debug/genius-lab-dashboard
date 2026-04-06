'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Smartphone,
  Ticket,
  Package,
  Wallet,
  MessageSquare,
  Settings,
  Wrench,
} from 'lucide-react'
import type { Profile } from '@/types/database'
import {
  canAccessDashboard,
  canAccessCustomers,
  canAccessDevices,
  canManageInventory,
  canViewPayments,
  canAccessCommunications,
  canAccessSettings,
} from '@/lib/auth/rbac'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'

const navItems: { href: string; label: string; icon: React.ElementType; can: (r: Profile['role']) => boolean }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, can: canAccessDashboard },
  { href: '/dashboard/customers', label: 'Clienti', icon: Users, can: canAccessCustomers },
  { href: '/dashboard/devices', label: 'Dispositivi', icon: Smartphone, can: canAccessDevices },
  { href: '/dashboard/tickets', label: 'Riparazioni', icon: Ticket, can: () => true },
  { href: '/dashboard/inventory', label: 'Magazzino', icon: Package, can: canManageInventory },
  { href: '/dashboard/payments', label: 'Pagamenti', icon: Wallet, can: canViewPayments },
  { href: '/dashboard/communications', label: 'Comunicazioni', icon: MessageSquare, can: canAccessCommunications },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings, can: canAccessSettings },
]

export function DashboardShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname()
  const filtered = navItems.filter((item) => item.can(profile.role))

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Genius Lab
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {filtered.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-2 border-t">
          <p className="text-xs text-muted-foreground px-3 py-1 truncate" title={profile.display_name ?? undefined}>
            {profile.display_name ?? 'Utente'}
          </p>
          <p className="text-xs text-muted-foreground px-3 py-1 capitalize">{profile.role}</p>
          <form action={signOut} className="mt-2">
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Esci
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
