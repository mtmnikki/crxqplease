/** 
 * Supabase client singleton
 * - Centralizes the Supabase browser client instance for authentication (and optional DB/RPC).
 * - Reads Vite env vars with safe fallbacks used elsewhere in the app.
 * - Persists sessions and auto-refreshes tokens by default.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Safely get Vite env regardless of bundler differences */
function env() {
  try {
    return (import.meta as any).env || {}
  } catch {
    return {}
  }
}

/** Defaults match the storage service to keep the app plug-and-play */
const DEFAULT_SUPABASE_URL = 'https://xeyfhlmflsibxzjsirav.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleWZobG1mbHNpYnh6anNpcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5Mjg5ODQsImV4cCI6MjA2OTUwNDk4NH0._wwYVbBmqX26WpbBnPMuuSmUTGG-XhxDwg8vkUS_n8Y'

const SUPABASE_URL: string =
  (env() as any).VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const SUPABASE_ANON_KEY: string =
  (env() as any).VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

/** 
 * Create a single Supabase client for the browser.
 * Note: We pass anon key only; never expose service role in client code.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
