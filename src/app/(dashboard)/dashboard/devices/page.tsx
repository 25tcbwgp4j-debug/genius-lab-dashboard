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
  ClickableTableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function DevicesPage() {
  const supabase = await createClient()
  const { data: devices } = await supabase
    .from('devices')
    .select(`
      id,
      category,
      model,
      serial_number,
      customer:customers(id, first_name, last_name)
    `)
    .order('updated_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dispositivi</h1>
        <p className="text-muted-foreground">Elenco dispositivi registrati</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Elenco</CardTitle>
          <CardDescription>Dispositivi per cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {!devices?.length ? (
            <p className="py-8 text-center text-muted-foreground">Nessun dispositivo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modello</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => {
                  const row = d as unknown as { customer?: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] }
                  const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer
                  return (
                  <ClickableTableRow key={d.id} href={`/dashboard/devices/${d.id}`}>
                    <TableCell className="font-medium">{d.model}</TableCell>
                    <TableCell><Badge variant="secondary">{d.category}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{d.serial_number ?? '—'}</TableCell>
                    <TableCell>
                      {customer ? (
                        <Link href={`/dashboard/customers/${customer.id}`} className="hover:underline">
                          {customer.first_name} {customer.last_name}
                        </Link>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/devices/${d.id}`} className="text-sm text-primary hover:underline">
                        Dettaglio
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
