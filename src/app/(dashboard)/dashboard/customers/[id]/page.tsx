import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Smartphone, Ticket } from 'lucide-react'
import { CustomerForm } from '@/components/customers/customer-form'
import { Badge } from '@/components/ui/badge'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single()
  if (!customer) notFound()

  const { data: devices } = await supabase
    .from('devices')
    .select('id, category, model, serial_number')
    .eq('customer_id', id)
    .order('updated_at', { ascending: false })

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_number, status, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/customers" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dati cliente</CardTitle>
          <CardDescription>Modifica e salva</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerForm mode="edit" customer={customer as import('@/types/database').Customer} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Dispositivi
            </CardTitle>
            <CardDescription>Elenco dispositivi registrati</CardDescription>
          </CardHeader>
          <CardContent>
            {devices?.length ? (
              <ul className="space-y-2">
                {devices.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dashboard/devices/${d.id}`}
                      className="text-primary hover:underline"
                    >
                      {d.model} ({d.category})
                    </Link>
                    {d.serial_number && (
                      <span className="ml-2 text-muted-foreground text-sm">
                        SN: {d.serial_number}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Nessun dispositivo.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Riparazioni
            </CardTitle>
            <CardDescription>Ultime riparazioni</CardDescription>
          </CardHeader>
          <CardContent>
            {tickets?.length ? (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/tickets/${t.id}`}
                      className="text-primary hover:underline"
                    >
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
            <Link href={`/dashboard/tickets/new?customerId=${id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2')}>
              Nuova riparazione
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
