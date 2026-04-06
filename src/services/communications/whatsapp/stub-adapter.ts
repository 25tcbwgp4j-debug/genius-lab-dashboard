import type { IWhatsAppAdapter, SendResult } from '../types'

/**
 * Stub adapter for development or when WhatsApp provider is not configured.
 * Logs payload and returns success; no actual send.
 * Replace with Twilio/Meta adapter in production.
 */
export class StubWhatsAppAdapter implements IWhatsAppAdapter {
  async sendText(to: string, body: string): Promise<SendResult> {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[StubWhatsApp] sendText', { to: to.slice(-4), bodyLength: body.length })
    }
    return { success: true, messageId: `stub-${Date.now()}` }
  }

  async sendLink(to: string, url: string, caption?: string): Promise<SendResult> {
    const body = caption ? `${caption}\n${url}` : url
    return this.sendText(to, body)
  }

  async sendDocument(to: string, url: string, filename: string): Promise<SendResult> {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[StubWhatsApp] sendDocument', { to: to.slice(-4), url, filename })
    }
    return { success: true, messageId: `stub-doc-${Date.now()}` }
  }

  async sendTemplate(to: string, templateKey: string, params: Record<string, string>): Promise<SendResult> {
    const body = `[Template: ${templateKey}] ${JSON.stringify(params)}`
    return this.sendText(to, body)
  }
}
