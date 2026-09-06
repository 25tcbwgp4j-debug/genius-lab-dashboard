'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Search } from 'lucide-react'
import { trovaPreventiviAction } from '@/app/actions/banco'
import { parseEstimate, total, type EstimateLine } from '@/lib/banco/estimate'

/**
 * Trovare il preventivo già fatto su un dispositivo identico, e copiarlo.
 *
 * È il modo in cui si è sempre lavorato in FileMaker: si entra in Trova, si
 * scrivono il modello, l'anno e il lavoro in tre campi, si guarda cosa si era
 * fatto l'ultima volta e si copia. Qui i tre campi arrivano già compilati dal
 * dispositivo della scheda: nel caso normale basta premere «Copia».
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

/** I lavori che tornano sempre: sono il 70% dell'archivio. */
const LAVORI = ['logica', 'display', 'batteria', 'disco', 'tastiera', 'recupero dati',
                'connettore', 'ventola', 'top case', 'liquido', 'vetro', 'camera']

const eur = (n: number) => (n ? `€ ${n.toLocaleString('it-IT')}` : '—')

/** «MacBook Pro (13-inch, 2020)» → modello «pro 13», anno «2020». */
export function scomponi(modello: string) {
  const m = (modello || '').toUpperCase()
  const tipo = m.match(/\b(AIR|PRO|MINI|STUDIO|IMAC|IPHONE|IPAD|WATCH|AIRPODS)\b/)?.[1] ?? ''
  const poll = m.match(/\b(11|12|13|14|15|16|17|21|24|27)(?:[.,]\d)?\s*[-"]?\s*(?:INCH|POLLICI)?/)?.[1] ?? ''
  const anno = m.match(/\b(20[0-2]\d)\b/)?.[1] ?? ''
  const nome = [tipo, poll].filter(Boolean).join(' ').toLowerCase()
  return { modello: nome || m.split(/[(,]/)[0].trim().toLowerCase().slice(0, 20), anno }
}

export function TrovaPreventivo({
  modelloDispositivo, difetto, onCopia, canEdit,
}: {
  modelloDispositivo: string
  difetto?: string | null
  onCopia: (righe: EstimateLine[]) => void
  canEdit: boolean
}) {
  const iniziale = scomponi(modelloDispositivo)
  const [modello, setModello] = useState(iniziale.modello)
  const [anno, setAnno] = useState(iniziale.anno)
  // se il difetto dice già di che lavoro si tratta, si parte da lì
  const [lavoro, setLavoro] = useState(
    LAVORI.find((l) => (difetto ?? '').toLowerCase().includes(l.split(' ')[0])) ?? ''
  )
  const [righe, setRighe] = useState<Riga[]>([])
  const [quante, setQuante] = useState(0)
  const [mediana, setMediana] = useState(0)
  const [allargato, setAllargato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [cercato, setCercato] = useState(false)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const cerca = () => start(async () => {
    const r = await trovaPreventiviAction(modello, anno, lavoro)
    setErrore(r.error ?? null)
    setRighe((r.rows ?? []) as unknown as Riga[])
    setQuante(r.count ?? 0)
    setMediana(r.mediana ?? 0)
    setAllargato(!!r.allargato)
    setCercato(true)
  })

  // si cerca da soli appena la scheda si apre: nel caso normale il preventivo
  // è già lì e non si tocca niente
  useEffect(() => { if (modello) cerca() /* eslint-disable-next-line */ }, [])

  const Campo = ({ e, v, set, w, lista }:
    { e: string; v: string; set: (s: string) => void; w: string; lista?: string }) => (
    <label className={`flex flex-col ${w}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{e}</span>
      <input value={v} onChange={(ev) => set(ev.target.value)} list={lista}
        onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); cerca() } }}
        className="rounded-md border bg-background px-2 py-1.5 text-sm" />
    </label>
  )

  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50/30 p-3">
      <div className="mb-2 flex flex-wrap items-end gap-2">
        <Campo e="Modello" v={modello} set={setModello} w="min-w-[9rem] flex-1" />
        <Campo e="Anno" v={anno} set={setAnno} w="w-[5.5rem]" />
        <Campo e="Lavoro" v={lavoro} set={setLavoro} w="min-w-[8rem] flex-1" lista="gl-lavori" />
        <datalist id="gl-lavori">{LAVORI.map((l) => <option key={l} value={l} />)}</datalist>
        <button type="button" onClick={cerca} disabled={pending}
          className="flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
          <Search className="h-3.5 w-3.5" />{pending ? 'cerco…' : 'Trova'}
        </button>
      </div>

      {cercato && !pending && (
        <p className="mb-2 text-xs text-muted-foreground">
          {errore ? <b className="text-red-600">{errore}</b>
            : quante === 0 ? 'Nessun preventivo con questi tre criteri. Togli l\'anno, o cambia il lavoro.'
            : <>
                <b className="text-foreground">{quante.toLocaleString('it-IT')}</b> preventivi già fatti
                {mediana > 0 && <> · di solito <b className="text-foreground">{eur(mediana)}</b></>}
                {allargato && <b className="text-orange-700"> · nessuno del {anno}: ti mostro tutti gli anni</b>}
              </>}
        </p>
      )}

      {avviso && (
        <p className="mb-2 rounded border border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900">
          {avviso}
        </p>
      )}

      <div className="max-h-80 space-y-1.5 overflow-y-auto">
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
                <button type="button" onClick={() => {
                    const righe = parseEstimate(z.body)
                    onCopia(righe)
                    /* Il prezzo di scheda e il testo non sempre coincidono: su un quarto
                       dell'archivio la cifra segnata comprende voci che nel testo non
                       compaiono. Meglio dirlo che far partire un preventivo sbagliato. */
                    const ric = total(righe), seg = Number(z.price ?? 0)
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
