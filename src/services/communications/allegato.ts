import {
  buildIntakePdfInput, buildEstimatePdfInput,
  buildPaymentInstructionsPdfInput, buildFinalReportPdfInput,
} from '@/lib/pdf/build-inputs'
import {
  generateIntakeSheetBytes, generateEstimateBytes,
  generatePaymentInstructionsBytes, generateFinalReportBytes,
} from '@/lib/pdf'
import type { TemplateKey } from './template-resolver'

/**
 * Il PDF da allegare alla mail.
 *
 * Tre dei nostri testi dicono al cliente «in allegato inviamo…»: la ricevuta di
 * ingresso, il preventivo e il consuntivo. Partivano senza niente attaccato: al
 * cliente arrivava una mail che prometteva un documento che non c'era.
 *
 * Chi non nomina allegati (pronto per il ritiro, spedito) resta senza: non si
 * appesantisce una mail di due righe con un PDF che nessuno ha chiesto.
 */
type Tipo = 'intake' | 'estimate' | 'payment' | 'report'

const DOCUMENTO: Partial<Record<TemplateKey, { tipo: Tipo; nome: string }>> = {
  intake_created:       { tipo: 'intake',   nome: 'scheda ingresso' },
  estimate_ready:       { tipo: 'estimate', nome: 'preventivo' },
  repair_update:        { tipo: 'estimate', nome: 'preventivo aggiornato' },
  payment_instructions: { tipo: 'payment',  nome: 'consuntivo' },
  ready_for_shipping:   { tipo: 'payment',  nome: 'consuntivo' },
  ticket_closed:        { tipo: 'report',   nome: 'rapporto' },
}

async function bytes(tipo: Tipo, ticketId: string): Promise<Uint8Array | null> {
  if (tipo === 'intake') {
    const i = await buildIntakePdfInput(ticketId)
    return i ? generateIntakeSheetBytes(i) : null
  }
  if (tipo === 'estimate') {
    const i = await buildEstimatePdfInput(ticketId)
    return i ? generateEstimateBytes(i) : null
  }
  if (tipo === 'payment') {
    const i = await buildPaymentInstructionsPdfInput(ticketId)
    return i ? generatePaymentInstructionsBytes(i) : null
  }
  const i = await buildFinalReportPdfInput(ticketId)
  return i ? generateFinalReportBytes(i) : null
}

export async function allegatoPerMail(
  templateKey: TemplateKey,
  ticketId: string,
  numeroScheda: string,
): Promise<{ filename: string; content: string }[] | undefined> {
  const d = DOCUMENTO[templateKey]
  if (!d) return undefined
  try {
    const b = await bytes(d.tipo, ticketId)
    if (!b) return undefined
    return [{
      // stesso nome dei PDF che si scaricano dalla pulsantiera
      filename: `${numeroScheda} ${d.nome}.pdf`,
      content: Buffer.from(b).toString('base64'),
    }]
  } catch {
    // un PDF che non si genera non deve impedire alla mail di partire
    return undefined
  }
}
