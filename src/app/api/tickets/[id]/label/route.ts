import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateLabelBytes } from '@/lib/pdf/generate-label'

/**
 * GET /api/tickets/{id}/label
 * Genera un PDF etichetta 50x30mm per il ticket specificato.
 * Protetto: richiede cookie HMAC di staff (proxy.ts blocca gia le rotte
 * non-pubbliche, ma ricontrolliamo qui per hardening).
 *
 * Formato label:
 *   - GENIUS LAB SRLS
 *   - Numero riparazione
 *   - Nome cliente
 *   - Modello dispositivo
 *   - Telefono cliente
 *   - Data intake
 */

async function isAuthenticated(): Promise<boolean> {
  const secret = process.env.AUTH_SECRET || ''
  if (!secret) return false
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return false
  return verifyToken(token, secret)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(
      `
      id,
      ticket_number,
      created_at,
      customers(first_name, last_name, phone, whatsapp_phone),
      devices(model, category)
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // Gestione delle possibili forme di risposta Supabase (oggetto singolo vs array)
  const customer = Array.isArray((ticket as Record<string, unknown>).customers)
    ? ((ticket as Record<string, unknown>).customers as unknown[])[0]
    : (ticket as Record<string, unknown>).customers
  const device = Array.isArray((ticket as Record<string, unknown>).devices)
    ? ((ticket as Record<string, unknown>).devices as unknown[])[0]
    : (ticket as Record<string, unknown>).devices

  const customerTyped = (customer ?? {}) as {
    first_name?: string
    last_name?: string
    phone?: string | null
    whatsapp_phone?: string | null
  }
  const deviceTyped = (device ?? {}) as {
    model?: string | null
    category?: string | null
  }

  const customerName =
    `${customerTyped.first_name ?? ''} ${customerTyped.last_name ?? ''}`.trim() || 'Cliente'
  const customerPhone = customerTyped.phone || customerTyped.whatsapp_phone || null

  const bytes = await generateLabelBytes({
    ticketNumber: (ticket as { ticket_number: string }).ticket_number,
    customerName,
    deviceModel: deviceTyped.model,
    deviceCategory: deviceTyped.category,
    intakeDate: formatDate((ticket as { created_at: string }).created_at),
    customerPhone,
    companyName: 'GENIUS LAB SRLS',
  })

  const safeNumber = (ticket as { ticket_number: string }).ticket_number.replace(
    /[^a-zA-Z0-9_-]/g,
    '_',
  )

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Etichetta_${safeNumber}.pdf"`,
    },
  })
}
