'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireUserAndProfile } from '@/lib/auth/require-auth'
import { canChangeTicketStatus } from '@/lib/auth/rbac'

export type EstimateItem = {
  description: string
  amount: number
  list_price?: number | null
}

/** Create or update estimate amounts, items and notes. Sets total_amount = labor + parts. Does not change status. */
export async function updateEstimateAction(
  ticketId: string,
  payload: {
    estimate_labor_cost: number
    estimate_parts_cost: number
    estimate_notes?: string | null
    estimate_items?: EstimateItem[] | null
  }
) {
  const { profile } = await requireUserAndProfile()
  if (!canChangeTicketStatus(profile.role)) throw new Error('Non autorizzato a modificare il ticket')
  const supabase = await createClient()
  const labor = Number(payload.estimate_labor_cost) || 0
  const parts = Number(payload.estimate_parts_cost) || 0
  const total = labor + parts
  const updates: Record<string, unknown> = {
    estimate_labor_cost: labor,
    estimate_parts_cost: parts,
    total_amount: total,
    updated_at: new Date().toISOString(),
  }
  if (payload.estimate_notes !== undefined) updates.estimate_notes = payload.estimate_notes ?? null
  if (payload.estimate_items !== undefined) updates.estimate_items = payload.estimate_items ?? null
  const { error } = await supabase.from('tickets').update(updates).eq('id', ticketId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  revalidatePath('/dashboard/tickets')
  return { success: true }
}
