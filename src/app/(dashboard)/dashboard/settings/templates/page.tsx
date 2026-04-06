import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TemplateList } from '@/components/settings/template-list'
import type { TemplateKey } from '@/services/communications/template-resolver'
import { requireRole } from '@/lib/auth/require-role'
import { canAccessSettings } from '@/lib/auth/rbac'

const TEMPLATE_KEYS: TemplateKey[] = [
  'intake_created',
  'estimate_ready',
  'repair_update',
  'ready_for_pickup',
  'ready_for_shipping',
  'payment_instructions',
  'shipped',
  'ticket_closed',
]

export default async function SettingsTemplatesPage() {
  await requireRole(canAccessSettings)
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('message_templates')
    .select('*')
    .order('template_key')
    .order('channel')
  const byKey = (rows ?? []).reduce(
    (acc, r) => {
      const k = `${r.template_key}:${r.channel}`
      acc[k] = r
      return acc
    },
    {} as Record<string, { id: string; template_key: string; channel: string; subject: string | null; body: string; active: boolean }>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/settings" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template messaggi</h1>
          <p className="text-muted-foreground">Modifica i testi inviati per email e WhatsApp. Placeholder: {`{{customer_name}}`}, {`{{ticket_number}}`}, {`{{tracking_link}}`}, {`{{estimate_link}}`}, {`{{document_intake_link}}`}, {`{{document_estimate_link}}`}, {`{{document_payment_link}}`}, {`{{document_report_link}}`}, {`{{shop_phone}}`}, {`{{amount_due}}`}, {`{{status}}`}, {`{{working_hours}}`}, {`{{iban}}`}, {`{{beneficiary}}`}, {`{{payment_reference}}`}, {`{{proof_of_payment_instructions}}`}, {`{{payment_instructions}}`}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Elenco template</CardTitle>
          <CardDescription>Ogni evento ha un template per email e uno per WhatsApp. Modifica e salva.</CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateList templateKeys={TEMPLATE_KEYS} initialRows={byKey} />
        </CardContent>
      </Card>
    </div>
  )
}
