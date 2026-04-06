import { createClient } from '@/lib/supabase/server'
import type { IAIDiagnosisProvider, AIDiagnosisResult } from '@/lib/ai/provider'
import { OpenAIDiagnosisAdapter } from '@/lib/ai/openai-adapter'
import { AnthropicDiagnosisAdapter } from '@/lib/ai/anthropic-adapter'
import { logAIDiagnosis } from './logger'

const AI_DIAGNOSIS_MAX_ATTEMPTS = 3
const AI_DIAGNOSIS_INITIAL_DELAY_MS = 800
const AI_DIAGNOSIS_MAX_DELAY_MS = 6000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Provider factory: AI_DIAGNOSIS_PROVIDER=anthropic (default) or openai. */
function getProvider(): IAIDiagnosisProvider {
  const provider = process.env.AI_DIAGNOSIS_PROVIDER ?? 'anthropic'
  if (provider === 'anthropic') return new AnthropicDiagnosisAdapter()
  if (provider === 'openai') return new OpenAIDiagnosisAdapter()
  throw new Error(`AI_DIAGNOSIS_PROVIDER=${provider} non supportato. Usare "anthropic" o "openai".`)
}

export type RunAIDiagnosisErrorCode = 'ticket_not_found' | 'device_not_found' | 'provider_error' | 'validation_error' | 'storage_error'

export async function runAIDiagnosis(ticketId: string): Promise<
  | { success: true; diagnosisId: string }
  | { success: false; error: string; code?: RunAIDiagnosisErrorCode }
> {
  const startMs = Date.now()
  logAIDiagnosis('info', 'AI diagnosis request started', { ticketId, success: false })
  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      id,
      device_id,
      customer_id,
      intake_summary,
      diagnosis
    `)
    .eq('id', ticketId)
    .single()
  if (!ticket) {
    logAIDiagnosis('warn', 'Ticket not found', { ticketId, success: false, durationMs: Date.now() - startMs, errorCode: 'ticket_not_found', errorMessage: 'Ticket non trovato' })
    return { success: false, error: 'Ticket non trovato', code: 'ticket_not_found' }
  }

  const { data: device } = await supabase
    .from('devices')
    .select('category, model, customer_reported_issue, internal_notes')
    .eq('id', ticket.device_id)
    .single()
  if (!device) {
    logAIDiagnosis('warn', 'Device not found', { ticketId, success: false, durationMs: Date.now() - startMs, errorCode: 'device_not_found', errorMessage: 'Dispositivo non trovato' })
    return { success: false, error: 'Dispositivo non trovato', code: 'device_not_found' }
  }

  const { data: priorTickets } = await supabase
    .from('tickets')
    .select('id, diagnosis, status')
    .eq('device_id', ticket.device_id)
    .neq('id', ticketId)
    .not('diagnosis', 'is', null)
  const priorRepairsSummary = priorTickets?.length
    ? priorTickets.map((t) => `Riparazione: ${t.status} - ${(t.diagnosis as string)?.slice(0, 200)}`).join('\n')
    : undefined

  const input = {
    customerReportedIssue: device.customer_reported_issue ?? '',
    deviceCategory: device.category,
    model: device.model,
    intakeNotes: ticket.intake_summary ?? undefined,
    priorRepairsSummary,
    technicalObservations: device.internal_notes ?? undefined,
  }

  let result: AIDiagnosisResult | null = null
  const provider = getProvider()
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= AI_DIAGNOSIS_MAX_ATTEMPTS; attempt++) {
    try {
      result = await provider.generateStructuredDiagnosis(input)
      lastError = null
      break
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < AI_DIAGNOSIS_MAX_ATTEMPTS) {
        const delayMs = Math.min(AI_DIAGNOSIS_INITIAL_DELAY_MS * Math.pow(2, attempt - 1), AI_DIAGNOSIS_MAX_DELAY_MS)
        await delay(delayMs)
      }
    }
  }
  if (lastError || !result) {
    const message = lastError?.message ?? 'Errore sconosciuto'
    const isValidation = message.includes('non valida') || message.includes('JSON')
    logAIDiagnosis('error', 'AI diagnosis failed after retries', {
      ticketId,
      success: false,
      durationMs: Date.now() - startMs,
      errorCode: isValidation ? 'validation_error' : 'provider_error',
      errorMessage: message,
    })
    return { success: false, error: message, code: isValidation ? 'validation_error' : 'provider_error' }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('ticket_ai_diagnosis')
    .insert({
      ticket_id: ticketId,
      hypotheses: result.hypotheses,
      suggested_checks: result.suggestedChecks,
      probable_parts: result.probableParts,
      complexity: result.complexity ?? null,
      risk_notes: result.riskNotes ?? null,
      confidence_score: result.confidenceScore ?? null,
      next_actions: result.nextActions ?? null,
      raw_response: result.raw as Record<string, unknown> ?? null,
    })
    .select('id')
    .single()
  if (insertError || !inserted) {
    logAIDiagnosis('error', 'AI diagnosis storage failed', {
      ticketId,
      success: false,
      durationMs: Date.now() - startMs,
      errorCode: 'storage_error',
      errorMessage: insertError?.message ?? 'Impossibile salvare la diagnosi AI',
    })
    return { success: false, error: 'Impossibile salvare la diagnosi AI', code: 'storage_error' }
  }

  const summary = result.hypotheses.slice(0, 3).join('; ') || 'Nessuna ipotesi.'
  const actions = (result.nextActions ?? result.suggestedChecks ?? []).slice(0, 5).join('; ')
  const riskFlags = (result.riskNotes ?? []).join('; ')

  // CRITICAL: Never write to tickets.diagnosis. Diagnosis is technician-only; AI suggestions live in ai_* and ticket_ai_diagnosis.
  const ticketUpdate: Record<string, unknown> = {
    ai_diagnosis_summary: summary,
    ai_recommended_actions: actions,
    ai_risk_flags: riskFlags || null,
    status: 'ai_diagnosis_generated',
    updated_at: new Date().toISOString(),
  }
  await supabase.from('tickets').update(ticketUpdate).eq('id', ticketId)

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'ai_diagnosis_generated',
    to_status: 'ai_diagnosis_generated',
    user_id: user?.id ?? null,
    metadata: { diagnosis_id: inserted.id },
  })

  logAIDiagnosis('info', 'AI diagnosis generated', {
    ticketId,
    success: true,
    durationMs: Date.now() - startMs,
    diagnosisId: inserted.id,
  })
  return { success: true, diagnosisId: inserted.id }
}
