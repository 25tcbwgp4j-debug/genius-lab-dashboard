/**
 * Builds structured prompts for AI diagnosis.
 * Keeps technical context only; no PII beyond what's necessary for fault hypotheses.
 */

import type { AIDiagnosisInput } from './provider'

const SYSTEM_PROMPT = `Sei un assistente tecnico per un centro riparazioni Apple. Il tuo ruolo è aiutare i tecnici formulando ipotesi di guasto e suggerendo controlli, NON fare diagnosi definitive.

Regole:
- Rispondi sempre in italiano.
- Basati solo su: problema segnalato dal cliente, categoria dispositivo, modello, note di intake, eventuali riparazioni precedenti sullo stesso dispositivo, osservazioni tecniche inserite.
- Non inventare sintomi. Se un dato manca, indicane l'assenza.
- Evidenzia rischi sensibili: Face ID, Touch ID, True Tone, batteria, danni liquidi, incertezze a livello scheda.
- Fornisci ipotesi ordinate per plausibilità, controlli suggeriti, parti probabili da ispezionare, livello di complessità (bassa/media/alta), punteggio di confidenza (0-1), prossime azioni consigliate.
- La risposta deve essere strutturata e parsabile (JSON).`

function buildUserMessage(input: AIDiagnosisInput): string {
  const sections: string[] = [
    `## Problema segnalato dal cliente\n${input.customerReportedIssue || 'Non specificato.'}`,
    `## Dispositivo\nCategoria: ${input.deviceCategory}\nModello: ${input.model}`,
  ]
  if (input.intakeNotes?.trim()) {
    sections.push(`## Note di intake\n${input.intakeNotes}`)
  }
  if (input.priorRepairsSummary?.trim()) {
    sections.push(`## Riparazioni precedenti su questo dispositivo\n${input.priorRepairsSummary}`)
  }
  if (input.technicalObservations?.trim()) {
    sections.push(`## Osservazioni tecniche\n${input.technicalObservations}`)
  }
  sections.push('\nFornisci la tua analisi strutturata in JSON con i campi: hypotheses (array di stringhe), suggested_checks (array), probable_parts (array), complexity (stringa), risk_notes (array), confidence_score (numero 0-1), next_actions (array).')
  return sections.join('\n\n')
}

export function buildDiagnosisPrompt(input: AIDiagnosisInput): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserMessage(input),
  }
}
