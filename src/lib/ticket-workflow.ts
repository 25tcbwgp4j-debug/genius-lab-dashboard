/**
 * Single source of truth for ticket status workflow.
 * Used by UI (allowed next states) and server (validation of transitions).
 * Do not duplicate ALLOWED_TRANSITIONS elsewhere.
 */
import type { TicketStatus } from '@/types/database'

/** From status -> list of valid next statuses. */
export const ALLOWED_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
  new: ['intake_completed', 'cancelled'],
  intake_completed: ['in_diagnosis', 'cancelled'],
  in_diagnosis: ['estimate_ready', 'ai_diagnosis_generated', 'cancelled'],
  ai_diagnosis_generated: ['estimate_ready', 'in_diagnosis', 'cancelled'],
  estimate_ready: ['waiting_customer_approval', 'cancelled'],
  waiting_customer_approval: ['approved', 'refused', 'cancelled'],
  approved: ['waiting_parts', 'in_repair'],
  refused: ['unrepaired_returned'],
  waiting_parts: ['in_repair', 'cancelled'],
  in_repair: ['testing', 'cancelled'],
  testing: ['ready_for_pickup', 'ready_for_shipping', 'in_repair'],
  ready_for_pickup: ['delivered', 'cancelled'],
  ready_for_shipping: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  unrepaired_returned: [],
  cancelled: [],
}

export function getAllowedNextStatuses(current: TicketStatus): TicketStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? []
}

export function isAllowedTransition(from: TicketStatus, to: string): to is TicketStatus {
  const allowed = ALLOWED_TRANSITIONS[from]
  return Array.isArray(allowed) && allowed.includes(to as TicketStatus)
}
