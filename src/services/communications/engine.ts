import { createClient } from '@/lib/supabase/server'
import { resolveTemplate, type TemplateKey } from './template-resolver'
import { getEmailAdapter } from './email/resend-service'
import { renderEmailToHtmlAndText } from './email/render-email'
import { getWhatsAppAdapter } from './whatsapp'
import { sendWithRetry } from './retry'
import type { CommunicationChannel } from './types'

type PreferredChannel = 'whatsapp' | 'email' | 'both' | 'phone'

function shouldSendChannel(preferred: PreferredChannel, channel: CommunicationChannel): boolean {
  if (preferred === 'both') return true
  if (preferred === 'whatsapp') return channel === 'whatsapp'
  if (preferred === 'email') return channel === 'email'
  if (preferred === 'phone') return false
  return true
}

export interface SendPayload {
  templateKey: TemplateKey
  ticketId?: string
  customerId: string
  payload: Record<string, string>
  /** Optional document URL to send via WhatsApp (e.g. intake PDF) */
  documentUrl?: string
  documentFilename?: string
}

export interface SendCommunicationResult {
  ok: boolean
  errors: string[]
  emailSent: boolean
  whatsappSent: boolean
}

/**
 * Sends via WhatsApp and/or Email based on customer preference.
 * - Template-based: resolveTemplate(templateKey, channel, payload) with dynamic parameter injection.
 * - WhatsApp send is retried (sendWithRetry, 3 attempts, exponential backoff) before marking failed.
 * - Fallback channel: when preferred is WhatsApp and WhatsApp fails after retries, sends via email if available.
 * - Communication logging: every send attempt (success or failure) is logged to communications table for audit.
 */
export async function sendCommunication(params: SendPayload): Promise<SendCommunicationResult> {
  const supabase = await createClient()
  const { data: customer } = await supabase
    .from('customers')
    .select('id, email, phone, whatsapp_phone, preferred_contact_channel')
    .eq('id', params.customerId)
    .single()
  if (!customer) return { ok: false, errors: ['Cliente non trovato'], emailSent: false, whatsappSent: false }

  const preferred = (customer.preferred_contact_channel as PreferredChannel) ?? 'both'
  const errors: string[] = []
  const emailTo = customer.email
  const whatsappTo = (customer.whatsapp_phone || customer.phone || '').replace(/\s/g, '')

  const logCommunication = async (
    channel: CommunicationChannel,
    recipient: string,
    subject: string | null,
    body: string,
    status: 'pending' | 'sent' | 'failed',
    providerMessageId?: string | null,
    errorMessage?: string | null,
    sentAt?: string | null
  ) => {
    await supabase.from('communications').insert({
      ticket_id: params.ticketId ?? null,
      customer_id: params.customerId,
      channel,
      template_key: params.templateKey,
      recipient,
      subject: subject ?? null,
      body: body || null,
      payload: params.payload as Record<string, unknown>,
      status,
      provider_message_id: providerMessageId ?? null,
      error_message: errorMessage ?? null,
      sent_at: sentAt ?? null,
    })
  }

  let emailSent = false
  let whatsappSent = false

  if (shouldSendChannel(preferred, 'whatsapp') && whatsappTo) {
    const resolved = await resolveTemplate(params.templateKey, 'whatsapp', params.payload)
    const adapter = getWhatsAppAdapter()
    const sendFn = params.documentUrl && adapter.sendDocument
      ? () => adapter.sendDocument!(whatsappTo, params.documentUrl!, params.documentFilename ?? 'document.pdf')
      : () => adapter.sendText(whatsappTo, resolved.body)
    const result = await sendWithRetry(sendFn)
    if (result.success) {
      await logCommunication('whatsapp', whatsappTo, null, resolved.body, 'sent', result.messageId, null, new Date().toISOString())
      whatsappSent = true
    } else {
      await logCommunication('whatsapp', whatsappTo, null, resolved.body, 'failed', null, result.error ?? 'Unknown')
      errors.push(`WhatsApp: ${result.error ?? 'failed'}`)
    }
  }

  if (shouldSendChannel(preferred, 'email') && emailTo) {
    const resolved = await resolveTemplate(params.templateKey, 'email', params.payload)
    const rendered = await renderEmailToHtmlAndText(params.templateKey, params.payload, resolved.subject ?? undefined)
    const adapter = getEmailAdapter()
    const result = await sendWithRetry(() => adapter.send({
      to: emailTo,
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
      text: rendered.text,
    }))
    if (result.success) {
      await logCommunication('email', emailTo, rendered.subject, rendered.text, 'sent', result.messageId, null, new Date().toISOString())
      emailSent = true
    } else {
      await logCommunication('email', emailTo, rendered.subject, rendered.text, 'failed', null, result.error ?? 'Unknown')
      errors.push(`Email: ${result.error ?? 'failed'}`)
    }
  }

  if (!emailSent && !whatsappSent && emailTo && preferred === 'whatsapp') {
    const resolved = await resolveTemplate(params.templateKey, 'email', params.payload)
    const rendered = await renderEmailToHtmlAndText(params.templateKey, params.payload, resolved.subject ?? undefined)
    const adapter = getEmailAdapter()
    const result = await sendWithRetry(() => adapter.send({
      to: emailTo,
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
      text: rendered.text,
    }))
    if (result.success) {
      await logCommunication('email', emailTo, rendered.subject, rendered.text, 'sent', result.messageId, null, new Date().toISOString())
      emailSent = true
    }
  }

  return {
    ok: emailSent || whatsappSent,
    errors,
    emailSent,
    whatsappSent,
  }
}
