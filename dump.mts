import { DEFAULT_TEMPLATES } from './src/services/communications/template-resolver.ts'
const out: Record<string, unknown> = {}
for (const [k, v] of Object.entries(DEFAULT_TEMPLATES as Record<string, { email?: { subject: string; body: string }; whatsapp?: string }>)) {
  out[k] = { subject: v.email?.subject ?? null, body: v.email?.body ?? null, whatsapp: v.whatsapp ?? null }
}
console.log(JSON.stringify(out))
