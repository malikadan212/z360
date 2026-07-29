/**
 * withRetry — wraps any async fn with exponential backoff on Gemini 429s.
 * Shared by tools.ts and chat/route.ts.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastErr = err
      const msg   = err instanceof Error ? err.message : String(err)
      const is429 = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')
      if (!is429 || attempt === maxAttempts - 1) throw err
      const waitMs = 2000 * Math.pow(2, attempt)  // 2s → 4s → 8s
      console.warn(`Gemini 429 — retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxAttempts})`)
      await new Promise(r => setTimeout(r, waitMs))
    }
  }
  throw lastErr
}
