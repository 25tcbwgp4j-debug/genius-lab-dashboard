'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireUserAndProfile } from '@/lib/auth/require-auth'
import { canChangeTicketStatus } from '@/lib/auth/rbac'
import { total, estimateText, type EstimateLine } from '@/lib/banco/estimate'

async function guard() {
  const { profile } = await requireUserAndProfile()
  if (!canChangeTicketStatus(profile.role)) throw new Error('Non autorizzato a modificare il ticket')
  return { profile, supabase: await createClient() }
}
const refresh = (id: string) => {
  revalidatePath(`/dashboard/tickets/${id}`)
  revalidatePath('/dashboard/tickets')
}

/** Salva le righe del preventivo. Il totale è quello con l'ipotesi scelta. */
export async function saveEstimateLinesAction(ticketId: string, lines: EstimateLine[]) {
  const { supabase } = await guard()
  const amount = total(lines)
  const { error } = await supabase
    .from('tickets')
    .update({
      estimate_lines: lines,
      estimate_notes: estimateText(lines),
      total_amount: amount,
      // le vecchie due caselle restano allineate, così il resto della dashboard regge
      estimate_parts_cost: amount,
      estimate_labor_cost: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  refresh(ticketId)
  return { success: true, total: amount }
}

/** Aggiunge una nota al diario: resta firmata e datata, la più recente in testa. */
export async function addWorkLogAction(ticketId: string, chi: string, testo: string) {
  const t = testo.trim()
  if (!t) return { error: 'Scrivi cosa hai fatto prima di aggiungere' }
  const { supabase } = await guard()
  const { data } = await supabase.from('tickets').select('work_log').eq('id', ticketId).single()
  const log = Array.isArray(data?.work_log) ? data.work_log : []
  const quando = new Date().toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const { error } = await supabase
    .from('tickets')
    .update({ work_log: [{ chi, quando, testo: t }, ...log], updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  refresh(ticketId)
  return { success: true }
}

export async function removeWorkLogAction(ticketId: string, index: number) {
  const { supabase } = await guard()
  const { data } = await supabase.from('tickets').select('work_log').eq('id', ticketId).single()
  const log = Array.isArray(data?.work_log) ? [...data.work_log] : []
  log.splice(index, 1)
  const { error } = await supabase.from('tickets').update({ work_log: log }).eq('id', ticketId)
  if (error) return { error: error.message }
  refresh(ticketId)
  return { success: true }
}

/** Chi segue la pratica in ufficio. Indipendente dal tecnico al banco. */
export async function setOfficeOwnerAction(
  ticketId: string,
  owner: string | null,
  reason?: string | null,
  note?: string | null
) {
  const { supabase } = await guard()
  const { error } = await supabase
    .from('tickets')
    .update({
      office_owner: owner,
      office_reason: owner ? reason ?? null : null,
      office_note: owner ? note ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  refresh(ticketId)
  return { success: true }
}

/** Segna una tappa del percorso (arrivo, ricevuta, riparato…). */
export async function setMilestoneAction(ticketId: string, field: string, on: boolean) {
  const consentiti = ['arrived_at', 'pickup_requested_at', 'intake_receipt_sent_at', 'repaired_at']
  if (!consentiti.includes(field)) return { error: 'Tappa non riconosciuta' }
  const { supabase } = await guard()
  const { error } = await supabase
    .from('tickets')
    .update({ [field]: on ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  refresh(ticketId)
  return { success: true }
}

/** Cerca fra i preventivi già fatti: più parole = più stretto, come in FileMaker. */
export async function searchPastEstimatesAction(query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return { rows: [] }
  const supabase = await createClient()
  let q = supabase
    .from('past_estimates')
    .select('card_no, model, family, fault, body, price, year, month')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(40)
  for (const t of terms) {
    q = q.or(`model.ilike.%${t}%,family.ilike.%${t}%,body.ilike.%${t}%,fault.ilike.%${t}%`)
  }
  const { data, error } = await q
  if (error) return { error: error.message, rows: [] }
  return { rows: data ?? [] }
}

/** Le ultime 4 cifre del seriale Apple sono il codice del modello. */
export async function lookupSerialAction(serial: string) {
  const s = String(serial || '').trim().toUpperCase()
  if (s.length < 11) return { model: null }   // i seriali nuovi a 10 caratteri non dicono nulla
  const supabase = await createClient()
  const { data } = await supabase
    .from('serial_models')
    .select('model, family, seen')
    .eq('code', s.slice(-4))
    .maybeSingle()
  return { model: data ?? null }
}
