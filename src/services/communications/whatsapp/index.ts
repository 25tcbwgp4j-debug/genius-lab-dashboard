import { getWhatsAppAdapterName } from '@/lib/env'
import type { IWhatsAppAdapter } from '../types'
import { StubWhatsAppAdapter } from './stub-adapter'

let instance: IWhatsAppAdapter | null = null

/**
 * Returns the configured WhatsApp adapter.
 * Only 'stub' is implemented; WHATSAPP_ADAPTER=stub (default) or unset.
 * If WHATSAPP_ADAPTER is set to anything else (e.g. twilio, meta), falls back to stub
 * and logs a warning so operators know WhatsApp is not actually sending.
 */
export function getWhatsAppAdapter(): IWhatsAppAdapter {
  if (!instance) {
    const adapter = getWhatsAppAdapterName()
    if (adapter === 'stub') {
      instance = new StubWhatsAppAdapter()
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[WhatsApp] WHATSAPP_ADAPTER=${adapter} requested but only 'stub' is implemented; using stub (messages will not be sent)`)
      }
      instance = new StubWhatsAppAdapter()
    }
  }
  return instance
}

export { StubWhatsAppAdapter }
