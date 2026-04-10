import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { NewTicketForm } from '@/components/tickets/new-ticket-form'

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; deviceId?: string }>
}) {
  const { customerId, deviceId } = await searchParams
  const supabase = await createClient()
  const { data: customers } = await supabase.from('customers').select('id, first_name, last_name, phone').order('last_name')
  let devices: { id: string; model: string; category: string; customer_id: string }[] = []
  if (customerId) {
    const res = await supabase.from('devices').select('id, model, category, customer_id').eq('customer_id', customerId)
    devices = res.data ?? []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/tickets" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuova riparazione</h1>
          <p className="text-muted-foreground">Assistenza / intake dispositivo</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dati riparazione</CardTitle>
          <CardDescription>Seleziona cliente e dispositivo. Il numero ticket e il link tracking verranno generati automaticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewTicketForm
            customers={customers ?? []}
            devices={devices}
            preselectedCustomerId={customerId ?? null}
            preselectedDeviceId={deviceId ?? null}
          />
        </CardContent>
      </Card>
    </div>
  )
}
