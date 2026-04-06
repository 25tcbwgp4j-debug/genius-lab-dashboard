import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_method,
      payment_date,
      ticket:tickets(id, ticket_number),
      created_by
    `)
    .order('payment_date', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagamenti</h1>
        <p className="text-muted-foreground">Storico pagamenti registrati</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Elenco</CardTitle>
          <CardDescription>Ultimi 50 pagamenti</CardDescription>
        </CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="py-8 text-center text-muted-foreground">Nessun pagamento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Metodo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.payment_date).toLocaleDateString('it-IT')}</TableCell>
                    <TableCell>
                      {((): React.ReactNode => {
                        const t = p.ticket as unknown as { id: string; ticket_number: string } | null
                        return t ? (
                          <Link href={`/dashboard/tickets/${t.id}`} className="text-primary hover:underline font-mono">
                            {t.ticket_number}
                          </Link>
                        ) : '—'
                      })()}
                    </TableCell>
                    <TableCell>€ {Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="secondary">{p.payment_method}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
