import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Preferisci NEXT_PUBLIC_VAPID_PUBLIC_KEY in env Vercel; fallback a backend.
  const publicEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (publicEnv) {
    return NextResponse.json({ public_key: publicEnv, configured: true })
  }

  const chatbotUrl = process.env.CHATBOT_BACKEND_URL
  if (!chatbotUrl) return NextResponse.json({ public_key: '', configured: false })
  try {
    const res = await fetch(`${chatbotUrl}/api/chat/push/vapid-public-key`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ public_key: '', configured: false })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ public_key: '', configured: false })
  }
}
