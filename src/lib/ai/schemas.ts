import { z } from 'zod'

/**
 * Schema for parsing AI diagnosis API response.
 * Used to validate and type the provider output before storing.
 */
export const aiDiagnosisResponseSchema = z.object({
  hypotheses: z.array(z.string()).default([]),
  suggested_checks: z.array(z.string()).default([]),
  probable_parts: z.array(z.string()).default([]),
  complexity: z.string().optional(),
  risk_notes: z.array(z.string()).optional().default([]),
  confidence_score: z.number().min(0).max(1).optional(),
  next_actions: z.array(z.string()).default([]),
})

export type AIDiagnosisResponse = z.infer<typeof aiDiagnosisResponseSchema>

/** Normalize raw API response (may be wrapped in markdown/code block) into AIDiagnosisResponse */
export function parseAIResponse(raw: string): AIDiagnosisResponse {
  let jsonStr = raw.trim()

  // Rimuovi code block markdown se presente
  const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) jsonStr = codeBlock[1].trim()

  // Fix comuni in JSON malformato da LLM
  jsonStr = jsonStr
    .replace(/,\s*}/g, '}')       // trailing comma prima di }
    .replace(/,\s*]/g, ']')       // trailing comma prima di ]
    .replace(/[\x00-\x1f]/g, ' ') // caratteri di controllo

  // Se inizia con testo prima del JSON, estrai il primo oggetto JSON
  if (!jsonStr.startsWith('{')) {
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) {
      jsonStr = jsonStr.slice(firstBrace)
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[AI PARSE] JSON non valido:', jsonStr.slice(0, 500))
    throw new Error(`Risposta AI non valida (JSON): ${msg}`)
  }
  const result = aiDiagnosisResponseSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.flatten().formErrors.join('; ')
    throw new Error(`Risposta AI non valida (schema): ${issues}`)
  }
  return result.data
}
