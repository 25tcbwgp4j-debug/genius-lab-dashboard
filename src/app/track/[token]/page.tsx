import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATUS_LABELS: Record<string, string> = {
  new: 'Registrato',
  intake_completed: 'In assistenza',
  in_diagnosis: 'In diagnosi',
  estimate_ready: 'Preventivo pronto',
  waiting_customer_approval: 'In attesa tua approvazione',
  approved: 'Approvato',
  waiting_parts: 'In attesa ricambi',
  in_repair: 'In riparazione',
  testing: 'In collaudo',
  ready_for_pickup: 'Pronto per il ritiro',
  ready_for_shipping: 'Pronto per la spedizione',
  shipped: 'Spedito',
  delivered: 'Consegnato',
  cancelled: 'Annullato',
  refused: 'Preventivo non accettato',
  unrepaired_returned: 'Restituito',
}

/** Public tracking page: token-only access, no PII. Uses admin client so unauthenticated users can read. */
export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      ticket_number,
      status,
      total_amount,
      amount_paid,
      approved_by_customer,
      device:devices(model, category)
    `)
    .eq('public_tracking_token', token)
    .single()
  if (!ticket) notFound()

  const amountDue = Number(ticket.total_amount) - Number(ticket.amount_paid)
  const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Genius Lab — Stato riparazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-mono font-semibold">{ticket.ticket_number}</p>
          <p className="text-muted-foreground">
            {((): string => {
            const d = Array.isArray(ticket.device) ? ticket.device[0] : ticket.device
            return d ? `${d.model} (${d.category})` : 'Dispositivo'
          })()}
          </p>
          <div>
            <span className="text-muted-foreground">Stato: </span>
            <Badge>{statusLabel}</Badge>
          </div>
          {ticket.status === 'waiting_customer_approval' && (
            <p className="text-sm text-amber-600">In attesa di approvazione del preventivo. Controlla la email o WhatsApp per il link.</p>
          )}
          <div className="pt-2 border-t text-sm">
            <p><span className="text-muted-foreground">Totale:</span> € {Number(ticket.total_amount).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Pagato:</span> € {Number(ticket.amount_paid).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Da saldare:</span> € {amountDue.toFixed(2)}</p>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Per informazioni: contatta il centro assistenza Genius Lab.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
