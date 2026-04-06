'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Loader2, Sparkles, Check, X, RefreshCw, Gauge, ListChecks } from 'lucide-react'
import {
  generateAIDiagnosisAction,
  acceptAIDiagnosisSuggestionAction,
  discardAIDiagnosisSuggestionAction,
} from '@/app/actions/ai-diagnosis'

type AIDiagnosisRow = {
  id: string
  hypotheses: string[] | null
  suggested_checks: string[] | null
  probable_parts: string[] | null
  complexity: string | null
  risk_notes: string[] | null
  confidence_score: number | null
  next_actions: string[] | null
  created_at: string
}

type Props = {
  ticketId: string
  canUseAI: boolean
  latestDiagnosis: AIDiagnosisRow | null
  currentRiskFlags: string | null
}

function confidenceColor(score: number): string {
  if (score >= 0.7) return 'bg-emerald-500'
  if (score >= 0.4) return 'bg-amber-500'
  return 'bg-red-500'
}

function confidenceLabel(score: number): string {
  if (score >= 0.7) return 'Alta'
  if (score >= 0.4) return 'Media'
  return 'Bassa'
}

export function AIDiagnosisBlock({ ticketId, canUseAI, latestDiagnosis, currentRiskFlags }: Props) {
  const [loading, setLoading] = useState<'generate' | 'accept' | 'discard' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setError(null)
    setLoading('generate')
    const result = await generateAIDiagnosisAction(ticketId)
    setLoading(null)
    if (!result.success) setError('error' in result ? result.error : 'Errore')
  }

  async function handleAccept() {
    if (!latestDiagnosis) return
    const text = [
      ...(latestDiagnosis.hypotheses ?? []),
      ...(latestDiagnosis.next_actions ?? latestDiagnosis.suggested_checks ?? []),
    ].join('\n')
    setError(null)
    setLoading('accept')
    await acceptAIDiagnosisSuggestionAction(ticketId, text)
    setLoading(null)
  }

  async function handleDiscard() {
    setError(null)
    setLoading('discard')
    await discardAIDiagnosisSuggestionAction(ticketId)
    setLoading(null)
  }

  const riskFlagsList = currentRiskFlags ? currentRiskFlags.split(';').filter(Boolean) : []
  const riskNotesList = (latestDiagnosis?.risk_notes ?? []).filter(Boolean)
  const hasRisks = riskFlagsList.length > 0 || riskNotesList.length > 0
  const confidence = latestDiagnosis?.confidence_score ?? null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Suggerimento diagnosi AI
          </CardTitle>
          {canUseAI && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={!!loading}
            >
              {loading === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {latestDiagnosis ? 'Rigenera' : 'Genera suggerimento'}
            </Button>
          )}
        </div>
        <CardDescription>
          L&apos;AI non sovrascrive la diagnosi del tecnico. Puoi accettare (copia nelle note), scartare o rigenerare.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {hasRisks && (
          <div className="rounded-lg border border-amber-500/60 bg-amber-500/5 px-3 py-3">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Avvertenze e rischi
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 dark:text-amber-200">
              {riskNotesList.length > 0
                ? riskNotesList.map((r, i) => <li key={i}>{r.trim()}</li>)
                : riskFlagsList.map((r, i) => <li key={i}>{r.trim()}</li>)}
            </ul>
          </div>
        )}

        {latestDiagnosis ? (
          <>
            {confidence != null && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-4 w-4" />
                  Confidenza suggerimento
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${confidenceColor(confidence)}`}
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium tabular-nums">{(confidence * 100).toFixed(0)}%</span>
                  <Badge variant={confidence >= 0.7 ? 'default' : confidence >= 0.4 ? 'secondary' : 'destructive'} className="shrink-0">
                    {confidenceLabel(confidence)}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              {latestDiagnosis.hypotheses?.length ? (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Ipotesi di guasto (probabili cause)</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {latestDiagnosis.hypotheses.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(latestDiagnosis.next_actions?.length ?? 0) > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <ListChecks className="h-4 w-4" />
                    Prossime azioni consigliate
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {latestDiagnosis.next_actions!.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {latestDiagnosis.suggested_checks?.length ? (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Controlli consigliati</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {latestDiagnosis.suggested_checks.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {latestDiagnosis.probable_parts?.length ? (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Parti probabili</p>
                  <div className="flex flex-wrap gap-1">
                    {latestDiagnosis.probable_parts.map((p, i) => (
                      <Badge key={i} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {latestDiagnosis.complexity && (
                <p><span className="font-medium text-muted-foreground">Complessità:</span> {latestDiagnosis.complexity}</p>
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" onClick={handleAccept} disabled={!!loading}>
                {loading === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accetta nelle note
              </Button>
              <Button size="sm" variant="outline" onClick={handleDiscard} disabled={!!loading}>
                {loading === 'discard' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Scarta
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nessun suggerimento generato. Usa &quot;Genera suggerimento&quot; per ottenere ipotesi e controlli consigliati.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
