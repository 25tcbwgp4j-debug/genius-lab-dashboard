/**
 * Build PDF inputs from ticket/customer/device/settings for API route.
 * When called from public document API (token-only), pass admin client to bypass RLS.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { IntakePdfInput, EstimatePdfInput, PaymentInstructionsPdfInput, FinalReportPdfInput } from './types'

async function getClient(supabase?: SupabaseClient) {
  return supabase ?? await createClient()
}

export async function buildIntakePdfInput(ticketId: string, supabase?: SupabaseClient): Promise<IntakePdfInput | null> {
  const db = await getClient(supabase)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: ticket } = await db
    .from('tickets')
    .select('id, ticket_number, intake_summary, public_tracking_token, created_at, device_id, customer_id')
    .eq('id', ticketId)
    .single()
  if (!ticket) return null
  const { data: device } = await db
    .from('devices')
    .select('category, model, serial_number, imei, meid, customer_reported_issue, accessories_received, intake_condition')
    .eq('id', ticket.device_id)
    .single()
  const { data: customer } = await db
    .from('customers')
    .select('first_name, last_name, email, phone, address, city, postal_code')
    .eq('id', ticket.customer_id)
    .single()
  const { data: settings } = await db
    .from('company_settings')
    .select('company_name, phone, address, city, postal_code, default_disclaimer')
    .limit(1)
    .maybeSingle()
  if (!device || !customer) return null
  const customerName = `${customer.first_name} ${customer.last_name}`.trim()
  const customerAddress = [customer.address, customer.city, customer.postal_code].filter(Boolean).join(', ') || undefined
  const shopAddressParts = [settings?.address, settings?.city, settings?.postal_code].filter(Boolean).join(', ')
  const shopAddress = shopAddressParts ? shopAddressParts : (settings?.address ?? undefined)
  const accessories = Array.isArray(device.accessories_received) ? device.accessories_received : undefined
  return {
    companyName: settings?.company_name ?? 'Genius Lab',
    ticketNumber: ticket.ticket_number,
    intakeDate: new Date(ticket.created_at).toLocaleDateString('it-IT'),
    customerName,
    customerEmail: customer.email ?? undefined,
    customerPhone: customer.phone ?? undefined,
    customerAddress: customerAddress || undefined,
    deviceCategory: device.category ?? '',
    deviceModel: device.model,
    serialNumber: device.serial_number ?? undefined,
    imei: device.imei ?? undefined,
    meid: device.meid ?? undefined,
    customerIssue: device.customer_reported_issue ?? undefined,
    accessories: accessories?.length ? accessories : undefined,
    intakeCondition: device.intake_condition ?? undefined,
    intakeSummary: ticket.intake_summary ?? undefined,
    disclaimer: settings?.default_disclaimer ?? undefined,
    trackingLink: `${baseUrl}/track/${ticket.public_tracking_token}`,
    shopPhone: settings?.phone ?? '',
    shopAddress,
  }
}

export async function buildEstimatePdfInput(ticketId: string, supabase?: SupabaseClient): Promise<EstimatePdfInput | null> {
  const db = await getClient(supabase)
  const { data: ticket } = await db
    .from('tickets')
    .select('ticket_number, estimate_labor_cost, estimate_parts_cost, total_amount, estimate_notes, device_id, customer_id')
    .eq('id', ticketId)
    .single()
  if (!ticket) return null
  const { data: device } = await db.from('devices').select('model').eq('id', ticket.device_id).single()
  const { data: customer } = await db.from('customers').select('first_name, last_name').eq('id', ticket.customer_id).single()
  if (!device || !customer) return null
  const labor = Number(ticket.estimate_labor_cost ?? 0)
  const parts = Number(ticket.estimate_parts_cost ?? 0)
  const total = Number(ticket.total_amount ?? labor + parts)
  return {
    ticketNumber: ticket.ticket_number,
    customerName: `${customer.first_name} ${customer.last_name}`.trim(),
    deviceModel: device.model,
    laborCost: labor,
    partsCost: parts,
    total,
    notes: (ticket as { estimate_notes?: string | null }).estimate_notes?.trim() || undefined,
  }
}

export async function buildPaymentInstructionsPdfInput(ticketId: string, supabase?: SupabaseClient): Promise<PaymentInstructionsPdfInput | null> {
  const db = await getClient(supabase)
  const { data: ticket } = await db
    .from('tickets')
    .select('ticket_number, total_amount, amount_paid, customer_id')
    .eq('id', ticketId)
    .single()
  if (!ticket) return null
  const { data: customer } = await db.from('customers').select('first_name, last_name').eq('id', ticket.customer_id).single()
  const { data: settings } = await db.from('company_settings').select('iban, account_holder, payment_instructions').limit(1).maybeSingle()
  if (!customer) return null
  const total = Number(ticket.total_amount ?? 0)
  const paid = Number(ticket.amount_paid ?? 0)
  const amountDue = Math.max(0, total - paid)
  const paymentReference = `GL ${ticket.ticket_number}`
  const proofOfPaymentInstructions = settings?.payment_instructions
    ? `Dopo il bonifico: ${settings.payment_instructions}`
    : 'Conservare la ricevuta e presentarla al ritiro o inviarla ai recapiti indicati.'
  return {
    ticketNumber: ticket.ticket_number,
    customerName: `${customer.first_name} ${customer.last_name}`.trim(),
    amountDue,
    iban: settings?.iban ?? '',
    beneficiary: settings?.account_holder ?? '',
    paymentReference,
    proofOfPaymentInstructions,
    paymentInstructions: settings?.payment_instructions ?? undefined,
  }
}

export async function buildFinalReportPdfInput(ticketId: string, supabase?: SupabaseClient): Promise<FinalReportPdfInput | null> {
  const db = await getClient(supabase)
  const { data: ticket } = await db
    .from('tickets')
    .select('ticket_number, diagnosis, total_amount, amount_paid, delivered_at, closed_at, updated_at, device_id, customer_id')
    .eq('id', ticketId)
    .single()
  if (!ticket) return null
  const { data: device } = await db.from('devices').select('category, model').eq('id', ticket.device_id).single()
  const { data: customer } = await db.from('customers').select('first_name, last_name').eq('id', ticket.customer_id).single()
  const { data: settings } = await db.from('company_settings').select('phone').limit(1).maybeSingle()
  if (!device || !customer) return null
  const completedAt = (ticket.delivered_at ?? ticket.closed_at ?? ticket.updated_at) ?? new Date().toISOString()
  return {
    ticketNumber: ticket.ticket_number,
    customerName: `${customer.first_name} ${customer.last_name}`.trim(),
    deviceModel: device.model,
    deviceCategory: device.category ?? '',
    diagnosis: ticket.diagnosis ?? '',
    totalAmount: Number(ticket.total_amount ?? 0),
    amountPaid: Number(ticket.amount_paid ?? 0),
    completedAt: new Date(completedAt).toLocaleDateString('it-IT'),
    shopPhone: settings?.phone ?? undefined,
  }
}
