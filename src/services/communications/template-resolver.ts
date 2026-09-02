import { createAdminClient } from '@/lib/supabase/admin'

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
  /* Testi copiati dalle mail che Genius Lab manda davvero — 2.495 preventivi,
     1.989 «pronto per il ritiro», 484 aggiornamenti, 418 consuntivi, letti
     dalla posta inviata. Il documento sta SEMPRE nel PDF allegato: il corpo
     resta corto, come lo scrivono loro. Cambiare queste parole significa
     scrivere ai clienti in un modo che non riconoscono. */
  intake_created: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} - RICEVUTA DI INGRESSO',
      body: 'Ciao  {{customer_name}}, \n\nin allegato inviamo la RICEVUTA DI INGRESSO relativa alla scheda di assistenza in oggetto.\n\nConservala: ti servirà per il ritiro e per seguire la lavorazione.\n\nRimaniamo in attesa di un Vostro riscontro.\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, abbiamo preso in carico il tuo dispositivo. Scheda n. {{ticket_number}}. Ti scriviamo appena abbiamo il preventivo.',
  },
  estimate_ready: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} - PREVENTIVO',
      body: 'Ciao  {{customer_name}}, \n\nin allegato inviamo il PREVENTIVO relativo alla scheda di assistenza in oggetto.\n\nRimaniamo in attesa di un Vostro riscontro.\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, in allegato il PREVENTIVO della scheda n. {{ticket_number}}. Rimaniamo in attesa di un Vostro riscontro.',
  },
  repair_update: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} - AGGIORNAMENTO',
      body: 'Ciao  {{customer_name}}, \n\nin allegato inviamo l\u2019AGGIORNAMENTO  relativo alla scheda di assistenza in oggetto.\n\nRimaniamo in attesa di un Vostro riscontro.\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, aggiornamento sulla scheda n. {{ticket_number}}.',
  },
  ready_for_pickup: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} PRONTO PER IL RITIRO',
      body: 'Ciao  {{customer_name}}, \n\nDISPOSITIVO PRONTO PER IL RITIRO presso: \n\nViale Somalia, 244  246  248  - Roma\nOrario LUN-VEN 9:30-13.30 e 15.00-19.00\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, il dispositivo della scheda n. {{ticket_number}} è PRONTO PER IL RITIRO in Viale Somalia 244/246/248, Roma. Orario LUN-VEN 9:30-13:30 e 15:00-19:00.',
  },
  ready_for_shipping: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} - PAGAMENTO E SPEDIZIONE',
      body: 'Ciao {{customer_name}} \n\nin allegato inviamo il CONSUNTIVO relativo alla scheda di assistenza in oggetto.\n\nPagamento con BONIFICO ORDINARIO (spedizione dopo 1 giorno lavorativo per accredito):\n\nPagamento con BONIFICO ISTANTANEO (spedizione immediata) avvertire dopo aver fatto bonifico:\n\nGENIUS LAB s.r.l.s.\nIBAN: {{iban}}\nBIC/SWIFT: SUMUIE22XXX\nIstituto: SumUp Limited\nPaese della banca: IRLANDA\n\nSe la banca chiede il paese dell\u2019istituto indicare IRLANDA e non Italia: indicando Italia il bonifico viene respinto.\n\nImporto \u20ac. {{amount_due}}\n\nCAUSALE:Scheda Assistenza N. {{ticket_number}}\n\nSe necessita fattura rispondere a questa mail con i dati per la fatturazione contestualmente al pagamento\n\nRimaniamo in attesa di un Vostro riscontro\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, consuntivo della scheda n. {{ticket_number}}: {{amount_due}} \u20ac. IBAN {{iban}} (SumUp Limited, paese IRLANDA). Causale: Scheda Assistenza N. {{ticket_number}}.',
  },
  payment_instructions: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} - PAGAMENTO E PRONTO PER IL RITIRO',
      body: 'Ciao {{customer_name}} \n\nin allegato inviamo il CONSUNTIVO relativo alla scheda di assistenza in oggetto.\n\nGENIUS LAB s.r.l.s.\nIBAN: {{iban}}\nBIC/SWIFT: SUMUIE22XXX\nIstituto: SumUp Limited\nPaese della banca: IRLANDA\n\nSe la banca chiede il paese dell\u2019istituto indicare IRLANDA e non Italia: indicando Italia il bonifico viene respinto.\n\nImporto \u20ac. {{amount_due}}\n\nCAUSALE:Scheda Assistenza N. {{ticket_number}}\n\nDISPOSITIVO PRONTO PER IL RITIRO presso: \n\nViale Somalia, 244  246  248  - Roma\nOrario LUN-VEN 9:30-13.30 e 15.00-19.00\n\nSe necessita fattura rispondere a questa mail con i dati per la fatturazione contestualmente al pagamento\n\nRimaniamo in attesa di un Vostro riscontro\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, scheda n. {{ticket_number}}: {{amount_due}} \u20ac. IBAN {{iban}} (SumUp Limited, paese IRLANDA). Causale: Scheda Assistenza N. {{ticket_number}}. Poi il dispositivo è pronto per il ritiro.',
  },
  shipped: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} - SPEDITO',
      body: 'Ciao  {{customer_name}}, \n\nil dispositivo della scheda di assistenza in oggetto \u00e8 stato SPEDITO.\n\nCorriere: {{courier}}\nNumero di tracking: {{tracking_code}}\n\nRimaniamo in attesa di un Vostro riscontro.\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, la scheda n. {{ticket_number}} \u00e8 stata spedita. {{courier}} \u2014 tracking {{tracking_code}}.',
  },
  ticket_closed: {
    email: {
      subject: 'Scheda assistenza n: {{ticket_number}} - CONSEGNATO',
      body: 'Ciao  {{customer_name}}, \n\nla lavorazione relativa alla scheda di assistenza in oggetto \u00e8 conclusa e il dispositivo \u00e8 stato consegnato.\n\nGrazie per averci scelto.\n\nCordialmente,\n\nApple  Vendita - Assistenza\n\nGenius Lab\nViale Somalia, 244/246/248\n00199 Roma\nTel. +39 06 84385510\nTel. +39 06 80074880\nOrario LUN-VEN orario 9:30-13.30 e 15.00-19.00\n\nwww.avatech.info\n\nwww.assistenza-macbook.it\nwww.apple-assistenza.it\nhttps://www.ebay.it/str/avatechlab',
    },
    whatsapp: 'Ciao {{customer_name}}, la scheda n. {{ticket_number}} è chiusa. Grazie per averci scelto.',
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
  const supabase = createAdminClient()
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
