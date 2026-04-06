import { createClient } from '@/lib/supabase/server'

export type TemplateKey =
  | 'intake_created'
  | 'estimate_ready'
  | 'repair_update'
  | 'ready_for_pickup'
  | 'ready_for_shipping'
  | 'payment_instructions'
  | 'shipped'
  | 'ticket_closed'

const DEFAULT_TEMPLATES: Record<
  TemplateKey,
  { email?: { subject: string; body: string }; whatsapp?: string }
> = {
  intake_created: {
    email: {
      subject: 'Scheda assistenza {{ticket_number}} – Genius Lab',
      body: 'Gentile {{customer_name}},\n\nLe confermiamo l\'avvenuta registrazione del suo dispositivo.\nNumero riparazione: {{ticket_number}}.\nScheda assistenza (PDF): {{document_intake_link}}\nSegui lo stato: {{tracking_link}}\nContatti: {{shop_phone}}.',
    },
    whatsapp: 'Gentile {{customer_name}}, scheda assistenza {{ticket_number}}. PDF: {{document_intake_link}} Tracking: {{tracking_link}}. Contatti: {{shop_phone}}',
  },
  estimate_ready: {
    email: {
      subject: 'Preventivo riparazione {{ticket_number}} – Genius Lab',
      body: 'Gentile {{customer_name}},\n\nIl preventivo per la riparazione {{ticket_number}} è pronto. Totale: {{amount_due}} €. Approvazione: {{estimate_link}}. Per informazioni: {{shop_phone}}.',
    },
    whatsapp: 'Preventivo {{ticket_number}} pronto. Totale {{amount_due}} €. Approva o rifiuta: {{estimate_link}}',
  },
  repair_update: {
    email: {
      subject: 'Aggiornamento riparazione {{ticket_number}}',
      body: 'Gentile {{customer_name}},\n\nStato riparazione {{ticket_number}}: {{status}}. Tracciamento: {{tracking_link}}.',
    },
    whatsapp: '{{ticket_number}}: {{status}}. {{tracking_link}}',
  },
  ready_for_pickup: {
    email: {
      subject: 'Dispositivo pronto per il ritiro – {{ticket_number}}',
      body: 'Gentile {{customer_name}},\n\nIl suo dispositivo è pronto per il ritiro. Importo da saldare: {{amount_due}} €. Orari: {{working_hours}}. Contatti: {{shop_phone}}.',
    },
    whatsapp: 'Dispositivo pronto per ritiro. Importo: {{amount_due}} €. Orari: {{working_hours}}. {{shop_phone}}',
  },
  ready_for_shipping: {
    email: {
      subject: 'Riparazione completata – Pronto per spedizione {{ticket_number}}',
      body: 'Gentile {{customer_name}},\n\nRiparazione {{ticket_number}} completata. Totale: {{amount_due}} €. Istruzioni pagamento: {{payment_instructions}}. Dopo l\'accredito spediremo il dispositivo.',
    },
    whatsapp: 'Riparazione completata. Totale {{amount_due}} €. Istruzioni: {{iban}} – Causale GL {{ticket_number}}',
  },
  payment_instructions: {
    email: {
      subject: 'Istruzioni di pagamento – {{ticket_number}}',
      body: 'Gentile {{customer_name}},\n\nImporto da saldare: {{amount_due}} €.\nIBAN: {{iban}}\nIntestatario: {{beneficiary}}\nRiferimento (causale): {{payment_reference}}\n\nDopo il pagamento: {{proof_of_payment_instructions}}',
    },
    whatsapp: 'Pagamento {{ticket_number}}: {{amount_due}} €. IBAN: {{iban}}. Intestatario: {{beneficiary}}. Causale: {{payment_reference}}. Dopo il bonifico: {{proof_of_payment_instructions}}',
  },
  shipped: {
    email: {
      subject: 'Dispositivo spedito – {{ticket_number}}',
      body: 'Gentile {{customer_name}},\n\nIl suo dispositivo (riparazione {{ticket_number}}) è stato spedito.\nCorriere: {{courier_name}}\nCodice tracciamento: {{tracking_code}}\n\nSegui la spedizione: {{tracking_link}}',
    },
    whatsapp: 'Dispositivo {{ticket_number}} spedito. Corriere: {{courier_name}}. Tracciamento: {{tracking_code}}. {{tracking_link}}',
  },
  ticket_closed: {
    email: {
      subject: 'Riparazione conclusa – {{ticket_number}}',
      body: 'Gentile {{customer_name}},\n\nLa riparazione {{ticket_number}} è stata conclusa. Grazie per aver scelto Genius Lab.',
    },
    whatsapp: 'Riparazione {{ticket_number}} conclusa. Grazie da Genius Lab.',
  },
}

/** Dynamic parameter injection: replace {{key}} with payload[key]. Keys and values must be server-built only. */
function substitute(template: string, payload: Record<string, string>): string {
  let out = template
  for (const [key, value] of Object.entries(payload)) {
    if (typeof key !== 'string' || key.length > 128) continue
    const safeValue = typeof value === 'string' ? value : String(value ?? '')
    out = out.replace(new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g'), safeValue)
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function resolveTemplate(
  templateKey: TemplateKey,
  channel: 'email' | 'whatsapp',
  payload: Record<string, string>
): Promise<{ subject?: string; body: string }> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('message_templates')
    .select('subject, body')
    .eq('template_key', templateKey)
    .eq('channel', channel)
    .eq('active', true)
    .maybeSingle()

  const defaults = DEFAULT_TEMPLATES[templateKey]
  if (channel === 'email') {
    const subject = row?.subject ?? defaults.email?.subject ?? ''
    const body = row?.body ?? defaults.email?.body ?? ''
    return { subject: substitute(subject, payload), body: substitute(body, payload) }
  }
  const body = row?.body ?? defaults.whatsapp ?? ''
  return { body: substitute(body, payload) }
}
