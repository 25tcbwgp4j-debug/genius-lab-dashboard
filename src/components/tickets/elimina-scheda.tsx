'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { eliminaSchedaAction } from '@/app/actions/banco'

/**
 * «Elimina record», come in FileMaker — per le schede aperte per sbaglio o
 * doppie. Chiede conferma col numero davanti, perché non si torna indietro.
 * Il cliente resta in rubrica: sparisce solo la scheda.
 */
export function EliminaScheda({ ticketId, numero }: { ticketId: string; numero: string }) {
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setAperto(true)}
        className="text-muted-foreground hover:text-red-600" title="Elimina questa scheda">
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={aperto} onOpenChange={setAperto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Elimino la scheda n. {numero}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Spariscono la scheda, i suoi pagamenti, le mail segnate e la cronologia.
            Il cliente resta in rubrica e il dispositivo pure.
            <b className="block pt-2 text-foreground">Non si può annullare.</b>
          </p>
          {errore && <p className="text-sm text-red-600">{errore}</p>}
          <DialogFooter showCloseButton>
            <Button variant="destructive" disabled={pending}
              onClick={() => start(async () => {
                const r = await eliminaSchedaAction(ticketId)
                if (r.error) { setErrore(r.error); return }
                setAperto(false)
                router.push('/dashboard/tickets')
                router.refresh()
              })}>
              {pending ? 'Elimino…' : 'Elimina definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
