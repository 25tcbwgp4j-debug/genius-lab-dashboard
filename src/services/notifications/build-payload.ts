import { createClient } from '@/lib/supabase/server'
import type { TemplateKey } from '@/services/communications/template-resolver'

export async function buildNotificationPayload(
  ticketId: string,
  templateKey: TemplateKey,
  overrides?: Partial<Record<string, string>>
): Promise<{ customerId: string; payload: Record<string, string> } | null> {
  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      customer_id,
      total_amount,
      amount_paid,
      public_tracking_token,
      status,
      shipping_address,
      courier_name,
      tracking_code,
      recipient_name,
      recipient_phone
    `)
    .eq('id', ticketId)
    .single()
  if (!ticket) return null

  const { data: customer } = await supabase
    .from('customers')
    .select('first_name, last_name')
    .eq('id', ticket.customer_id)
    .single()
  if (!customer) return null

  const { data: settings } = await supabase
    .from('company_settings')
    .select('phone, working_hours, iban, account_holder, payment_instructions')
    .limit(1)
    .maybeSingle()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const token = ticket.public_tracking_token
  const customerName = `${customer.first_name} ${customer.last_name}`.trim()
  const total = Number(ticket.total_amount ?? 0)
  const paid = Number(ticket.amount_paid ?? 0)
  const amountDue = Math.max(0, total - paid)
  const paymentReference = `GL ${ticket.ticket_number}`
  const payload: Record<string, string> = {
    customer_name: customerName,
    ticket_number: ticket.ticket_number,
    tracking_link: `${baseUrl}/track/${token}`,
    estimate_link: `${baseUrl}/estimate/${token}`,
    document_intake_link: `${baseUrl}/api/documents/intake?token=${encodeURIComponent(token)}`,
    document_estimate_link: `${baseUrl}/api/documents/estimate?token=${encodeURIComponent(token)}`,
    document_payment_link: `${baseUrl}/api/documents/payment?token=${encodeURIComponent(token)}`,
    document_report_link: `${baseUrl}/api/documents/report?token=${encodeURIComponent(token)}`,
    shop_phone: settings?.phone ?? '',
    working_hours: settings?.working_hours ?? '',
    amount_due: amountDue.toFixed(2),
    status: ticket.status,
    iban: settings?.iban ?? '',
    beneficiary: settings?.account_holder ?? '',
    payment_instructions: settings?.payment_instructions ?? '',
    payment_reference: paymentReference,
    proof_of_payment_instructions: settings?.payment_instructions
      ? `Dopo il bonifico: ${settings.payment_instructions}`
      : 'Dopo il bonifico conservare la ricevuta e presentarla al ritiro o inviarla ai recapiti indicati.',
    shipping_address: (ticket.shipping_address as string) ?? '',
    courier_name: (ticket.courier_name as string) ?? '',
    tracking_code: (ticket.tracking_code as string) ?? '',
    recipient_name: (ticket.recipient_name as string) ?? '',
    recipient_phone: (ticket.recipient_phone as string) ?? '',
    ...overrides,
  }
  return { customerId: ticket.customer_id, payload }
}
