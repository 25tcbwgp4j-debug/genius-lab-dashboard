import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verify webhook signature from provider.
 * Twilio: X-Twilio-Signature = HMAC-SHA1(url + sorted params, auth_token) base64.
 * Meta: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(rawBody, app_secret) hex.
 */

const TWILIO_SIGNATURE_HEADER = 'x-twilio-signature'
const META_SIGNATURE_HEADER = 'x-hub-signature-256'

export type VerifyResult = { ok: true; provider: 'twilio' | 'meta' } | { ok: false; reason: string }

/**
 * Twilio: validateRequest equivalent. URL must match exactly what Twilio calls.
 * Params: parsed POST body (key-value). Signature = HMAC-SHA1(url + concat sorted key+value, authToken), base64.
 */
export function verifyTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature || !authToken) return false
  const sortedKeys = Object.keys(params).sort()
  const data = url + sortedKeys.map((k) => k + params[k]).join('')
  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64')
  try {
    return expected.length === signature.length && timingSafeEqual(Buffer.from(expected, 'base64'), Buffer.from(signature, 'base64'))
  } catch {
    return false
  }
}

/**
 * Meta: X-Hub-Signature-256 = "sha256=" + hex(HMAC-SHA256(rawBody, appSecret)).
 * rawBody must be the exact bytes received (e.g. request body as string/buffer).
 */
export function verifyMetaSignature(
  appSecret: string,
  signatureHeader: string | null,
  rawBody: string | Buffer
): boolean {
  if (!signatureHeader || !appSecret) return false
  const prefix = 'sha256='
  if (!signatureHeader.toLowerCase().startsWith(prefix)) return false
  const receivedHex = signatureHeader.slice(prefix.length)
  const bodyBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody
  const expected = createHmac('sha256', appSecret).update(bodyBuffer).digest('hex')
  try {
    return expected.length === receivedHex.length && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedHex, 'hex'))
  } catch {
    return false
  }
}

/**
 * Verify request. If no secret configured for a provider, skip verification (dev mode).
 * When WHATSAPP_WEBHOOK_SECRET is set, it is used for Meta (app secret). For Twilio use TWILIO_AUTH_TOKEN.
 */
export function verifyWebhookSignature(
  request: Request,
  rawBody: string,
  parsedBody: Record<string, unknown>,
  webhookUrl: string
): VerifyResult {
  const metaSecret = process.env.WHATSAPP_WEBHOOK_SECRET ?? process.env.META_APP_SECRET
  const twilioToken = process.env.TWILIO_AUTH_TOKEN

  const metaSig = request.headers.get(META_SIGNATURE_HEADER)
  const twilioSig = request.headers.get(TWILIO_SIGNATURE_HEADER)

  if (metaSig && metaSecret) {
    if (verifyMetaSignature(metaSecret, metaSig, rawBody)) return { ok: true, provider: 'meta' }
    return { ok: false, reason: 'Meta signature invalid' }
  }
  if (twilioSig && twilioToken) {
    const params: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsedBody)) {
      params[k] = typeof v === 'string' ? v : JSON.stringify(v)
    }
    if (verifyTwilioSignature(twilioToken, twilioSig, webhookUrl, params)) return { ok: true, provider: 'twilio' }
    return { ok: false, reason: 'Twilio signature invalid' }
  }
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, reason: 'Webhook signature required in production' }
  }
  return { ok: true, provider: 'twilio' }
}
