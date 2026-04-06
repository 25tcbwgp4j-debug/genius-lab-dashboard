import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { canAccessCommunications } from '@/lib/auth/rbac'
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

export default async function CommunicationsPage() {
  await requireRole(canAccessCommunications)
  const supabase = await createClient()
  const { data: comms } = await supabase
    .from('communications')
    .select(`
      id,
      channel,
      template_key,
      recipient,
      status,
      created_at,
      sent_at,
      ticket:tickets(id, ticket_number)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunicazioni</h1>
        <p className="text-muted-foreground">Log invii email e WhatsApp</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Elenco</CardTitle>
          <CardDescription>Ultime 100 comunicazioni</CardDescription>
        </CardHeader>
        <CardContent>
          {!comms?.length ? (
            <p className="py-8 text-center text-muted-foreground">Nessuna comunicazione registrata.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Canale</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comms.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.sent_at ? new Date(c.sent_at).toLocaleString('it-IT') : new Date(c.created_at).toLocaleString('it-IT')}
                    </TableCell>
                    <TableCell><Badge variant="outline">{c.channel}</Badge></TableCell>
                    <TableCell>{c.template_key}</TableCell>
                    <TableCell>{c.recipient}</TableCell>
                    <TableCell>
                      {((): React.ReactNode => {
                        const t = c.ticket as unknown as { id: string; ticket_number: string } | null
                        return t ? (
                          <Link href={`/dashboard/tickets/${t.id}`} className="text-primary hover:underline font-mono text-sm">
                            {t.ticket_number}
                          </Link>
                        ) : '—'
                      })()}
                    </TableCell>
                    <TableCell><Badge>{c.status}</Badge></TableCell>
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
