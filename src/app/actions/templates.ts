'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireUserAndProfile } from '@/lib/auth/require-auth'
import { canAccessSettings } from '@/lib/auth/rbac'

export async function updateMessageTemplate(
  templateKey: string,
  channel: 'email' | 'whatsapp',
  data: { subject?: string; body?: string; active?: boolean }
) {
  const { profile } = await requireUserAndProfile()
  if (!canAccessSettings(profile.role)) throw new Error('Non autorizzato a modificare i template')
  const supabase = await createClient()
  const { error } = await supabase
    .from('message_templates')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('template_key', templateKey)
    .eq('channel', channel)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings/templates')
  return { success: true }
}

export async function upsertMessageTemplate(
  templateKey: string,
  channel: 'email' | 'whatsapp',
  data: { subject?: string; body: string; active?: boolean }
) {
  const { profile } = await requireUserAndProfile()
  if (!canAccessSettings(profile.role)) throw new Error('Non autorizzato a modificare i template')
  const supabase = await createClient()
  const { error } = await supabase.from('message_templates').upsert(
    {
      template_key: templateKey,
      channel,
      subject: data.subject ?? null,
      body: data.body,
      active: data.active ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'template_key,channel' }
  )
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings/templates')
  return { success: true }
}
