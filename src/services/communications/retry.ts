/** Production retry: attempts and backoff for send operations (WhatsApp/Email). */
export const SEND_RETRY_MAX_ATTEMPTS = 3
export const SEND_RETRY_INITIAL_DELAY_MS = 500
export const SEND_RETRY_MAX_DELAY_MS = 5000

const MAX_ATTEMPTS = SEND_RETRY_MAX_ATTEMPTS
const INITIAL_DELAY_MS = SEND_RETRY_INITIAL_DELAY_MS
const MAX_DELAY_MS = SEND_RETRY_MAX_DELAY_MS

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run an async send operation with exponential backoff retries.
 * Returns the last result (success or failure) after all attempts.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  let delayMs = INITIAL_DELAY_MS
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (attempt < MAX_ATTEMPTS) {
        await delay(Math.min(delayMs, MAX_DELAY_MS))
        delayMs *= 2
      }
    }
  }
  throw lastError
}

/**
 * Run send and return result; on failure retries up to MAX_ATTEMPTS.
 * Use for adapters that return { success, messageId?, error? }. Fallback/retry logic uses this.
 */
export async function sendWithRetry(fn: () => Promise<{ success: boolean; messageId?: string; error?: string }>): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let lastResult: { success: boolean; messageId?: string; error?: string } = { success: false, error: 'No attempt' }
  let delayMs = INITIAL_DELAY_MS
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await fn()
    lastResult = result
    if (result.success) return result
    if (attempt < MAX_ATTEMPTS) {
      await delay(Math.min(delayMs, MAX_DELAY_MS))
      delayMs *= 2
    }
  }
  return lastResult
}
