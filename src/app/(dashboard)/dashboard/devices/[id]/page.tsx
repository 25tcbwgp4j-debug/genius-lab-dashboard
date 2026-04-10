import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Ticket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DeleteDeviceButton } from '@/components/devices/delete-device-button'

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: device } = await supabase
    .from('devices')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone)
    `)
    .eq('id', id)
    .single()
  if (!device) notFound()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_number, status, created_at')
    .eq('device_id', id)
    .order('created_at', { ascending: false })

  const c = device.customer as { id: string; first_name: string; last_name: string; email: string; phone: string } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/devices" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{device.model}</h1>
          <p className="text-muted-foreground">
            {device.brand} · {device.category}
            {device.serial_number && ` · ${device.serial_number}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dati dispositivo</CardTitle>
            <CardDescription>Informazioni di intake</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span>{' '}
              {c ? (
                <Link href={`/dashboard/customers/${c.id}`} className="text-primary hover:underline">
                  {c.first_name} {c.last_name}
                </Link>
              ) : '—'}
            </p>
            <p><span className="text-muted-foreground">IMEI:</span> {device.imei ?? '—'}</p>
            <p><span className="text-muted-foreground">Problema segnalato:</span> {device.customer_reported_issue ?? '—'}</p>
            <p><span className="text-muted-foreground">Stato intake:</span> {device.intake_condition ?? '—'}</p>
            <p><span className="text-muted-foreground">Note interne:</span> {device.internal_notes ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Riparazioni
            </CardTitle>
            <CardDescription>Storico su questo dispositivo</CardDescription>
          </CardHeader>
          <CardContent>
            {tickets?.length ? (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/dashboard/tickets/${t.id}`} className="text-primary hover:underline">
                      {t.ticket_number}
                    </Link>
                    <Badge variant="secondary" className="ml-2">{t.status}</Badge>
                    <span className="ml-2 text-muted-foreground text-sm">
                      {new Date(t.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Nessuna riparazione.</p>
            )}
            <Link href={`/dashboard/tickets/new?customerId=${device.customer_id}&deviceId=${device.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2')}>
                Nuova riparazione
              </Link>
          </CardContent>
        </Card>
      </div>

      <DeleteDeviceButton deviceId={device.id} />
    </div>
  )
}
