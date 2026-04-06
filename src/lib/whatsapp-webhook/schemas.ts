import { z } from 'zod'

/** Max webhook body size (100KB) to prevent DoS and oversized payloads. */
export const WEBHOOK_BODY_MAX_BYTES = 100 * 1024

/** Twilio status callback: MessageSid, MessageStatus. Strict: no extra keys. */
export const twilioStatusCallbackSchema = z.object({
  MessageSid: z.string().min(1).max(256),
  MessageStatus: z.string().max(64).optional(),
}).strict()

/** Meta WhatsApp Cloud API: status update in nested structure. Only fields we read are required. */
export const metaWebhookSchema = z.object({
  object: z.string().optional(),
  entry: z.array(z.object({
    id: z.string().optional(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.string().optional(),
        metadata: z.object({
          display_phone_number: z.string().optional(),
          phone_number_id: z.string().optional(),
        }).optional(),
        statuses: z.array(z.object({
          id: z.string().min(1).max(256),
          status: z.enum(['sent', 'delivered', 'read', 'failed']),
          timestamp: z.string().optional(),
          recipient_id: z.string().optional(),
        })).optional(),
      }).optional(),
    })).optional(),
  })).optional(),
})

/** Normalized payload after parsing: messageId and status for DB update */
export type NormalizedWebhookPayload = {
  messageId: string
  status: 'sent' | 'delivered'
  provider: 'twilio' | 'meta'
}

function normalizeStatus(raw: string | undefined): 'sent' | 'delivered' {
  if (raw === 'delivered' || raw === 'read') return 'delivered'
  return 'sent'
}

/**
 * Parse and normalize webhook body with strict Zod validation.
 * Returns null if body is not a status callback (e.g. other webhook types) or validation fails.
 */
export function parseAndNormalize(body: unknown): NormalizedWebhookPayload | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null
  const twilio = twilioStatusCallbackSchema.safeParse(body)
  if (twilio.success) {
    return {
      messageId: twilio.data.MessageSid,
      status: normalizeStatus(twilio.data.MessageStatus),
      provider: 'twilio',
    }
  }
  const meta = metaWebhookSchema.safeParse(body)
  if (meta.success && meta.data.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]) {
    const s = meta.data.entry[0].changes[0].value.statuses[0]
    return {
      messageId: s.id,
      status: normalizeStatus(s.status),
      provider: 'meta',
    }
  }
  return null
}
