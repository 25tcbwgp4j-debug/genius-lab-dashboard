import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ClickableTableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()
  let query = supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      status,
      priority,
      created_at,
      customer:customers(first_name, last_name),
      device:devices(model, category)
    `)
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data: tickets } = await query.limit(100)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riparazioni</h1>
          <p className="text-muted-foreground">Ticket e stato lavorazioni</p>
        </div>
        <Link href="/dashboard/tickets/new" className={cn(buttonVariants())}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova riparazione
          </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Elenco</CardTitle>
          <CardDescription>Filtra per stato tramite query ?status=</CardDescription>
        </CardHeader>
        <CardContent>
          {!tickets?.length ? (
            <p className="py-8 text-center text-muted-foreground">Nessun ticket.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Priorità</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => {
                  const row = t as unknown as {
                    id: string
                    ticket_number: string
                    status: string
                    priority: string
                    created_at: string
                    customer?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[]
                    device?: { model: string; category: string } | { model: string; category: string }[]
                  }
                  const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer
                  const device = Array.isArray(row.device) ? row.device[0] : row.device
                  return (
                  <ClickableTableRow key={row.id} href={`/dashboard/tickets/${row.id}`}>
                    <TableCell className="font-mono font-medium">{row.ticket_number}</TableCell>
                    <TableCell>
                      {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
                    </TableCell>
                    <TableCell>{device ? `${device.model} (${device.category})` : '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{row.priority}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/tickets/${row.id}`} className="text-sm text-primary hover:underline">
                        Apri
                      </Link>
                    </TableCell>
                  </ClickableTableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
