import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'
import type { AppRole } from '@/types/database'

/**
 * Protegge le pagine riservate.
 *
 * Prima cercava una sessione Supabase per leggerne il ruolo, ma qui l'accesso è
 * a password e quella sessione non esiste: il risultato era che Magazzino,
 * Comunicazioni, Impostazioni e Modelli messaggi **rimandavano al login** anche
 * a chi era già entrato. Quattro sezioni irraggiungibili.
 *
 * Chi ha la password è staff, e lo staff vede tutto: il ruolo si dà per admin.
 * Il parametro resta per non toccare le pagine che lo passano.
 */
export async function requireRole(
  _allowed?: (role: AppRole) => boolean
): Promise<{ role: AppRole }> {
  const secret = process.env.AUTH_SECRET?.trim() || ''
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!secret || !token || !(await verifyToken(token, secret))) redirect('/login')
  return { role: 'admin' as AppRole }
}
