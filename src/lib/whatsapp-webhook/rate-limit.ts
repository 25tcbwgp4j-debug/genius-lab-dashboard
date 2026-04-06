/**
 * In-memory rate limiter for webhook endpoint (by IP or by header).
 * Production: consider Redis or Upstash for multi-instance.
 */

const windowMs = 60 * 1000
const maxRequestsPerWindow = 120

const store = new Map<string, { count: number; resetAt: number }>()

function prune(): void {
  const now = Date.now()
  for (const [key, v] of store.entries()) {
    if (v.resetAt <= now) store.delete(key)
  }
}

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  prune()
  const entry = store.get(identifier)
  if (!entry) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.resetAt <= now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  entry.count += 1
  if (entry.count > maxRequestsPerWindow) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }
  return { allowed: true }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
