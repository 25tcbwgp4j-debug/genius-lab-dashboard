import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/', '/track', '/estimate', '/login', '/reset-password']
const AUTH_PATHS = ['/login', '/reset-password']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = isPublic(pathname)

  const response = await updateSession(request)

  if (isPublicRoute && !isAuthPath(pathname)) {
    return response
  }

  if (isAuthPath(pathname)) {
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
