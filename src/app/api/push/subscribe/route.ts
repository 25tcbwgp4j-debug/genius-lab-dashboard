import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  if (!body?.endpoint || !body?.p256dh || !body?.auth) {
    return NextResponse.json({ error: 'endpoint, p256dh, auth richiesti' }, { status: 400 })
  }

  const chatbotUrl = process.env.CHATBOT_BACKEND_URL
  const apiKey = process.env.CHATBOT_API_KEY ?? ''
  if (!chatbotUrl) return NextResponse.json({ error: 'Backend non configurato' }, { status: 500 })

  const res = await fetch(`${chatbotUrl}/api/chat/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_id: user.id,
      user_agent: body.user_agent ?? null,
    }),
  })
  if (!res.ok) return NextResponse.json({ error: 'subscribe failed' }, { status: 500 })
  return NextResponse.json(await res.json())
}
