import type { IAIDiagnosisProvider, AIDiagnosisInput, AIDiagnosisResult } from './provider'
import { buildDiagnosisPrompt } from './prompt-builder'
import { parseAIResponse } from './schemas'

const OPENAI_BASE = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

export class OpenAIDiagnosisAdapter implements IAIDiagnosisProvider {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? ''
    if (!this.apiKey) {
      console.warn('OpenAIDiagnosisAdapter: OPENAI_API_KEY not set; calls will fail.')
    }
  }

  async generateStructuredDiagnosis(input: AIDiagnosisInput): Promise<AIDiagnosisResult> {
    const { system, user } = buildDiagnosisPrompt(input)
    const url = `${OPENAI_BASE}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI API error ${res.status}: ${err}`)
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response from OpenAI')
    const parsed = parseAIResponse(content)
    return {
      hypotheses: parsed.hypotheses,
      suggestedChecks: parsed.suggested_checks,
      probableParts: parsed.probable_parts,
      complexity: parsed.complexity,
      riskNotes: parsed.risk_notes,
      confidenceScore: parsed.confidence_score,
      nextActions: parsed.next_actions,
      raw: parsed,
    }
  }
}
