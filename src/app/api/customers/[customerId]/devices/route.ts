import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'

// API protetta dal proxy password-based. Check extra del cookie qui per
// hardening (in caso l'API venga chiamata da contesti senza proxy).
async function isAuthenticated(): Promise<boolean> {
  const secret = process.env.AUTH_SECRET || ''
  if (!secret) return false
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return false
  return verifyToken(token, secret)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
