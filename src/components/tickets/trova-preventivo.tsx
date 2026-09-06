'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Search } from 'lucide-react'
import { trovaPreventiviAction } from '@/app/actions/banco'
import { parseEstimate, total, type EstimateLine } from '@/lib/banco/estimate'

/**
 * Trovare il preventivo già fatto su un dispositivo identico, e copiarlo.
 *
 * Una casella sola, come il Trova rapida di FileMaker: si scrive
 * «pro 13" 2020 log» e si guarda cosa si era preso l'ultima volta. Le parole
 * si sommano, e ognuna può stare in un campo diverso.
 *
 * La casella arriva già compilata dal dispositivo e dal difetto della scheda, e
 * la ricerca parte da sola: nel caso normale il preventivo giusto è già lì.
 */

type Riga = {
  card_no: string
  model: string | null
  family: string | null
  fault: string | null
  body: string
  price: number | null
  year: number | null
  month: number | null
}

/** I tre lavori che coprono quasi tutto: un clic cambia solo quella parola. */
const LAVORI = ['logica', 'display', 'batteria']
const ALTRI = ['disco', 'tastiera', 'recupero dati', 'liquido', 'connettore', 'ventola', 'top case']

const eur = (n: number) => (n ? `€ ${n.toLocaleString('it-IT')}` : '—')

/** «MacBook Pro (13-inch, 2020)» + «danno alla scheda logica» → «pro 13 2020 logica». */
export function primaRicerca(modello: string, difetto?: string | null) {
  const m = (modello || '').toUpperCase()
  const tipo = m.match(/\b(AIR|PRO|MINI|STUDIO|IMAC|IPHONE|IPAD|WATCH|AIRPODS)\b/)?.[1] ?? ''
  const poll = m.match(/\b(11|12|13|14|15|16|17|21|24|27)(?:[.,]\d)?\s*[-"]?\s*(?:INCH|POLLICI)?/)?.[1] ?? ''
  const anno = m.match(/\b(20[0-2]\d)\b/)?.[1] ?? ''
  const d = (difetto ?? '').toLowerCase()
  const lavoro = [...LAVORI, ...ALTRI].find((l) => d.includes(l.split(' ')[0])) ?? ''
  const base = [tipo, poll].filter(Boolean).join(' ').toLowerCase()
    || m.split(/[(,]/)[0].trim().toLowerCase().slice(0, 20)
  return [base, anno, lavoro].filter(Boolean).join(' ')
}

export function TrovaPreventivo({
  modelloDispositivo, difetto, onCopia, canEdit,
}: {
  modelloDispositivo: string
  difetto?: string | null
  onCopia: (righe: EstimateLine[]) => void
  canEdit: boolean
}) {
  const [q, setQ] = useState(primaRicerca(modelloDispositivo, difetto))
  const [righe, setRighe] = useState<Riga[]>([])
  const [quante, setQuante] = useState(0)
  const [mediana, setMediana] = useState(0)
  const [allargato, setAllargato] = useState(false)
  const [anno, setAnno] = useState<string | undefined>()
  const [errore, setErrore] = useState<string | null>(null)
  const [cercato, setCercato] = useState(false)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const cerca = (testo = q) => start(async () => {
    const r = await trovaPreventiviAction(testo)
    setErrore(r.error ?? null)
    setRighe((r.rows ?? []) as unknown as Riga[])
    setQuante(r.count ?? 0)
    setMediana(r.mediana ?? 0)
    setAllargato(!!r.allargato)
    setAnno(r.anno)
    setCercato(true)
  })

  useEffect(() => { if (q.trim()) cerca(q) /* eslint-disable-next-line */ }, [])

  /** Cambia solo la parola del lavoro, lasciando modello e anno dove sono. */
  const cambiaLavoro = (nuovo: string) => {
    const tutti = [...LAVORI, ...ALTRI]
    const parole = q.split(/\s+/).filter((p) => !tutti.includes(p.toLowerCase()))
    const testo = [...parole, nuovo].join(' ').trim()
    setQ(testo); setAvviso(null); cerca(testo)
  }
  const lavoroAttivo = (l: string) => q.toLowerCase().split(/\s+/).includes(l)

  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[15rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setAvviso(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cerca() } }}
            placeholder={'modello, anno e lavoro — es. pro 13" 2020 log'}
            aria-label="Trova un preventivo già fatto"
            className="w-full rounded-md border bg-background py-1.5 pl-9 pr-3 font-mono text-sm"
          />
        </div>
        <button type="button" onClick={() => cerca()} disabled={pending}
          className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
          {pending ? 'cerco…' : 'Trova'}
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {LAVORI.map((l) => (
          <button key={l} type="button" onClick={() => cambiaLavoro(l)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              lavoroAttivo(l) ? 'border-orange-500 bg-orange-500 font-semibold text-white'
                             : 'bg-background hover:border-orange-400'}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {pending ? 'cerco…' : !cercato ? null
            : errore ? <b className="text-red-600">{errore}</b>
            : quante === 0 ? 'Nessun preventivo. Togli una parola.'
            : <><b className="text-foreground">{quante.toLocaleString('it-IT')}</b> già fatti
                {mediana > 0 && <> · di solito <b className="text-foreground">{eur(mediana)}</b></>}</>}
        </span>
      </div>

      {allargato && (
        <p className="mt-1.5 text-[11px] text-orange-700">
          Del <b>{anno}</b> non ce n'erano: ti mostro gli altri anni.
        </p>
      )}
      {avviso && (
        <p className="mt-1.5 rounded border border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900">
          {avviso}
        </p>
      )}

      <div className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
        {righe.map((z) => (
          <div key={z.card_no} className="rounded-md border bg-background px-2.5 py-2">
            <div className="flex flex-wrap items-baseline gap-2 text-xs">
              <span className="font-mono text-muted-foreground">n. {z.card_no}</span>
              <span className="font-mono text-muted-foreground">
                {String(z.month ?? '').padStart(2, '0')}/{z.year}
              </span>
              <span className="flex-1 truncate font-medium">{z.model || z.family}</span>
              <b className="font-mono tabular-nums">{eur(Number(z.price ?? 0))}</b>
              {canEdit && (
                <button type="button"
                  onClick={() => {
                    const nuove = parseEstimate(z.body)
                    onCopia(nuove)
                    /* Su un quarto dell'archivio la cifra segnata comprende voci che
                       nel testo non compaiono: meglio dirlo che far partire un
                       preventivo più basso del dovuto. */
                    const ric = total(nuove), seg = Number(z.price ?? 0)
                    setAvviso(seg && Math.abs(ric - seg) > 1
                      ? `Copiato dalla n. ${z.card_no}: dal testo vengono ${eur(ric)}, ma su quella scheda era segnato ${eur(seg)}. Controlla se manca una voce.`
                      : null)
                  }}
                  className="flex items-center gap-1 rounded border border-orange-400 px-2 py-0.5 text-[11px] font-medium text-orange-700 hover:bg-orange-500 hover:text-white">
                  <Plus className="h-3 w-3" />Copia
                </button>
              )}
            </div>
            {z.fault && <p className="mt-0.5 text-[11px] italic text-muted-foreground">{z.fault}</p>}
            <p className="mt-0.5 break-words text-[11px] leading-snug">{z.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
