'use client'

import { useEffect, useState } from 'react'
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
  MessageCircle,
  Settings,
  Wrench,
  Sun,
  Moon,
  Bell,
  BellOff,
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
import { useTheme } from '@/components/theme-provider'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/* Il menu segue il lavoro al banco, non la struttura del database.
   «Schede» sta in cima perché è lì che si passa la giornata; il resto è
   raggruppato per quando serve davvero. Nomi come li usa chi ci lavora. */
const navItems: { href: string; label: string; icon: React.ElementType; can: (r: Profile['role']) => boolean; gruppo: string }[] = [
  { href: '/dashboard/tickets', label: 'Schede', icon: Ticket, can: () => true, gruppo: 'Banco' },
  { href: '/dashboard/tickets/new', label: 'Nuova scheda', icon: Package, can: () => true, gruppo: 'Banco' },
  { href: '/dashboard', label: 'Come va', icon: LayoutDashboard, can: canAccessDashboard, gruppo: 'Banco' },

  { href: '/dashboard/customers', label: 'Clienti', icon: Users, can: canAccessCustomers, gruppo: 'Anagrafiche' },
  { href: '/dashboard/devices', label: 'Dispositivi', icon: Smartphone, can: canAccessDevices, gruppo: 'Anagrafiche' },

  { href: '/dashboard/payments', label: 'Incassi', icon: Wallet, can: canViewPayments, gruppo: 'Soldi e messaggi' },
  { href: '/dashboard/chat', label: 'WhatsApp', icon: MessageCircle, can: () => true, gruppo: 'Soldi e messaggi' },
  { href: '/dashboard/communications', label: 'Mail inviate', icon: MessageSquare, can: canAccessCommunications, gruppo: 'Soldi e messaggi' },

  // I ricambi con i loro prezzi vengono dalla vecchia dashboard e NON coincidono
  // con i preventivi di FileMaker: restano consultabili, ma fuori dal giro di
  // tutti i giorni, per non farli scambiare per il listino buono.
  { href: '/dashboard/inventory', label: 'Ricambi (vecchi prezzi)', icon: Package, can: canManageInventory, gruppo: 'Altro' },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings, can: canAccessSettings, gruppo: 'Altro' },
]

export function DashboardShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const push = usePushNotifications()
  const filtered = navItems.filter((item) => item.can(profile.role))

  /* Badge dei messaggi WhatsApp non letti, ogni 30 secondi.
     L'indirizzo giusto è quello del proxy — `/api/chat/conversations` non è mai
     esistito e dava un 404 nella console ogni mezzo minuto, col badge sempre a zero. */
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let cancelled = false
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/backend/api/chat/conversations?limit=100')
        if (!res.ok) return
        const data = await res.json()
        const list = data.conversations || []
        const count = list.filter(
          (c: { lastRole?: string }) => c.lastRole === 'user',
        ).length
        if (!cancelled) setUnread(count)
      } catch { /* ignora */ }
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Genius Lab
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((item, i) => {
            const Icon = item.icon
            // «Schede» resta acceso solo sull'elenco, non su ogni sotto-pagina
            const active =
              item.href === '/dashboard' || item.href === '/dashboard/tickets/new'
                ? pathname === item.href
                : item.href === '/dashboard/tickets'
                  ? pathname.startsWith('/dashboard/tickets') && pathname !== '/dashboard/tickets/new'
                  : pathname.startsWith(item.href)
            const nuovoGruppo = i === 0 || filtered[i - 1].gruppo !== item.gruppo
            const showBadge = item.href === '/dashboard/chat' && unread > 0
            return (
              <div key={item.href}>
              {nuovoGruppo && (
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground first:pt-1">
                  {item.gruppo}
                </p>
              )}
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-semibold">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              </div>
            )
          })}
        </nav>
        <div className="p-2 border-t">
          <p className="text-xs text-muted-foreground px-3 py-1 truncate" title={profile.display_name ?? undefined}>
            {profile.display_name ?? 'Utente'}
          </p>
          <p className="text-xs text-muted-foreground px-3 py-1 capitalize">{profile.role}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start mt-2"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
          </Button>
          {push.status !== 'unsupported' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start mt-1"
              disabled={push.busy || push.status === 'denied'}
              onClick={() => (push.status === 'subscribed' ? push.unsubscribe() : push.subscribe())}
              aria-label={push.status === 'subscribed' ? 'Disattiva notifiche' : 'Attiva notifiche'}
              title={push.status === 'denied' ? 'Permesso negato dal browser' : ''}
            >
              {push.status === 'subscribed' ? (
                <Bell className="h-4 w-4 mr-2 text-emerald-500" />
              ) : (
                <BellOff className="h-4 w-4 mr-2" />
              )}
              {push.status === 'subscribed'
                ? 'Notifiche attive'
                : push.status === 'denied'
                  ? 'Notifiche bloccate'
                  : 'Attiva notifiche'}
            </Button>
          )}
          <form action={signOut} className="mt-1">
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
