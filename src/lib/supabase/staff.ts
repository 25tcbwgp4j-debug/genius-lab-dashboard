import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'

/**
 * Il client per le pagine e le azioni dello staff.
 *
 * Qui l'accesso è a password con cookie firmato: non esiste una sessione
 * Supabase, quindi il client anonimo sbatte contro le policy — che pretendono
 * il ruolo `authenticated` — e ogni lettura torna vuota. È il motivo per cui
 * la scheda di una riparazione rispondeva 404 a chi entrava con la sola
 * password: i dati c'erano, ma non erano leggibili.
 *
 * Qui si verifica prima il cookie (lo stesso muro del proxy) e solo dopo si
 * parla al database con la chiave di servizio. Nessuna richiesta senza cookie
 * valido arriva a questo punto.
 *
 * ⚠️ Non usarlo nelle pagine pubbliche `/track` e `/estimate`: là serve il
 * client anonimo di `server.ts`, che vede solo quello che il token permette.
 */
export async function createStaffClient() {
  const secret = process.env.AUTH_SECRET || ''
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!secret || !token || !(await verifyToken(token, secret))) {
    throw new Error('Non autenticato')
  }
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) throw new Error('Accesso al database non configurato')

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
