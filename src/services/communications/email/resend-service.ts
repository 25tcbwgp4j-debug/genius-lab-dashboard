import { Resend } from 'resend'
import { getResendApiKey, getEmailFromAddress, getEmailFromName } from '@/lib/env'
import type { IEmailAdapter, SendResult } from '../types'

export class ResendEmailService implements IEmailAdapter {
  private client: Resend | null = null

  private getClient(): Resend | null {
    const key = getResendApiKey()
    if (!key) return null
    if (!this.client) this.client = new Resend(key)
    return this.client
  }

  async send(params: { to: string; subject: string; body: string; html?: string; text?: string }): Promise<SendResult> {
    const resend = this.getClient()
    if (!resend) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Resend] RESEND_API_KEY not set; skipping send')
      }
      return { success: false, error: 'Email not configured' }
    }
    try {
      const html = params.html ?? params.body.replace(/\n/g, '<br/>')
      const text = params.text ?? params.body
      const fromName = getEmailFromName()
      const fromEmail = getEmailFromAddress()
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html,
        text,
      })
      if (error) return { success: false, error: error.message }
      return { success: true, messageId: data?.id }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      return { success: false, error: message }
    }
  }
}

let instance: IEmailAdapter | null = null

export function getEmailAdapter(): IEmailAdapter {
  if (!instance) instance = new ResendEmailService()
  return instance
}
