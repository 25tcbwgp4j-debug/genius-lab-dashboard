import { createStaffClient } from '@/lib/supabase/staff'
import Link from 'next/link'
import { Plus } from 'lucide-react'

/**
 * «Come va» — la giornata a colpo d'occhio.
 *
 * Prima erano sei numeri e basta, uno perfino in inglese, e per sapere QUALI
 * schede fossero bisognava andarsele a cercare. Presa la forma che sulla
 * dashboard Tarature funziona: i contatori sono **cliccabili** e portano
 * dritti all'elenco filtrato, e sotto ci sono le ultime schede toccate —
 * cliente, dispositivo, stato, prezzo — che è quello che si guarda davvero
 * la mattina.
 */

export const dynamic = 'force-dynamic'

const ETICHETTA: Record<string, string> = {
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

export default async function ComeVa() {
  const supabase = await createStaffClient()

  const [{ data: counts }, { data: ultime }] = await Promise.all([
    supabase.rpc('get_dashboard_counts'),
    supabase
      .from('tickets')
      .select(`id, ticket_number, status, created_at, total_amount,
               customer:customers(first_name, last_name, company_name),
               device:devices(model)`)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const c = (counts ?? {}) as Record<string, number>
  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  /* I contatori portano all'elenco già filtrato: un numero che non si può
     aprire costringe a rifare la ricerca a mano. */
  const CONTATORI = [
    { n: c.today ?? 0, e: 'aperte oggi', href: '/dashboard/tickets' },
    { n: c.open ?? 0, e: 'aperte in tutto', href: '/dashboard/tickets?status=aperte' },
    { n: c.waiting_approval ?? 0, e: 'preventivo mandato', href: '/dashboard/tickets?status=waiting_customer_approval', spia: true },
    { n: c.in_repair ?? 0, e: 'in lavorazione', href: '/dashboard/tickets?status=in_repair' },
    { n: c.waiting_parts ?? 0, e: 'in attesa ricambi', href: '/dashboard/tickets?status=waiting_parts' },
    { n: c.ready ?? 0, e: 'pronte per il cliente', href: '/dashboard/tickets?status=ready_for_pickup', spia: true },
  ]

  const nome = (r: { customer?: { first_name?: string; last_name?: string; company_name?: string | null } | null }) =>
    r.customer?.company_name
    || [r.customer?.first_name, r.customer?.last_name].filter(Boolean).join(' ')
    || '—'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Come va</h1>
          <p className="text-sm capitalize text-muted-foreground">{oggi}</p>
        </div>
        <Link href="/dashboard/tickets/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Nuova scheda
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {CONTATORI.map((k) => (
          <Link key={k.e} href={k.href}
            className={`rounded-lg border p-3 transition-colors hover:border-orange-400 hover:bg-orange-50/50 ${
              k.spia && k.n > 0 ? 'border-amber-300 bg-amber-50/40' : ''}`}>
            <p className={`font-mono text-2xl font-semibold tabular-nums leading-none ${
              k.spia && k.n > 0 ? 'text-amber-700' : ''}`}>
              {k.n.toLocaleString('it-IT')}
            </p>
            <p className="mt-1 text-xs leading-tight text-muted-foreground">{k.e}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Ultime schede
        </h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              {(ultime ?? []).map((r) => {
                const row = r as unknown as {
                  id: string; ticket_number: string; status: string; created_at: string
                  total_amount: number | null
                  customer?: { first_name?: string; last_name?: string; company_name?: string | null } | null
                  device?: { model?: string } | null
                }
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs font-semibold tabular-nums">
                      <Link href={`/dashboard/tickets/${row.id}`} className="block">{row.ticket_number}</Link>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-1.5">
                      <Link href={`/dashboard/tickets/${row.id}`} className="block">{nome(row)}</Link>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-1.5 text-xs text-muted-foreground">
                      {row.device?.model ?? '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${COLORE(row.status)}`}>
                        {ETICHETTA[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs tabular-nums">
                      {row.total_amount ? `${Number(row.total_amount).toLocaleString('it-IT')} €` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
