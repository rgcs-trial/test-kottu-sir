import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { 
  SessionToken, 
  GuestSession, 
  verifySessionToken, 
  generateSessionToken, 
  generateSecureId,
  COOKIES,
  AUTH_CONFIG 
} from './index'
import type { User } from '../../types'

/**
 * Session management for Cloudflare Workers edge environment
 */
export class SessionManager {
  private sessionCache = new Map<string, SessionToken>()
  private guestSessionCache = new Map<string, GuestSession>()

  /**
   * Get session from request
   */
  async getSession(request: NextRequest): Promise<SessionToken | null> {
    const sessionToken = request.cookies.get(COOKIES.SESSION_TOKEN)?.value
    
    if (!sessionToken) {
      return null
    }

    // Check cache first
    const cached = this.sessionCache.get(sessionToken)
    if (cached && cached.exp > Date.now() / 1000) {
      return cached
    }

    // Verify token
    const session = await verifySessionToken(sessionToken)
    
    if (session) {
      // Cache valid session
      this.sessionCache.set(sessionToken, session)
    } else {
      // Remove invalid token from cache
      this.sessionCache.delete(sessionToken)
    }

    return session
  }

  /**
   * Create new session for user
   */
  async createSession(user: User, restaurantId?: string): Promise<string> {
    const sessionToken = await generateSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId,
      isGuest: false,
    })

    // Cache the session
    const session = await verifySessionToken(sessionToken)
    if (session) {
      this.sessionCache.set(sessionToken, session)
    }

    return sessionToken
  }

  /**
   * Create guest session
   */
  async createGuestSession(restaurantId: string, cartId?: string): Promise<string> {
    const sessionId = generateSecureId()
    const now = Date.now()
    
    const guestSession: GuestSession = {
      sessionId,
      cartId,
      restaurantId,
      createdAt: now,
      expiresAt: now + AUTH_CONFIG.GUEST_SESSION_DURATION,
    }

    // Cache guest session
    this.guestSessionCache.set(sessionId, guestSession)

    // Generate JWT for guest session
    const sessionToken = await generateSessionToken({
      userId: sessionId,
      email: `guest-${sessionId}@temp.com`,
      role: 'customer',
      restaurantId,
      isGuest: true,
    })

    return sessionToken
  }

  /**
   * Get guest session
   */
  getGuestSession(sessionId: string): GuestSession | null {
    const session = this.guestSessionCache.get(sessionId)
    
    if (!session || session.expiresAt < Date.now()) {
      this.guestSessionCache.delete(sessionId)
      return null
    }

    return session
  }

  /**
   * Update guest session cart
   */
  updateGuestSessionCart(sessionId: string, cartId: string): boolean {
    const session = this.guestSessionCache.get(sessionId)
    
    if (!session || session.expiresAt < Date.now()) {
      return false
    }

    session.cartId = cartId
    this.guestSessionCache.set(sessionId, session)
    return true
  }

  /**
   * Invalidate session
   */
  invalidateSession(sessionToken: string): void {
    this.sessionCache.delete(sessionToken)
  }

  /**
   * Invalidate all sessions for user
   */
  invalidateUserSessions(userId: string): void {
    for (const [token, session] of this.sessionCache.entries()) {
      if (session.userId === userId) {
        this.sessionCache.delete(token)
      }
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanup(): void {
    const now = Date.now() / 1000
    
    // Cleanup regular sessions
    for (const [token, session] of this.sessionCache.entries()) {
      if (session.exp <= now) {
        this.sessionCache.delete(token)
      }
    }

    // Cleanup guest sessions
    const currentTime = Date.now()
    for (const [id, session] of this.guestSessionCache.entries()) {
      if (session.expiresAt <= currentTime) {
        this.guestSessionCache.delete(id)
      }
    }
  }

  /**
   * Get session stats
   */
  getStats(): { activeSessions: number; guestSessions: number } {
    const now = Date.now() / 1000
    let activeSessions = 0
    let guestSessions = 0

    for (const session of this.sessionCache.values()) {
      if (session.exp > now) {
        if (session.isGuest) {
          guestSessions++
        } else {
          activeSessions++
        }
      }
    }

    return { activeSessions, guestSessions }
  }
}

// Global session manager instance
export const sessionManager = new SessionManager()

// Cleanup sessions every 15 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    sessionManager.cleanup()
  }, 15 * 60 * 1000)
}

/**
 * Server-side session utilities
 */
export async function getServerSession(): Promise<SessionToken | null> {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get(COOKIES.SESSION_TOKEN)?.value

    if (!sessionToken) {
      return null
    }

    return await verifySessionToken(sessionToken)
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

/**
 * Middleware session utilities
 */
export async function getMiddlewareSession(request: NextRequest): Promise<SessionToken | null> {
  return sessionManager.getSession(request)
}

/**
 * Set session cookies in response
 */
export function setSessionCookies(
  response: NextResponse,
  sessionToken: string,
  rememberMe = false
): void {
  const maxAge = rememberMe 
    ? AUTH_CONFIG.REFRESH_TOKEN_DURATION / 1000
    : AUTH_CONFIG.SESSION_DURATION / 1000

  response.cookies.set(COOKIES.SESSION_TOKEN, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })

  if (rememberMe) {
    response.cookies.set(COOKIES.REMEMBER_ME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })
  }
}

/**
 * Set guest session cookies
 */
export function setGuestSessionCookies(
  response: NextResponse,
  sessionToken: string
): void {
  const maxAge = AUTH_CONFIG.GUEST_SESSION_DURATION / 1000

  response.cookies.set(COOKIES.GUEST_SESSION, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })
}

/**
 * Clear session cookies
 */
export function clearSessionCookies(response: NextResponse): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  }

  response.cookies.set(COOKIES.SESSION_TOKEN, '', cookieOptions)
  response.cookies.set(COOKIES.GUEST_SESSION, '', cookieOptions)
  response.cookies.set(COOKIES.REMEMBER_ME, '', cookieOptions)
}

/**
 * Session refresh utilities
 */
export async function refreshSession(currentSession: SessionToken): Promise<string | null> {
  // Check if session needs refresh (less than 1 hour remaining)
  const now = Math.floor(Date.now() / 1000)
  const timeUntilExpiry = currentSession.exp - now
  
  if (timeUntilExpiry > 3600) { // 1 hour
    return null // No refresh needed
  }

  // Create new session token
  return await generateSessionToken({
    userId: currentSession.userId,
    email: currentSession.email,
    role: currentSession.role,
    restaurantId: currentSession.restaurantId,
    isGuest: currentSession.isGuest,
  })
}

/**
 * Session validation middleware utility
 */
export async function validateSessionMiddleware(
  request: NextRequest
): Promise<{ isValid: boolean; session: SessionToken | null; requiresRefresh: boolean }> {
  const session = await getMiddlewareSession(request)
  
  if (!session) {
    return { isValid: false, session: null, requiresRefresh: false }
  }

  const now = Math.floor(Date.now() / 1000)
  const isValid = session.exp > now
  const requiresRefresh = session.exp - now < 3600 // Less than 1 hour

  return { isValid, session, requiresRefresh }
}

/**
 * CSRF protection utilities
 */
export function generateCSRFToken(): string {
  return generateSecureId(32)
}

export function setCSRFToken(response: NextResponse, token: string): void {
  response.cookies.set(COOKIES.CSRF_TOKEN, token, {
    httpOnly: false, // Accessible to client for form submission
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: AUTH_CONFIG.SESSION_DURATION / 1000,
    path: '/',
  })
}

export function verifyCSRFToken(request: NextRequest, token: string): boolean {
  const cookieToken = request.cookies.get(COOKIES.CSRF_TOKEN)?.value
  return cookieToken === token
}

/**
 * Session context for React components
 */
export interface SessionContextData {
  session: SessionToken | null
  isAuthenticated: boolean
  isGuest: boolean
  user: {
    id: string
    email: string
    role: string
    restaurantId?: string
  } | null
  loading: boolean
}

/**
 * Extract session data for client components
 */
export function extractSessionData(session: SessionToken | null): SessionContextData {
  if (!session) {
    return {
      session: null,
      isAuthenticated: false,
      isGuest: false,
      user: null,
      loading: false,
    }
  }

  return {
    session,
    isAuthenticated: !session.isGuest,
    isGuest: session.isGuest,
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
      restaurantId: session.restaurantId,
    },
    loading: false,
  }
}