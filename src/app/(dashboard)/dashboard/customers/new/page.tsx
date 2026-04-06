import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerForm } from '@/components/customers/customer-form'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/customers" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuovo cliente</h1>
          <p className="text-muted-foreground">Inserisci i dati del cliente</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dati cliente</CardTitle>
          <CardDescription>Campi obbligatori: nome, cognome, telefono, email</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
