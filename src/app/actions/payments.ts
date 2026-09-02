'use server'

import { createStaffClient } from '@/lib/supabase/staff'
import { revalidatePath } from 'next/cache'
import { richiediStaff } from '@/lib/auth/staff'
import { canRecordPayment } from '@/lib/auth/rbac'
import type { PaymentMethod } from '@/types/database'

export async function recordPaymentAction(payload: {
  ticket_id: string
  payment_method: PaymentMethod
  amount: number
  payment_date?: string
  reference?: string
  notes?: string
}) {
  const staff = await richiediStaff()
  const supabase = await createStaffClient()
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      ticket_id: payload.ticket_id,
      payment_method: payload.payment_method,
      amount: payload.amount,
      payment_date: payload.payment_date ?? new Date().toISOString().slice(0, 10),
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
      created_by: staff,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  const { data: ticket } = await supabase.from('tickets').select('amount_paid, total_amount').eq('id', payload.ticket_id).single()
  if (ticket) {
    const total = Number(ticket.total_amount ?? 0)
    const currentPaid = Number(ticket.amount_paid ?? 0)
    const newPaid = Math.max(0, currentPaid + payload.amount)
    const payment_status = total <= 0 ? 'unpaid' : newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'
    await supabase.from('tickets').update({
      amount_paid: newPaid,
      payment_status,
      updated_at: new Date().toISOString(),
    }).eq('id', payload.ticket_id)
    await supabase.from('ticket_events').insert({
      ticket_id: payload.ticket_id,
      event_type: 'payment_recorded',
      user_id: staff,
      metadata: { payment_id: payment.id, amount: payload.amount, payment_method: payload.payment_method },
    })
  }
  revalidatePath(`/dashboard/tickets/${payload.ticket_id}`)
  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard')
  return { success: true, paymentId: payment.id }
}
