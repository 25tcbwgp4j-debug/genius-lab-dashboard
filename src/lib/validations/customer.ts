import { z } from 'zod'

export const contactChannelSchema = z.enum(['whatsapp', 'email', 'both', 'phone'])

export const customerCreateSchema = z.object({
  first_name: z.string().min(1, 'Nome richiesto'),
  last_name: z.string().min(1, 'Cognome richiesto'),
  company_name: z.string().optional(),
  phone: z.string().min(1, 'Telefono richiesto'),
  whatsapp_phone: z.string().optional(),
  email: z.string().email('Email non valida'),
  tax_code: z.string().optional(),
  vat_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
  preferred_contact_channel: contactChannelSchema.default('both'),
  privacy_consent: z.boolean().default(true),
  marketing_consent: z.boolean().optional(),
})

export const customerUpdateSchema = customerCreateSchema.partial()

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>
