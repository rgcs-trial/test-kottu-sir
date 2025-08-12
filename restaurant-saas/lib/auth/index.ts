import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { z } from 'zod'
import type { Database } from '../supabase/types'
import type { User, UserRole } from '../../types'

// JWT Secret for edge environment
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

// Session token schema
export const SessionTokenSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['super_admin', 'platform_admin', 'restaurant_owner', 'restaurant_admin', 'staff', 'customer']),
  restaurantId: z.string().uuid().optional(),
  isGuest: z.boolean().default(false),
  exp: z.number(),
  iat: z.number(),
})

export type SessionToken = z.infer<typeof SessionTokenSchema>

// Guest session schema
export const GuestSessionSchema = z.object({
  sessionId: z.string(),
  cartId: z.string().uuid().optional(),
  restaurantId: z.string().uuid(),
  createdAt: z.number(),
  expiresAt: z.number(),
})

export type GuestSession = z.infer<typeof GuestSessionSchema>

// Auth configuration
export const AUTH_CONFIG = {
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  GUEST_SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_TOKEN_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  MAGIC_LINK_EXPIRY: 15 * 60 * 1000, // 15 minutes
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const

/**
 * Create Supabase client for server-side operations with cookies
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting errors in middleware
            console.error('Cookie setting error:', error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal errors in middleware
            console.error('Cookie removal error:', error)
          }
        },
      },
    }
  )
}

/**
 * Create Supabase client for middleware
 */
export function createMiddlewareSupabaseClient(request: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Store cookie changes for response
          request.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          // Store cookie removal for response
          request.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
}

/**
 * Generate JWT token for session
 */
export async function generateSessionToken(payload: Omit<SessionToken, 'exp' | 'iat'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (AUTH_CONFIG.SESSION_DURATION / 1000)

  return new SignJWT({
    ...payload,
    iat: now,
    exp,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(JWT_SECRET)
}

/**
 * Verify JWT token
 */
export async function verifySessionToken(token: string): Promise<SessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return SessionTokenSchema.parse(payload)
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Generate magic link token
 */
export async function generateMagicLinkToken(email: string, purpose: 'login' | 'signup' = 'login'): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (AUTH_CONFIG.MAGIC_LINK_EXPIRY / 1000)

  return new SignJWT({
    email,
    purpose,
    type: 'magic_link',
    iat: now,
    exp,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(JWT_SECRET)
}

/**
 * Verify magic link token
 */
export async function verifyMagicLinkToken(token: string): Promise<{ email: string; purpose: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    if (payload.type !== 'magic_link') {
      return null
    }

    return {
      email: payload.email as string,
      purpose: payload.purpose as string,
    }
  } catch (error) {
    console.error('Magic link verification failed:', error)
    return null
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Fetch user details from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return null
    }

    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      phoneNumber: userData.phone_number,
      avatar: userData.avatar,
      role: userData.role as UserRole,
      isActive: userData.is_active,
      emailVerified: userData.email_verified,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
      lastLoginAt: userData.last_login_at ? new Date(userData.last_login_at) : undefined,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Password strength validation
 */
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

/**
 * Email validation schema
 */
export const EmailSchema = z.string().email('Please enter a valid email address')

/**
 * Generate secure random string
 */
export function generateSecureId(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Hash password using Web Crypto API (edge compatible)
 */
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder()
  
  // Generate salt if not provided
  const saltValue = salt || generateSecureId(16)
  const saltedPassword = password + saltValue
  
  // Hash the password
  const data = encoder.encode(saltedPassword)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return { hash, salt: saltValue }
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const { hash: newHash } = await hashPassword(password, salt)
  return newHash === hash
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()

  isRateLimited(identifier: string, maxAttempts = AUTH_CONFIG.MAX_LOGIN_ATTEMPTS): boolean {
    const now = Date.now()
    const attempt = this.attempts.get(identifier)

    if (!attempt || now > attempt.resetTime) {
      return false
    }

    return attempt.count >= maxAttempts
  }

  recordAttempt(identifier: string): void {
    const now = Date.now()
    const attempt = this.attempts.get(identifier)

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + AUTH_CONFIG.LOCKOUT_DURATION,
      })
    } else {
      attempt.count++
    }
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, attempt] of this.attempts.entries()) {
      if (now > attempt.resetTime) {
        this.attempts.delete(key)
      }
    }
  }
}

// Global rate limiter instance
export const authRateLimiter = new RateLimiter()

// Cleanup rate limiter every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    authRateLimiter.cleanup()
  }, 60 * 60 * 1000)
}

/**
 * OAuth provider configuration
 */
export const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    icon: '🔗',
    scopes: 'openid email profile',
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    scopes: 'email',
  },
} as const

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS

/**
 * Error types for authentication
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401),
  USER_NOT_FOUND: new AuthError('User not found', 'USER_NOT_FOUND', 404),
  USER_INACTIVE: new AuthError('Account is inactive', 'USER_INACTIVE', 403),
  EMAIL_NOT_VERIFIED: new AuthError('Email not verified', 'EMAIL_NOT_VERIFIED', 403),
  RATE_LIMITED: new AuthError('Too many attempts. Please try again later.', 'RATE_LIMITED', 429),
  INVALID_TOKEN: new AuthError('Invalid or expired token', 'INVALID_TOKEN', 401),
  PERMISSION_DENIED: new AuthError('Permission denied', 'PERMISSION_DENIED', 403),
  SUBDOMAIN_TAKEN: new AuthError('Subdomain is already taken', 'SUBDOMAIN_TAKEN', 409),
  EMAIL_EXISTS: new AuthError('Email already exists', 'EMAIL_EXISTS', 409),
  WEAK_PASSWORD: new AuthError('Password does not meet requirements', 'WEAK_PASSWORD', 400),
} as const

/**
 * Tenant resolution utilities
 */
export async function getTenantFromSubdomain(subdomain: string): Promise<{ restaurant: any; isValid: boolean }> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single()

    if (error || !restaurant) {
      return { restaurant: null, isValid: false }
    }

    return { restaurant, isValid: true }
  } catch (error) {
    console.error('Error resolving tenant:', error)
    return { restaurant: null, isValid: false }
  }
}

/**
 * Cookie utilities for edge environment
 */
export const COOKIES = {
  SESSION_TOKEN: 'session_token',
  GUEST_SESSION: 'guest_session',
  REMEMBER_ME: 'remember_me',
  CSRF_TOKEN: 'csrf_token',
} as const

export function setAuthCookies(
  response: NextResponse,
  sessionToken: string,
  rememberMe = false
) {
  const maxAge = rememberMe ? AUTH_CONFIG.REFRESH_TOKEN_DURATION : AUTH_CONFIG.SESSION_DURATION

  response.cookies.set(COOKIES.SESSION_TOKEN, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAge / 1000,
    path: '/',
  })

  if (rememberMe) {
    response.cookies.set(COOKIES.REMEMBER_ME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAge / 1000,
      path: '/',
    })
  }
}

export function clearAuthCookies(response: NextResponse) {
  Object.values(COOKIES).forEach(cookieName => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  })
}