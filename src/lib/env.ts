/**
 * Central place for environment variable access.
 * Documents all vars used by the app; use this module instead of process.env in production code.
 * Required at runtime: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */

function get(key: string): string | undefined {
  return process.env[key]
}

/** Public app URL (no trailing slash). Used in links in emails, PDFs, tracking. */
export function getAppUrl(): string {
  return get('NEXT_PUBLIC_APP_URL') ?? (typeof window !== 'undefined' ? '' : 'http://localhost:3000')
}

/** Supabase project URL. Required for DB and Auth. */
export function getSupabaseUrl(): string | undefined {
  return get('NEXT_PUBLIC_SUPABASE_URL')
}

/** Supabase anon key (public). Required for client and server session. */
export function getSupabaseAnonKey(): string | undefined {
  return get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/** Supabase service role key (secret). Server-only; used for webhook and public token reads. */
export function getSupabaseServiceRoleKey(): string | undefined {
  return get('SUPABASE_SERVICE_ROLE_KEY')
}

/** Resend API key. If missing, email sends are skipped. */
export function getResendApiKey(): string | undefined {
  return get('RESEND_API_KEY')
}

/** Email from address (optional; fallback in Resend adapter). */
export function getEmailFromAddress(): string {
  return get('EMAIL_FROM') ?? get('EMAIL_FROM_ADDRESS') ?? 'noreply@geniuslab.it'
}

/** Email from name (optional). */
export function getEmailFromName(): string {
  return get('EMAIL_FROM_NAME') ?? 'Genius Lab'
}

/** OpenAI API key. If missing, AI diagnosis will fail. */
export function getOpenAIApiKey(): string | undefined {
  return get('OPENAI_API_KEY')
}

/** OpenAI model (optional). */
export function getOpenAIModel(): string {
  return get('OPENAI_MODEL') ?? 'gpt-4o-mini'
}

/** OpenAI base URL (optional; for proxy). */
export function getOpenAIBaseUrl(): string {
  return get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'
}

/** WhatsApp adapter name. Only 'stub' is implemented. */
export function getWhatsAppAdapterName(): string {
  return get('WHATSAPP_ADAPTER') ?? 'stub'
}

/** WhatsApp webhook signature secret (Meta or custom). */
export function getWhatsAppWebhookSecret(): string | undefined {
  return get('WHATSAPP_WEBHOOK_SECRET') ?? get('META_APP_SECRET')
}

/** Twilio auth token (for WhatsApp via Twilio). */
export function getTwilioAuthToken(): string | undefined {
  return get('TWILIO_AUTH_TOKEN')
}
