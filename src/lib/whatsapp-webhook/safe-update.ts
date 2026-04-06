import type { SupabaseClient } from '@supabase/supabase-js'

/** Status order for out-of-order handling: only allow transitions to same or higher. */
const STATUS_ORDER: Record<string, number> = { pending: 0, sent: 1, delivered: 2, failed: 0 }

export function shouldApplyStatusUpdate(currentStatus: string | null, newStatus: 'sent' | 'delivered'): boolean {
  const current = currentStatus ?? 'pending'
  const currentOrder = STATUS_ORDER[current] ?? 0
  const newOrder = STATUS_ORDER[newStatus] ?? 1
  return newOrder >= currentOrder
}

export type SafeUpdateResult = { updated: true } | { updated: false; reason: 'no_row' | 'out_of_order' }

/**
 * Update communications row by provider_message_id only if status transition is allowed.
 * Out-of-order event handling: e.g. delivered before sent is ignored; we only move status forward.
 * Must be called with admin client in webhook context (no user session; RLS bypass for communications update).
 */
export async function safeUpdateCommunicationStatus(
  supabase: SupabaseClient,
  providerMessageId: string,
  newStatus: 'sent' | 'delivered'
): Promise<SafeUpdateResult> {
  const { data: rows } = await supabase
    .from('communications')
    .select('id, status')
    .eq('provider_message_id', providerMessageId)
    .limit(1)

  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) return { updated: false, reason: 'no_row' }
  const currentStatus = (row as { status?: string }).status ?? null
  if (!shouldApplyStatusUpdate(currentStatus, newStatus)) return { updated: false, reason: 'out_of_order' }

  const { error } = await supabase
    .from('communications')
    .update({
      status: newStatus,
      sent_at: new Date().toISOString(),
    })
    .eq('id', (row as { id: string }).id)

  return error ? { updated: false, reason: 'out_of_order' } : { updated: true }
}
