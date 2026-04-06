import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { TicketActions } from '@/components/tickets/ticket-actions'
import { AIDiagnosisBlock } from '@/components/tickets/ai-diagnosis-block'
import { getProfile } from '@/lib/auth/profile'
import { canUseAIDiagnosis, canRecordPayment, canAssignTechnician, canChangeTicketStatus } from '@/lib/auth/rbac'
import { EstimateCard } from '@/components/tickets/estimate-card'
import { TicketPaymentsCard } from '@/components/tickets/ticket-payments-card'
import { TicketShippingCard } from '@/components/tickets/ticket-shipping-card'
import { TicketTechnicianSelect } from '@/components/tickets/ticket-technician-select'
import { TicketAcceptanceOperator } from '@/components/tickets/ticket-acceptance-operator'
import { CommunicationFlagsCard } from '@/components/tickets/communication-flags-card'
import type { TicketStatus } from '@/types/database'

const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Nuovo',
  intake_completed: 'Intake completato',
  in_diagnosis: 'In diagnosi',
  ai_diagnosis_generated: 'Diagnosi AI generata',
  estimate_ready: 'Preventivo pronto',
  waiting_customer_approval: 'In attesa approvazione',
  approved: 'Approvato',
  refused: 'Rifiutato',
  waiting_parts: 'In attesa ricambi',
  in_repair: 'In riparazione',
  testing: 'In test',
  ready_for_pickup: 'Pronto ritiro',
  ready_for_shipping: 'Pronto spedizione',
  shipped: 'Spedito',
  delivered: 'Consegnato',
  unrepaired_returned: 'Restituito non riparato',
  cancelled: 'Annullato',
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(id, first_name, last_name, email, phone, preferred_contact_channel),
      device:devices(id, model, category, serial_number, customer_reported_issue, device_password, apple_id, apple_id_password, special_notes, passcode_notes, intake_condition)
    `)
    .eq('id', id)
    .single()
  if (!ticket) notFound()

  const { data: events } = await supabase
    .from('ticket_events')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: aiDiagnoses } = await supabase
    .from('ticket_ai_diagnosis')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
  const latestAIDiagnosis = aiDiagnoses?.[0] ?? null

  const user = await supabase.auth.getUser()
  const profile = user.data.user ? await getProfile(user.data.user.id) : null
  const canUseAI = profile ? canUseAIDiagnosis(profile.role) : false
  const canRecordPay = profile ? canRecordPayment(profile.role) : false
  const canAssignTech = profile ? canAssignTechnician(profile.role) : false
  const canChangeStatus = profile ? canChangeTicketStatus(profile.role) : false

  const { data: technicians } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'technician')
    .order('display_name', { ascending: true, nullsFirst: false })

  const { data: ticketPayments } = await supabase
    .from('payments')
    .select('id, amount, payment_method, payment_date, reference, notes')
    .eq('ticket_id', id)
    .order('payment_date', { ascending: false })

  const { data: commFlags } = await supabase
    .from('communication_flags')
    .select('id, flag_type, sent_at')
    .eq('ticket_id', id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const trackingLink = `${baseUrl}/track/${ticket.public_tracking_token}`
  const estimateLink = `${baseUrl}/estimate/${ticket.public_tracking_token}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tickets" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">{ticket.ticket_number}</h1>
            <p className="text-muted-foreground">
              {ticket.device ? (ticket.device as { model: string; category: string }).model : '—'} ·{' '}
              {STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{ticket.priority}</Badge>
          <Badge>{ticket.payment_status}</Badge>
        </div>
      </div>

      <TicketActions ticketId={id} currentStatus={ticket.status as TicketStatus} />

      <div className="flex flex-wrap gap-4">
        {canAssignTech || ticket.assigned_technician_id ? (
          <TicketTechnicianSelect
            ticketId={id}
            assignedTechnicianId={ticket.assigned_technician_id}
            technicians={(technicians ?? []).map((t) => ({ id: t.id, display_name: t.display_name }))}
            canAssign={canAssignTech}
          />
        ) : null}
        <TicketAcceptanceOperator
          ticketId={id}
          currentOperator={(ticket as { acceptance_operator?: string | null }).acceptance_operator ?? null}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cliente e dispositivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Cliente:</span>{' '}
              <Link href={`/dashboard/customers/${(ticket.customer as { id: string }).id}`} className="text-primary hover:underline">
                {(ticket.customer as { first_name: string; last_name: string }).first_name}{' '}
                {(ticket.customer as { last_name: string }).last_name}
              </Link>
            </p>
            <p><span className="text-muted-foreground">Email:</span> {(ticket.customer as { email: string }).email}</p>
            <p><span className="text-muted-foreground">Telefono:</span> {(ticket.customer as { phone: string }).phone}</p>
            <p><span className="text-muted-foreground">Dispositivo:</span>{' '}
              {ticket.device ? `${(ticket.device as { model: string }).model} (${(ticket.device as { category: string }).category})` : '—'}
            </p>
            {ticket.device && (ticket.device as { serial_number?: string }).serial_number && (
              <p><span className="text-muted-foreground">Serial:</span> {(ticket.device as { serial_number: string }).serial_number}</p>
            )}
          </CardContent>
        </Card>
        <EstimateCard
          ticketId={id}
          estimateLaborCost={Number(ticket.estimate_labor_cost ?? 0)}
          estimatePartsCost={Number(ticket.estimate_parts_cost ?? 0)}
          estimateNotes={(ticket as { estimate_notes?: string | null }).estimate_notes ?? null}
          estimateItems={(ticket as { estimate_items?: { description: string; amount: number; list_price?: number | null }[] | null }).estimate_items ?? null}
          totalAmount={Number(ticket.total_amount ?? 0)}
          status={ticket.status as TicketStatus}
          canEdit={canChangeStatus}
        />
        <Card>
          <CardHeader>
            <CardTitle>Importi e link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Totale:</span> € {Number(ticket.total_amount).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Pagato:</span> € {Number(ticket.amount_paid).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Da saldare:</span> € {Math.max(0, Number(ticket.total_amount ?? 0) - Number(ticket.amount_paid ?? 0)).toFixed(2)}</p>
            <p className="pt-2">
              <span className="text-muted-foreground">Link tracking (pubblico):</span>
              <br />
              <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="text-primary break-all hover:underline">
                {trackingLink}
              </a>
            </p>
            <p>
              <span className="text-muted-foreground">Link approvazione preventivo:</span>
              <br />
              <a href={estimateLink} target="_blank" rel="noopener noreferrer" className="text-primary break-all hover:underline">
                {estimateLink}
              </a>
            </p>
          </CardContent>
        </Card>
        <TicketPaymentsCard
          ticketId={id}
          totalAmount={Number(ticket.total_amount ?? 0)}
          amountPaid={Number(ticket.amount_paid ?? 0)}
          payments={(ticketPayments ?? []).map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            payment_method: p.payment_method,
            payment_date: p.payment_date,
            reference: p.reference,
            notes: p.notes,
          }))}
          canRecordPayment={canRecordPay}
        />
        <TicketShippingCard
          ticketId={id}
          status={ticket.status as TicketStatus}
          shippingRequired={Boolean(ticket.shipping_required)}
          shippingAddress={ticket.shipping_address}
          recipientName={ticket.recipient_name}
          recipientPhone={ticket.recipient_phone}
          courierName={ticket.courier_name}
          trackingCode={ticket.tracking_code}
          shippingNotes={ticket.shipping_notes}
        />
      </div>

      <AIDiagnosisBlock
        ticketId={id}
        canUseAI={canUseAI}
        latestDiagnosis={latestAIDiagnosis}
        currentRiskFlags={ticket.ai_risk_flags}
      />

      <Card>
        <CardHeader>
          <CardTitle>Riepilogo riparazione</CardTitle>
          <CardDescription>Dettaglio completo intake, diagnosi e dati dispositivo</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Difetto segnalato</dt>
            <dd>{(ticket.device as { customer_reported_issue?: string })?.customer_reported_issue ?? '—'}</dd>

            <dt className="text-muted-foreground">Dispositivo</dt>
            <dd>{ticket.device ? `${(ticket.device as { model: string }).model} (${(ticket.device as { category: string }).category})` : '—'}</dd>

            <dt className="text-muted-foreground">Operatore accettazione</dt>
            <dd>{(ticket as { acceptance_operator?: string | null }).acceptance_operator ?? '—'}</dd>

            <dt className="text-muted-foreground">Sintesi intake</dt>
            <dd className="whitespace-pre-line">{ticket.intake_summary ?? '—'}</dd>

            <dt className="text-muted-foreground">Condizione ingresso</dt>
            <dd>{(ticket.device as { intake_condition?: string })?.intake_condition ?? '—'}</dd>

            <dt className="text-muted-foreground">Password dispositivo</dt>
            <dd>{(ticket.device as { device_password?: string })?.device_password ?? '—'}</dd>

            <dt className="text-muted-foreground">Apple ID</dt>
            <dd>{(ticket.device as { apple_id?: string })?.apple_id ?? '—'}</dd>

            <dt className="text-muted-foreground">Password Apple ID</dt>
            <dd>{(ticket.device as { apple_id_password?: string })?.apple_id_password ?? '—'}</dd>

            <dt className="text-muted-foreground">Garanzia 1° anno</dt>
            <dd>{(ticket as { warranty_first_year?: boolean | null }).warranty_first_year ? 'Sì' : 'No'}</dd>

            <dt className="text-muted-foreground">Garanzia 2° anno</dt>
            <dd>{(ticket as { warranty_second_year?: boolean | null }).warranty_second_year ? 'Sì' : 'No'}</dd>

            <dt className="text-muted-foreground">Spedizione</dt>
            <dd>{(ticket as { shipping_type?: string | null }).shipping_type ?? (ticket.shipping_required ? 'Corriere' : 'A mano')}</dd>

            <dt className="text-muted-foreground">Diagnosi tecnico</dt>
            <dd className="whitespace-pre-line">{ticket.diagnosis ?? '—'}</dd>

            {(ticket.device as { special_notes?: string })?.special_notes && (
              <>
                <dt className="text-muted-foreground">Note speciali</dt>
                <dd className="whitespace-pre-line">{(ticket.device as { special_notes: string }).special_notes}</dd>
              </>
            )}

            {ticket.status === 'refused' && (ticket as { refused_note?: string | null }).refused_note && (
              <>
                <dt className="text-muted-foreground text-destructive">Note rifiuto</dt>
                <dd className="text-destructive">{(ticket as { refused_note: string }).refused_note}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <CommunicationFlagsCard
        ticketId={id}
        flags={(commFlags ?? []).map(f => ({ id: f.id, flag_type: f.flag_type, sent_at: f.sent_at }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Timeline eventi</CardTitle>
        </CardHeader>
        <CardContent>
          {events?.length ? (
            <ul className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(e.created_at).toLocaleString('it-IT')}
                  </span>
                  <span>{e.event_type}</span>
                  {e.from_status && <Badge variant="outline">{e.from_status}</Badge>}
                  {e.to_status && <Badge>{e.to_status}</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Nessun evento.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
