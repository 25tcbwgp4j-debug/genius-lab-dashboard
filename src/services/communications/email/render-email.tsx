/**
 * Renders React email templates to HTML and plain text.
 * Each template receives the notification payload; components are fully parameterized.
 */
import { render, toPlainText } from '@react-email/render'
import React from 'react'
import type { TemplateKey } from '../template-resolver'
import { IntakeCreatedEmail } from '@/emails/templates/intake-created'
import { EstimateReadyEmail } from '@/emails/templates/estimate-ready'
import { RepairUpdateEmail } from '@/emails/templates/repair-update'
import { ReadyForPickupEmail } from '@/emails/templates/ready-for-pickup'
import { ReadyForShippingEmail } from '@/emails/templates/ready-for-shipping'
import { PaymentInstructionsEmail } from '@/emails/templates/payment-instructions'
import { ShippedEmail } from '@/emails/templates/shipped'
import { TicketClosedEmail } from '@/emails/templates/ticket-closed'

const DEFAULT_SUBJECTS: Record<TemplateKey, string> = {
  intake_created: 'Scheda assistenza {{ticket_number}} – Genius Lab',
  estimate_ready: 'Preventivo riparazione {{ticket_number}} – Genius Lab',
  repair_update: 'Aggiornamento riparazione {{ticket_number}}',
  ready_for_pickup: 'Dispositivo pronto per il ritiro – {{ticket_number}}',
  ready_for_shipping: 'Riparazione completata – Pronto per spedizione {{ticket_number}}',
  payment_instructions: 'Istruzioni di pagamento – {{ticket_number}}',
  shipped: 'Dispositivo spedito – {{ticket_number}}',
  ticket_closed: 'Riparazione conclusa – {{ticket_number}}',
}

function substitute(template: string, payload: Record<string, string>): string {
  let out = template
  for (const [key, value] of Object.entries(payload)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '')
  }
  return out
}

function getProps(templateKey: TemplateKey, payload: Record<string, string>) {
  const p = payload
  const base = {
    customerName: p.customer_name ?? '',
    ticketNumber: p.ticket_number ?? '',
  }
  switch (templateKey) {
    case 'intake_created':
      return { ...base, trackingLink: p.tracking_link ?? '', shopPhone: p.shop_phone ?? '' }
    case 'estimate_ready':
      return { ...base, amountDue: p.amount_due ?? '', estimateLink: p.estimate_link ?? '', shopPhone: p.shop_phone ?? '' }
    case 'repair_update':
      return { ...base, status: p.status ?? '', trackingLink: p.tracking_link ?? '' }
    case 'ready_for_pickup':
      return { ...base, amountDue: p.amount_due ?? '', workingHours: p.working_hours ?? '', shopPhone: p.shop_phone ?? '' }
    case 'ready_for_shipping':
      return {
        ...base,
        amountDue: p.amount_due ?? '',
        paymentInstructions: p.payment_instructions ?? '',
        shopPhone: p.shop_phone ?? '',
      }
    case 'payment_instructions':
      return {
        ...base,
        amountDue: p.amount_due ?? '',
        iban: p.iban ?? '',
        beneficiary: p.beneficiary ?? '',
        paymentReference: p.payment_reference ?? `GL ${p.ticket_number ?? ''}`,
        proofOfPaymentInstructions: p.proof_of_payment_instructions ?? undefined,
      }
    case 'shipped':
      return {
        ...base,
        courierName: p.courier_name ?? '',
        trackingCode: p.tracking_code ?? '',
        trackingLink: p.tracking_link ?? '',
      }
    case 'ticket_closed':
      return base
    default:
      return base
  }
}

function getComponent(templateKey: TemplateKey) {
  switch (templateKey) {
    case 'intake_created':
      return IntakeCreatedEmail
    case 'estimate_ready':
      return EstimateReadyEmail
    case 'repair_update':
      return RepairUpdateEmail
    case 'ready_for_pickup':
      return ReadyForPickupEmail
    case 'ready_for_shipping':
      return ReadyForShippingEmail
    case 'payment_instructions':
      return PaymentInstructionsEmail
    case 'shipped':
      return ShippedEmail
    case 'ticket_closed':
      return TicketClosedEmail
    default:
      return null
  }
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

/**
 * Renders the React email for the given template and payload.
 * Returns subject (with placeholders substituted), HTML, and plain text.
 */
export async function renderEmailToHtmlAndText(
  templateKey: TemplateKey,
  payload: Record<string, string>,
  subjectOverride?: string | null,
  bodyOverride?: string | null
): Promise<RenderedEmail> {
  const Component = getComponent(templateKey)
  const subject = subjectOverride ?? DEFAULT_SUBJECTS[templateKey]
  const subjectResolved = substitute(subject, payload)

  /* Se c'è il testo dei nostri modelli, è QUELLO che va al cliente.
     Prima il corpo veniva ignorato e partiva un testo generico di libreria
     («Gentile Mario Rossi, Le confermiamo l'avvenuta registrazione…»): niente
     firma, niente indirizzo di Viale Somalia e — sul consuntivo — niente
     coordinate bancarie. Il testo vero sta in template-resolver.ts, letto
     dalle 2.495 mail realmente inviate. */
  if (bodyOverride && bodyOverride.trim()) {
    const testo = substitute(bodyOverride, payload)
    const html =
      `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;` +
      `font-size:14px;line-height:1.55;color:#1a1a1a;white-space:pre-wrap">` +
      testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      `</div>`
    return { subject: subjectResolved, html, text: testo }
  }

  if (!Component) {
    const body = Object.values(payload).join(' ')
    return {
      subject: subjectResolved,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
      text: body,
    }
  }

  const props = getProps(templateKey, payload)
  const element = React.createElement(Component as React.ComponentType<Record<string, string>>, props as Record<string, string>)
  const html = await render(element)
  const text = toPlainText(html)
  return { subject: subjectResolved, html, text }
}
