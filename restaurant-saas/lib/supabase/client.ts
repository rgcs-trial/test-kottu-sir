import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Client-side Supabase client for browser usage
 * This client automatically handles authentication state and session management
 */
export const createClientComponentClient = () =>
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Server-side Supabase client for server components and API routes
 * This is a basic client without automatic session handling
 */
export const createServerClient = () =>
  createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Default browser client for immediate use
 * Use this in client components and pages
 */
export const supabase = createClientComponentClient()

// Export types for convenience
export type { Database } from './types'