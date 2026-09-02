'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { listaSchedeAction, contatoriAction } from '@/app/actions/banco'

/**
 * L'elenco delle schede, a sinistra e sempre presente — come in FileMaker,
 * dove non si «torna alla lista» per cambiare scheda.
 * In cima i contatori: quante aspettano cosa. Un clic filtra.
 */

type Riga = {
  id: string
  ticket_number: string
  status: string
  office_owner: string | null
  created_at: string
  customer: { first_name: string; last_name: string; company_name: string | null } | null
  device: { model: string; category: string } | null
}

const ETICHETTA: Record<string, string> = {
  new: 'creata', intake_completed: 'da preventivare', in_diagnosis: 'in diagnosi',
  estimate_ready: 'preventivo pronto', waiting_customer_approval: 'preventivo inviato',
  approved: 'accettato', refused: 'rifiutato', waiting_parts: 'attesa ricambi',
  in_repair: 'in lavorazione', testing: 'in collaudo', ready_for_pickup: 'pronta',
  ready_for_shipping: 'da spedire', shipped: 'spedita', delivered: 'chiusa',
  unrepaired_returned: 'resa non riparata', cancelled: 'annullata',
}
const COLORE = (s: string) =>
  s === 'delivered' || s === 'shipped' ? 'bg-emerald-50 text-emerald-700'
  : s === 'refused' || s === 'unrepaired_returned' || s === 'cancelled' ? 'bg-red-50 text-red-700'
  : s === 'ready_for_pickup' || s === 'ready_for_shipping' ? 'bg-amber-50 text-amber-700'
  : 'bg-muted text-muted-foreground'

const CONTATORI = [
  { k: 'intake_completed', e: 'da preventivare' },
  { k: 'waiting_customer_approval', e: 'preventivo mandato' },
  { k: 'approved', e: 'accettati' },
  { k: 'in_repair', e: 'in lavorazione' },
  { k: 'ready_for_pickup', e: 'pronte' },
  { k: 'new', e: 'senza dispositivo' },
]

export function BancoElenco({ attivo }: { attivo: string }) {
  const router = useRouter()
  const [righe, setRighe] = useState<Riga[]>([])
  const [conti, setConti] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('tutte')
  const [pending, start] = useTransition()

  useEffect(() => { contatoriAction().then(setConti) }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      start(async () => {
        const r = await listaSchedeAction(q, filtro)
        setRighe((r.rows ?? []) as unknown as Riga[])
      })
    }, 180)
    return () => clearTimeout(t)
  }, [q, filtro])

  const nome = (r: Riga) =>
    r.customer?.company_name || [r.customer?.first_name, r.customer?.last_name].filter(Boolean).join(' ') || '—'

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b p-2.5">
        <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="numeric"
          placeholder="numero di scheda…" aria-label="Cerca la scheda"
          className="w-full rounded-md border bg-muted/40 px-2.5 py-1.5 text-sm" />
        <div className="grid grid-cols-3 gap-1">
          {CONTATORI.filter((c) => (conti[c.k] ?? 0) > 0).map((c) => (
            <button key={c.k} type="button"
              onClick={() => setFiltro(filtro === c.k ? 'tutte' : c.k)}
              className={`flex flex-col items-start rounded border px-1.5 py-1 text-left ${
                filtro === c.k ? 'border-orange-400 bg-orange-50' : 'hover:border-foreground/30'}`}>
              <b className={`font-mono text-sm tabular-nums leading-tight ${
                c.k === 'ready_for_pickup' ? 'text-amber-600' : ''} ${filtro === c.k ? 'text-orange-600' : ''}`}>
                {(conti[c.k] ?? 0).toLocaleString('it-IT')}
              </b>
              <span className="text-[9px] leading-tight text-muted-foreground">{c.e}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pending && righe.length === 0 && <p className="p-3 text-xs text-muted-foreground">Cerco…</p>}
        {!pending && righe.length === 0 && (
          <p className="p-3 text-xs text-muted-foreground">Nessuna scheda con questi criteri.</p>
        )}
        {righe.map((r) => (
          <button key={r.id} type="button" onClick={() => router.push(`/dashboard/tickets/${r.id}`)}
            aria-current={r.id === attivo}
            className={`block w-full border-b border-l-[3px] px-3 py-2 text-left transition-colors ${
              r.id === attivo ? 'border-l-orange-500 bg-orange-50/60' : 'border-l-transparent hover:bg-muted/50'}`}>
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs font-semibold tabular-nums">{r.ticket_number}</span>
              <span className={`rounded px-1.5 font-mono text-[9px] uppercase tracking-wide ${COLORE(r.status)}`}>
                {ETICHETTA[r.status] ?? r.status}
              </span>
            </span>
            <span className="block truncate text-[13px] font-medium">{nome(r)}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {r.device?.model ?? '—'}{r.office_owner ? ` · ${r.office_owner}` : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
