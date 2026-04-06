'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { approveEstimateAction, rejectEstimateAction } from '@/app/actions/estimate-approval'

export function ApproveRejectForm({ ticketId, token }: { ticketId: string; token: string }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleApprove() {
    setLoading('approve')
    setMessage(null)
    const result = await approveEstimateAction(ticketId, token)
    setLoading(null)
    if (result?.error) setMessage(result.error)
    else setMessage('Preventivo approvato. Grazie.')
  }

  async function handleReject() {
    setLoading('reject')
    setMessage(null)
    const result = await rejectEstimateAction(ticketId, token, note)
    setLoading(null)
    if (result?.error) setMessage(result.error)
    else setMessage('Preventivo rifiutato. Ti contatteremo.')
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="note">Note (opzionale, per rifiuto)</Label>
        <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo rifiuto o richiesta..." />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleApprove} disabled={!!loading}>
          {loading === 'approve' ? 'Elaborazione...' : 'Approva preventivo'}
        </Button>
        <Button variant="destructive" onClick={handleReject} disabled={!!loading}>
          {loading === 'reject' ? 'Elaborazione...' : 'Rifiuta'}
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
