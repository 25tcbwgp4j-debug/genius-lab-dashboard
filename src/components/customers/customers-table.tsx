'use client'

import Link from 'next/link'
import type { Customer } from '@/types/database'
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

export function CustomersTable({ customers }: { customers: Customer[] }) {
  if (!customers.length) {
    return (
      <p className="py-8 text-center text-muted-foreground">Nessun cliente trovato.</p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telefono</TableHead>
          <TableHead>Canale</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => (
          <ClickableTableRow key={c.id} href={`/dashboard/customers/${c.id}`}>
            <TableCell>
              <Link href={`/dashboard/customers/${c.id}`} className="font-medium hover:underline">
                {c.first_name} {c.last_name}
              </Link>
            </TableCell>
            <TableCell>{c.email}</TableCell>
            <TableCell>{c.phone}</TableCell>
            <TableCell>
              <Badge variant="secondary">{c.preferred_contact_channel}</Badge>
            </TableCell>
            <TableCell>
              <Link
                href={`/dashboard/customers/${c.id}`}
                className="text-sm text-primary hover:underline"
              >
                Dettaglio
              </Link>
            </TableCell>
          </ClickableTableRow>
        ))}
      </TableBody>
    </Table>
  )
}
