import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildFatturaXml,
  makeFatturaFilename,
  type FatturaLinea,
  type FatturaCliente,
} from '@/lib/fattura-xml'

/**
 * GET /api/tickets/{id}/fattura-xml
 * Genera un XML FatturaPA v1.2.2 pre-compilato per il ticket specificato.
 *
 * Il file e' pensato per essere importato manualmente in SimplyFatt Network:
 * l'utente apre SimplyFatt -> Importa XML -> seleziona il file -> SimplyFatt
 * crea una bozza pre-compilata con numero fattura sequenziale reale.
 *
 * Righe fattura generate dal ticket:
 *  1. Manodopera (se estimate_labor_cost > 0)
 *  2. Parti/ricambi (se estimate_parts_cost > 0)
 *  - I prezzi dal DB sono considerati IVA-inclusa al 22% → lo scorporo IVA
 *    viene fatto automaticamente dal modulo fattura-xml.ts
 *
 * Protezione: cookie HMAC staff (come /api/tickets/[id]/label).
 */

async function isAuthenticated(): Promise<boolean> {
  const secret = process.env.AUTH_SECRET || ''
  if (!secret) return false
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return false
  return verifyToken(token, secret)
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
      intake_summary,
      estimate_labor_cost,
      estimate_parts_cost,
      estimate_notes,
      total_amount,
      customers(
        first_name, last_name, company_name,
        email, phone, whatsapp_phone,
        vat_number, tax_id, sdi_code, pec,
        address, zip_code, city, province
      ),
      devices(model, category, serial_number)
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  type CustomerRow = {
    first_name?: string
    last_name?: string
    company_name?: string
    vat_number?: string | null
    tax_id?: string | null
    sdi_code?: string | null
    pec?: string | null
    address?: string | null
    zip_code?: string | null
    city?: string | null
    province?: string | null
  }
  type DeviceRow = {
    model?: string | null
    category?: string | null
    serial_number?: string | null
  }

  const rawCustomer = (ticket as Record<string, unknown>).customers
  const rawDevice = (ticket as Record<string, unknown>).devices
  const customer: CustomerRow = (Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer) as CustomerRow
  const device: DeviceRow = (Array.isArray(rawDevice) ? rawDevice[0] : rawDevice) as DeviceRow

  const ticketTyped = ticket as unknown as {
    id: string
    ticket_number: string
    intake_summary: string | null
    estimate_labor_cost: number | null
    estimate_parts_cost: number | null
    estimate_notes: string | null
    total_amount: number | null
  }

  // Costruisci il nome cliente: preferisci company_name per B2B, altrimenti nome+cognome
  const customerName =
    (customer?.company_name && customer.company_name.trim()) ||
    `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`.trim() ||
    'Cliente'

  // Mappa customer GL → FatturaCliente
  const fatturaCustomer: FatturaCliente = {
    denominazione: customerName,
    partitaIva: customer?.vat_number ?? null,
    codiceFiscale: customer?.tax_id ?? null,
    codiceSdi: customer?.sdi_code ?? null,
    pec: customer?.pec ?? null,
    indirizzo: customer?.address ?? null,
    cap: customer?.zip_code ?? null,
    comune: customer?.city ?? null,
    provincia: customer?.province ?? null,
  }

  // Righe fattura: manodopera + parti (se > 0)
  // Se mancano entrambe, usa total_amount come riga unica "Riparazione"
  const righe: FatturaLinea[] = []
  const labor = Number(ticketTyped.estimate_labor_cost ?? 0)
  const parts = Number(ticketTyped.estimate_parts_cost ?? 0)
  const total = Number(ticketTyped.total_amount ?? 0)
  const deviceLabel = [device?.category?.toUpperCase(), device?.model].filter(Boolean).join(' ')

  if (labor > 0) {
    righe.push({
      descrizione: `Manodopera riparazione ${deviceLabel || 'dispositivo'}${
        ticketTyped.intake_summary ? ` - ${ticketTyped.intake_summary}` : ''
      }`.slice(0, 200),
      prezzoIvaInclusa: labor,
      quantita: 1,
    })
  }
  if (parts > 0) {
    righe.push({
      descrizione: `Ricambi/parti per ${deviceLabel || 'riparazione'}${
        ticketTyped.estimate_notes ? ` - ${ticketTyped.estimate_notes}` : ''
      }`.slice(0, 200),
      prezzoIvaInclusa: parts,
      quantita: 1,
    })
  }

  // Fallback: nessun dettaglio preventivo → usa total_amount come unica riga
  if (righe.length === 0 && total > 0) {
    righe.push({
      descrizione: `Riparazione ${deviceLabel || 'dispositivo'} - Rif. ${ticketTyped.ticket_number}`.slice(0, 200),
      prezzoIvaInclusa: total,
      quantita: 1,
    })
  }

  if (righe.length === 0) {
    return NextResponse.json(
      {
        error:
          'Impossibile generare fattura: preventivo/totale non disponibile per questo ticket',
      },
      { status: 400 },
    )
  }

  const xml = buildFatturaXml({
    cliente: fatturaCustomer,
    righe,
  })

  const filename = makeFatturaFilename('DA-ASSEGNARE', customerName)

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
