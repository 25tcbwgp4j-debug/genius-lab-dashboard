/**
 * WhatsApp webhook: status callbacks (delivered/read) from Twilio or Meta.
 * Uses createAdminClient only here: no user context; idempotency and communications update require RLS bypass.
 * Do not use admin client for user-facing or authenticated routes.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { claimIdempotencyKey } from '@/lib/whatsapp-webhook/idempotency'
import { logWebhook } from '@/lib/whatsapp-webhook/log'
import { checkRateLimit, getClientIdentifier } from '@/lib/whatsapp-webhook/rate-limit'
import { parseAndNormalize, WEBHOOK_BODY_MAX_BYTES } from '@/lib/whatsapp-webhook/schemas'
import { safeUpdateCommunicationStatus } from '@/lib/whatsapp-webhook/safe-update'
import { verifyWebhookSignature } from '@/lib/whatsapp-webhook/verify-signature'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export const maxDuration = 30

export async function POST(request: Request) {
  const requestId = randomUUID()
  const clientId = getClientIdentifier(request)

  const rateLimit = checkRateLimit(clientId)
  if (!rateLimit.allowed) {
    logWebhook('warn', 'Rate limited', { requestId, clientId, action: 'rate_limited', retryAfterMs: rateLimit.retryAfterMs })
    return NextResponse.json({ ok: false }, { status: 429, headers: rateLimit.retryAfterMs ? { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } : undefined })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    logWebhook('error', 'Failed to read body', { requestId, action: 'error' })
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (rawBody.length > WEBHOOK_BODY_MAX_BYTES) {
    logWebhook('warn', 'Body too large', { requestId, bytes: rawBody.length, maxBytes: WEBHOOK_BODY_MAX_BYTES, action: 'error' })
    return NextResponse.json({ ok: false }, { status: 413 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  let parsedBody: Record<string, unknown>
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(rawBody)
      parsedBody = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    } catch {
      logWebhook('warn', 'Invalid JSON body', { requestId, action: 'error' })
      return NextResponse.json({ ok: false }, { status: 400 })
    }
  } else {
    try {
      const params = new URLSearchParams(rawBody)
      parsedBody = Object.fromEntries([...params.entries()]) as Record<string, unknown>
    } catch {
      logWebhook('warn', 'Invalid form body', { requestId, action: 'error' })
      return NextResponse.json({ ok: false }, { status: 400 })
    }
  }

  const webhookUrl = request.url
  const verifyResult = verifyWebhookSignature(request, rawBody, parsedBody, webhookUrl)
  if (!verifyResult.ok) {
    logWebhook('warn', 'Signature verification failed', { requestId, action: 'signature_fail', reason: verifyResult.reason })
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  logWebhook('info', 'Signature verified', { requestId, provider: verifyResult.provider, action: 'signature_ok' })

  const normalized = parseAndNormalize(parsedBody)
  if (!normalized) {
    logWebhook('info', 'Payload not a status callback (ignored)', { requestId, action: 'received' })
    return NextResponse.json({ ok: true })
  }
  logWebhook('info', 'Status callback received', { requestId, messageId: normalized.messageId, status: normalized.status, provider: normalized.provider, action: 'received' })

  // Admin client required: webhook has no auth; idempotency and communications update bypass RLS.
  const supabase = createAdminClient()
  let firstTime: boolean
  try {
    const claim = await claimIdempotencyKey(supabase, normalized.messageId, normalized.status)
    firstTime = claim.firstTime
  } catch (e) {
    logWebhook('error', 'Idempotency claim failed', { requestId, messageId: normalized.messageId, action: 'error', error: String(e) })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  if (!firstTime) {
    logWebhook('info', 'Duplicate event (idempotent skip)', { requestId, messageId: normalized.messageId, status: normalized.status, action: 'idempotent_skip' })
    return NextResponse.json({ ok: true })
  }

  const result = await safeUpdateCommunicationStatus(supabase, normalized.messageId, normalized.status)
  if (result.updated) {
    logWebhook('info', 'Communication status updated', { requestId, messageId: normalized.messageId, status: normalized.status, action: 'updated' })
  } else {
    logWebhook('info', result.reason === 'no_row' ? 'No communication row for message (ignored)' : 'Status not applied (out of order or already delivered)', { requestId, messageId: normalized.messageId, status: normalized.status, action: result.reason })
  }
  return NextResponse.json({ ok: true })
}
