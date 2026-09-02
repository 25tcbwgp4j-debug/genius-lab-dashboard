import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'

/**
 * L'accesso di questa dashboard è a password, con un cookie firmato: non c'è
 * una sessione Supabase, quindi `requireUserAndProfile()` qui fallirebbe sempre.
 *
 * Il muro vero è il proxy, che respinge ogni richiesta senza cookie valido —
 * server action comprese. Questo controllo lo ripete dentro le azioni, così
 * restano protette anche se un domani il matcher del proxy cambiasse.
 */
export async function richiediStaff(): Promise<void> {
  const secret = process.env.AUTH_SECRET || ''
  if (!secret) throw new Error('Accesso non configurato')
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!token || !(await verifyToken(token, secret))) throw new Error('Non autenticato')
}
