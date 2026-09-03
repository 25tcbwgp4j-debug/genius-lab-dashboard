'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Le linguette della scheda, come i pannelli a schede di FileMaker.
 *
 * Sopra resta sempre visibile quello che serve ogni volta (cliente,
 * dispositivo, preventivo); qui sotto finisce il resto, che prima obbligava a
 * scorrere per mezzo schermo: lavorazione, soldi, spedizione, cronologia.
 *
 * La linguetta scelta si ricorda per tutta la sessione: chi sta facendo i
 * pagamenti li trova aperti anche sulla scheda dopo.
 */

type Voce = { k: string; e: string; pallino?: boolean; contenuto: ReactNode }

const RICORDO = 'gl-linguetta'

export function Linguette({ voci }: { voci: Voce[] }) {
  const [attiva, setAttiva] = useState(voci[0]?.k)

  // si legge dopo l'idratazione, così server e client partono uguali
  useEffect(() => {
    try {
      const s = sessionStorage.getItem(RICORDO)
      if (s && voci.some((v) => v.k === s)) setAttiva(s)
    } catch { /* sessione non disponibile: si resta sulla prima */ }
  }, [voci])

  const scegli = (k: string) => {
    setAttiva(k)
    try { sessionStorage.setItem(RICORDO, k) } catch { /* pazienza */ }
  }

  return (
    <div>
      <div role="tablist" aria-label="Parti della scheda" className="flex flex-wrap items-end gap-0.5 border-b">
        {voci.map((v) => (
          <button
            key={v.k}
            type="button"
            role="tab"
            aria-selected={attiva === v.k}
            onClick={() => scegli(v.k)}
            className={`-mb-px flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-[13px] transition-colors ${
              attiva === v.k
                ? 'border-border bg-background font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {v.e}
            {v.pallino && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-label="c'è qualcosa" />}
          </button>
        ))}
      </div>

      {voci.map((v) => (
        <div key={v.k} role="tabpanel" hidden={attiva !== v.k} className="space-y-4 pt-4">
          {v.contenuto}
        </div>
      ))}
    </div>
  )
}
