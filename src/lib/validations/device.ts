import { z } from 'zod'

const deviceCategorySchema = z.enum([
  'iphone', 'ipad', 'macbook', 'imac', 'apple_watch', 'airpods', 'other',
])

export const deviceCreateSchema = z.object({
  customer_id: z.string().uuid(),
  category: deviceCategorySchema,
  brand: z.string().default('Apple'),
  model: z.string().min(1, 'Modello richiesto'),
  serial_number: z.string().optional(),
  imei: z.string().optional(),
  meid: z.string().optional(),
  color: z.string().optional(),
  storage_capacity: z.string().optional(),
  accessories_received: z.array(z.string()).optional(),
  passcode_received: z.boolean().optional(),
  passcode_notes: z.string().optional(),
  intake_condition: z.string().optional(),
  customer_reported_issue: z.string().optional(),
  internal_notes: z.string().optional(),
  cosmetic_damage_notes: z.string().optional(),
  liquid_damage_suspected: z.boolean().optional(),
  power_on: z.boolean().optional(),
  face_id_status: z.string().optional(),
  touch_id_status: z.string().optional(),
  true_tone_status: z.string().optional(),
})

export const deviceUpdateSchema = deviceCreateSchema.partial()

export type DeviceCreateInput = z.infer<typeof deviceCreateSchema>
export type DeviceUpdateInput = z.infer<typeof deviceUpdateSchema>
