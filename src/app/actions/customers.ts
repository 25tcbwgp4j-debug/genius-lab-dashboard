'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { customerCreateSchema, customerUpdateSchema, type CustomerCreateInput, type CustomerUpdateInput } from '@/lib/validations/customer'
import { requireUserAndProfile } from '@/lib/auth/require-auth'
import { canAccessCustomers } from '@/lib/auth/rbac'

export async function createCustomer(formData: CustomerCreateInput) {
  const { profile } = await requireUserAndProfile()
  if (!canAccessCustomers(profile.role)) throw new Error('Non autorizzato a creare clienti')
  const parsed = customerCreateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({
      ...parsed.data,
      marketing_consent: parsed.data.marketing_consent ?? false,
    })
    .select('id')
    .single()
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
  redirect(`/dashboard/customers/${data.id}`)
}

export async function updateCustomer(id: string, formData: CustomerUpdateInput) {
  const { profile } = await requireUserAndProfile()
  if (!canAccessCustomers(profile.role)) throw new Error('Non autorizzato a modificare i clienti')
  const parsed = customerUpdateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { error } = await supabase.from('customers').update(parsed.data).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/dashboard/customers')
  revalidatePath(`/dashboard/customers/${id}`)
  return { success: true }
}
