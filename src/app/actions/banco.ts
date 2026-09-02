'use server'

import { createStaffClient } from '@/lib/supabase/staff'
import { revalidatePath } from 'next/cache'
import { richiediStaff } from '@/lib/auth/staff'
import { dispatchNotification, type NotificationEvent } from '@/services/notifications/dispatch'
import { total, estimateText, type EstimateLine } from '@/lib/banco/estimate'

/** Gli unici stati che un filtro può chiedere. */
const STATI = [
  'new', 'intake_completed', 'in_diagnosis', 'ai_diagnosis_generated', 'estimate_ready',
  'waiting_customer_approval', 'approved', 'refused', 'waiting_parts', 'in_repair',
  'testing', 'ready_for_pickup', 'ready_for_shipping', 'shipped', 'delivered',
  'unrepaired_returned', 'cancelled',
]

async function guard() {
  await richiediStaff()
  return { supabase: await createStaffClient() }
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

/** Segna una tappa del percorso (arrivo, ricevuta, riparato, consegna…). */
export async function setMilestoneAction(ticketId: string, field: string, on: boolean) {
  const { supabase } = await guard()
  const consentiti = [
    'arrived_at', 'pickup_requested_at', 'intake_receipt_sent_at', 'repaired_at',
    'approved_at', 'refused_at', 'ready_for_pickup_at', 'ready_for_shipping_at',
    'shipped_at', 'delivered_at', 'closed_at',
  ]
  if (!consentiti.includes(field)) return { error: 'Tappa non riconosciuta' }
  const { error } = await supabase
    .from('tickets')
    .update({ [field]: on ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) return { error: error.message }
  refresh(ticketId)
  return { success: true }
}

/* PostgREST usa virgole e parentesi come sintassi nei filtri `or`: un termine
   che le contiene cambierebbe la query. Si tengono solo lettere, cifre e spazi. */
const pulisci = (t: string) => t.replace(/[^\p{L}\p{N} _-]/gu, '').trim()

/** Cerca fra i preventivi già fatti: più parole = più stretto, come in FileMaker. */
export async function searchPastEstimatesAction(query: string) {
  await richiediStaff()
  const terms = query.trim().split(/\s+/).map(pulisci).filter(Boolean).slice(0, 6)
  if (!terms.length) return { rows: [] }
  const supabase = await createStaffClient()
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
  await richiediStaff()
  const s = String(serial || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.length < 11) return { model: null }   // i seriali nuovi a 10 caratteri non dicono nulla
  const supabase = await createStaffClient()
  const { data } = await supabase
    .from('serial_models')
    .select('model, family, seen')
    .eq('code', s.slice(-4))
    .maybeSingle()
  return { model: data ?? null }
}

/** Le schede per l'elenco di sinistra: le più recenti, o quelle che rispondono alla ricerca. */
export async function listaSchedeAction(query: string, filtro: string) {
  await richiediStaff()
  const supabase = await createStaffClient()
  let q = supabase
    .from('tickets')
    .select('id, ticket_number, status, office_owner, assigned_technician_id, created_at, customer:customers(first_name, last_name, company_name), device:devices(model, category)')
    .order('created_at', { ascending: false })
    .limit(60)

  const t = pulisci(query).slice(0, 40)
  if (t) q = q.ilike('ticket_number', `%${t}%`)
  // lo stato arriva da un elenco chiuso: quello che non c'è si ignora
  if (filtro && filtro !== 'tutte' && STATI.includes(filtro)) q = q.eq('status', filtro)

  const { data, error } = await q
  if (error) return { rows: [], error: error.message }
  return { rows: data ?? [] }
}

/** I contatori in cima all'elenco. */
export async function contatoriAction() {
  await richiediStaff()
  const supabase = await createStaffClient()
  const stati = ['intake_completed', 'waiting_customer_approval', 'approved', 'in_repair', 'ready_for_pickup', 'new']
  const out: Record<string, number> = {}
  await Promise.all(stati.map(async (s) => {
    const { count } = await supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', s)
    out[s] = count ?? 0
  }))
  return out
}

/* ─────────────────────────────────────────────────────────────────────────────
   Mandare davvero la mail al cliente.

   Prima la pulsantiera si limitava a segnare «inviata»: la mail la si scriveva
   a mano, come in FileMaker. Qui parte da sola — stesso testo dei modelli, con
   il link al PDF della scheda — e il flag si mette solo se è partita davvero.
   ──────────────────────────────────────────────────────────────────────────── */


/** Quale comunicazione corrisponde a quale tasto della pulsantiera. */
const TASTO_A_EVENTO: Record<string, NotificationEvent> = {
  intake_sent: 'intake_created',
  estimate_sent: 'estimate_ready',
  update_sent: 'repair_update',
  ready_sent: 'ready_for_pickup',
  payment_sent: 'payment_instructions',
  shipped_sent: 'shipped',
}

export async function inviaComunicazioneAction(ticketId: string, tasto: string) {
  await richiediStaff()
  const evento = TASTO_A_EVENTO[tasto]
  if (!evento) return { error: 'Comunicazione non riconosciuta' }

  const supabase = await createStaffClient()

  // senza indirizzo non si manda niente, e va detto prima di provarci
  const { data: t } = await supabase
    .from('tickets')
    .select('id, customer:customers(email, phone)')
    .eq('id', ticketId)
    .single()
  const cli = t?.customer as { email?: string; phone?: string } | null
  if (!cli?.email && !cli?.phone) {
    return { error: 'Questo cliente non ha né email né telefono: la comunicazione non può partire.' }
  }

  const esito = await dispatchNotification(evento, ticketId)
  if (!esito.ok && !esito.emailSent && !esito.whatsappSent) {
    return { error: esito.errors.join(' · ') || 'Invio non riuscito' }
  }

  // il flag si mette solo adesso: segna che è partita davvero
  const { data: gia } = await supabase
    .from('communication_flags')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('flag_type', tasto)
    .maybeSingle()
  if (!gia) {
    await supabase.from('communication_flags')
      .insert({ ticket_id: ticketId, flag_type: tasto, sent_at: new Date().toISOString() })
  }

  refresh(ticketId)
  return {
    success: true,
    email: !!esito.emailSent,
    whatsapp: !!esito.whatsappSent,
    a: cli?.email || cli?.phone || '',
  }
}
