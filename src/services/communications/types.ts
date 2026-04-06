export type CommunicationChannel = 'whatsapp' | 'email'

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface IEmailAdapter {
  send(params: { to: string; subject: string; body: string; html?: string; text?: string }): Promise<SendResult>
}

/** Generic WhatsApp provider abstraction. Implementations: Twilio, Meta Cloud API, stub. */
export interface IWhatsAppAdapter {
  sendText(to: string, body: string): Promise<SendResult>
  sendLink?(to: string, url: string, caption?: string): Promise<SendResult>
  sendDocument?(to: string, url: string, filename: string): Promise<SendResult>
  sendTemplate?(to: string, templateKey: string, params: Record<string, string>): Promise<SendResult>
}
