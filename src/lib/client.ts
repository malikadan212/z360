import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser client — uses the anon key.
 * Safe for client components and Realtime subscriptions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
