'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Search, Check } from 'lucide-react'
import { saveEstimateLinesAction, searchPastEstimatesAction } from '@/app/actions/banco'
import { parseEstimate, total, totalWith, num, type EstimateLine } from '@/lib/banco/estimate'

type PriceRow = { id: string; label: string; intervention: string | null; price: number | null; is_shipping: boolean }
type Pair = { id: string; label: string; first_line: { t: string; nota?: string; i?: string }; second_line: { t: string; nota?: string; i?: string } }
type Prezzo = { family: string; intervention: string; price: number; jobs: number; basis: string }
type Past = { card_no: string; model: string | null; family: string | null; fault: string | null; body: string; price: number | null; year: number | null; month: number | null }

const eur = (n: number) => (n ? `€ ${n.toLocaleString('it-IT')}` : '—')
const NOTE = [null, 'compreso recupero dati', 'senza recupero dati', 'solo recupero dati']

export function EstimateLinesCard({
  ticketId, initialLines, priceList, pairs, searchHint, prezzi = [], canEdit,
}: {
  ticketId: string
  initialLines: EstimateLine[]
  priceList: PriceRow[]
  pairs: Pair[]
  searchHint: string
  prezzi?: Prezzo[]
  canEdit: boolean
}) {
  const [lines, setLines] = useState<EstimateLine[]>(initialLines ?? [])
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState(searchHint)
  const [past, setPast] = useState<Past[] | null>(null)
  const [searching, setSearching] = useState(false)

  /* Quanto è stato incassato su questo stesso dispositivo per questo lavoro.
     Non è una stima: è la mediana dei preventivi accettati. */
  const prezzoDi = (intervento: string | null) =>
    intervento ? prezzi.find((p) => p.intervention === intervento) ?? null : null

  const save = (next: EstimateLine[]) => {
    setLines(next)
    start(async () => {
      const r = await saveEstimateLinesAction(ticketId, next)
      setMsg(r?.error ? r.error : null)
    })
  }

  const add = (t: string, p: number | null, asOption = false, intervento: string | null = null) => {
    // se il listino generale non dà un prezzo, si usa quello di questo dispositivo
    if (p == null) p = prezzoDi(intervento)?.price ?? null
    const opts = lines.filter((r) => r.opt != null).length
    save([...lines, {
      t, p: p == null ? '' : p, iva: false, listino: null, nota: null,
      opt: asOption ? opts : null, on: asOption ? opts === 0 : false,
    }])
  }
  const addPair = (pr: Pair) => {
    const opts = lines.filter((r) => r.opt != null).length
    const pa = prezzoDi((pr.first_line as { i?: string }).i ?? null)?.price ?? ''
    const pb = prezzoDi((pr.second_line as { i?: string }).i ?? null)?.price ?? ''
    save([...lines,
      { t: pr.first_line.t, p: pa, nota: pr.first_line.nota ?? null, opt: opts, on: opts === 0 },
      { t: pr.second_line.t, p: pb, nota: pr.second_line.nota ?? null, opt: opts + 1, on: false },
    ])
  }
  const patch = (i: number, p: Partial<EstimateLine>) =>
    save(lines.map((r, k) => (k === i ? { ...r, ...p } : r)))
  const choose = (i: number) =>
    save(lines.map((r) => (r.opt == null ? r : { ...r, on: lines[i] === r })))
  const drop = (i: number) => {
    const next = lines.filter((_, k) => k !== i)
    let n = 0
    next.forEach((r) => { if (r.opt != null) r.opt = n++ })
    const alts = next.filter((r) => r.opt != null)
    if (alts.length && !alts.some((r) => r.on)) alts[0].on = true
    save(next)
  }

  const search = () => {
    setSearching(true)
    start(async () => {
      const r = await searchPastEstimatesAction(q)
      setPast(r.rows as Past[]); setSearching(false)
    })
  }

  const fixed = lines.filter((r) => r.opt == null)
  const alts = lines.filter((r) => r.opt != null)
  const missing = lines.filter((r) => (r.opt == null || r.on) && !r.p).length
  const shipping = priceList.filter((p) => p.is_shipping)
  const catalogue = priceList.filter((p) => !p.is_shipping)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Preventivo</span>
          <span className="font-mono text-xl tabular-nums">{eur(total(lines))}</span>
        </CardTitle>
        <CardDescription>
          Le voci si sommano. Le ipotesi sono alternative: nel totale entra solo quella scelta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* righe */}
        <div className="space-y-1.5">
          {lines.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nessuna voce. Prendila dal listino, oppure copiala da un preventivo già fatto.
            </p>
          )}
          {[...fixed, ...alts].map((r) => {
            const i = lines.indexOf(r)
            const isAlt = r.opt != null
            return (
              <div key={i}
                className={`rounded-md border px-2.5 py-2 ${
                  isAlt ? (r.on ? 'border-orange-300 bg-orange-50/50' : 'border-muted opacity-60') : 'bg-muted/30'
                }`}>
                <div className="flex items-start gap-2">
                  {isAlt && (
                    <button type="button" disabled={!canEdit} onClick={() => choose(i)}
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        r.on ? 'bg-orange-500 text-white' : 'border text-muted-foreground'}`}
                      title="Il cliente sceglie questa">{(r.opt ?? 0) + 1}ª</button>
                  )}
                  <span className={`min-w-0 flex-1 text-sm leading-snug break-words ${
                    isAlt && !r.on ? 'line-through decoration-muted' : ''}`}>
                    {r.t}
                    {r.listino ? <em className="ml-2 font-mono text-[10px] not-italic text-muted-foreground line-through">listino € {r.listino}</em> : null}
                    {r.nota ? <em className="ml-2 whitespace-nowrap rounded bg-emerald-50 px-1.5 text-[10px] not-italic text-emerald-700">{r.nota}</em> : null}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-end gap-1.5">
                  <button type="button" disabled={!canEdit} title="Recupero dati: compreso / senza / solo / niente"
                    onClick={() => patch(i, { nota: NOTE[(NOTE.indexOf(r.nota ?? null) + 1) % NOTE.length] })}
                    className="rounded border px-1.5 py-0.5 text-[10px] whitespace-nowrap text-muted-foreground hover:text-foreground">
                    {r.nota ? r.nota.split(' ')[0] : 'rec. dati'}
                  </button>
                  <button type="button" disabled={!canEdit} onClick={() => patch(i, { iva: !r.iva })}
                    className={`rounded border px-1.5 py-0.5 text-[10px] ${r.iva ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>
                    +IVA
                  </button>
                  <Input value={String(r.p ?? '')} disabled={!canEdit} inputMode="numeric"
                    onChange={(e) => patch(i, { p: e.target.value.replace(/[^\d]/g, '') })}
                    className="h-7 w-24 text-right font-mono tabular-nums" placeholder="—" aria-label="Importo" />
                  <button type="button" disabled={!canEdit} onClick={() => drop(i)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Togli la riga">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {alts.length > 0 && (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
            {alts.map((r, i) => (
              <div key={i} className="flex justify-between gap-3 py-0.5">
                <span className="text-muted-foreground">se sceglie la {i + 1}ª ipotesi</span>
                <span className="font-mono tabular-nums">{eur(totalWith(lines, r.opt ?? 0))}</span>
              </div>
            ))}
          </div>
        )}
        {missing > 0 && (
          <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {missing === 1 ? 'Una voce non ha ancora l’importo' : `${missing} voci non hanno l’importo`}: scrivilo prima di mandare il preventivo.
          </p>
        )}
        {msg && <p className="text-xs text-destructive">{msg}</p>}

        {canEdit && (
          <>
            {pairs.length > 0 && (
              <section>
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Le due ipotesi — un clic mette tutte e due
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {pairs.map((p) => (
                    <button key={p.id} type="button" onClick={() => addPair(p)}
                      title={`${p.first_line.t}\n${p.second_line.t}`}
                      className="rounded-full border border-dashed px-3 py-1 text-xs hover:border-orange-400 hover:bg-orange-50">
                      {p.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {shipping.length > 0 && (
              <section>
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Spedizione e ritiro
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {shipping.map((p) => (
                    <button key={p.id} type="button" onClick={() => add(p.label, p.price)}
                      className="rounded-full border px-3 py-1 text-xs hover:border-orange-400 hover:bg-orange-50">
                      {p.label}{p.price ? <b className="ml-1.5 font-mono">{eur(Number(p.price))}</b> : null}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Listino</h4>
              <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-md border p-1">
                {catalogue.map((p) => (
                  <div key={p.id} className="flex items-stretch gap-1">
                    <button type="button" onClick={() => add(p.label, p.price, false, p.intervention)}
                      className="flex flex-1 items-start justify-between gap-3 rounded px-2 py-1.5 text-left text-xs leading-snug hover:bg-orange-50">
                      <span className="break-words">{p.label}</span>
                      <b className="shrink-0 font-mono text-muted-foreground">
                        {p.price === 0 ? 'senza addebito'
                          : p.price != null ? eur(Number(p.price))
                          : prezzoDi(p.intervention)
                            ? <span className="text-orange-600" title={`mediana di ${prezzoDi(p.intervention)!.jobs} lavori accettati su questo dispositivo`}>
                                {eur(prezzoDi(p.intervention)!.price)}
                              </span>
                            : 'prezzo a mano'}
                      </b>
                    </button>
                    <button type="button" onClick={() => add(p.label, p.price, true, p.intervention)}
                      title="Aggiungi come ipotesi alternativa"
                      className="rounded px-2 text-[10px] text-muted-foreground hover:bg-orange-50 hover:text-orange-600">
                      ipotesi
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preventivi già fatti — i prezzi giusti stanno qui
              </h4>
              <div className="flex gap-1.5">
                <Input value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search() } }}
                  placeholder="modello, anno, intervento — es. air 2020 logica" className="h-8 font-mono text-xs" />
                <Button type="button" size="sm" variant="outline" onClick={search} disabled={pending}>
                  <Search className="mr-1 h-3.5 w-3.5" />Cerca
                </Button>
              </div>
              {searching && <p className="mt-2 text-xs text-muted-foreground">Cerco…</p>}
              {past && !searching && (
                past.length === 0
                  ? <p className="mt-2 text-xs text-muted-foreground">Nessun preventivo con tutte queste parole. Prova a togliere un termine.</p>
                  : <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
                      {past.map((z, i) => (
                        <div key={i} className="rounded-md border px-2 py-1.5">
                          <div className="flex flex-wrap items-baseline gap-2 text-xs">
                            <span className="font-mono text-muted-foreground">n. {z.card_no}</span>
                            <span className="font-mono text-muted-foreground">{String(z.month ?? '').padStart(2, '0')}/{z.year}</span>
                            <span className="flex-1 font-medium">{z.model || z.family}</span>
                            <b className="font-mono">{eur(Number(z.price ?? 0))}</b>
                            <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                              onClick={() => save(parseEstimate(z.body))}>
                              <Plus className="mr-1 h-3 w-3" />Copia
                            </Button>
                          </div>
                          {z.fault && <p className="mt-0.5 text-[11px] italic text-muted-foreground">{z.fault}</p>}
                          <p className="mt-0.5 break-words text-[11px] leading-snug">{z.body}</p>
                        </div>
                      ))}
                    </div>
              )}
            </section>
          </>
        )}

        {pending && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="h-3 w-3" />Salvo…</p>}
      </CardContent>
    </Card>
  )
}
