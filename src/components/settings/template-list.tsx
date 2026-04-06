'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Pencil, Mail } from 'lucide-react'
import Link from 'next/link'
import { upsertMessageTemplate } from '@/app/actions/templates'

type Row = { id: string; template_key: string; channel: string; subject: string | null; body: string; active: boolean }

type Props = {
  templateKeys: string[]
  initialRows: Record<string, Row>
}

export function TemplateList({ templateKeys, initialRows }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-4">
      {templateKeys.map((templateKey) => (
        <div key={templateKey} className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium">{templateKey}</h3>
          <Tabs defaultValue="email">
            <TabsList>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              <div className="flex items-center gap-2 pb-2">
                <Link
                  href={`/api/emails/preview?templateKey=${encodeURIComponent(templateKey)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  Anteprima email
                </Link>
              </div>
              <TemplateRow
                templateKey={templateKey}
                channel="email"
                row={initialRows[`${templateKey}:email`]}
                onSave={async (data) => {
                  setSaving(true)
                  await upsertMessageTemplate(templateKey, 'email', data)
                  setSaving(false)
                  setOpen(null)
                  router.refresh()
                }}
                open={open === `${templateKey}:email`}
                setOpen={(v) => setOpen(v ? `${templateKey}:email` : null)}
                saving={saving}
              />
            </TabsContent>
            <TabsContent value="whatsapp">
              <TemplateRow
                templateKey={templateKey}
                channel="whatsapp"
                row={initialRows[`${templateKey}:whatsapp`]}
                onSave={async (data) => {
                  setSaving(true)
                  await upsertMessageTemplate(templateKey, 'whatsapp', data)
                  setSaving(false)
                  setOpen(null)
                  router.refresh()
                }}
                open={open === `${templateKey}:whatsapp`}
                setOpen={(v) => setOpen(v ? `${templateKey}:whatsapp` : null)}
                saving={saving}
              />
            </TabsContent>
          </Tabs>
        </div>
      ))}
    </div>
  )
}

function TemplateRow({
  templateKey,
  channel,
  row,
  onSave,
  open,
  setOpen,
  saving,
}: {
  templateKey: string
  channel: 'email' | 'whatsapp'
  row?: Row | null
  onSave: (data: { subject?: string; body: string; active?: boolean }) => Promise<void>
  open: boolean
  setOpen: (v: boolean) => void
  saving: boolean
}) {
  const [subject, setSubject] = useState(row?.subject ?? '')
  const [body, setBody] = useState(row?.body ?? '')
  const [active, setActive] = useState(row?.active ?? true)

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setSubject(row?.subject ?? '')
      setBody(row?.body ?? '')
      setActive(row?.active ?? true)
    }
    setOpen(isOpen)
  }

  return (
    <div className="flex items-start justify-between gap-2 pt-2">
      <div className="min-w-0 flex-1 text-sm">
        {row ? (
          <>
            {channel === 'email' && row.subject && <p className="text-muted-foreground truncate">Oggetto: {row.subject}</p>}
            <p className="truncate">{row.body.slice(0, 80)}…</p>
            {!row.active && <Badge variant="secondary">Disattivo</Badge>}
          </>
        ) : (
          <p className="text-muted-foreground">Usa default (non salvato in DB)</p>
        )}
      </div>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
            Modifica
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template {templateKey} — {channel}</DialogTitle>
            <DialogDescription>Placeholder: {`{{customer_name}}`}, {`{{ticket_number}}`}, {`{{tracking_link}}`}, {`{{estimate_link}}`}, {`{{shop_phone}}`}, {`{{amount_due}}`}, {`{{status}}`}, {`{{working_hours}}`}, {`{{iban}}`}, {`{{beneficiary}}`}, {`{{payment_instructions}}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {channel === 'email' && (
              <div className="space-y-2">
                <Label>Oggetto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Corpo</Label>
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" className="font-mono text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={active} onCheckedChange={(c) => setActive(!!c)} />
              <Label htmlFor="active">Attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpen(false)}>Annulla</Button>
            <Button disabled={saving || !body.trim()} onClick={() => onSave({ subject: channel === 'email' ? subject : undefined, body: body.trim(), active })}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
