/**
 * Structured logging for AI diagnosis. All calls server-side only.
 * Use for audit and debugging; optionally persist to ai_request_log table later.
 */
export type AIDiagnosisLogLevel = 'info' | 'warn' | 'error'

export interface AIDiagnosisLogContext {
  ticketId: string
  success: boolean
  durationMs?: number
  diagnosisId?: string
  errorCode?: string
  errorMessage?: string
}

function formatMessage(level: AIDiagnosisLogLevel, message: string, context: AIDiagnosisLogContext): string {
  const ts = new Date().toISOString()
  const ctx = JSON.stringify(context)
  return `[${ts}] [ai-diagnosis] [${level}] ${message} ${ctx}`
}

export function logAIDiagnosis(level: AIDiagnosisLogLevel, message: string, context: AIDiagnosisLogContext): void {
  const out = formatMessage(level, message, context)
  if (level === 'error') console.error(out)
  else if (level === 'warn') console.warn(out)
  else console.info(out)
}
