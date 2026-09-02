import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIdentifierFromRequest } from '@/lib/rate-limit'
import {
  type DocumentType,
  generateIntakeSheetBytes,
  generateEstimateBytes,
  generatePaymentInstructionsBytes,
  generateFinalReportBytes,
} from '@/lib/pdf'
import {
  buildIntakePdfInput,
  buildEstimatePdfInput,
  buildPaymentInstructionsPdfInput,
  buildFinalReportPdfInput,
} from '@/lib/pdf/build-inputs'

const TYPES: DocumentType[] = ['intake', 'estimate', 'payment', 'report']

const DOCUMENTS_RATE_LIMIT = { windowMs: 60 * 1000, maxPerWindow: 30 }

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> }
) {
  const clientId = getClientIdentifierFromRequest(request)
  const rateLimit = checkRateLimit('documents', clientId, DOCUMENTS_RATE_LIMIT)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: rateLimit.retryAfterMs
          ? { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) }
          : undefined,
      }
    )
  }
  const { type } = await context.params
  if (!TYPES.includes(type as DocumentType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
  }
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token?.trim()) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }
  /** Token-based public access: use admin client so unauthenticated link can fetch ticket. */
  const supabase = createAdminClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, ticket_number')
    .eq('public_tracking_token', token.trim())
    .single()
  if (!ticket) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const ticketId = ticket.id
  let bytes: Uint8Array
  /* Il file si chiama col numero di scheda, come il PDF che FileMaker salvava
     sulla scrivania: chi lo allega su WhatsApp lo riconosce senza aprirlo. */
  const nomi: Record<string, string> = {
    intake: 'scheda-ingresso', estimate: 'preventivo',
    payment: 'consuntivo', report: 'rapporto',
  }
  // il nome finisce dentro un header HTTP: si tengono solo lettere, cifre,
  // spazi e trattini, così non ci si può infilare altro
  const pulito = String(ticket.ticket_number ?? token.slice(0, 8))
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .slice(0, 40)
    .trim() || token.slice(0, 8)
  const filename = (t: string) => `${pulito} ${nomi[t] ?? t}.pdf`
  try {
    switch (type as DocumentType) {
      case 'intake': {
        const input = await buildIntakePdfInput(ticketId, supabase)
        if (!input) return NextResponse.json({ error: 'Data not found' }, { status: 404 })
        bytes = await generateIntakeSheetBytes(input)
        break
      }
      case 'estimate': {
        const input = await buildEstimatePdfInput(ticketId, supabase)
        if (!input) return NextResponse.json({ error: 'Data not found' }, { status: 404 })
        bytes = await generateEstimateBytes(input)
        break
      }
      case 'payment': {
        const input = await buildPaymentInstructionsPdfInput(ticketId, supabase)
        if (!input) return NextResponse.json({ error: 'Data not found' }, { status: 404 })
        bytes = await generatePaymentInstructionsBytes(input)
        break
      }
      case 'report': {
        const input = await buildFinalReportPdfInput(ticketId, supabase)
        if (!input) return NextResponse.json({ error: 'Data not found' }, { status: 404 })
        bytes = await generateFinalReportBytes(input)
        break
      }
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (e) {
    console.error('[documents] PDF generation failed', type, e)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
  const scarica = searchParams.get('download') === '1'
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${scarica ? 'attachment' : 'inline'}; filename="${filename(type)}"`,
    },
  })
}
