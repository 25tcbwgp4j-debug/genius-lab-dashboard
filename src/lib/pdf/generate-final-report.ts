import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { FinalReportPdfInput } from './types'
import { addHeaderFooter, startY, LAYOUT, drawLabelValue } from './layout'

const { MARGIN, LINE_HEIGHT } = LAYOUT

export async function generateFinalReportBytes(input: FinalReportPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842])
  await addHeaderFooter(doc, page, `Rapporto di riparazione – ${input.ticketNumber}`)
  let y = startY()
  const x = MARGIN
  y = drawLabelValue(page, font, bold, 'Numero riparazione', input.ticketNumber, x, y)
  y = drawLabelValue(page, font, bold, 'Cliente', input.customerName, x, y)
  y = drawLabelValue(page, font, bold, 'Dispositivo', `${input.deviceCategory} – ${input.deviceModel}`, x, y)
  y = drawLabelValue(page, font, bold, 'Data conclusione', input.completedAt, x, y)
  y -= LINE_HEIGHT
  page.drawText('Diagnosi / intervento', { x, y, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) })
  y -= LINE_HEIGHT
  y = drawLabelValue(page, font, bold, 'Descrizione', input.diagnosis || '—', x, y)
  y -= LINE_HEIGHT
  page.drawText('Importi', { x, y, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) })
  y -= LINE_HEIGHT
  y = drawLabelValue(page, font, bold, 'Totale', `€ ${input.totalAmount.toFixed(2)}`, x, y)
  y = drawLabelValue(page, font, bold, 'Pagato', `€ ${input.amountPaid.toFixed(2)}`, x, y)
  if (input.shopPhone) y = drawLabelValue(page, font, bold, 'Contatti', input.shopPhone, x, y)
  return doc.save()
}
