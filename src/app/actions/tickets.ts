'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getNextTicketNumber } from '@/services/tickets/numbering'
import { nanoid } from 'nanoid'
import { dispatchNotification } from '@/services/notifications/dispatch'
import { requireUserAndProfile } from '@/lib/auth/require-auth'
import { canCreateTicket, canChangeTicketStatus, canEditTicketShipping, canAssignTechnician } from '@/lib/auth/rbac'
import { isAllowedTransition } from '@/lib/ticket-workflow'
import type { TicketStatus } from '@/types/database'

export async function createTicket(payload: {
  customer_id: string
  device_id: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  intake_summary?: string
}) {
  const { user, profile } = await requireUserAndProfile()
  if (!canCreateTicket(profile.role)) throw new Error('Non autorizzato a creare ticket')
  const supabase = await createClient()

  const ticketNumber = await getNextTicketNumber()
  const publicToken = nanoid(32)

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      ticket_number: ticketNumber,
      customer_id: payload.customer_id,
      device_id: payload.device_id,
      created_by_user_id: user.id as string,
      priority: payload.priority ?? 'normal',
      status: 'intake_completed',
      intake_summary: payload.intake_summary ?? null,
      public_tracking_token: publicToken,
      payment_status: 'unpaid',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    event_type: 'created',
    to_status: 'intake_completed',
    user_id: user.id,
    metadata: {},
  })

  const notifResult = await dispatchNotification('intake_created', ticket.id).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'intake_created' as const, event: 'intake_created' as const, emailSent: false, whatsappSent: false }))
  if (notifResult.ok) {
    const channels = [notifResult.emailSent && 'email', notifResult.whatsappSent && 'whatsapp'].filter(Boolean) as string[]
    await supabase.from('ticket_events').insert({
      ticket_id: ticket.id,
      event_type: 'notification_sent',
      user_id: user.id,
      metadata: { event: notifResult.event, template_key: notifResult.templateKey, channels },
    })
  }

  revalidatePath('/dashboard/tickets')
  revalidatePath('/dashboard')
  redirect(`/dashboard/tickets/${ticket.id}`)
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: string,
  metadata?: Record<string, unknown>
) {
  const { user, profile } = await requireUserAndProfile()
  if (!canChangeTicketStatus(profile.role)) throw new Error('Non autorizzato a modificare lo stato del ticket')
  const supabase = await createClient()

  const { data: ticket } = await supabase.from('tickets').select('status').eq('id', ticketId).single()
  if (!ticket) throw new Error('Ticket non trovato')
  const currentStatus = ticket.status as TicketStatus
  if (!isAllowedTransition(currentStatus, newStatus)) {
    return { error: `Transizione non consentita: ${currentStatus} → ${newStatus}` }
  }

  const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  if (newStatus === 'ready_for_pickup') updates.ready_for_pickup_at = new Date().toISOString()
  if (newStatus === 'ready_for_shipping') updates.ready_for_shipping_at = new Date().toISOString()
  if (newStatus === 'shipped') {
    updates.shipped_at = new Date().toISOString()
    if (metadata?.courier_name != null) updates.courier_name = String(metadata.courier_name)
    if (metadata?.tracking_code != null) updates.tracking_code = String(metadata.tracking_code)
  }
  if (newStatus === 'delivered') {
    updates.delivered_at = new Date().toISOString()
    updates.closed_at = new Date().toISOString()
  }
  if (newStatus === 'cancelled' || newStatus === 'unrepaired_returned') updates.closed_at = new Date().toISOString()

  // When sending estimate to customer: sync total_amount from labor+parts so email amount_due is correct
  if (newStatus === 'estimate_ready') {
    const { data: est } = await supabase.from('tickets').select('estimate_labor_cost, estimate_parts_cost, total_amount').eq('id', ticketId).single()
    if (est) {
      const labor = Number(est.estimate_labor_cost ?? 0)
      const parts = Number(est.estimate_parts_cost ?? 0)
      const sum = labor + parts
      if (sum > 0) updates.total_amount = sum
    }
  }

  const { error: updateError } = await supabase.from('tickets').update(updates).eq('id', ticketId)
  if (updateError) return { error: updateError.message }

  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'status_change',
    from_status: ticket.status,
    to_status: newStatus,
    user_id: user.id,
    metadata: metadata ?? {},
  })

  const { data: ticketFull } = await supabase.from('tickets').select('total_amount, amount_paid').eq('id', ticketId).single()
  const amountDue = ticketFull ? Number(ticketFull.total_amount) - Number(ticketFull.amount_paid) : 0

  const recordNotificationSent = async (res: Awaited<ReturnType<typeof dispatchNotification>>) => {
    if (!res.ok) return
    const channels = [res.emailSent && 'email', res.whatsappSent && 'whatsapp'].filter(Boolean) as string[]
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'notification_sent',
      user_id: user.id,
      metadata: { event: res.event, template_key: res.templateKey, channels },
    })
  }

  if (newStatus === 'estimate_ready') {
    const res = await dispatchNotification('estimate_ready', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'estimate_ready' as const, event: 'estimate_ready' as const, emailSent: false, whatsappSent: false }))
    await recordNotificationSent(res)
    // Move to waiting_customer_approval so the estimate approval link works (customer sees approve/reject form)
    const { data: t } = await supabase.from('tickets').select('status').eq('id', ticketId).single()
    if (t?.status === 'estimate_ready' && isAllowedTransition('estimate_ready' as TicketStatus, 'waiting_customer_approval')) {
      await supabase.from('tickets').update({ status: 'waiting_customer_approval', updated_at: new Date().toISOString() }).eq('id', ticketId)
      await supabase.from('ticket_events').insert({
        ticket_id: ticketId,
        event_type: 'status_change',
        from_status: 'estimate_ready',
        to_status: 'waiting_customer_approval',
        user_id: user.id,
        metadata: {},
      })
    }
  } else if (['in_diagnosis', 'waiting_parts', 'in_repair', 'testing'].includes(newStatus)) {
    const res = await dispatchNotification('repair_update', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'repair_update' as const, event: 'repair_update' as const, emailSent: false, whatsappSent: false }))
    await recordNotificationSent(res)
  } else if (newStatus === 'ready_for_pickup') {
    const res1 = await dispatchNotification('ready_for_pickup', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'ready_for_pickup' as const, event: 'ready_for_pickup' as const, emailSent: false, whatsappSent: false }))
    await recordNotificationSent(res1)
    if (amountDue > 0) {
      const res2 = await dispatchNotification('payment_instructions', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'payment_instructions' as const, event: 'payment_instructions' as const, emailSent: false, whatsappSent: false }))
      await recordNotificationSent(res2)
    }
  } else if (newStatus === 'ready_for_shipping') {
    const res1 = await dispatchNotification('ready_for_shipping', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'ready_for_shipping' as const, event: 'ready_for_shipping' as const, emailSent: false, whatsappSent: false }))
    await recordNotificationSent(res1)
    if (amountDue > 0) {
      const res2 = await dispatchNotification('payment_instructions', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'payment_instructions' as const, event: 'payment_instructions' as const, emailSent: false, whatsappSent: false }))
      await recordNotificationSent(res2)
    }
  } else if (newStatus === 'shipped') {
    const res = await dispatchNotification('shipped', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'shipped' as const, event: 'shipped' as const, emailSent: false, whatsappSent: false }))
    await recordNotificationSent(res)
  } else if (newStatus === 'delivered') {
    const res = await dispatchNotification('ticket_closed', ticketId).catch(() => ({ ok: false, errors: [] as string[], templateKey: 'ticket_closed' as const, event: 'ticket_closed' as const, emailSent: false, whatsappSent: false }))
    await recordNotificationSent(res)
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`)
  revalidatePath('/dashboard/tickets')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTicketShipping(
  ticketId: string,
  payload: {
    shipping_required?: boolean
    shipping_address?: string | null
    recipient_name?: string | null
    recipient_phone?: string | null
    shipping_notes?: string | null
  }
) {
  const { profile } = await requireUserAndProfile()
  if (!canEditTicketShipping(profile.role)) throw new Error('Non autorizzato a modificare i dati di spedizione')
  const supabase = await createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.shipping_required !== undefined) updates.shipping_required = payload.shipping_required
  if (payload.shipping_address !== undefined) updates.shipping_address = payload.shipping_address ?? null
  if (payload.recipient_name !== undefined) updates.recipient_name = payload.recipient_name ?? null
  if (payload.recipient_phone !== undefined) updates.recipient_phone = payload.recipient_phone ?? null
  if (payload.shipping_notes !== undefined) updates.shipping_notes = payload.shipping_notes ?? null
  const { error } = await supabase.from('tickets').update(updates).eq('id', ticketId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  revalidatePath('/dashboard/tickets')
  return { success: true }
}

export async function assignTechnicianAction(ticketId: string, assignedTechnicianId: string | null) {
  const { user, profile } = await requireUserAndProfile()
  if (!canAssignTechnician(profile.role)) throw new Error('Non autorizzato a assegnare tecnici')
  const supabase = await createClient()
  const { error } = await supabase
    .from('tickets')
    .update({
      assigned_technician_id: assignedTechnicianId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'technician_assigned',
    user_id: user.id,
    metadata: { assigned_technician_id: assignedTechnicianId },
  })
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  revalidatePath('/dashboard/tickets')
  return { success: true }
}

export async function updateAcceptanceOperatorAction(ticketId: string, operator: string | null) {
  const { user } = await requireUserAndProfile()
  const supabase = await createClient()
  const { error } = await supabase
    .from('tickets')
    .update({
      acceptance_operator: operator,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return { success: true }
}
