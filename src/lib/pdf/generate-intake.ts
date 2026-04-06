import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { IntakePdfInput } from './types'
import { addHeaderFooter, startY, LAYOUT, drawLabelValue } from './layout'

const { MARGIN, LINE_HEIGHT } = LAYOUT

function orDash(value: string | undefined): string {
  return value?.trim() ? value : '—'
}

export async function generateIntakeSheetBytes(input: IntakePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842])
  const dark = rgb(0.1, 0.1, 0.1)

  await addHeaderFooter(doc, page, {
    title: `Scheda assistenza – ${input.ticketNumber}`,
    companyName: input.companyName,
    companyTagline: 'Assistenza Apple',
    footerDisclaimer: input.disclaimer ?? 'Documento generato dal centro assistenza. Per informazioni contattare i recapiti indicati.',
  })

  let y = startY()
  const x = MARGIN
  const sectionGap = 6
  const titleSize = 11

  // Ticket & date
  page.drawText('Riparazione e data', { x, y, size: titleSize, font: bold, color: dark })
  y -= LINE_HEIGHT + 2
  y = drawLabelValue(page, font, bold, 'Numero riparazione', input.ticketNumber, x, y)
  y = drawLabelValue(page, font, bold, 'Data intake', input.intakeDate, x, y)
  y -= sectionGap + LINE_HEIGHT

  // Customer details
  page.drawText('Dati cliente', { x, y, size: titleSize, font: bold, color: dark })
  y -= LINE_HEIGHT + 2
  y = drawLabelValue(page, font, bold, 'Nome', input.customerName, x, y)
  y = drawLabelValue(page, font, bold, 'Email', orDash(input.customerEmail), x, y)
  y = drawLabelValue(page, font, bold, 'Telefono', orDash(input.customerPhone), x, y)
  if (input.customerAddress) y = drawLabelValue(page, font, bold, 'Indirizzo', input.customerAddress, x, y)
  y -= sectionGap + LINE_HEIGHT

  // Device details
  page.drawText('Dispositivo', { x, y, size: titleSize, font: bold, color: dark })
  y -= LINE_HEIGHT + 2
  y = drawLabelValue(page, font, bold, 'Categoria', orDash(input.deviceCategory), x, y)
  y = drawLabelValue(page, font, bold, 'Modello', orDash(input.deviceModel), x, y)
  if (input.serialNumber) y = drawLabelValue(page, font, bold, 'Serial number', input.serialNumber, x, y)
  if (input.imei) y = drawLabelValue(page, font, bold, 'IMEI', input.imei, x, y)
  if (input.meid) y = drawLabelValue(page, font, bold, 'MEID', input.meid, x, y)
  y -= sectionGap + LINE_HEIGHT

  // Reported issue
  page.drawText('Problema segnalato', { x, y, size: titleSize, font: bold, color: dark })
  y -= LINE_HEIGHT + 2
  y = drawLabelValue(page, font, bold, 'Descrizione', orDash(input.customerIssue), x, y)
  if (input.intakeSummary) y = drawLabelValue(page, font, bold, 'Sintesi intake', input.intakeSummary, x, y)
  y -= sectionGap + LINE_HEIGHT

  // Accessories & condition
  page.drawText('Accessori e condizione', { x, y, size: titleSize, font: bold, color: dark })
  y -= LINE_HEIGHT + 2
  y = drawLabelValue(page, font, bold, 'Accessori ricevuti', input.accessories?.length ? input.accessories.join(', ') : '—', x, y)
  y = drawLabelValue(page, font, bold, 'Condizione intake', orDash(input.intakeCondition), x, y)
  y -= sectionGap + LINE_HEIGHT

  // Tracking & contact
  page.drawText('Segui la riparazione', { x, y, size: titleSize, font: bold, color: dark })
  y -= LINE_HEIGHT + 2
  y = drawLabelValue(page, font, bold, 'Link tracking', input.trackingLink, x, y)
  y -= sectionGap + LINE_HEIGHT
  page.drawText('Contatti negozio', { x, y, size: titleSize, font: bold, color: dark })
  y -= LINE_HEIGHT + 2
  y = drawLabelValue(page, font, bold, 'Telefono', input.shopPhone, x, y)
  if (input.shopAddress) y = drawLabelValue(page, font, bold, 'Indirizzo', input.shopAddress, x, y)

  return doc.save()
}
