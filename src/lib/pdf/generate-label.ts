import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'

/**
 * Genera etichette 50x30mm per riparazioni.
 * Una etichetta per pagina PDF. Formato compatibile con stampanti termiche
 * a rotolo continuo (es. Brother QL-700 + DK-22223 50mm).
 *
 * Contenuto etichetta:
 *   - GENIUS LAB SRLS (brand)
 *   - Numero riparazione (ticket_number)
 *   - Nome cliente
 *   - Modello dispositivo
 *   - Data intake
 *   - Telefono cliente (fallback dal contatto)
 */

export interface LabelInput {
  ticketNumber: string
  customerName: string
  deviceModel?: string | null
  deviceCategory?: string | null
  intakeDate: string
  customerPhone?: string | null
  companyName?: string
}

// 50mm x 30mm in punti PDF (1 mm = 2.83464567 pt)
const MM = 2.83464567
const PAGE_W = 50 * MM
const PAGE_H = 30 * MM
const MARGIN = 1.5 * MM

function truncate(text: string, maxChars: number): string {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars - 1) + '…'
}

function drawLabel(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  data: LabelInput,
) {
  const dark = rgb(0.1, 0.1, 0.1)
  const gray = rgb(0.45, 0.45, 0.45)
  const innerW = PAGE_W - MARGIN * 2
  let y = PAGE_H - MARGIN

  // 1. Brand centrato (GENIUS LAB SRLS)
  const brand = data.companyName || 'GENIUS LAB SRLS'
  const brandSize = 8.5
  const brandWidth = bold.widthOfTextAtSize(brand, brandSize)
  page.drawText(brand, {
    x: MARGIN + (innerW - brandWidth) / 2,
    y: y - brandSize,
    size: brandSize,
    font: bold,
    color: dark,
  })
  y -= brandSize + 2

  // Linea separatrice
  page.drawLine({
    start: { x: MARGIN, y: y - 1 },
    end: { x: PAGE_W - MARGIN, y: y - 1 },
    thickness: 0.3,
    color: gray,
  })
  y -= 4

  // 2. Numero riparazione (big, bold)
  const ticketLabel = `RIP. ${data.ticketNumber}`
  const ticketSize = 8
  page.drawText(truncate(ticketLabel, 22), {
    x: MARGIN,
    y: y - ticketSize,
    size: ticketSize,
    font: bold,
    color: dark,
  })
  y -= ticketSize + 2

  // 3. Nome cliente
  const customer = truncate(data.customerName || '—', 28)
  const custSize = 6.5
  page.drawText(customer, {
    x: MARGIN,
    y: y - custSize,
    size: custSize,
    font: bold,
    color: dark,
  })
  y -= custSize + 2

  // 4. Modello dispositivo (+ categoria se presente)
  const devParts: string[] = []
  if (data.deviceCategory) devParts.push(data.deviceCategory.toUpperCase())
  if (data.deviceModel) devParts.push(data.deviceModel)
  const device = truncate(devParts.join(' · ') || '—', 32)
  const devSize = 6
  page.drawText(device, {
    x: MARGIN,
    y: y - devSize,
    size: devSize,
    font: font,
    color: dark,
  })
  y -= devSize + 2

  // 5. Telefono (se disponibile)
  if (data.customerPhone) {
    const phone = truncate(`Tel: ${data.customerPhone}`, 30)
    page.drawText(phone, {
      x: MARGIN,
      y: y - devSize,
      size: devSize,
      font: font,
      color: gray,
    })
    y -= devSize + 2
  }

  // 6. Data intake (bottom)
  const date = `Intake: ${data.intakeDate}`
  page.drawText(date, {
    x: MARGIN,
    y: MARGIN,
    size: 6,
    font: font,
    color: gray,
  })
}

export async function generateLabelBytes(label: LabelInput): Promise<Uint8Array> {
  return generateLabelsBatchBytes([label])
}

export async function generateLabelsBatchBytes(
  labels: LabelInput[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  for (const label of labels) {
    const page = doc.addPage([PAGE_W, PAGE_H])
    drawLabel(page, font, bold, label)
  }

  return doc.save()
}
