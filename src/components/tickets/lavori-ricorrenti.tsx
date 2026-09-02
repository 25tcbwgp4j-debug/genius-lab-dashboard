'use client'

import { useEffect, useState, useTransition } from 'react'
import { lavoriSuQuestoModelloAction, type LavoroRicorrente } from '@/app/actions/banco'
import { parseEstimate, total, type EstimateLine } from '@/lib/banco/estimate'
import { History } from 'lucide-react'

/**
 * Quello che si è già fatto su questo stesso modello.
 *
 * È il gesto vero del banco: si cerca una scheda dello stesso modello e anno e
 * si copia il preventivo, perché le lavorazioni sono sempre quelle — batteria,
 * display, scheda logica, e sugli iMac il disco. Qui non c'è da cercare: appena
 * si apre la scheda i lavori già fatti sono lì, ognuno con l'ultimo preventivo
 * e quante volte è stato fatto. Un clic e le righe sono dentro.
 */
export function LavoriRicorrenti({
  modello, onCopia, canEdit,
}: {
  modello: string
  onCopia: (righe: EstimateLine[]) => void
  canEdit: boolean
}) {
  const [gruppi, setGruppi] = useState<LavoroRicorrente[] | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    if (!modello) { setGruppi([]); return }
    start(async () => {
      const r = await lavoriSuQuestoModelloAction(modello)
      setGruppi(r.gruppi ?? [])
    })
  }, [modello])

  if (!gruppi) return <p className="text-xs text-muted-foreground">Cerco cosa è già stato fatto su questo modello…</p>
  if (!gruppi.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Su questo modello non risultano lavorazioni precedenti. Prendi le voci dal listino qui sotto.
      </p>
    )
  }

  const eur = (n: number) => (n ? `€ ${n.toLocaleString('it-IT')}` : '—')

  return (
    <div className="space-y-1.5">
      {gruppi.map((g) => (
        <button
          key={g.lavorazione}
          type="button"
          disabled={!canEdit}
          onClick={() => onCopia(parseEstimate(g.ultimo.body))}
          className="flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left hover:border-orange-400 hover:bg-orange-50 disabled:opacity-60"
          title={g.ultimo.body}
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-2">
              <b className="text-sm capitalize">{g.lavorazione}</b>
              <span className="text-[11px] text-muted-foreground">
                {g.volte === 1 ? 'una volta' : `${g.volte} volte`} su questo modello
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ultima: n. {g.ultimo.card_no} · {String(g.ultimo.month).padStart(2, '0')}/{g.ultimo.year}
              </span>
            </span>
            <span className="mt-0.5 block break-words text-[11px] leading-snug text-muted-foreground">
              {g.ultimo.body.slice(0, 150)}{g.ultimo.body.length > 150 ? '…' : ''}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <b className="block font-mono text-sm tabular-nums">{eur(g.prezzo)}</b>
            <span className="text-[10px] text-muted-foreground">copia</span>
          </span>
        </button>
      ))}
      <p className="pt-1 text-[11px] text-muted-foreground">
        <History className="mr-1 inline h-3 w-3" />
        Il prezzo è la mediana di quelle lavorazioni; il testo è quello dell’ultima scheda.
        Copiandolo controlla gli importi prima di mandare il preventivo.
      </p>
    </div>
  )
}
