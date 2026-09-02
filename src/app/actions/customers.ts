'use server'

import { createStaffClient } from '@/lib/supabase/staff'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { customerCreateSchema, customerUpdateSchema, type CustomerCreateInput, type CustomerUpdateInput } from '@/lib/validations/customer'
import { richiediStaff } from '@/lib/auth/staff'
import { canAccessCustomers } from '@/lib/auth/rbac'

export async function createCustomer(formData: CustomerCreateInput) {
  await richiediStaff()
  const parsed = customerCreateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createStaffClient()
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
  await richiediStaff()
  const parsed = customerUpdateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createStaffClient()
  const { error } = await supabase.from('customers').update(parsed.data).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/dashboard/customers')
  revalidatePath(`/dashboard/customers/${id}`)
  return { success: true }
}
