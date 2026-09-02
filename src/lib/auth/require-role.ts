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
 * ⚠️ Il predicato sui ruoli viene IGNORATO di proposito, ed è una scelta da
 * conoscere: la dashboard ha **una sola password per tutto lo staff**, quindi
 * non esistono livelli da distinguere — chi entra è già dentro a tutto, e il
 * muro vero è il proxy. Far finta di filtrare per ruolo darebbe una falsa
 * sicurezza; peggio, com'era prima, rendeva quattro sezioni irraggiungibili.
 * Se un domani si vorranno ruoli diversi servirà un accesso per persona
 * (Supabase Auth o utenze separate): allora questo controllo va rifatto.
 */
export async function requireRole(
  _allowed?: (role: AppRole) => boolean
): Promise<{ role: AppRole }> {
  const secret = process.env.AUTH_SECRET?.trim() || ''
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!secret || !token || !(await verifyToken(token, secret))) redirect('/login')
  return { role: 'admin' as AppRole }
}
