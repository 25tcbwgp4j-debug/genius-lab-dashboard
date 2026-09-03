'use client'

import { useTransition } from 'react'
import { setMilestoneAction } from '@/app/actions/banco'

/**
 * Il percorso della scheda.
 *
 * La scheda NON nasce «accettata»: nasce e basta. A volte il dispositivo arriva
 * dopo, portato dal cliente o ritirato dal corriere — e finché non è arrivato
 * non si preventiva nulla. Ogni tappa porta la sua data, e la prossima da fare
 * è evidenziata, così l'ordine non si sbaglia.
 */

type Tappa = { k: string; e: string; det?: string }

const PERCORSO: Tappa[] = [
  { k: 'created_at',             e: 'Scheda creata' },
  { k: 'pickup_requested_at',    e: 'Ritiro richiesto al corriere', det: 'ritiro' },
  { k: 'arrived_at',             e: 'Dispositivo arrivato' },
  { k: 'intake_receipt_sent_at', e: 'Scheda di ingresso consegnata' },
  { k: 'estimate_sent_at',       e: 'Preventivo inviato' },
  { k: 'approved_at',            e: 'Preventivo accettato' },
  { k: 'repaired_at',            e: 'Riparato' },
  { k: 'ready_for_pickup_at',    e: 'Pronto / consuntivo inviato' },
  { k: 'delivered_at',           e: 'Riconsegnato o spedito', det: 'uscita' },
]

const quando = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : null

export function BancoPercorso({
  ticketId, dati, stato, canEdit,
}: {
  ticketId: string
  dati: Record<string, string | null>
  stato: string
  canEdit: boolean
}) {
  const [pending, start] = useTransition()

  // una scheda già chiusa non deve mostrare tappe mai segnate: sarebbe lavoro
  // da fare che non esiste
  const chiusa = !!dati.delivered_at
  /* Le schede d'archivio non hanno `arrived_at`: se però una tappa successiva
     è segnata, il pezzo è arrivato e non va più chiesto. */
  const avanti = !!(dati.approved_at || dati.repaired_at || dati.ready_for_pickup_at ||
                    dati.estimate_sent_at || dati.refused_at || chiusa)
  const tappe = PERCORSO.filter((t) => {
    if (t.k === 'pickup_requested_at')
      return dati.pickup_requested_at || (!dati.arrived_at && !avanti)
    if (t.k === 'arrived_at') return dati.arrived_at || !avanti
    if (chiusa) return !!dati[t.k]
    return true
  })

  // la prossima è la prima vuota DOPO l'ultima fatta: una tappa saltata
  // (il cliente ha portato il pezzo a mano) non torna indietro a chiedere
  let ultima = -1
  tappe.forEach((t, i) => { if (dati[t.k]) ultima = i })
  const prossima = tappe.slice(ultima + 1).find((t) => !dati[t.k])?.k ?? null

  const segna = (k: string, on: boolean) =>
    start(async () => { await setMilestoneAction(ticketId, k, on) })

  return (
    /* Una striscia, non una colonna: nove tappe in verticale mangiavano mezzo
       schermo prima ancora di arrivare al preventivo. Qui stanno su due righe,
       e si legge in un colpo a che punto è il pezzo. */
    <ol className="flex flex-wrap gap-x-1 gap-y-2">
      {tappe.map((t) => {
        const fatto = !!dati[t.k]
        const ora = t.k === prossima
        const modificabile = canEdit && t.k !== 'created_at' && t.k !== 'estimate_sent_at'
        const dettaglio =
          t.det === 'ritiro' && dati.courier_name
            ? `${dati.courier_name}${dati.tracking_code ? ` · ${dati.tracking_code}` : ''}`
            : t.det === 'uscita' && fatto
              ? (dati.shipped_at ? 'spedito' : 'riconsegnato a mano')
              : null
        return (
          <li key={t.k} className={`flex min-w-[8.5rem] flex-1 flex-col gap-0.5 rounded-md border px-2 py-1.5 ${
            ora ? 'border-orange-400 bg-orange-50/60' : fatto ? 'border-emerald-200 bg-emerald-50/40' : 'border-dashed'
          }`}>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${
                fatto ? 'bg-emerald-500' : ora ? 'bg-orange-500' : 'bg-muted-foreground/25'
              }`} />
              <span className={`text-[11px] leading-tight ${
                fatto ? 'font-medium' : ora ? 'font-semibold text-orange-700' : 'text-muted-foreground'
              }`}>{t.e}</span>
            </span>
            <time className="pl-3.5 font-mono text-[10px] leading-tight tabular-nums text-muted-foreground">
              {quando(dati[t.k]) ?? '—'}
            </time>
            {dettaglio && <em className="pl-3.5 text-[10px] not-italic leading-tight text-muted-foreground">{dettaglio}</em>}
            {modificabile && (
              <button type="button" disabled={pending} onClick={() => segna(t.k, !fatto)}
                className={`ml-3.5 mt-0.5 self-start rounded border px-1.5 text-[10px] leading-4 ${
                  ora ? 'border-orange-400 font-semibold text-orange-600 hover:bg-orange-500 hover:text-white'
                      : 'text-muted-foreground hover:text-foreground'}`}>
                {fatto ? 'annulla' : 'segna'}
              </button>
            )}
          </li>
        )
      })}
    </ol>
  )
}
