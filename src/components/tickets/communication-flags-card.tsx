'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleCommunicationFlag } from '@/app/actions/communication-flags'

const FLAG_TYPES = [
  { key: 'intake_sent', label: 'Scheda ingresso inviata' },
  { key: 'estimate_sent', label: 'Preventivo inviato' },
  { key: 'update_sent', label: 'Aggiornamento inviato' },
  { key: 'payment_sent', label: 'Consuntivo pagamento inviato' },
  { key: 'ready_sent', label: 'Pronto al ritiro inviato' },
] as const

type Flag = { id: string; flag_type: string; sent_at: string }

export function CommunicationFlagsCard({
  ticketId,
  flags,
}: {
  ticketId: string
  flags: Flag[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle(flagType: string) {
    startTransition(async () => {
      await toggleCommunicationFlag(ticketId, flagType)
      router.refresh()
    })
  }

  const flagMap = new Map(flags.map(f => [f.flag_type, f]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comunicazioni inviate</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {FLAG_TYPES.map(({ key, label }) => {
            const flag = flagMap.get(key)
            return (
              <li key={key} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(key)}
                  disabled={isPending}
                  className="flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs ${flag ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'}`}>
                    {flag ? '✓' : ''}
                  </span>
                  <span className={flag ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
                </button>
                {flag && (
                  <span className="text-muted-foreground text-xs">
                    {new Date(flag.sent_at).toLocaleString('it-IT')}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
