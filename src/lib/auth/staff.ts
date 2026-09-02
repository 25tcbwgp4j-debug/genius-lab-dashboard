import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * L'accesso di questa dashboard è a password, con un cookie firmato: non c'è
 * una sessione Supabase, quindi `requireUserAndProfile()` qui fallisce sempre.
 *
 * Il muro vero è il proxy, che respinge ogni richiesta senza cookie valido —
 * server action comprese. Questo controllo lo ripete dentro le azioni, così
 * restano protette anche se un domani il matcher del proxy cambiasse.
 *
 * Restituisce l'id del profilo dello staff, per i campi «creato da».
 */
let idInCache: string | null = null

export async function richiediStaff(): Promise<string> {
  const secret = process.env.AUTH_SECRET?.trim() || ''
  if (!secret) throw new Error('Accesso non configurato')
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!token || !(await verifyToken(token, secret))) throw new Error('Non autenticato')

  if (idInCache) return idInCache
  const supabase = createAdminClient()
  const { data } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
  const id: string = data?.id ?? '00000000-0000-0000-0000-000000000000'
  idInCache = id
  return id
}
