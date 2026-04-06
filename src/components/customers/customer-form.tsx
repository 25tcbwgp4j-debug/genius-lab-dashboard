'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerCreateSchema, type CustomerCreateInput } from '@/lib/validations/customer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createCustomer, updateCustomer } from '@/app/actions/customers'
import type { Customer } from '@/types/database'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; customer: Customer }

export function CustomerForm(props: Props) {
  const isCreate = props.mode === 'create'
  const defaultValues: CustomerCreateInput = props.mode === 'edit'
    ? {
        first_name: props.customer.first_name,
        last_name: props.customer.last_name,
        company_name: props.customer.company_name ?? '',
        phone: props.customer.phone,
        whatsapp_phone: props.customer.whatsapp_phone ?? '',
        email: props.customer.email,
        tax_code: props.customer.tax_code ?? '',
        vat_number: props.customer.vat_number ?? '',
        address: props.customer.address ?? '',
        city: props.customer.city ?? '',
        postal_code: props.customer.postal_code ?? '',
        notes: props.customer.notes ?? '',
        preferred_contact_channel: props.customer.preferred_contact_channel,
        privacy_consent: props.customer.privacy_consent,
        marketing_consent: props.customer.marketing_consent ?? false,
      }
    : {
        first_name: '',
        last_name: '',
        company_name: '',
        phone: '',
        whatsapp_phone: '',
        email: '',
        tax_code: '',
        vat_number: '',
        address: '',
        city: '',
        postal_code: '',
        notes: '',
        preferred_contact_channel: 'both',
        privacy_consent: true,
        marketing_consent: false,
      }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema) as import('react-hook-form').Resolver<CustomerCreateInput>,
    defaultValues,
  })

  const preferredChannel = watch('preferred_contact_channel')
  const privacyConsent = watch('privacy_consent')
  const marketingConsent = watch('marketing_consent')

  async function onSubmit(data: CustomerCreateInput) {
    if (isCreate) {
      await createCustomer(data)
    } else {
      await updateCustomer(props.customer.id, data)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">Nome *</Label>
          <Input id="first_name" {...register('first_name')} />
          {errors.first_name && (
            <p className="text-sm text-destructive">{errors.first_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Cognome *</Label>
          <Input id="last_name" {...register('last_name')} />
          {errors.last_name && (
            <p className="text-sm text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_name">Azienda</Label>
        <Input id="company_name" {...register('company_name')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono *</Label>
          <Input id="phone" {...register('phone')} />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp_phone">WhatsApp</Label>
          <Input id="whatsapp_phone" {...register('whatsapp_phone')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tax_code">Codice fiscale</Label>
          <Input id="tax_code" {...register('tax_code')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat_number">P. IVA</Label>
          <Input id="vat_number" {...register('vat_number')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Indirizzo</Label>
        <Input id="address" {...register('address')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">Città</Label>
          <Input id="city" {...register('city')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">CAP</Label>
          <Input id="postal_code" {...register('postal_code')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Canale preferito</Label>
        <Select
          value={preferredChannel}
          onValueChange={(v) => setValue('preferred_contact_channel', v as CustomerCreateInput['preferred_contact_channel'])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="both">Entrambi</SelectItem>
            <SelectItem value="phone">Telefono</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" rows={3} {...register('notes')} />
      </div>
      <div className="flex gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="privacy_consent"
            checked={privacyConsent}
            onCheckedChange={(c) => setValue('privacy_consent', !!c)}
          />
          <Label htmlFor="privacy_consent">Consenso privacy</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="marketing_consent"
            checked={marketingConsent}
            onCheckedChange={(c) => setValue('marketing_consent', !!c)}
          />
          <Label htmlFor="marketing_consent">Consenso marketing</Label>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isCreate ? 'Crea cliente' : 'Salva modifiche'}
      </Button>
    </form>
  )
}
