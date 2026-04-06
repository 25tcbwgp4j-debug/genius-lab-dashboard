import type { IAIDiagnosisProvider, AIDiagnosisInput, AIDiagnosisResult } from './provider'
import { buildDiagnosisPrompt } from './prompt-builder'
import { parseAIResponse } from './schemas'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'

export class AnthropicDiagnosisAdapter implements IAIDiagnosisProvider {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? ''
    if (!this.apiKey) {
      console.warn('AnthropicDiagnosisAdapter: ANTHROPIC_API_KEY not set; calls will fail.')
    }
  }

  async generateStructuredDiagnosis(input: AIDiagnosisInput): Promise<AIDiagnosisResult> {
    const { system, user } = buildDiagnosisPrompt(input)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${err}`)
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const content = data.content?.find(c => c.type === 'text')?.text
    if (!content) throw new Error('Empty response from Anthropic')
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
