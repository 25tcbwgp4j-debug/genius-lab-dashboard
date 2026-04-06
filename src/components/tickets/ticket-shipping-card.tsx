'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { updateTicketShipping } from '@/app/actions/tickets'
import type { TicketStatus } from '@/types/database'

type Props = {
  ticketId: string
  status: TicketStatus
  shippingRequired: boolean
  shippingAddress: string | null
  recipientName: string | null
  recipientPhone: string | null
  courierName: string | null
  trackingCode: string | null
  shippingNotes: string | null
  canEditShipping?: boolean
}

const SHIPPING_STATUSES: TicketStatus[] = ['ready_for_shipping', 'shipped', 'delivered']

export function TicketShippingCard({
  ticketId,
  status,
  shippingRequired,
  shippingAddress,
  recipientName,
  recipientPhone,
  courierName,
  trackingCode,
  shippingNotes,
  canEditShipping = true,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formRequired, setFormRequired] = useState(shippingRequired)
  const [formAddress, setFormAddress] = useState(shippingAddress ?? '')
  const [formRecipient, setFormRecipient] = useState(recipientName ?? '')
  const [formPhone, setFormPhone] = useState(recipientPhone ?? '')
  const [formNotes, setFormNotes] = useState(shippingNotes ?? '')

  const showShippingSection = shippingRequired || SHIPPING_STATUSES.includes(status)
  const allowEdit = canEditShipping && !['shipped', 'delivered'].includes(status)

  function handleSave() {
    startTransition(async () => {
      const res = await updateTicketShipping(ticketId, {
        shipping_required: formRequired,
        shipping_address: formAddress || null,
        recipient_name: formRecipient || null,
        recipient_phone: formPhone || null,
        shipping_notes: formNotes || null,
      })
      if (!res?.error) {
        setEditing(false)
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Spedizione</CardTitle>
        {allowEdit && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Modifica
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shipping-required"
                checked={formRequired}
                onChange={(e) => setFormRequired(e.target.checked)}
              />
              <Label htmlFor="shipping-required">Spedizione richiesta</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shipping-address">Indirizzo di spedizione</Label>
              <Textarea
                id="shipping-address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Indirizzo completo"
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recipient-name">Destinatario</Label>
              <Input
                id="recipient-name"
                value={formRecipient}
                onChange={(e) => setFormRecipient(e.target.value)}
                placeholder="Nome e cognome"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recipient-phone">Telefono destinatario</Label>
              <Input
                id="recipient-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+39 ..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shipping-notes">Note spedizione</Label>
              <Textarea
                id="shipping-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Note per il corriere"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                Salva
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={isPending}>
                Annulla
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p>
              <span className="text-muted-foreground">Spedizione richiesta:</span>{' '}
              {shippingRequired ? <Badge variant="secondary">Sì</Badge> : <Badge variant="outline">No</Badge>}
            </p>
            {showShippingSection && (
              <>
                {shippingAddress && (
                  <p>
                    <span className="text-muted-foreground">Indirizzo:</span> {shippingAddress}
                  </p>
                )}
                {recipientName && (
                  <p>
                    <span className="text-muted-foreground">Destinatario:</span> {recipientName}
                  </p>
                )}
                {recipientPhone && (
                  <p>
                    <span className="text-muted-foreground">Tel. destinatario:</span> {recipientPhone}
                  </p>
                )}
                {courierName && (
                  <p>
                    <span className="text-muted-foreground">Corriere:</span> {courierName}
                  </p>
                )}
                {trackingCode && (
                  <p>
                    <span className="text-muted-foreground">Codice tracciamento:</span>{' '}
                    <span className="font-mono">{trackingCode}</span>
                  </p>
                )}
                {shippingNotes && (
                  <p>
                    <span className="text-muted-foreground">Note:</span> {shippingNotes}
                  </p>
                )}
              </>
            )}
            {!shippingRequired && !shippingAddress && !courierName && !trackingCode && (
              <p className="text-muted-foreground">Nessun dato di spedizione. Ritiro in negozio.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
