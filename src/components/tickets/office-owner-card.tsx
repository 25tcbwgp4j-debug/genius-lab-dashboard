'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setOfficeOwnerAction } from '@/app/actions/banco'

/** Perché una pratica resta ferma in ufficio, quando non è un problema tecnico. */
const MOTIVI = [
  'manca la password', "manca l'Apple ID", 'aspetta risposta del cliente',
  'da chiamare', 'preventivo da rifare', 'aspetta il pagamento', 'da spedire', 'altro',
]

/**
 * Chi segue la pratica in ufficio. È un'assegnazione distinta da quella del
 * tecnico: una scheda può essere ferma al banco e in ufficio nello stesso momento.
 */
export function OfficeOwnerCard({
  ticketId, owner, reason, note, people, canEdit,
}: {
  ticketId: string
  owner: string | null
  reason: string | null
  note: string | null
  people: string[]
  canEdit: boolean
}) {
  const [open, setOpen] = useState(false)
  const [chi, setChi] = useState(owner ?? people[0] ?? '')
  const [perche, setPerche] = useState(reason ?? MOTIVI[0])
  const [nota, setNota] = useState(note ?? '')
  const [pending, start] = useTransition()

  const salva = (o: string | null) =>
    start(async () => { await setOfficeOwnerAction(ticketId, o, perche, nota); setOpen(false) })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguita in ufficio</CardTitle>
        <CardDescription>Per quando è ferma e non dipende dal banco.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {owner ? (
            <>
              <b className="text-sm">{owner}</b>
              {reason && <span className="rounded bg-orange-50 px-2 py-0.5 font-mono text-[10px] text-orange-700">{reason}</span>}
              {note && <span className="text-xs text-muted-foreground">{note}</span>}
            </>
          ) : <span className="text-sm text-muted-foreground">nessuno</span>}
          {canEdit && (
            <div className="ml-auto flex gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={() => setOpen(!open)}>
                {owner ? 'cambia' : 'assegna'}
              </Button>
              {owner && (
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => salva(null)}>
                  togli
                </Button>
              )}
            </div>
          )}
        </div>

        {open && canEdit && (
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Persona</span>
              <select value={chi} onChange={(e) => setChi(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
                {people.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Perché è ferma</span>
              <select value={perche} onChange={(e) => setPerche(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
                {MOTIVI.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Cosa c’è da fare</span>
              <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="scrivi qui il dettaglio" />
            </label>
            <div className="sm:col-span-2">
              <Button type="button" size="sm" disabled={pending} onClick={() => salva(chi)}>
                {pending ? 'Salvo…' : 'Assegna'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
