'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'
import { duplicaSchedaAction } from '@/app/actions/banco'

/**
 * Duplica scheda.
 *
 * Il cliente che è già stato qui torna: si apre la sua ultima scheda e la si
 * duplica, invece di riscrivere nome, telefono, indirizzo e dati del pezzo.
 * Due strade, come si faceva in FileMaker:
 *  · stesso dispositivo → si tiene tutto (modello, seriale, codice di sblocco)
 *    e si azzerano difetto, preventivo e date: si scrive solo il guasto nuovo
 *  · dispositivo diverso → resta l'anagrafica, i dati del pezzo si riscrivono
 */
export function DuplicaScheda({ ticketId, modello }: { ticketId: string; modello: string }) {
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const duplica = (stesso: boolean) =>
    start(async () => {
      setErrore(null)
      const r = await duplicaSchedaAction(ticketId, stesso)
      if (r?.error) setErrore(r.error)
      else if (r?.id) router.push(`/dashboard/tickets/${r.id}`)
    })

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        title="Apri una scheda nuova per questo stesso cliente"
      >
        <Copy className="h-3.5 w-3.5" />
        Duplica
      </button>

      {aperto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setAperto(false) }}
        >
          <div className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Nuova scheda per questo cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anagrafica, indirizzo di spedizione e destinatario restano. Difetto,
              preventivo e date ripartono da zero.
            </p>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => duplica(true)}
                className="rounded-md border px-4 py-3 text-left hover:border-orange-400 hover:bg-orange-50 disabled:opacity-60"
              >
                <b className="block text-sm">Ha riportato lo stesso dispositivo</b>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Si tengono modello, numero di serie e codice di sblocco
                  {modello ? ` — ${modello}` : ''}. Scriverai solo il guasto nuovo.
                </span>
              </button>

              <button
                type="button"
                disabled={pending}
                onClick={() => duplica(false)}
                className="rounded-md border px-4 py-3 text-left hover:border-orange-400 hover:bg-orange-50 disabled:opacity-60"
              >
                <b className="block text-sm">È un altro dispositivo</b>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Resta solo l’anagrafica del cliente: modello, seriale e accessi
                  li scrivi sulla scheda nuova.
                </span>
              </button>
            </div>

            {errore && <p className="mt-3 text-sm text-destructive">{errore}</p>}
            {pending && <p className="mt-3 text-sm text-muted-foreground">Apro la scheda…</p>}

            <button
              type="button"
              onClick={() => setAperto(false)}
              className="mt-4 text-sm text-muted-foreground underline"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </>
  )
}
