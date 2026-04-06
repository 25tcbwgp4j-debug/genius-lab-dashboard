import { sendCommunication } from '@/services/communications/engine'
import { buildNotificationPayload } from './build-payload'
import type { TemplateKey } from '@/services/communications/template-resolver'

export type NotificationEvent =
  | 'intake_created'
  | 'estimate_ready'
  | 'repair_update'
  | 'ready_for_pickup'
  | 'ready_for_shipping'
  | 'payment_instructions'
  | 'shipped'
  | 'ticket_closed'

const EVENT_TO_TEMPLATE: Record<NotificationEvent, TemplateKey> = {
  intake_created: 'intake_created',
  estimate_ready: 'estimate_ready',
  repair_update: 'repair_update',
  ready_for_pickup: 'ready_for_pickup',
  ready_for_shipping: 'ready_for_shipping',
  payment_instructions: 'payment_instructions',
  shipped: 'shipped',
  ticket_closed: 'ticket_closed',
}

export interface DispatchResult {
  ok: boolean
  errors: string[]
  templateKey: TemplateKey
  event: NotificationEvent
  emailSent?: boolean
  whatsappSent?: boolean
}

/**
 * Event-driven notification: build payload from ticket/customer/settings, then send via engine (WhatsApp + Email).
 * Does not throw; logs errors. Call after ticket create or status update.
 */
export async function dispatchNotification(
  event: NotificationEvent,
  ticketId: string,
  overrides?: Partial<Record<string, string>>
): Promise<DispatchResult> {
  const templateKey = EVENT_TO_TEMPLATE[event]
  const built = await buildNotificationPayload(ticketId, templateKey, overrides)
  if (!built) return { ok: false, errors: ['Payload not built'], templateKey, event }
  const result = await sendCommunication({
    templateKey,
    ticketId,
    customerId: built.customerId,
    payload: built.payload,
  })
  return {
    ok: result.ok,
    errors: result.errors,
    templateKey,
    event,
    emailSent: result.emailSent,
    whatsappSent: result.whatsappSent,
  }
}
