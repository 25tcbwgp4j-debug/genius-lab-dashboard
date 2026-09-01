'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Trash2 } from 'lucide-react'
import { addWorkLogAction, removeWorkLogAction } from '@/app/actions/banco'

type Nota = { chi: string; quando: string; testo: string }

/**
 * Il diario della lavorazione: qui il tecnico scrive cosa ha fatto davvero.
 * Ogni riga resta firmata e datata — serve al collaudo, serve se il pezzo
 * torna indietro, serve quando il cliente chiede conto di cosa è stato toccato.
 */
export function WorkLogCard({
  ticketId, log, technicians, assignedTo, canEdit,
}: {
  ticketId: string
  log: Nota[]
  technicians: string[]
  assignedTo: string | null
  canEdit: boolean
}) {
  const scelte = technicians.length ? technicians : (assignedTo ? [assignedTo] : [])
  const [chi, setChi] = useState(assignedTo ?? scelte[0] ?? '')
  const [testo, setTesto] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const aggiungi = () => {
    if (!testo.trim()) { setMsg('Scrivi cosa hai fatto prima di aggiungere'); return }
    start(async () => {
      const r = await addWorkLogAction(ticketId, chi, testo)
      if (r?.error) setMsg(r.error)
      else { setTesto(''); setMsg(null) }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Diario della lavorazione</span>
          {log.length > 0 && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {log.length} {log.length === 1 ? 'nota' : 'note'}
            </span>
          )}
        </CardTitle>
        <CardDescription>Cosa è stato fatto sul dispositivo, firmato e datato.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={chi} onChange={(e) => setChi(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-sm font-medium" aria-label="Chi scrive">
                {scelte.map((t) => <option key={t}>{t}</option>)}
                {chi && !scelte.includes(chi) && <option>{chi}</option>}
              </select>
              {assignedTo
                ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">assegnata a {assignedTo}</span>
                : <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">nessun tecnico assegnato</span>}
            </div>
            <Textarea rows={3} value={testo} onChange={(e) => setTesto(e.target.value)}
              placeholder="Cosa hai fatto, cosa hai trovato, cosa resta da fare…" />
            <Button type="button" size="sm" onClick={aggiungi} disabled={pending}>
              {pending ? 'Salvo…' : 'Aggiungi al diario'}
            </Button>
            {msg && <p className="text-xs text-destructive">{msg}</p>}
          </div>
        )}

        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ancora niente scritto su questa lavorazione.</p>
        ) : (
          <ol className="space-y-2">
            {log.map((n, i) => (
              <li key={i} className="rounded-r-md border border-l-[3px] border-l-emerald-500 bg-background px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <b className="text-sm">{n.chi}</b>
                  <time className="flex-1 font-mono text-[10px] tabular-nums text-muted-foreground">{n.quando}</time>
                  {canEdit && (
                    <button type="button" aria-label="Togli questa nota"
                      onClick={() => start(async () => { await removeWorkLogAction(ticketId, i) })}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{n.testo}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
