import { createClient } from '@/lib/supabase/server'
import { getLowStockParts } from '@/services/inventory/parts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Ticket, Clock, Package, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1 query RPC invece di 7 query separate per i contatori
  const [{ data: counts }, lowStockParts] = await Promise.all([
    supabase.rpc('get_dashboard_counts'),
    getLowStockParts(),
  ])

  const c = (counts ?? {}) as Record<string, number>
  const openCount = c.open ?? 0
  const approvalCount = c.waiting_approval ?? 0
  const partsCount = c.waiting_parts ?? 0
  const repairCount = c.in_repair ?? 0
  const pickupCount = c.ready ?? 0
  const todayCount = c.today ?? 0
  const lowStock = lowStockParts.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Panoramica riparazioni e attività</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oggi</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayCount}</p>
            <p className="text-xs text-muted-foreground">Riparazioni create oggi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aperti</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openCount}</p>
            <p className="text-xs text-muted-foreground">Ticket aperti</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In attesa approvazione</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{approvalCount}</p>
            <p className="text-xs text-muted-foreground">Preventivi da approvare</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In attesa ricambi</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{partsCount}</p>
            <p className="text-xs text-muted-foreground">Waiting parts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In riparazione</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{repairCount}</p>
            <p className="text-xs text-muted-foreground">In lavorazione</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pronti ritiro/spedizione</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pickupCount}</p>
            <p className="text-xs text-muted-foreground">Pronti per il cliente</p>
          </CardContent>
        </Card>
      </div>

      {lowStock > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scorte basse</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm">{lowStock} articoli sotto soglia minima.</p>
            <ul className="text-xs mt-1">
              {lowStockParts.slice(0, 5).map((p) => (
                <li key={p.id}>{p.name}: {p.quantity} / {p.minimum_stock}</li>
              ))}
              {lowStockParts.length > 5 && <li>…</li>}
            </ul>
            <Link href="/dashboard/inventory" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2')}>
              Vai al magazzino
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Azioni rapide</CardTitle>
          <CardDescription>Crea una nuova riparazione o cerca un cliente</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link href="/dashboard/tickets/new" className={cn(buttonVariants())}>
            Nuova riparazione
          </Link>
          <Link href="/dashboard/customers" className={cn(buttonVariants({ variant: 'outline' }))}>
            Clienti
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
