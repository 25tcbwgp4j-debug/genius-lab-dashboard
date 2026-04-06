'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTicket } from '@/app/actions/tickets'

const schema = z.object({
  customer_id: z.string().uuid('Seleziona un cliente'),
  device_id: z.string().uuid('Seleziona un dispositivo'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  intake_summary: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Customer = { id: string; first_name: string; last_name: string; phone: string }
type Device = { id: string; model: string; category: string; customer_id: string }

export function NewTicketForm({
  customers,
  devices: initialDevices,
  preselectedCustomerId,
  preselectedDeviceId,
}: {
  customers: Customer[]
  devices: Device[]
  preselectedCustomerId: string | null
  preselectedDeviceId: string | null
}) {
  const [devices, setDevices] = useState<Device[]>(initialDevices)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: {
      customer_id: preselectedCustomerId ?? '',
      device_id: preselectedDeviceId ?? '',
      priority: 'normal',
      intake_summary: '',
    },
  })

  const selectedCustomerId = watch('customer_id')

  useEffect(() => {
    if (!selectedCustomerId) {
      setDevices([])
      setValue('device_id', '')
      return
    }
    fetch(`/api/customers/${selectedCustomerId}/devices`)
      .then((res) => res.json())
      .then((data: Device[]) => {
        setDevices(data)
        setValue('device_id', '')
      })
      .catch(() => setDevices([]))
  }, [selectedCustomerId, setValue])

  async function onSubmit(data: FormData) {
    const result = await createTicket({
      customer_id: data.customer_id,
      device_id: data.device_id,
      priority: data.priority as 'low' | 'normal' | 'high' | 'urgent',
      intake_summary: data.intake_summary,
    })
    if (result?.error) {
      console.error(result.error)
      return
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label>Cliente *</Label>
        <Select
          value={watch('customer_id')}
          onValueChange={(v) => setValue('customer_id', v ?? '')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona cliente" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.last_name} {c.first_name} — {c.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.customer_id && (
          <p className="text-sm text-destructive">{errors.customer_id.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Dispositivo *</Label>
        <Select
          value={watch('device_id')}
          onValueChange={(v) => setValue('device_id', v ?? '')}
          disabled={!selectedCustomerId || !devices.length}
        >
          <SelectTrigger>
            <SelectValue placeholder={selectedCustomerId ? 'Seleziona dispositivo' : 'Seleziona prima un cliente'} />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.model} ({d.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.device_id && (
          <p className="text-sm text-destructive">{errors.device_id.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Priorità</Label>
        <Select value={watch('priority')} onValueChange={(v) => setValue('priority', (v ?? 'normal') as FormData['priority'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Bassa</SelectItem>
            <SelectItem value="normal">Normale</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="intake_summary">Sintesi intake</Label>
        <Textarea id="intake_summary" rows={3} {...register('intake_summary')} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creazione...' : 'Crea riparazione'}
      </Button>
    </form>
  )
}
