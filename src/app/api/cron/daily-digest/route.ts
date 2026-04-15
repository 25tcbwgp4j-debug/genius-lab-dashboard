import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmailAdapter } from '@/services/communications/email/resend-service'

/**
 * Cron giornaliero Vercel → digest operativo via email.
 *
 * Schedule: 07:00 UTC (≈ 09:00 Europe/Rome in estate CEST).
 * Protezione: Vercel Cron invia Authorization: Bearer ${CRON_SECRET}.
 *
 * Contenuto digest:
 * - Totale ticket per stato (aperti/chiusi/in attesa approvazione)
 * - Ticket "fermi" (senza aggiornamenti da >3 giorni, non chiusi)
 * - Link diretti al dettaglio ticket
 *
 * Destinatario: DIGEST_RECIPIENT_EMAIL env var (fallback: nessun invio).
 */

const STALE_DAYS = 3

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuovi',
  intake_completed: 'Intake completato',
  in_diagnosis: 'In diagnosi',
  ai_diagnosis_generated: 'Diagnosi AI generata',
  estimate_ready: 'Preventivo pronto',
  waiting_customer_approval: 'In attesa approvazione',
  approved: 'Approvati',
  in_repair: 'In riparazione',
  ready_for_pickup: 'Pronti al ritiro',
  ready_for_shipping: 'Pronti alla spedizione',
  shipped: 'Spediti',
  delivered: 'Consegnati',
  closed: 'Chiusi',
  refused: 'Rifiutati',
}

const OPEN_STATUSES = [
  'new',
  'intake_completed',
  'in_diagnosis',
  'ai_diagnosis_generated',
  'estimate_ready',
  'waiting_customer_approval',
  'approved',
  'in_repair',
  'ready_for_pickup',
  'ready_for_shipping',
]

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recipient = process.env.DIGEST_RECIPIENT_EMAIL
  if (!recipient) {
    return NextResponse.json(
      { skipped: true, reason: 'DIGEST_RECIPIENT_EMAIL non configurata' },
      { status: 200 },
    )
  }

  const supabase = createAdminClient()
  const staleThreshold = new Date(Date.now() - STALE_DAYS * 86400000).toISOString()

  // Conteggi per stato (solo ultimi 90 giorni per peso ragionevole)
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString()
  const { data: recent, error: err1 } = await supabase
    .from('tickets')
    .select('status')
    .gte('created_at', since90)
  if (err1) return NextResponse.json({ error: err1.message }, { status: 500 })

  const counts: Record<string, number> = {}
  for (const t of recent || []) {
    const s = (t as { status: string }).status
    counts[s] = (counts[s] || 0) + 1
  }

  // Ticket fermi: stati aperti con updated_at < 3 giorni fa
  const { data: stale, error: err2 } = await supabase
    .from('tickets')
    .select('id, ticket_number, status, updated_at, customer_id, customers(first_name, last_name)')
    .in('status', OPEN_STATUSES)
    .lt('updated_at', staleThreshold)
    .order('updated_at', { ascending: true })
    .limit(50)
  if (err2) return NextResponse.json({ error: err2.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://genius-lab-dashboard.vercel.app'
  const today = new Date().toLocaleDateString('it-IT')

  const countsRows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([s, n]) =>
        `<tr><td style="padding:4px 12px 4px 0">${STATUS_LABELS[s] || s}</td><td style="padding:4px 0;text-align:right"><b>${n}</b></td></tr>`,
    )
    .join('')

  const staleRows = (stale || [])
    .map((t) => {
      const row = t as unknown as {
        id: string
        ticket_number: string
        status: string
        updated_at: string
        customers:
          | { first_name: string | null; last_name: string | null }
          | Array<{ first_name: string | null; last_name: string | null }>
          | null
      }
      const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers
      const name = cust
        ? `${cust.first_name ?? ''} ${cust.last_name ?? ''}`.trim()
        : '—'
      const dd = daysSince(row.updated_at)
      return `<tr>
        <td style="padding:4px 12px 4px 0"><a href="${baseUrl}/dashboard/tickets/${row.id}" style="color:#0d9488;text-decoration:none"><b>${row.ticket_number}</b></a></td>
        <td style="padding:4px 12px 4px 0">${name}</td>
        <td style="padding:4px 12px 4px 0;color:#666">${STATUS_LABELS[row.status] || row.status}</td>
        <td style="padding:4px 0;color:#b91c1c">${dd}g fa</td>
      </tr>`
    })
    .join('')

  const staleSection =
    stale && stale.length > 0
      ? `<h3 style="margin:24px 0 8px;color:#b91c1c">⚠️ ${stale.length} ticket fermi (nessun aggiornamento da >${STALE_DAYS} giorni)</h3>
         <table style="border-collapse:collapse;font-size:14px">
           <thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left;padding:6px 12px 6px 0">Ticket</th><th style="text-align:left;padding:6px 12px 6px 0">Cliente</th><th style="text-align:left;padding:6px 12px 6px 0">Stato</th><th style="text-align:left;padding:6px 0">Ultimo aggiornamento</th></tr></thead>
           <tbody>${staleRows}</tbody>
         </table>`
      : '<p style="color:#16a34a">✅ Nessun ticket fermo — tutti gli aperti hanno aggiornamenti recenti.</p>'

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,Helvetica,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:20px">
  <h2 style="margin:0 0 4px">Genius Lab — Digest operativo</h2>
  <p style="color:#666;margin:0 0 20px">${today}</p>

  <h3 style="margin:0 0 8px">📊 Ticket per stato (ultimi 90 giorni)</h3>
  <table style="border-collapse:collapse;font-size:14px">${countsRows || '<tr><td>Nessun ticket recente</td></tr>'}</table>

  ${staleSection}

  <p style="margin-top:28px;color:#999;font-size:12px">
    Digest automatico giornaliero · <a href="${baseUrl}/dashboard" style="color:#0d9488">Apri dashboard</a>
  </p>
</body></html>`

  const email = getEmailAdapter()
  const result = await email.send({
    to: recipient,
    subject: `Genius Lab — Digest ${today} (${stale?.length || 0} ticket fermi)`,
    body: '',
    html,
  })

  return NextResponse.json({
    success: result.success,
    stale_count: stale?.length || 0,
    total_recent: (recent || []).length,
    message_id: result.messageId ?? null,
  })
}
