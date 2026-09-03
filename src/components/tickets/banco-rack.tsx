'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Tag, FileDown, Printer } from 'lucide-react'
import { inviaComunicazioneAction } from '@/app/actions/banco'

/**
 * La pulsantiera del banco.
 *
 * Un solo tasto è pieno: quello che tocca fare adesso su questa scheda. Gli
 * altri restano a portata ma spenti — serve a non mandare il consuntivo prima
 * del preventivo, o a non chiedere un pagamento su un pezzo non ancora arrivato.
 */

type Flag = { id: string; flag_type: string; sent_at: string }

const COMUNICAZIONI = [
  { key: 'intake_sent',   t: 'Scheda di ingresso' },
  { key: 'estimate_sent', t: 'Preventivo' },
  { key: 'update_sent',   t: 'Aggiornamento prev.' },
  { key: 'ready_sent',    t: 'Pronto per il ritiro' },
]

export function BancoRack({
  ticketId, flags, dati, spedizione, canEdit, preventivoScritto = false,
}: {
  ticketId: string
  flags: Flag[]
  dati: Record<string, string | null>
  spedizione: boolean
  canEdit: boolean
  /** C'è già un preventivo su questa scheda: allora il pezzo l'abbiamo visto. */
  preventivoScritto?: boolean
}) {
  const [pending, start] = useTransition()
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null)
  const mappa = new Map(flags.map((f) => [f.flag_type, f]))

  /* La mail parte davvero: stesso testo dei modelli, col link al PDF della
     scheda. Il tasto diventa verde solo se l'invio è andato a buon fine. */
  const invia = (tasto: string, etichetta: string) =>
    start(async () => {
      setEsito(null)
      const r = await inviaComunicazioneAction(ticketId, tasto)
      if (r?.error) setEsito({ ok: false, testo: r.error })
      else {
        const vie = [r?.email && 'email', r?.whatsapp && 'WhatsApp'].filter(Boolean).join(' e ')
        setEsito({ ok: true, testo: `${etichetta}: inviata via ${vie || 'email'} a ${r?.a ?? ''}` })
      }
    })

  /* Il passo che tocca adesso. Se manca un presupposto, non si propone niente
     e si dice perché. */
  /* Sulle schede venute da FileMaker `arrived_at` non c'è, e nemmeno i flag
     delle mail: erano stati mandati da FileMaker, non da qui. Restava scritto
     «il dispositivo non è ancora arrivato» su tutte e 12.789 le schede
     d'archivio. Un preventivo scritto è la prova che il pezzo l'abbiamo avuto
     in mano: non si preventiva quello che non si è visto. */
  const arrivato = !!(dati.arrived_at || dati.approved_at || dati.repaired_at ||
                      dati.ready_for_pickup_at || dati.estimate_sent_at || dati.refused_at ||
                      preventivoScritto)

  const passo = (() => {
    if (dati.delivered_at) return null
    if (!arrivato) return null
    if (!mappa.has('intake_sent')) return 'intake_sent'
    if (!mappa.has('estimate_sent')) return 'estimate_sent'
    if (dati.refused_at) return null
    if (!dati.approved_at) return 'update_sent'
    if (!dati.repaired_at) return null
    return 'payment_sent'
  })()

  const motivo =
    dati.delivered_at ? 'Scheda chiusa.'
    : !arrivato ? 'Il dispositivo non è ancora arrivato.'
    : dati.refused_at ? 'Preventivo rifiutato: resta da restituire il dispositivo.'
    : (dati.approved_at && !dati.repaired_at) ? 'In lavorazione: aspetta il riparato.'
    : null

  const Btn = ({ k, t }: { k: string; t: string }) => {
    const f = mappa.get(k)
    const ora = k === passo
    return (
      <button type="button" disabled={!canEdit || pending}
        onClick={() => invia(k, t)}
        className={`relative mb-1.5 flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${
          f ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : ora ? 'border-orange-500 bg-orange-500 text-white hover:brightness-110'
            : 'hover:border-foreground/40 hover:bg-muted/50'}`}>
        {ora && !f && (
          <span className="absolute -top-1.5 left-2 rounded-sm bg-orange-500 px-1.5 font-mono text-[8.5px] uppercase tracking-wider text-white">
            da fare adesso
          </span>
        )}
        <span>{t}</span>
        <kbd className={`rounded border px-1 font-mono text-[9.5px] font-normal ${
          f ? 'border-emerald-300 text-emerald-700' : ora ? 'border-white/40 text-white' : 'text-muted-foreground'}`}>
          {f ? new Date(f.sent_at).toLocaleDateString('it-IT') : 'invia'}
        </kbd>
      </button>
    )
  }

  const Titolo = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground first:mt-0">
      {children}
    </h3>
  )

  return (
    <div className="space-y-1">
      {!passo && motivo && (
        <p className="mb-3 rounded border border-l-[3px] border-l-amber-500 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {motivo}
        </p>
      )}

      <Titolo>Comunicazioni al cliente</Titolo>
      {COMUNICAZIONI.map((c) => <Btn key={c.key} k={c.key} t={c.t} />)}

      <Titolo>Consuntivo — {spedizione ? 'spedizione' : 'ritiro'}</Titolo>
      <Btn k="payment_sent" t={`Consuntivo + ${spedizione ? 'spedizione' : 'ritiro'}`} />

      {esito && (
        <p className={`mb-2 rounded border px-2.5 py-2 text-xs leading-snug ${
          esito.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                   : 'border-red-300 bg-red-50 text-red-800'}`}>
          {esito.testo}
        </p>
      )}
      {pending && <p className="mb-2 text-xs text-muted-foreground">Sto inviando…</p>}

      <Titolo>Stampa e PDF</Titolo>
      <a href={`/api/tickets/${ticketId}/label?t=${Date.now()}`} target="_blank" rel="noopener noreferrer"
        className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-[13px] font-medium hover:bg-muted/50">
        <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Etichetta</span>
        <kbd className="rounded border px-1 font-mono text-[9.5px] font-normal text-muted-foreground">banco</kbd>
      </a>
      {[
        { t: 'intake', e: 'Scheda di ingresso' },
        { t: 'estimate', e: 'Preventivo' },
        { t: 'payment', e: 'Consuntivo e pagamento' },
        { t: 'report', e: 'Rapporto finale' },
      ].map((d) => (
        <a key={d.t} href={`/api/documents/${d.t}?token=${dati.public_tracking_token}&download=1`}
          className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-[13px] font-medium hover:bg-muted/50">
          <span className="flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" />{d.e}</span>
          <kbd className="rounded border px-1 font-mono text-[9.5px] font-normal text-muted-foreground">scarica</kbd>
        </a>
      ))}
      <a href={`/api/tickets/${ticketId}/fattura-xml`}
        className="flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-[13px] font-medium hover:bg-muted/50">
        <span className="flex items-center gap-1.5"><FileDown className="h-3.5 w-3.5" />Fattura XML</span>
        <kbd className="rounded border px-1 font-mono text-[9.5px] font-normal text-muted-foreground">SdI</kbd>
      </a>

      <Titolo>Link per il cliente</Titolo>
      <Link href={`/track/${dati.public_tracking_token}`} target="_blank"
        className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-[13px] hover:bg-muted/50">
        <span>Stato lavorazione</span>
        <kbd className="rounded border px-1 font-mono text-[9.5px] text-muted-foreground">apri</kbd>
      </Link>
      <Link href={`/estimate/${dati.public_tracking_token}`} target="_blank"
        className="flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-[13px] hover:bg-muted/50">
        <span>Approva il preventivo</span>
        <kbd className="rounded border px-1 font-mono text-[9.5px] text-muted-foreground">apri</kbd>
      </Link>
    </div>
  )
}
