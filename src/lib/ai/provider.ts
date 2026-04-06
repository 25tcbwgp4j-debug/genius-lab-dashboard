/**
 * Abstraction for AI diagnosis provider (OpenAI-compatible).
 * Implementations: openai-adapter.ts or other providers.
 * Never expose API keys to the client.
 */

export interface AIDiagnosisInput {
  customerReportedIssue: string
  deviceCategory: string
  model: string
  intakeNotes?: string
  priorRepairsSummary?: string
  technicalObservations?: string
}

export interface AIDiagnosisResult {
  hypotheses: string[]
  suggestedChecks: string[]
  probableParts: string[]
  complexity?: string
  riskNotes?: string[]
  confidenceScore?: number
  nextActions?: string[]
  raw?: unknown
}

export interface IAIDiagnosisProvider {
  generateStructuredDiagnosis(input: AIDiagnosisInput): Promise<AIDiagnosisResult>
}
