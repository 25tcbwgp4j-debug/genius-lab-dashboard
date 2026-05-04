'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Link as LinkIcon, Copy, ExternalLink } from 'lucide-react'
import { recordPaymentAction } from '@/app/actions/payments'
import type { PaymentMethod } from '@/types/database'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Contanti' },
  { value: 'pos', label: 'POS' },
  { value: 'bank_transfer', label: 'Bonifico' },
  { value: 'other', label: 'Altro' },
]

type PaymentRow = {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  reference: string | null
  notes: string | null
}

type Props = {
  ticketId: string
  totalAmount: number
  amountPaid: number
  payments: PaymentRow[]
  canRecordPayment: boolean
  ticketDescription?: string | null
}

export function TicketPaymentsCard({ ticketId, totalAmount, amountPaid, payments, canRecordPayment, ticketDescription }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const amountDue = Math.max(0, totalAmount - amountPaid)

  // Stripe Checkout link generator
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkAmount, setLinkAmount] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function openLinkForm() {
    setLinkAmount(amountDue > 0 ? amountDue.toFixed(2) : totalAmount.toFixed(2))
    setLinkDescription(ticketDescription || `Riparazione ticket ${ticketId.slice(0, 8)}`)
    setGeneratedUrl(null)
    setLinkError(null)
    setLinkOpen(true)
  }

  async function generateCheckoutLink(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(linkAmount.replace(',', '.'))
    if (Number.isNaN(num) || num <= 0) {
      setLinkError('Importo non valido')
      return
    }
    setLinkError(null)
    setLinkLoading(true)
    try {
      const resp = await fetch('/api/backend/api/chat/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          amount_eur: num,
          description: linkDescription.trim() || `Ticket ${ticketId.slice(0, 8)}`,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || !data.url) {
        setLinkError(data.error || `Errore HTTP ${resp.status}`)
      } else {
        setGeneratedUrl(data.url)
      }
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Errore rete')
    } finally {
      setLinkLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (Number.isNaN(num) || num <= 0) {
      setError('Inserire un importo valido')
      return
    }
    setError(null)
    setLoading(true)
    const result = await recordPaymentAction({
      ticket_id: ticketId,
      payment_method: method,
      amount: num,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setAmount('')
    setReference('')
    setNotes('')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagamenti</CardTitle>
        <CardDescription>
          Totale € {totalAmount.toFixed(2)} · Pagato € {amountPaid.toFixed(2)} · Da saldare € {amountDue.toFixed(2)}
          {amountDue > 0 && <Badge variant="outline" className="ml-2">{amountDue === totalAmount ? 'Non pagato' : 'Parziale'}</Badge>}
          {amountDue <= 0 && totalAmount > 0 && <Badge className="ml-2">Saldata</Badge>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.length > 0 && (
          <ul className="space-y-1 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between items-center">
                <span>{new Date(p.payment_date).toLocaleDateString('it-IT')}</span>
                <span>€ {Number(p.amount).toFixed(2)}</span>
                <Badge variant="secondary">{p.payment_method}</Badge>
                {p.reference && <span className="text-muted-foreground truncate max-w-[120px]">{p.reference}</span>}
              </li>
            ))}
          </ul>
        )}
        {canRecordPayment && (
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pay-amount">Importo (€)</Label>
                <Input
                  id="pay-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pay-method">Metodo</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} disabled={loading}>
                  <SelectTrigger id="pay-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-reference">Riferimento (opzionale)</Label>
              <Input
                id="pay-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Es. ricevuta bonifico"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-notes">Note (opzionale)</Label>
              <Textarea
                id="pay-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Registra pagamento
            </Button>
          </form>
        )}
        {!canRecordPayment && payments.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessun pagamento registrato.</p>
        )}

        {canRecordPayment && (
          <div className="pt-3 border-t">
            {!linkOpen && (
              <Button type="button" variant="outline" size="sm" onClick={openLinkForm}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Genera link Stripe
              </Button>
            )}
            {linkOpen && (
              <form onSubmit={generateCheckoutLink} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Link pagamento online</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLinkOpen(false)} disabled={linkLoading}>
                    Annulla
                  </Button>
                </div>
                {linkError && <p className="text-sm text-destructive">{linkError}</p>}
                <div className="space-y-1">
                  <Label htmlFor="link-amount">Importo (€)</Label>
                  <Input
                    id="link-amount"
                    type="text"
                    inputMode="decimal"
                    value={linkAmount}
                    onChange={(e) => setLinkAmount(e.target.value)}
                    disabled={linkLoading || !!generatedUrl}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="link-description">Descrizione</Label>
                  <Input
                    id="link-description"
                    value={linkDescription}
                    onChange={(e) => setLinkDescription(e.target.value)}
                    disabled={linkLoading || !!generatedUrl}
                  />
                </div>
                {!generatedUrl && (
                  <Button type="submit" size="sm" disabled={linkLoading}>
                    {linkLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-1" />}
                    Genera link
                  </Button>
                )}
                {generatedUrl && (
                  <div className="space-y-2">
                    <Input value={generatedUrl} readOnly onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4 mr-1" />
                        {copied ? 'Copiato!' : 'Copia'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Apri
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Inviare il link al cliente via WhatsApp o email. Verrà registrato automaticamente quando completato.
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
