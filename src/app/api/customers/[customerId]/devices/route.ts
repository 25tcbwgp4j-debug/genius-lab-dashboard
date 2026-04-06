import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/session'
import { getProfile } from '@/lib/auth/profile'
import { canAccessCustomers } from '@/lib/auth/rbac'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getProfile(user.id)
  if (!profile || !canAccessCustomers(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { customerId } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devices')
    .select('id, model, category, customer_id')
    .eq('customer_id', customerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
