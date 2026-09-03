import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { EstimatePdfInput } from './types'
import { addHeaderFooter, startY, LAYOUT, drawLabelValue, drawWrappedText } from './layout'

const { MARGIN, LINE_HEIGHT, PAGE_WIDTH } = LAYOUT

/**
 * Il preventivo come lo faceva FileMaker: prima il lavoro, scritto per esteso,
 * e in fondo il totale.
 *
 * La riga «Manodopera / Ricambi» compare solo se la manodopera è stata
 * scorporata davvero. Qui il preventivo è un prezzo a lavoro finito — dire al
 * cliente «Ricambi € 327, Manodopera € 0» su una riparazione di scheda logica
 * era falso, e sono i numeri con cui poi contesta la fattura.
 */
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

  if (input.notes?.trim()) {
    y -= LINE_HEIGHT
    page.drawText('Lavoro previsto', { x, y, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) })
    y -= LINE_HEIGHT
    // gli a capo del preventivo sono le voci: si tengono
    for (const riga of input.notes.split(/\r?\n/)) {
      y = riga.trim()
        ? drawWrappedText(page, font, riga.trim(), x, y, PAGE_WIDTH - MARGIN * 2)
        : y - LINE_HEIGHT / 2
    }
  }

  y -= LINE_HEIGHT
  if (input.laborCost > 0) {
    y = drawLabelValue(page, font, bold, 'Manodopera', `€ ${input.laborCost.toFixed(2)}`, x, y)
    y = drawLabelValue(page, font, bold, 'Ricambi', `€ ${input.partsCost.toFixed(2)}`, x, y)
  }
  page.drawText('Totale', { x, y, size: 12, font: bold, color: rgb(0.1, 0.1, 0.1) })
  const totale = `€ ${input.total.toFixed(2)}`
  page.drawText(totale, {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(totale, 14),
    y: y - 1, size: 14, font: bold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= LINE_HEIGHT
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1, color: rgb(0.4, 0.4, 0.4),
  })

  return doc.save()
}
