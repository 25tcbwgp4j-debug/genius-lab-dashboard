import Link from 'next/link'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth-password'

export default async function HomePage() {
  // Check cookie HMAC per decidere se mostrare "Vai alla dashboard" o "Accedi"
  const secret = process.env.AUTH_SECRET || ''
  let isLoggedIn = false
  if (secret) {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
    if (token) {
      isLoggedIn = await verifyToken(token, secret)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Genius Lab</h1>
        <p className="text-muted-foreground">
          Piattaforma di gestione riparazioni Apple
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Vai alla dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Accedi
            </Link>
          )}
          <Link
            href="/track"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Traccia riparazione
          </Link>
        </div>
      </div>
    </div>
  )
}
