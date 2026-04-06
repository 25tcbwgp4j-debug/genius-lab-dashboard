export type WebhookLogLevel = 'info' | 'warn' | 'error'

export interface WebhookLogContext {
  requestId?: string
  messageId?: string
  status?: string
  provider?: string
  action?: 'received' | 'signature_ok' | 'signature_fail' | 'rate_limited' | 'idempotent_skip' | 'updated' | 'no_row' | 'out_of_order' | 'error'
  [key: string]: unknown
}

function formatMessage(level: WebhookLogLevel, message: string, context: WebhookLogContext): string {
  const ts = new Date().toISOString()
  const ctx = JSON.stringify(context)
  return `[${ts}] [whatsapp-webhook] [${level}] ${message} ${ctx}`
}

export function logWebhook(level: WebhookLogLevel, message: string, context: WebhookLogContext = {}): void {
  const out = formatMessage(level, message, context)
  if (level === 'error') console.error(out)
  else if (level === 'warn') console.warn(out)
  else console.info(out)
}
