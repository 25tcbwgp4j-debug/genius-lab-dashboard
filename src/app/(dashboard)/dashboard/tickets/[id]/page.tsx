import { createStaffClient } from '@/lib/supabase/staff'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketActions } from '@/components/tickets/ticket-actions'
import { AIDiagnosisBlock } from '@/components/tickets/ai-diagnosis-block'
import { EstimateLinesCard } from '@/components/tickets/estimate-lines-card'
import { WorkLogCard } from '@/components/tickets/work-log-card'
import { OfficeOwnerCard } from '@/components/tickets/office-owner-card'
import { TicketPaymentsCard } from '@/components/tickets/ticket-payments-card'
import { TicketShippingCard } from '@/components/tickets/ticket-shipping-card'
import { TicketTechnicianSelect } from '@/components/tickets/ticket-technician-select'
import { TicketAcceptanceOperator } from '@/components/tickets/ticket-acceptance-operator'
import { BancoPercorso } from '@/components/tickets/banco-percorso'
import { BancoRack } from '@/components/tickets/banco-rack'
import { BancoElenco } from '@/components/tickets/banco-elenco'
import { DuplicaScheda } from '@/components/tickets/duplica-scheda'
import { BarraRecord } from '@/components/tickets/barra-record'
import { Linguette } from '@/components/tickets/scheda-linguette'
import { EliminaScheda } from '@/components/tickets/elimina-scheda'
import type { TicketStatus } from '@/types/database'

/**
 * La scheda di riparazione, al banco.
 *
 * Una schermata sola, come in FileMaker: l'elenco a sinistra (non si «torna
 * alla lista» per cambiare scheda), la scheda al centro, la pulsantiera a
 * destra. In cima la barra dei record col numero scrivibile.
 *
 * Sopra sta solo quello che serve ogni volta — a che punto è il pezzo, chi è
 * il cliente, che macchina è, quanto costa. Tutto il resto (lavorazione,
 * soldi, spedizione, cronologia) sta nelle linguette qui sotto: c'era già,
 * ma costringeva a scorrere mezzo schermo per arrivarci.
 */

const ETICHETTA: Record<TicketStatus, string> = {
  new: 'creata', intake_completed: 'da preventivare', in_diagnosis: 'in diagnosi',
  ai_diagnosis_generated: 'diagnosi AI', estimate_ready: 'preventivo pronto',
  waiting_customer_approval: 'preventivo inviato', approved: 'accettato', refused: 'rifiutato',
  waiting_parts: 'attesa ricambi', in_repair: 'in lavorazione', testing: 'in collaudo',
  ready_for_pickup: 'pronta', ready_for_shipping: 'da spedire', shipped: 'spedita',
  delivered: 'chiusa', unrepaired_returned: 'resa non riparata', cancelled: 'annullata',
}
const COLORE = (s: string) =>
  s === 'delivered' || s === 'shipped' ? 'bg-emerald-50 text-emerald-700'
  : s === 'refused' || s === 'unrepaired_returned' || s === 'cancelled' ? 'bg-red-50 text-red-700'
  : s === 'ready_for_pickup' || s === 'ready_for_shipping' ? 'bg-amber-50 text-amber-700'
  : 'bg-muted text-muted-foreground'

const Campo = ({ e, v, mono }: { e: string; v?: string | null; mono?: boolean }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{e}</dt>
    <dd className={`break-words text-sm ${mono ? 'font-mono' : ''}`}>{v || '—'}</dd>
  </div>
)

export default async function SchedaRiparazione({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createStaffClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`*,
      customer:customers(id, first_name, last_name, company_name, email, phone, address, city),
      device:devices(id, model, category, serial_number, customer_reported_issue,
                     device_password, apple_id, apple_id_password, special_notes, intake_condition)`)
    .eq('id', id)
    .single()
  if (!ticket) notFound()

  const [
    { data: events }, { data: aiDiagnoses }, { data: technicians },
    { data: ticketPayments }, { data: commFlags }, { data: operatorsList },
    { data: priceList }, { data: estimatePairs }, { data: prezziDispositivo },
    { data: precedente }, { data: successiva },
    { count: totale }, { count: piuRecenti }, { data: prima }, { data: ultima },
  ] = await Promise.all([
    supabase.from('ticket_events').select('*').eq('ticket_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('ticket_ai_diagnosis').select('*').eq('ticket_id', id).order('created_at', { ascending: false }).limit(1),
    supabase.from('profiles').select('id, display_name').eq('role', 'technician').order('display_name', { ascending: true, nullsFirst: false }),
    supabase.from('payments').select('id, amount, payment_method, payment_date, reference, notes').eq('ticket_id', id).order('payment_date', { ascending: false }),
    supabase.from('communication_flags').select('id, flag_type, sent_at').eq('ticket_id', id),
    supabase.from('operators').select('name').eq('active', true).order('name'),
    supabase.from('price_list').select('id, label, intervention, price, is_shipping').eq('active', true).order('sort_order').order('label'),
    supabase.from('estimate_pairs').select('id, label, first_line, second_line').eq('active', true).order('sort_order'),
    supabase.from('price_by_device').select('family, intervention, price, jobs, basis'),
    supabase.from('tickets').select('id').lt('created_at', ticket.created_at).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('tickets').select('id').gt('created_at', ticket.created_at).order('created_at', { ascending: true }).limit(1).maybeSingle(),
    // la posizione nell'archivio, come il «record 3 di 12.785» di FileMaker
    supabase.from('tickets').select('id', { count: 'exact', head: true }),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).gt('created_at', ticket.created_at),
    supabase.from('tickets').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('tickets').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle(),
  ])

  const canEdit = true                     // auth a password: lo staff ha accesso pieno
  const dev = ticket.device as {
    model?: string; category?: string; serial_number?: string; customer_reported_issue?: string
    device_password?: string; apple_id?: string; apple_id_password?: string; intake_condition?: string
  } | null
  const cli = ticket.customer as {
    first_name?: string; last_name?: string; company_name?: string
    email?: string; phone?: string; address?: string; city?: string
  } | null
  const nomeCliente = cli?.company_name || [cli?.first_name, cli?.last_name].filter(Boolean).join(' ') || '—'
  const tecnico = (technicians ?? []).find((t: { id: string }) => t.id === ticket.assigned_technician_id)?.display_name ?? null

  // i termini con cui cercare fra i preventivi già fatti, come in FileMaker
  /* Il prezzo dipende dal dispositivo: una batteria su un Air 13" sta a 124 €,
     sullo stesso lavoro un Pro 15" ne fa 210. Si cerca la famiglia dal modello. */
  const famiglia = (() => {
    const m = (dev?.model ?? '').toUpperCase()
    if (/MACBOOK ?PRO/.test(m)) {
      const p = m.match(/\b(13|14|15|16|17)[-\s]?INCH|\b(13|14|15|16|17)"/)
      const n = p?.[1] ?? p?.[2]
      return n ? `MACBOOK PRO ${n}" RETINA` : null
    }
    if (/MACBOOK ?AIR/.test(m)) {
      return /RETINA|M1|M2|M3|M4|20(1[89]|2\d)/.test(m) ? 'MACBOOK AIR 13" RETINA' : 'MACBOOK AIR 13"'
    }
    if (/IMAC/.test(m)) {
      const p = m.match(/\b(21|24|27)/)
      return p ? `IMAC ${p[1]}" RETINA` : null
    }
    if (/IPHONE/.test(m)) {
      const p = m.match(/IPHONE ?(\d+ ?(PRO ?MAX|PRO|PLUS|MINI)?|X[RS]?|SE)/)
      return p ? `IPHONE ${p[1]}`.trim() : null
    }
    return (dev?.model ?? '').toUpperCase() || null
  })()

  const cercaSimili = [
    (dev?.model ?? '').match(/\b(air|pro|mini|imac|iphone|ipad|watch|airpods|studio)\b/i)?.[1]?.toLowerCase(),
    (dev?.model ?? '').match(/\b(20\d{2})\b/)?.[1],
  ].filter(Boolean).join(' ')

  const dati: Record<string, string | null> = {
    created_at: ticket.created_at, pickup_requested_at: ticket.pickup_requested_at,
    arrived_at: ticket.arrived_at, intake_receipt_sent_at: ticket.intake_receipt_sent_at,
    estimate_sent_at: (commFlags ?? []).find((f: { flag_type: string }) => f.flag_type === 'estimate_sent')?.sent_at ?? null,
    approved_at: ticket.approved_at, refused_at: ticket.refused_at, repaired_at: ticket.repaired_at,
    ready_for_pickup_at: ticket.ready_for_pickup_at, shipped_at: ticket.shipped_at,
    delivered_at: ticket.delivered_at, courier_name: ticket.courier_name,
    tracking_code: ticket.tracking_code, public_tracking_token: ticket.public_tracking_token,
  }

  const Riquadro = ({ titolo, children }: { titolo: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{titolo}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )

  return (
    <div className="-m-4 grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_268px] lg:overflow-hidden">
      {/* elenco: sempre lì, non si torna indietro per cambiare scheda */}
      <aside className="hidden border-r bg-background lg:block lg:overflow-hidden">
        <BancoElenco attivo={id} />
      </aside>

      {/* la scheda */}
      <main className="space-y-4 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-3">
          <BarraRecord
            numero={ticket.ticket_number}
            precedente={precedente?.id}
            successiva={successiva?.id}
            posizione={(piuRecenti ?? 0) + 1}
            totale={totale ?? 0}
            primaId={prima?.id}
            ultimaId={ultima?.id}
          />
          <span className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${COLORE(ticket.status)}`}>
            {ETICHETTA[ticket.status as TicketStatus] ?? ticket.status}
          </span>
          {tecnico && (
            <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700" title="Tecnico assegnato">
              {tecnico}
            </span>
          )}
          {ticket.office_owner && (
            <span className="rounded bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700" title="In ufficio la segue">
              ufficio: {ticket.office_owner}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <DuplicaScheda ticketId={id} modello={dev?.model ?? ''} />
            <TicketActions ticketId={id} currentStatus={ticket.status as TicketStatus} />
            <EliminaScheda ticketId={id} numero={ticket.ticket_number} />
          </span>
        </div>

        <Riquadro titolo="Percorso della scheda">
          <BancoPercorso ticketId={id} dati={dati} stato={ticket.status} canEdit={canEdit} />
        </Riquadro>

        {/* cliente e dispositivo insieme: è la testa della scheda, si legge in un colpo */}
        <Card>
          <CardContent className="grid gap-x-6 gap-y-3 pt-5 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Cliente</p>
              <Campo e="Nome o ragione sociale" v={nomeCliente} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo e="Telefono" v={cli?.phone} mono />
                <Campo e="Email" v={cli?.email} />
              </div>
              <Campo e="Indirizzo di spedizione"
                v={ticket.shipping_address || [cli?.address, cli?.city].filter(Boolean).join(' — ')} />
            </div>

            <div className="space-y-3 md:border-l md:pl-6">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Dispositivo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo e="Modello" v={dev?.model} mono />
                <Campo e="Numero di serie" v={dev?.serial_number} mono />
              </div>
              <Campo e="Difetto indicato dal cliente" v={dev?.customer_reported_issue || ticket.intake_summary} />
              <div className="rounded-md border bg-muted/30 p-2.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accesso al dispositivo</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Campo e="Codice di sblocco" v={dev?.device_password} mono />
                  <Campo e="Apple ID" v={dev?.apple_id} mono />
                  <Campo e="Password Apple ID" v={dev?.apple_id_password} mono />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <EstimateLinesCard
          ticketId={id}
          initialLines={Array.isArray(ticket.estimate_lines) ? ticket.estimate_lines : []}
          priceList={priceList ?? []}
          pairs={(estimatePairs ?? []) as never}
          searchHint={cercaSimili}
          modello={dev?.model ?? ''}
          prezzi={(prezziDispositivo ?? []).filter(
            (r: { family: string }) => r.family === famiglia
          )}
          canEdit={canEdit}
          testoOriginale={ticket.estimate_notes}
          importoOriginale={ticket.total_amount}
        />

        <Linguette
          voci={[
            {
              k: 'lavorazione',
              e: 'Lavorazione',
              pallino: (Array.isArray(ticket.work_log) ? ticket.work_log.length : 0) > 0,
              contenuto: (
                <>
                  <Riquadro titolo="Chi ci sta lavorando">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TicketTechnicianSelect ticketId={id} technicians={technicians ?? []}
                        assignedTechnicianId={ticket.assigned_technician_id} canAssign={canEdit} />
                      <TicketAcceptanceOperator ticketId={id}
                        operators={(operatorsList ?? []).map((o: { name: string }) => o.name)}
                        currentOperator={ticket.acceptance_operator ?? null} />
                    </div>
                  </Riquadro>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <WorkLogCard ticketId={id} log={Array.isArray(ticket.work_log) ? ticket.work_log : []}
                      technicians={(technicians ?? []).map((t: { display_name: string | null }) => t.display_name ?? '').filter(Boolean)}
                      assignedTo={tecnico} canEdit={canEdit} />
                    <OfficeOwnerCard ticketId={id} owner={ticket.office_owner ?? null} reason={ticket.office_reason ?? null}
                      note={ticket.office_note ?? null} people={(operatorsList ?? []).map((o: { name: string }) => o.name)} canEdit={canEdit} />
                  </div>

                  <Card className="border-dashed border-amber-400">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[11px] uppercase tracking-[0.1em] text-amber-700">
                        Parte interna — non compare nel PDF del cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><Campo e="Lavorazione eseguita" v={ticket.diagnosis} /></div>
                      <Campo e="Condizione all'ingresso" v={dev?.intake_condition} />
                      <Campo e="Priorità" v={ticket.priority} />
                      <Campo e="Consegna prevista" v={ticket.expected_delivery_date} />
                      <Campo e="Stato pagamento" v={ticket.payment_status} />
                    </CardContent>
                  </Card>

                  <AIDiagnosisBlock ticketId={id} canUseAI={canEdit}
                    latestDiagnosis={aiDiagnoses?.[0] ?? null} currentRiskFlags={ticket.ai_risk_flags ?? null} />
                </>
              ),
            },
            {
              k: 'soldi',
              e: 'Incasso e spedizione',
              pallino: (ticketPayments?.length ?? 0) > 0 || !!ticket.tracking_code,
              contenuto: (
                <div className="grid gap-4 lg:grid-cols-2">
                  <TicketPaymentsCard ticketId={id} payments={ticketPayments ?? []} totalAmount={ticket.total_amount}
                    amountPaid={ticket.amount_paid} canRecordPayment={canEdit} />
                  <TicketShippingCard ticketId={id} status={ticket.status} shippingRequired={ticket.shipping_required}
                    shippingAddress={ticket.shipping_address} recipientName={ticket.recipient_name}
                    recipientPhone={ticket.recipient_phone} courierName={ticket.courier_name}
                    trackingCode={ticket.tracking_code} shippingNotes={ticket.shipping_notes}
                    canEditShipping={canEdit} />
                </div>
              ),
            },
            {
              k: 'storico',
              e: 'Cronologia',
              pallino: (events?.length ?? 0) > 0,
              contenuto: (events?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">Su questa scheda non è ancora successo niente.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {(events ?? []).map((e: { id: string; event_type: string; created_at: string; note?: string }) => (
                    <li key={e.id} className="flex gap-3">
                      <time className="shrink-0 font-mono tabular-nums text-muted-foreground">
                        {new Date(e.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </time>
                      <span>{e.event_type}{e.note ? ` — ${e.note}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      </main>

      {/* la pulsantiera */}
      <aside className="border-t bg-background p-3 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <BancoRack ticketId={id} flags={commFlags ?? []} dati={dati}
          spedizione={!!ticket.shipping_required} canEdit={canEdit}
          preventivoScritto={!!(ticket.estimate_notes ?? '').trim() || Number(ticket.total_amount) > 0
            || (Array.isArray(ticket.estimate_lines) && ticket.estimate_lines.length > 0)} />
      </aside>
    </div>
  )
}
