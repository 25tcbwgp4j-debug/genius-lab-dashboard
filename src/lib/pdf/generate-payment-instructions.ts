import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PaymentInstructionsPdfInput } from './types'
import { addHeaderFooter, startY, LAYOUT, drawLabelValue } from './layout'

const { MARGIN, LINE_HEIGHT } = LAYOUT

export async function generatePaymentInstructionsBytes(input: PaymentInstructionsPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842])
  await addHeaderFooter(doc, page, `Istruzioni di pagamento – ${input.ticketNumber}`)
  let y = startY()
  const x = MARGIN
  y = drawLabelValue(page, font, bold, 'Numero riparazione', input.ticketNumber, x, y)
  y = drawLabelValue(page, font, bold, 'Cliente', input.customerName, x, y)
  y -= LINE_HEIGHT
  y = drawLabelValue(page, font, bold, 'Importo da saldare', `€ ${input.amountDue.toFixed(2)}`, x, y)
  y = drawLabelValue(page, font, bold, 'IBAN', input.iban, x, y)
  y = drawLabelValue(page, font, bold, 'Intestatario', input.beneficiary, x, y)
  y = drawLabelValue(page, font, bold, 'Riferimento di pagamento (causale)', input.paymentReference, x, y)
  if (input.proofOfPaymentInstructions?.trim()) {
    y -= LINE_HEIGHT
    y = drawLabelValue(page, font, bold, 'Dopo il pagamento', input.proofOfPaymentInstructions, x, y)
  } else if (input.paymentInstructions?.trim()) {
    y -= LINE_HEIGHT
    drawLabelValue(page, font, bold, 'Istruzioni', input.paymentInstructions, x, y)
  }
  return doc.save()
}
