import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { requireRole } from '@/lib/auth/require-role'
import { canAccessSettings } from '@/lib/auth/rbac'

export default async function SettingsPage() {
  await requireRole(canAccessSettings)
  const supabase = await createClient()
  const { data: settings } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-muted-foreground">Dati azienda e canali</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dati azienda</CardTitle>
          <CardDescription>Nome, indirizzo, contatti</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {settings ? (
            <>
              <p><span className="text-muted-foreground">Ragione sociale:</span> {settings.company_name}</p>
              <p><span className="text-muted-foreground">Indirizzo:</span> {settings.address ?? '—'}, {settings.city ?? ''} {settings.postal_code ?? ''}</p>
              <p><span className="text-muted-foreground">Telefono:</span> {settings.phone ?? '—'}</p>
              <p><span className="text-muted-foreground">Email:</span> {settings.email ?? '—'}</p>
              <p><span className="text-muted-foreground">Orari:</span> {settings.working_hours ?? '—'}</p>
              <p><span className="text-muted-foreground">IBAN:</span> {settings.iban ?? '—'}</p>
              <p><span className="text-muted-foreground">Intestatario:</span> {settings.account_holder ?? '—'}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Nessuna impostazione. Esegui il seed del database.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Template messaggi</CardTitle>
          <CardDescription>Modifica i testi usati per email e WhatsApp (intake, preventivo, pronto ritiro, ecc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/settings/templates" className={buttonVariants({ variant: 'outline' })}>
            Gestisci template
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
