/**
 * Shared PDF layout: Genius Lab branding, margins, and text helpers.
 */
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'

const MARGIN = 50
const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const LINE_HEIGHT = 14
const TITLE_SIZE = 18
const HEADER_SIZE = 12
const BODY_SIZE = 10

export const LAYOUT = { MARGIN, PAGE_WIDTH, PAGE_HEIGHT, LINE_HEIGHT, TITLE_SIZE, HEADER_SIZE, BODY_SIZE }

export interface HeaderFooterOptions {
  title: string
  companyName?: string
  companyTagline?: string
  footerDisclaimer?: string
}

export async function addHeaderFooter(doc: PDFDocument, page: PDFPage, options: string | HeaderFooterOptions): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const dark = rgb(0.1, 0.1, 0.1)
  const gray = rgb(0.4, 0.4, 0.4)

  const opts = typeof options === 'string' ? { title: options } : options
  const companyName = opts.companyName ?? 'Genius Lab'
  const tagline = opts.companyTagline ?? 'Assistenza Apple'
  const footerText = opts.footerDisclaimer ?? 'Documento generato da Genius Lab. Per informazioni contattare i recapiti indicati.'

  page.drawText(companyName, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 16,
    size: TITLE_SIZE,
    font: bold,
    color: dark,
  })
  page.drawText(tagline, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 28,
    size: 10,
    font,
    color: gray,
  })
  page.drawText(opts.title, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 46,
    size: HEADER_SIZE,
    font: bold,
    color: dark,
  })
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 52 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 52 },
    thickness: 1,
    color: gray,
  })
  const footerLines = wrapText(footerText, PAGE_WIDTH - MARGIN * 2, 8, font)
  let footerY = 30
  for (const line of footerLines) {
    page.drawText(line, { x: MARGIN, y: footerY, size: 8, font, color: gray })
    footerY -= 10
  }
}

export function startY(): number {
  return PAGE_HEIGHT - MARGIN - 68
}

export function drawWrappedText(
  page: PDFPage,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number = BODY_SIZE
): number {
  const lines = wrapText(text, maxWidth, size, font)
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) })
    y -= LINE_HEIGHT
  }
  return y
}

function wrapText(text: string, maxWidth: number, fontSize: number, font: Awaited<ReturnType<PDFDocument['embedFont']>>): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w
    const width = font.widthOfTextAtSize(candidate, fontSize)
    if (width > maxWidth && current) {
      lines.push(current)
      current = w
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

export function drawLabelValue(page: PDFPage, font: Awaited<ReturnType<PDFDocument['embedFont']>>, bold: Awaited<ReturnType<PDFDocument['embedFont']>>, label: string, value: string, x: number, y: number): number {
  page.drawText(`${label}: `, { x, y, size: BODY_SIZE, font: bold, color: rgb(0.2, 0.2, 0.2) })
  const labelWidth = bold.widthOfTextAtSize(`${label}: `, BODY_SIZE)
  const valueLines = wrapText(value, PAGE_WIDTH - MARGIN * 2 - labelWidth, BODY_SIZE, font)
  let currentY = y
  page.drawText(valueLines[0] ?? '', { x: x + labelWidth, y: currentY, size: BODY_SIZE, font, color: rgb(0.2, 0.2, 0.2) })
  currentY -= LINE_HEIGHT
  for (let i = 1; i < valueLines.length; i++) {
    page.drawText(valueLines[i]!, { x: x + labelWidth, y: currentY, size: BODY_SIZE, font, color: rgb(0.2, 0.2, 0.2) })
    currentY -= LINE_HEIGHT
  }
  return currentY - 4
}
