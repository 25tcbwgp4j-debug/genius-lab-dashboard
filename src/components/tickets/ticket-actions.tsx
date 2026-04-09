'use client'

import { useState } from 'react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateTicketStatus } from '@/app/actions/tickets'
import { getAllowedNextStatuses } from '@/lib/ticket-workflow'
import type { TicketStatus } from '@/types/database'

export function TicketActions({ ticketId, currentStatus }: { ticketId: string; currentStatus: TicketStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [shippedDialogOpen, setShippedDialogOpen] = useState(false)
  const [courierName, setCourierName] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const nextOptions = getAllowedNextStatuses(currentStatus)

  async function handleResult(result: { success?: boolean; error?: string; notificationErrors?: string[] }) {
    if (result.error) {
      setWarning(`Errore: ${result.error}`)
    } else if (result.notificationErrors?.length) {
      setWarning(`Stato aggiornato, ma: ${result.notificationErrors.join('; ')}`)
    } else {
      setWarning(null)
    }
  }

  function handleStatusChange(newStatus: string | null) {
    if (!newStatus) return
    if (newStatus === 'shipped') {
      setCourierName('')
      setTrackingCode('')
      setShippedDialogOpen(true)
      return
    }
    startTransition(async () => {
      const result = await updateTicketStatus(ticketId, newStatus)
      await handleResult(result)
      router.refresh()
    })
  }

  function handleShippedSubmit() {
    startTransition(async () => {
      const result = await updateTicketStatus(ticketId, 'shipped', { courier_name: courierName, tracking_code: trackingCode })
      await handleResult(result)
      setShippedDialogOpen(false)
      router.refresh()
    })
  }

  if (!nextOptions.length) return null

  return (
    <>
      {warning && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          {warning}
          <button type="button" onClick={() => setWarning(null)} className="ml-2 font-medium underline">Chiudi</button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Cambia stato:</span>
        <Select onValueChange={handleStatusChange} disabled={isPending}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Seleziona nuovo stato" />
          </SelectTrigger>
          <SelectContent>
            {nextOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Dialog open={shippedDialogOpen} onOpenChange={setShippedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Segna come spedito</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="shipped-courier">Corriere</Label>
              <Input
                id="shipped-courier"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="es. DHL, SDA"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shipped-tracking">Codice tracciamento</Label>
              <Input
                id="shipped-tracking"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="es. 1234567890"
              />
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleShippedSubmit} disabled={isPending}>
              Conferma spedizione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
