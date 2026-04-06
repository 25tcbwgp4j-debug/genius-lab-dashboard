'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateEstimateAction } from '@/app/actions/estimate'
import { FileText } from 'lucide-react'

type Props = {
  ticketId: string
  estimateLaborCost: number
  estimatePartsCost: number
  estimateNotes: string | null
  totalAmount: number
  status: string
  canEdit: boolean
}

export function EstimateCard({
  ticketId,
  estimateLaborCost,
  estimatePartsCost,
  estimateNotes,
  totalAmount,
  status,
  canEdit,
}: Props) {
  const router = useRouter()
  const [labor, setLabor] = useState(String(estimateLaborCost || ''))
  const [parts, setParts] = useState(String(estimatePartsCost || ''))
  const [notes, setNotes] = useState(estimateNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const laborNum = parseFloat(labor) || 0
  const partsNum = parseFloat(parts) || 0
  const computedTotal = laborNum + partsNum
  const showForm = canEdit && ['in_diagnosis', 'ai_diagnosis_generated', 'estimate_ready', 'new', 'intake_completed'].includes(status)

  async function handleSave() {
    setMessage(null)
    setSaving(true)
    const result = await updateEstimateAction(ticketId, {
      estimate_labor_cost: laborNum,
      estimate_parts_cost: partsNum,
      estimate_notes: notes.trim() || null,
    })
    setSaving(false)
    if (result?.error) setMessage(result.error)
    else {
      setMessage('Preventivo salvato. Usa "Cambia stato" → "estimate ready" per inviarlo al cliente.')
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Preventivo
        </CardTitle>
        <CardDescription>
          Manodopera, ricambi e totale. Salva prima di inviare al cliente (cambia stato in &quot;Preventivo pronto&quot;).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="est-labor">Manodopera (€)</Label>
                <Input
                  id="est-labor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="est-parts">Ricambi (€)</Label>
                <Input
                  id="est-parts"
                  type="number"
                  step="0.01"
                  min="0"
                  value={parts}
                  onChange={(e) => setParts(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="est-notes">Note / esclusioni (opzionale)</Label>
              <Textarea
                id="est-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Es. non incluso: danni da liquidi, batteria..."
              />
            </div>
            <p className="text-sm text-muted-foreground">Totale: € {(computedTotal || totalAmount).toFixed(2)}</p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva preventivo'}
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </>
        ) : (
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Manodopera:</span> € {Number(estimateLaborCost).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Ricambi:</span> € {Number(estimatePartsCost).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Totale:</span> € {Number(totalAmount || estimateLaborCost + estimatePartsCost).toFixed(2)}</p>
            {estimateNotes?.trim() && (
              <p className="pt-2"><span className="text-muted-foreground">Note:</span> {estimateNotes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
