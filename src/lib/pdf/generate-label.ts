import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'

/**
 * Etichette riparazione 50x22mm (Brother QL-700 + DK-22223).
 * Layout allineato al sistema Tarature (backend labels_generator.py):
 *   GENIUS LAB s.r.l.s
 *   V.le Somalia 246 Roma  06 80074880  375 7371888
 *   ─────────────────────────────
 *   RIP. GL-XXX · CATEGORIA
 *   Nome cliente · Tel. XXX
 *   Modello               Intake: gg/mm/aa
 */

export interface LabelInput {
  ticketNumber: string
  customerName: string
  deviceModel?: string | null
  deviceCategory?: string | null
  intakeDate: string
  customerPhone?: string | null
}

// 1 mm = 2.83464567 pt
const MM = 2.83464567
const LABEL_W_MM = 50.0
const LABEL_H_MM = 22.0
const MARGIN_MM = 2.2
const MARGIN_TOP_MM = 3.5

const PAGE_W = LABEL_W_MM * MM
const PAGE_H = LABEL_H_MM * MM

const COMPANY_BOLD = 'GENIUS LAB'
const COMPANY_SUFFIX = 's.r.l.s'
const CONTACT_LINE = 'V.le Somalia 246 Roma  06 80074880  375 7371888'

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
  const left = MARGIN_MM * MM
  const right = PAGE_W - MARGIN_MM * MM
  const topMargin = MARGIN_TOP_MM * MM

  // === Riga 1: GENIUS LAB (bold) + s.r.l.s (small), centrato ===
  const boldSize = 8.5
  const suffixSize = 6
  const titleY = PAGE_H - topMargin - 1.8 * MM
  const boldW = bold.widthOfTextAtSize(COMPANY_BOLD, boldSize)
  const suffix = ' ' + COMPANY_SUFFIX
  const sfxW = font.widthOfTextAtSize(suffix, suffixSize)
  const startX = (PAGE_W - boldW - sfxW) / 2
  page.drawText(COMPANY_BOLD, {
    x: startX,
    y: titleY - boldSize,
    size: boldSize,
    font: bold,
    color: dark,
  })
  page.drawText(suffix, {
    x: startX + boldW,
    y: titleY - boldSize,
    size: suffixSize,
    font: font,
    color: dark,
  })

  // === Riga 2: indirizzo + telefono (centrato) ===
  const infoSize = 5.4
  const infoY = titleY - 2.6 * MM
  const infoW = font.widthOfTextAtSize(CONTACT_LINE, infoSize)
  page.drawText(CONTACT_LINE, {
    x: (PAGE_W - infoW) / 2,
    y: infoY - infoSize,
    size: infoSize,
    font: font,
    color: dark,
  })

  // Linea separatrice
  const sepY = infoY - infoSize - 1.1 * MM
  page.drawLine({
    start: { x: left, y: sepY },
    end: { x: right, y: sepY },
    thickness: 0.3,
    color: gray,
  })

  // === Riga 3: RIP. N · CATEGORIA (bold) ===
  const rowSize = 7.5
  const row1Y = sepY - 2.5 * MM
  const ripText = `RIP. ${data.ticketNumber}`
  const category = (data.deviceCategory || '').trim().toUpperCase()
  const line1 = category
    ? `${ripText} · ${truncate(category, 18)}`
    : ripText
  page.drawText(truncate(line1, 36), {
    x: left,
    y: row1Y - rowSize,
    size: rowSize,
    font: bold,
    color: dark,
  })

  // === Riga 4: Nome cliente · Tel. ===
  const bodySize = 6.5
  const row2Y = row1Y - 2.4 * MM
  const name = (data.customerName || '').trim()
  const phone = (data.customerPhone || '').trim()
  const parts: string[] = []
  if (name) parts.push(truncate(name, 22))
  if (phone) parts.push(`Tel. ${truncate(phone, 15)}`)
  if (parts.length) {
    page.drawText(truncate(parts.join(' · '), 44), {
      x: left,
      y: row2Y - bodySize,
      size: bodySize,
      font: font,
      color: dark,
    })
  }

  // === Riga 5: Modello + Intake (affiancati) ===
  const row3Y = row2Y - 2.4 * MM
  const model = truncate((data.deviceModel || '—').trim(), 22)
  const intake = `Intake: ${data.intakeDate}`
  page.drawText(model, {
    x: left,
    y: row3Y - bodySize,
    size: bodySize,
    font: font,
    color: dark,
  })
  const intakeW = font.widthOfTextAtSize(intake, bodySize)
  page.drawText(intake, {
    x: right - intakeW,
    y: row3Y - bodySize,
    size: bodySize,
    font: font,
    color: dark,
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
