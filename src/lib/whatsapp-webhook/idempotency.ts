import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Try to record idempotency key. Returns true if this is the first time (should process).
 * Returns false if key already exists (duplicate event, skip processing).
 * Duplicate event protection: same (messageId, status) is processed only once.
 * Must be called with admin client in webhook context (no user session).
 */
export async function claimIdempotencyKey(
  supabase: SupabaseClient,
  messageId: string,
  normalizedStatus: 'sent' | 'delivered'
): Promise<{ firstTime: boolean }> {
  const key = `${messageId}:${normalizedStatus}`
  const { error } = await supabase.from('whatsapp_webhook_events').insert({ idempotency_key: key })
  if (error) {
    if (error.code === '23505') return { firstTime: false }
    throw error
  }
  return { firstTime: true }
}
