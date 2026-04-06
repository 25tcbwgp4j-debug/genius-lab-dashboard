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
import { updateAcceptanceOperatorAction } from '@/app/actions/tickets'

export function TicketAcceptanceOperator({
  ticketId,
  currentOperator,
  operators,
}: {
  ticketId: string
  currentOperator: string | null
  operators: string[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string | null) {
    const operator = !value || value === '__none__' ? null : value
    startTransition(async () => {
      await updateAcceptanceOperatorAction(ticketId, operator)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <Label>Operatore accettazione</Label>
      <Select
        value={currentOperator ?? '__none__'}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Nessuno" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Nessuno</SelectItem>
          {operators.map((nome) => (
            <SelectItem key={nome} value={nome}>
              {nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
