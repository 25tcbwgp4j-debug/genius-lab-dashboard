'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { trovaSchedeAction } from '@/app/actions/banco'

/**
 * «Trova», come in FileMaker: si scrive una cosa sola — numero di scheda,
 * cognome, telefono, modello o numero di serie — e si guarda il gruppo trovato.
 * In cima quante ne ha trovate; sotto le pagine da cinquanta.
 *
 * L'elenco è una tabella fitta apposta: al banco serve vedere venti schede
 * insieme, non sei riquadri colorati.
 */

type Riga = {
  id: string
  ticket_number: string
  status: string
  created_at: string
  total_amount: number | null
  office_owner: string | null
  customer: { first_name: string; last_name: string; company_name: string | null; phone: string | null } | null
  device: { model: string; serial_number: string | null } | null
}

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

const FILTRI = [
  { k: 'tutte', e: 'tutte' },
  { k: 'aperte', e: 'aperte' },
  { k: 'intake_completed', e: 'da preventivare' },
  { k: 'waiting_customer_approval', e: 'preventivo inviato' },
  { k: 'approved', e: 'accettate' },
  { k: 'in_repair', e: 'in lavorazione' },
  { k: 'ready_for_pickup', e: 'pronte' },
  { k: 'ready_for_shipping', e: 'da spedire' },
  { k: 'delivered', e: 'chiuse' },
]

export function TrovaSchede({ statoIniziale = 'tutte' }: { statoIniziale?: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [stato, setStato] = useState(statoIniziale)
  const [pagina, setPagina] = useState(0)
  const [righe, setRighe] = useState<Riga[]>([])
  const [trovate, setTrovate] = useState(0)
  const [per, setPer] = useState(50)
  const [errore, setErrore] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => { setPagina(0) }, [q, stato])
  useEffect(() => {
    const t = setTimeout(() => {
      start(async () => {
        const r = await trovaSchedeAction(q, stato, pagina)
        // se la ricerca si rompe si dice: prima tornava «nessuna scheda», che è un'altra cosa
        setErrore(r.error ?? null)
        setRighe((r.rows ?? []) as unknown as Riga[])
        setTrovate(r.count ?? 0)
        setPer(r.per ?? 50)
      })
    }, 200)
    return () => clearTimeout(t)
  }, [q, stato, pagina])

  const nome = (r: Riga) =>
    r.customer?.company_name || [r.customer?.first_name, r.customer?.last_name].filter(Boolean).join(' ') || '—'
  const pagine = Math.ceil(trovate / per)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="numero di scheda, cognome, telefono, modello o numero di serie…"
            aria-label="Trova una scheda"
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <Link href="/dashboard/tickets/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Nuova scheda
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {FILTRI.map((f) => (
          <button key={f.k} type="button" onClick={() => setStato(f.k)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              stato === f.k ? 'border-orange-400 bg-orange-50 font-semibold text-orange-700' : 'hover:bg-muted'}`}>
            {f.e}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {pending ? 'cerco…' : errore ? <b className="text-red-600">{errore}</b>
            : <><b className="tabular-nums text-foreground">{trovate.toLocaleString('it-IT')}</b> schede trovate</>}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">n.</th>
              <th className="px-3 py-2 text-left font-semibold">Cliente</th>
              <th className="px-3 py-2 text-left font-semibold">Telefono</th>
              <th className="px-3 py-2 text-left font-semibold">Dispositivo</th>
              <th className="px-3 py-2 text-left font-semibold">Stato</th>
              <th className="px-3 py-2 text-right font-semibold">Prezzo</th>
              <th className="px-3 py-2 text-left font-semibold">Aperta</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.id} onClick={() => router.push(`/dashboard/tickets/${r.id}`)}
                className="cursor-pointer border-t hover:bg-muted/50">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono font-semibold tabular-nums">{r.ticket_number}</td>
                <td className="max-w-[220px] truncate px-3 py-1.5">{nome(r)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-muted-foreground">{r.customer?.phone ?? '—'}</td>
                <td className="max-w-[260px] truncate px-3 py-1.5 text-xs">{r.device?.model ?? '—'}</td>
                <td className="px-3 py-1.5">
                  <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${COLORE(r.status)}`}>
                    {ETICHETTA[r.status] ?? r.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono tabular-nums">
                  {r.total_amount ? `${Number(r.total_amount).toLocaleString('it-IT')} €` : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('it-IT')}
                </td>
              </tr>
            ))}
            {!pending && righe.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                {errore ? `La ricerca si è rotta: ${errore}` : 'Nessuna scheda con questi criteri.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pagine > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}
            className="rounded border px-3 py-1 disabled:opacity-30">← indietro</button>
          <span className="tabular-nums text-muted-foreground">pagina {pagina + 1} di {pagine.toLocaleString('it-IT')}</span>
          <button type="button" disabled={pagina + 1 >= pagine} onClick={() => setPagina((p) => p + 1)}
            className="rounded border px-3 py-1 disabled:opacity-30">avanti →</button>
        </div>
      )}
    </div>
  )
}
