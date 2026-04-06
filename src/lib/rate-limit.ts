/**
 * In-memory rate limiter for API routes and server actions.
 * Use distinct bucket names per endpoint (e.g. 'documents', 'estimate-approval').
 * Production: consider Redis or Upstash for multi-instance.
 */

const store = new Map<string, { count: number; resetAt: number }>()

function prune(): void {
  const now = Date.now()
  for (const [key, v] of store.entries()) {
    if (v.resetAt <= now) store.delete(key)
  }
}

export interface RateLimitOptions {
  windowMs: number
  maxPerWindow: number
}

export function checkRateLimit(
  bucket: string,
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const key = `${bucket}:${identifier}`
  prune()
  const entry = store.get(key)
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true }
  }
  if (entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true }
  }
  entry.count += 1
  if (entry.count > options.maxPerWindow) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }
  return { allowed: true }
}

export function getClientIdentifierFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/** Get client IP from Next.js headers() (e.g. in server actions). */
export function getClientIdentifierFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
