'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { assignTechnicianAction } from '@/app/actions/tickets'

type Technician = { id: string; display_name: string | null }

export function TicketTechnicianSelect({
  ticketId,
  assignedTechnicianId,
  technicians,
  canAssign,
}: {
  ticketId: string
  assignedTechnicianId: string | null
  technicians: Technician[]
  canAssign: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const assigned = technicians.find((t) => t.id === assignedTechnicianId)

  function handleChange(value: string | null) {
    const id = !value || value === '__none__' ? null : value
    startTransition(async () => {
      await assignTechnicianAction(ticketId, id)
      router.refresh()
    })
  }

  if (!canAssign && !assignedTechnicianId) return null
  if (!canAssign) {
    return (
      <p className="text-sm">
        <span className="text-muted-foreground">Tecnico assegnato:</span>{' '}
        {assigned?.display_name ?? assignedTechnicianId ?? '—'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Tecnico assegnato</Label>
      <Select
        value={assignedTechnicianId ?? '__none__'}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Nessuno" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Nessuno</SelectItem>
          {technicians.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.display_name ?? t.id.slice(0, 8)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
