import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'
import { renderEmailToHtmlAndText } from '@/services/communications/email/render-email'
import type { TemplateKey } from '@/services/communications/template-resolver'

// Auth password-based: check cookie HMAC invece di Supabase Auth
async function isAuthenticated(): Promise<boolean> {
  const secret = process.env.AUTH_SECRET || ''
  if (!secret) return false
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return false
  return verifyToken(token, secret)
}

const SAMPLE_PAYLOAD: Record<string, string> = {
  customer_name: 'Mario Rossi',
  ticket_number: 'GL-2025-001',
  tracking_link: 'https://example.com/track/abc123',
  estimate_link: 'https://example.com/estimate/abc123',
  shop_phone: '+39 02 1234567',
  working_hours: 'Lun–Ven 9:00–19:00, Sab 9:00–13:00',
  amount_due: '89,00',
  status: 'in_repair',
  iban: 'IT00 X000 0000 0000 0000 0000 000',
  beneficiary: 'Genius Lab S.r.l.',
  payment_instructions: 'Bonifico bancario. Indicare in causale: GL e numero riparazione.',
  courier_name: 'DHL',
  tracking_code: '1234567890',
}

const TEMPLATE_KEYS: TemplateKey[] = [
  'intake_created',
  'estimate_ready',
  'repair_update',
  'ready_for_pickup',
  'ready_for_shipping',
  'payment_instructions',
  'shipped',
  'ticket_closed',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const templateKey = searchParams.get('templateKey') as TemplateKey | null
  if (!templateKey || !TEMPLATE_KEYS.includes(templateKey)) {
    return NextResponse.json({ error: 'templateKey required and must be one of: ' + TEMPLATE_KEYS.join(', ') }, { status: 400 })
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = { ...SAMPLE_PAYLOAD }
  try {
    const rendered = await renderEmailToHtmlAndText(templateKey, payload)
    return new NextResponse(rendered.html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Render failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { templateKey?: string; payload?: Record<string, string> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const templateKey = body.templateKey as TemplateKey | undefined
  if (!templateKey || !TEMPLATE_KEYS.includes(templateKey)) {
    return NextResponse.json({ error: 'templateKey required' }, { status: 400 })
  }
  const payload = { ...SAMPLE_PAYLOAD, ...body.payload }
  try {
    const rendered = await renderEmailToHtmlAndText(templateKey, payload)
    return new NextResponse(rendered.html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Render failed' }, { status: 500 })
  }
}
