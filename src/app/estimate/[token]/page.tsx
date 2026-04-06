import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApproveRejectForm } from '@/components/tickets/approve-reject-form'

/** Public estimate approval: token-only access. Uses admin client so unauthenticated users can read. */
export default async function EstimatePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      status,
      estimate_labor_cost,
      estimate_parts_cost,
      total_amount,
      device:devices(model)
    `)
    .eq('public_tracking_token', token)
    .single()
  if (!ticket) notFound()
  const canApprove = ticket.status === 'waiting_customer_approval' || ticket.status === 'estimate_ready'
  if (!canApprove) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Preventivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Questo preventivo non è più in attesa di approvazione (stato attuale: {ticket.status}).
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const labor = Number(ticket.estimate_labor_cost ?? 0)
  const parts = Number(ticket.estimate_parts_cost ?? 0)
  const total = Number(ticket.total_amount ?? 0) || labor + parts

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Preventivo — {ticket.ticket_number}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {(Array.isArray(ticket.device) ? ticket.device[0] : ticket.device)?.model ?? 'Dispositivo'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Manodopera: € {labor.toFixed(2)}</p>
          <p>Ricambi: € {parts.toFixed(2)}</p>
          <p className="font-semibold">Totale: € {total.toFixed(2)}</p>
          <ApproveRejectForm ticketId={ticket.id} token={token} />
        </CardContent>
      </Card>
    </div>
  )
}
