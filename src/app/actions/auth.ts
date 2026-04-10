'use server'

import { logout as passwordLogout } from '@/app/(auth)/login/actions'

/**
 * signOut: wrapper retrocompatibile che usa il nuovo sistema auth password-based.
 * Mantenuto per non rompere i componenti che importano { signOut } from questo modulo.
 */
export async function signOut() {
  await passwordLogout()
}
