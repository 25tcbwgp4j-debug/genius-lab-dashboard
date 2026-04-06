import Link from 'next/link'
import { getSession } from '@/lib/auth/session'

export default async function HomePage() {
  const session = await getSession()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Genius Lab</h1>
        <p className="text-muted-foreground">
          Piattaforma di gestione riparazioni Apple
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {session ? (
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
