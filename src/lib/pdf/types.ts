/**
 * PDF generation abstraction. Implementations can use @react-pdf/renderer, Puppeteer, or external service.
 * Stub implementation returns null URLs until a real generator is wired.
 */

export interface IntakePdfInput {
  /** Company name for branding (from company_settings) */
  companyName: string
  ticketNumber: string
  intakeDate: string
  /** Customer section */
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  /** Device section */
  deviceCategory: string
  deviceModel: string
  serialNumber?: string
  imei?: string
  meid?: string
  customerIssue?: string
  accessories?: string[]
  intakeCondition?: string
  /** Optional intake summary (ticket) */
  intakeSummary?: string
  /** Footer: disclaimer from company_settings */
  disclaimer?: string
  trackingLink: string
  shopPhone: string
  shopAddress?: string
}

export interface EstimatePdfInput {
  ticketNumber: string
  customerName: string
  deviceModel: string
  laborCost: number
  partsCost: number
  total: number
  notes?: string
}

export interface PaymentInstructionsPdfInput {
  ticketNumber: string
  customerName: string
  amountDue: number
  iban: string
  beneficiary: string
  /** Payment reference (causale) e.g. GL GL-2025-001 */
  paymentReference: string
  /** Instructions for proof of payment after transfer */
  proofOfPaymentInstructions?: string
  paymentInstructions?: string
}

export interface FinalReportPdfInput {
  ticketNumber: string
  customerName: string
  deviceModel: string
  deviceCategory: string
  diagnosis: string
  totalAmount: number
  amountPaid: number
  completedAt: string
  shopPhone?: string
}

export interface PdfResult {
  url: string
  /** Optional storage path for Supabase Storage */
  path?: string
}

/** PDF bytes for on-the-fly response (e.g. API route). */
export type PdfBytes = Uint8Array
