/**
 * PDF generation: intake sheet, estimate, payment instructions, final report.
 * Uses pdf-lib; generators return bytes for on-the-fly serving (e.g. API route).
 * Document URLs: use getDocumentUrl(type, token) for links in emails/WhatsApp.
 */
export { generateIntakeSheetBytes } from './generate-intake'
export { generateEstimateBytes } from './generate-estimate'
export { generatePaymentInstructionsBytes } from './generate-payment-instructions'
export { generateFinalReportBytes } from './generate-final-report'
import type {
  IntakePdfInput,
  EstimatePdfInput,
  PaymentInstructionsPdfInput,
  FinalReportPdfInput,
  PdfResult,
} from './types'

export type { IntakePdfInput, EstimatePdfInput, PaymentInstructionsPdfInput, FinalReportPdfInput, PdfResult }

export type DocumentType = 'intake' | 'estimate' | 'payment' | 'report'

export function getDocumentUrl(type: DocumentType, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/api/documents/${type}?token=${encodeURIComponent(token)}`
}
