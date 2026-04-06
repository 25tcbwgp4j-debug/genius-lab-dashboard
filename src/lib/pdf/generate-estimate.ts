import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { EstimatePdfInput } from './types'
import { addHeaderFooter, startY, LAYOUT, drawLabelValue } from './layout'

const { MARGIN, LINE_HEIGHT } = LAYOUT

export async function generateEstimateBytes(input: EstimatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842])
  await addHeaderFooter(doc, page, `Preventivo – ${input.ticketNumber}`)
  let y = startY()
  const x = MARGIN
  y = drawLabelValue(page, font, bold, 'Numero riparazione', input.ticketNumber, x, y)
  y = drawLabelValue(page, font, bold, 'Cliente', input.customerName, x, y)
  y = drawLabelValue(page, font, bold, 'Dispositivo', input.deviceModel, x, y)
  y -= LINE_HEIGHT
  page.drawText('Importi', { x, y, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) })
  y -= LINE_HEIGHT
  y = drawLabelValue(page, font, bold, 'Manodopera', `€ ${input.laborCost.toFixed(2)}`, x, y)
  y = drawLabelValue(page, font, bold, 'Ricambi', `€ ${input.partsCost.toFixed(2)}`, x, y)
  y = drawLabelValue(page, font, bold, 'Totale', `€ ${input.total.toFixed(2)}`, x, y)
  if (input.notes?.trim()) {
    y -= LINE_HEIGHT
    y = drawLabelValue(page, font, bold, 'Note', input.notes, x, y)
  }
  return doc.save()
}
