'use server'

import { createStaffClient } from '@/lib/supabase/staff'
import { revalidatePath } from 'next/cache'
import { runAIDiagnosis } from '@/services/ai-diagnosis/run-diagnosis'
import { richiediStaff } from '@/lib/auth/staff'
import { canUseAIDiagnosis, canEditDiagnosis } from '@/lib/auth/rbac'

export async function generateAIDiagnosisAction(ticketId: string) {
  await richiediStaff()
  // runAIDiagnosis already inserts ticket_event 'ai_diagnosis_generated' and logs; no duplicate event.
  const result = await runAIDiagnosis(ticketId)
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return result
}

/** Append AI suggestion to technician diagnosis notes. NEVER overwrites tickets.diagnosis — only appends. */
export async function acceptAIDiagnosisSuggestionAction(ticketId: string, suggestionText: string) {
  await richiediStaff()
  const supabase = await createStaffClient()
  const { data: ticket } = await supabase.from('tickets').select('diagnosis').eq('id', ticketId).single()
  if (!ticket) return { error: 'Ticket non trovato' }
  const existing = (ticket.diagnosis ?? '').trim()
  const separator = existing ? '\n\n--- Suggerimento AI accettato ---\n' : ''
  const newDiagnosis = existing + separator + suggestionText
  await supabase.from('tickets').update({ diagnosis: newDiagnosis, updated_at: new Date().toISOString() }).eq('id', ticketId)
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return { success: true }
}

/** Discard AI suggestion: clear ai_* fields on ticket; keep ticket_ai_diagnosis rows for history. */
export async function discardAIDiagnosisSuggestionAction(ticketId: string) {
  await richiediStaff()
  const supabase = await createStaffClient()
  await supabase
    .from('tickets')
    .update({
      ai_diagnosis_summary: null,
      ai_recommended_actions: null,
      ai_risk_flags: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
  revalidatePath(`/dashboard/tickets/${ticketId}`)
  return { success: true }
}
