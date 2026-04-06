'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, getClientIdentifierFromHeaders } from '@/lib/rate-limit'

const ESTIMATE_APPROVAL_RATE_LIMIT = { windowMs: 60 * 1000, maxPerWindow: 15 }

/** Public estimate approval: no auth; token validates identity. Uses admin client so unauthenticated user can update. */
export async function approveEstimateAction(ticketId: string, token: string) {
  const headersList = await headers()
  const clientId = getClientIdentifierFromHeaders(headersList)
  const rateLimit = checkRateLimit('estimate-approval', clientId, ESTIMATE_APPROVAL_RATE_LIMIT)
  if (!rateLimit.allowed) {
    return { error: 'Troppi tentativi. Riprova tra qualche minuto.' }
  }
  const supabase = createAdminClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, public_tracking_token, status')
    .eq('id', ticketId)
    .eq('public_tracking_token', token)
    .single()
  const allowedStatuses = ['waiting_customer_approval', 'estimate_ready']
  if (!ticket || !allowedStatuses.includes(ticket.status)) {
    return { error: 'Preventivo non trovato o non più in attesa.' }
  }
  const { error } = await supabase
    .from('tickets')
    .update({
      status: 'approved',
      approved_by_customer: true,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'estimate_approved',
    from_status: 'waiting_customer_approval',
    to_status: 'approved',
    user_id: null,
    metadata: { source: 'public_page' },
  })
  revalidatePath(`/track/${token}`)
  revalidatePath(`/estimate/${token}`)
  return { success: true }
}

/** Public estimate rejection: no auth; token validates identity. Uses admin client so unauthenticated user can update. */
export async function rejectEstimateAction(ticketId: string, token: string, note?: string) {
  const headersList = await headers()
  const clientId = getClientIdentifierFromHeaders(headersList)
  const rateLimit = checkRateLimit('estimate-approval', clientId, ESTIMATE_APPROVAL_RATE_LIMIT)
  if (!rateLimit.allowed) {
    return { error: 'Troppi tentativi. Riprova tra qualche minuto.' }
  }
  const supabase = createAdminClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, public_tracking_token, status')
    .eq('id', ticketId)
    .eq('public_tracking_token', token)
    .single()
  const allowedStatuses = ['waiting_customer_approval', 'estimate_ready']
  if (!ticket || !allowedStatuses.includes(ticket.status)) {
    return { error: 'Preventivo non trovato o non più in attesa.' }
  }
  const updatePayload: Record<string, unknown> = {
    status: 'refused',
    approved_by_customer: false,
    refused_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (note?.trim()) updatePayload.refused_note = note.trim()
  const { error } = await supabase.from('tickets').update(updatePayload).eq('id', ticketId)
  if (error) return { error: error.message }
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'estimate_rejected',
    from_status: 'waiting_customer_approval',
    to_status: 'refused',
    user_id: null,
    metadata: { source: 'public_page', note: note ?? null },
  })
  revalidatePath(`/track/${token}`)
  revalidatePath(`/estimate/${token}`)
  return { success: true }
}
