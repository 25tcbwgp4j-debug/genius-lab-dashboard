'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { vaiANumeroAction } from '@/app/actions/banco'

/**
 * La barra dei record, come in fondo a FileMaker: le frecce, il numero
 * scrivibile e la posizione nell'archivio.
 *
 * Le frecce funzionano anche da tastiera (← →), che è il modo in cui si
 * scorrono le schede al banco senza staccare la mano dal cacciavite.
 * Non rispondono mentre si sta scrivendo in un campo.
 */

type Props = {
  numero: string
  precedente?: string   // id della scheda più vecchia (freccia ▶)
  successiva?: string   // id della scheda più recente (freccia ◀)
  posizione: number
  totale: number
  primaId?: string
  ultimaId?: string
}

export function BarraRecord({ numero, precedente, successiva, posizione, totale, primaId, ultimaId }: Props) {
  const router = useRouter()
  const [testo, setTesto] = useState(numero)
  const [errore, setErrore] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const casella = useRef<HTMLInputElement>(null)

  useEffect(() => { setTesto(numero); setErrore(null) }, [numero])

  // ← → scorrono le schede, ma non mentre si scrive
  useEffect(() => {
    const dentroUnCampo = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || dentroUnCampo(e.target)) return
      if (e.key === 'ArrowLeft' && successiva) router.push(`/dashboard/tickets/${successiva}`)
      if (e.key === 'ArrowRight' && precedente) router.push(`/dashboard/tickets/${precedente}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, precedente, successiva])

  const vai = () => {
    if (testo.trim() === numero) return
    start(async () => {
      const r = await vaiANumeroAction(testo)
      if (r.error) { setErrore(r.error); casella.current?.select(); return }
      setErrore(null)
      router.push(`/dashboard/tickets/${r.id}`)
    })
  }

  const Salto = ({ id, titolo, children }: { id?: string; titolo: string; children: React.ReactNode }) =>
    id ? (
      <button type="button" title={titolo} aria-label={titolo} onClick={() => router.push(`/dashboard/tickets/${id}`)}
        className="rounded border px-1.5 py-1.5 hover:bg-muted">{children}</button>
    ) : (
      <span title={titolo} className="cursor-not-allowed rounded border px-1.5 py-1.5 opacity-25">{children}</span>
    )

  return (
    <div className="flex items-center gap-1">
      <Salto id={successiva && primaId} titolo="La più recente"><ChevronsLeft className="h-4 w-4" /></Salto>
      <Salto id={successiva} titolo="Scheda più recente (←)"><ChevronLeft className="h-4 w-4" /></Salto>

      <label className="mx-1 flex flex-col leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">scheda n.</span>
        <input
          ref={casella}
          value={testo}
          onChange={(e) => { setTesto(e.target.value); setErrore(null) }}
          onFocus={(e) => e.target.select()}
          onBlur={vai}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
            if (e.key === 'Escape') { setTesto(numero); setErrore(null); e.currentTarget.blur() }
          }}
          inputMode="numeric"
          aria-label="Numero della scheda: scrivilo e premi invio per andarci"
          className={`w-[7.5ch] rounded border bg-transparent px-1 py-0.5 font-mono text-2xl font-semibold tabular-nums leading-tight outline-none focus:border-orange-400 focus:bg-orange-50/50 ${
            errore ? 'border-red-400 text-red-600' : 'border-transparent hover:border-muted-foreground/30'
          } ${pending ? 'opacity-50' : ''}`}
        />
      </label>

      <Salto id={precedente} titolo="Scheda più vecchia (→)"><ChevronRight className="h-4 w-4" /></Salto>
      <Salto id={precedente && ultimaId} titolo="La più vecchia"><ChevronsRight className="h-4 w-4" /></Salto>

      <span className="ml-1 whitespace-nowrap text-[11px] leading-tight text-muted-foreground">
        {errore ? <b className="text-red-600">{errore}</b> : (
          <>{posizione.toLocaleString('it-IT')}ª<br />di {totale.toLocaleString('it-IT')}</>
        )}
      </span>
    </div>
  )
}
