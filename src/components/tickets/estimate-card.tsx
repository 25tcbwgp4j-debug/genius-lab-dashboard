'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateEstimateAction, type EstimateItem } from '@/app/actions/estimate'
import { FileText, Plus, Trash2 } from 'lucide-react'

type Props = {
  ticketId: string
  estimateLaborCost: number
  estimatePartsCost: number
  estimateNotes: string | null
  estimateItems: EstimateItem[] | null
  totalAmount: number
  status: string
  canEdit: boolean
}

export function EstimateCard({
  ticketId,
  estimateLaborCost,
  estimatePartsCost,
  estimateNotes,
  estimateItems: initialItems,
  totalAmount,
  status,
  canEdit,
}: Props) {
  const router = useRouter()
  const [labor, setLabor] = useState(String(estimateLaborCost || ''))
  const [parts, setParts] = useState(String(estimatePartsCost || ''))
  const [notes, setNotes] = useState(estimateNotes ?? '')
  const [items, setItems] = useState<EstimateItem[]>(initialItems ?? [])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const laborNum = parseFloat(labor) || 0
  const partsNum = parseFloat(parts) || 0
  const computedTotal = laborNum + partsNum
  const showForm = canEdit && ['in_diagnosis', 'ai_diagnosis_generated', 'estimate_ready', 'new', 'intake_completed'].includes(status)

  function addItem() {
    setItems([...items, { description: '', amount: 0, list_price: null }])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof EstimateItem, value: string | number | null) {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  async function handleSave() {
    setMessage(null)
    setSaving(true)
    const cleanItems = items.filter(it => it.description.trim())
    const result = await updateEstimateAction(ticketId, {
      estimate_labor_cost: laborNum,
      estimate_parts_cost: partsNum,
      estimate_notes: notes.trim() || null,
      estimate_items: cleanItems.length > 0 ? cleanItems : null,
    })
    setSaving(false)
    if (result?.error) setMessage(result.error)
    else {
      setMessage('Preventivo salvato.')
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
          Manodopera, ricambi e voci dettagliate. Salva prima di inviare al cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="est-labor">Manodopera (€)</Label>
                <Input id="est-labor" type="number" step="0.01" min="0" value={labor} onChange={(e) => setLabor(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="est-parts">Ricambi (€)</Label>
                <Input id="est-parts" type="number" step="0.01" min="0" value={parts} onChange={(e) => setParts(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <Label>Voci preventivo</Label>
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Descrizione voce"
                      value={it.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      step="0.01"
                      placeholder="Prezzo"
                      value={it.amount || ''}
                      onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      step="0.01"
                      placeholder="Listino"
                      value={it.list_price ?? ''}
                      onChange={(e) => updateItem(idx, 'list_price', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" /> Aggiungi voce
            </Button>

            <div className="space-y-2">
              <Label htmlFor="est-notes">Note / esclusioni</Label>
              <Textarea id="est-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Es. non incluso: danni da liquidi..." />
            </div>
            <p className="text-sm text-muted-foreground">Totale: € {(computedTotal || totalAmount).toFixed(2)}</p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva preventivo'}
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </>
        ) : (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Manodopera:</span> € {Number(estimateLaborCost).toFixed(2)}</p>
            <p><span className="text-muted-foreground">Ricambi:</span> € {Number(estimatePartsCost).toFixed(2)}</p>
            {initialItems && initialItems.length > 0 && (
              <div className="pt-2 border-t space-y-1">
                <p className="font-medium">Voci dettaglio:</p>
                {initialItems.map((it, idx) => (
                  <p key={idx}>
                    {it.description}: € {Number(it.amount).toFixed(2)}
                    {it.list_price ? <span className="text-muted-foreground ml-1">(listino € {Number(it.list_price).toFixed(2)})</span> : null}
                  </p>
                ))}
              </div>
            )}
            <p className="font-medium pt-1"><span className="text-muted-foreground">Totale:</span> € {Number(totalAmount || estimateLaborCost + estimatePartsCost).toFixed(2)}</p>
            {estimateNotes?.trim() && (
              <p className="pt-2"><span className="text-muted-foreground">Note:</span> {estimateNotes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
