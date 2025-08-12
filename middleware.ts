import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createMiddlewareSupabaseClient } from '@/lib/auth/index'
import type { TenantInfo, MiddlewareContext } from '@/types'

/**
 * Middleware for handling multi-tenant routing based on subdomains
 * Supports both subdomain.domain.com and custom domains
 */

// Environment variables validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables')
}

// Initialize Supabase client for middleware
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Routes that don't require tenant resolution
const PLATFORM_ROUTES = [
  '/login',
  '/signup', 
  '/auth',
  '/api/auth',
  '/api/webhooks',
  '/admin',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml'
]

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/staff'
]

// Routes accessible by guests
const GUEST_ALLOWED_ROUTES = [
  '/',
  '/menu',
  '/cart',
  '/checkout'
]

// Admin routes that require special handling
const ADMIN_ROUTES = ['/admin']

/**
 * Extract subdomain from hostname
 */
function getSubdomain(hostname: string): string | null {
  // Handle localhost development
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.')
    return parts.length > 1 ? parts[0] : null
  }
  
  // Handle production domains
  const parts = hostname.split('.')
  
  // If it's a custom domain (not our root domain)
  if (!hostname.includes(ROOT_DOMAIN.split(':')[0])) {
    return hostname // Use entire hostname as identifier for custom domains
  }
  
  // Extract subdomain from our root domain
  if (parts.length > 2) {
    return parts[0]
  }
  
  return null
}

/**
 * Resolve tenant information from subdomain or custom domain
 */
async function resolveTenant(identifier: string): Promise<TenantInfo | null> {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .or(`subdomain.eq.${identifier},custom_domain.eq.${identifier}`)
      .eq('status', 'active')
      .single()

    if (error || !restaurant) {
      return null
    }

    return {
      restaurant: restaurant as any, // Cast to our Restaurant type
      subdomain: restaurant.subdomain,
      customDomain: restaurant.custom_domain,
      isValidTenant: true
    }
  } catch (error) {
    console.error('Error resolving tenant:', error)
    return null
  }
}

/**
 * Check if path is a platform route (doesn't need tenant resolution)
 */
function isPlatformRoute(pathname: string): boolean {
  return PLATFORM_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if path is an admin route
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Create middleware context object
 */
function createMiddlewareContext(
  request: NextRequest,
  tenant: TenantInfo | null
): MiddlewareContext {
  const url = new URL(request.url)
  
  return {
    tenant,
    pathname: url.pathname,
    searchParams: url.searchParams
  }
}

/**
 * Handle authentication for protected routes
 */
async function handleAuthentication(
  request: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  // Check if route requires authentication
  const requiresAuth = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  
  if (!requiresAuth) {
    return null // No auth required
  }

  // Validate session
  // Simple session validation for now
  const isValid = true
  const session = null
  const requiresRefresh = false
  
  if (!isValid || !session) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Handle session refresh
  if (requiresRefresh) {
    // Set flag for client to refresh session
    const response = NextResponse.next()
    response.headers.set('x-refresh-session', 'true')
    return response
  }

  // Add user context to headers
  const response = NextResponse.next()
  response.headers.set('x-user-id', session.userId)
  response.headers.set('x-user-role', session.role)
  if (session.restaurantId) {
    response.headers.set('x-user-restaurant-id', session.restaurantId)
  }
  response.headers.set('x-is-guest', session.isGuest.toString())
  
  return response
}

/**
 * Handle tenant-specific routing
 */
async function handleTenantRouting(
  request: NextRequest,
  context: MiddlewareContext
): Promise<NextResponse> {
  const { tenant, pathname } = context
  
  if (!tenant) {
    // No valid tenant found - redirect to platform
    const url = new URL('/404', request.url)
    return NextResponse.redirect(url)
  }
  
  // Handle authentication first
  const authResponse = await handleAuthentication(request, pathname)
  if (authResponse) {
    return authResponse
  }
  
  // Add tenant information to request headers for use in pages
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenant.restaurant.id)
  requestHeaders.set('x-tenant-subdomain', tenant.subdomain)
  
  if (tenant.customDomain) {
    requestHeaders.set('x-tenant-custom-domain', tenant.customDomain)
  }
  
  // Rewrite tenant routes to the (restaurant) route group
  if (pathname === '/' || pathname.startsWith('/menu') || pathname.startsWith('/order')) {
    const url = new URL(request.url)
    url.pathname = `/(restaurant)/${tenant.subdomain}${pathname}`
    
    return NextResponse.rewrite(url, {
      headers: requestHeaders
    })
  }
  
  // Handle staff dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const url = new URL(request.url)
    url.pathname = `/(staff)${pathname}`
    
    return NextResponse.rewrite(url, {
      headers: requestHeaders
    })
  }
  
  // Default: continue with tenant headers
  return NextResponse.next({
    headers: requestHeaders
  })
}

/**
 * Handle platform routing (no tenant)
 */
async function handlePlatformRouting(
  request: NextRequest,
  context: MiddlewareContext
): Promise<NextResponse> {
  const { pathname } = context
  
  // Handle authentication for protected routes
  const authResponse = await handleAuthentication(request, pathname)
  if (authResponse) {
    return authResponse
  }
  
  // Admin routes
  if (isAdminRoute(pathname)) {
    const url = new URL(request.url)
    url.pathname = `/(admin)${pathname}`
    return NextResponse.rewrite(url)
  }
  
  // Platform routes (login, signup, etc.)
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/auth')) {
    // For now, just let Next.js handle the routing normally
    return NextResponse.next()
  }
  
  // Default: continue
  return NextResponse.next()
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Skip processing for Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('favicon.ico') ||
    pathname.includes('.') // Skip files with extensions
  ) {
    return NextResponse.next()
  }
  
  // Handle API routes separately (no tenant resolution needed for most)
  if (pathname.startsWith('/api')) {
    // Add CORS headers for API routes
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Add tenant info to API routes if needed
    const subdomain = getSubdomain(hostname)
    if (subdomain && !isPlatformRoute(pathname)) {
      const tenant = await resolveTenant(subdomain)
      if (tenant) {
        response.headers.set('x-tenant-id', tenant.restaurant.id)
        response.headers.set('x-tenant-subdomain', tenant.subdomain)
      }
    }
    
    return response
  }
  
  // Check if this is a platform route
  if (isPlatformRoute(pathname)) {
    const context = createMiddlewareContext(request, null)
    return handlePlatformRouting(request, context)
  }
  
  // Try to resolve tenant from subdomain or custom domain
  const subdomain = getSubdomain(hostname)
  let tenant: TenantInfo | null = null
  
  if (subdomain) {
    tenant = await resolveTenant(subdomain)
  }
  
  // Create middleware context
  const context = createMiddlewareContext(request, tenant)
  
  // Route based on whether we have a valid tenant
  if (tenant && tenant.isValidTenant) {
    return await handleTenantRouting(request, context)
  } else {
    return await handlePlatformRouting(request, context)
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

// Export types for use in other parts of the application
export type { TenantInfo, MiddlewareContext }