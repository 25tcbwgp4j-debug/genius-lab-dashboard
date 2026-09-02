'use server'

import { createStaffClient } from '@/lib/supabase/staff'
import { revalidatePath } from 'next/cache'
import { richiediStaff } from '@/lib/auth/staff'
import { canAccessSettings } from '@/lib/auth/rbac'

export async function updateMessageTemplate(
  templateKey: string,
  channel: 'email' | 'whatsapp',
  data: { subject?: string; body?: string; active?: boolean }
) {
  await richiediStaff()
  const supabase = await createStaffClient()
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
  await richiediStaff()
  const supabase = await createStaffClient()
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
