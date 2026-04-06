import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { CustomersTable } from '@/components/customers/customers-table'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('customers').select('*').order('updated_at', { ascending: false })
  if (q?.trim()) {
    const term = `%${q.trim()}%`
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
  }
  const { data: customers } = await query.limit(100)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clienti</h1>
          <p className="text-muted-foreground">Cerca e gestisci i clienti</p>
        </div>
        <Link href="/dashboard/customers/new" className={cn(buttonVariants())}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo cliente
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elenco</CardTitle>
          <CardDescription>
            Cerca per nome, cognome, email o telefono
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-4 flex gap-2" method="get" action="/dashboard/customers">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Cerca..."
                defaultValue={q}
                className="pl-9"
              />
            </div>
            <Button type="submit">Cerca</Button>
          </form>
          <CustomersTable customers={customers ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
