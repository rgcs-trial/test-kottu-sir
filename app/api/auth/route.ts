import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createServerSupabaseClient,
  generateSessionToken,
  generateMagicLinkToken,
  verifyMagicLinkToken,
  hashPassword,
  verifyPassword,
  authRateLimiter,
  AUTH_ERRORS,
  PasswordSchema,
  EmailSchema,
  generateSecureId,
} from '../../../lib/auth/index'
import { setSessionCookies, clearSessionCookies, setGuestSessionCookies } from '../../../lib/auth/session'
import { createGuestSession } from '../../../lib/auth/guest'
import type { User, RegisterForm } from '../../../types'

// Request schemas
const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  restaurantId: z.string().uuid().optional(),
})

const RegisterRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string(),
  restaurantName: z.string().min(1, 'Restaurant name is required').optional(),
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters').optional(),
  role: z.enum(['restaurant_owner', 'customer']).default('customer'),
  restaurantId: z.string().uuid().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const MagicLinkRequestSchema = z.object({
  email: EmailSchema,
  purpose: z.enum(['login', 'signup']).default('login'),
  restaurantId: z.string().uuid().optional(),
})

const ResetPasswordRequestSchema = z.object({
  email: EmailSchema,
})

const UpdatePasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const GuestSessionRequestSchema = z.object({
  restaurantId: z.string().uuid(),
})

/**
 * Helper function to get client IP for rate limiting
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return 'unknown'
}

/**
 * Helper function to create user response
 */
function createUserResponse(user: any): User {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phoneNumber: user.phone_number,
    avatar: user.avatar,
    role: user.role,
    isActive: user.is_active,
    emailVerified: user.email_verified,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
  }
}

/**
 * POST /api/auth - Handle authentication requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'login':
        return handleLogin(request, body)
      case 'register':
        return handleRegister(request, body)
      case 'magic-link':
        return handleMagicLink(request, body)
      case 'reset-password':
        return handleResetPassword(request, body)
      case 'update-password':
        return handleUpdatePassword(request, body)
      case 'guest-session':
        return handleGuestSession(request, body)
      case 'logout':
        return handleLogout(request)
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle user login
 */
async function handleLogin(request: NextRequest, body: any) {
  try {
    const { email, password, rememberMe, restaurantId } = LoginRequestSchema.parse(body)
    const clientIP = getClientIP(request)
    const identifier = `login:${email}:${clientIP}`

    // Check rate limiting
    if (authRateLimiter.isRateLimited(identifier)) {
      return NextResponse.json(
        { success: false, error: AUTH_ERRORS.RATE_LIMITED.message },
        { status: AUTH_ERRORS.RATE_LIMITED.statusCode }
      )
    }

    const supabase = createServerSupabaseClient()

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      authRateLimiter.recordAttempt(identifier)
      return NextResponse.json(
        { success: false, error: AUTH_ERRORS.INVALID_CREDENTIALS.message },
        { status: AUTH_ERRORS.INVALID_CREDENTIALS.statusCode }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: AUTH_ERRORS.USER_INACTIVE.message },
        { status: AUTH_ERRORS.USER_INACTIVE.statusCode }
      )
    }

    // Verify password (for now, assume password is stored hashed in auth.users)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      authRateLimiter.recordAttempt(identifier)
      return NextResponse.json(
        { success: false, error: AUTH_ERRORS.INVALID_CREDENTIALS.message },
        { status: AUTH_ERRORS.INVALID_CREDENTIALS.statusCode }
      )
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Reset rate limiter on successful login
    authRateLimiter.reset(identifier)

    // Generate session token
    const sessionToken = await generateSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId,
      isGuest: false,
    })

    const response = NextResponse.json({
      success: true,
      user: createUserResponse(user),
    })

    // Set session cookies
    setSessionCookies(response, sessionToken, rememberMe)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle user registration
 */
async function handleRegister(request: NextRequest, body: any) {
  try {
    const userData = RegisterRequestSchema.parse(body)
    const clientIP = getClientIP(request)
    const identifier = `register:${userData.email}:${clientIP}`

    // Check rate limiting
    if (authRateLimiter.isRateLimited(identifier, 3)) { // Lower limit for registration
      return NextResponse.json(
        { success: false, error: AUTH_ERRORS.RATE_LIMITED.message },
        { status: AUTH_ERRORS.RATE_LIMITED.statusCode }
      )
    }

    const supabase = createServerSupabaseClient()

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email.toLowerCase())
      .single()

    if (existingUser) {
      authRateLimiter.recordAttempt(identifier)
      return NextResponse.json(
        { success: false, error: AUTH_ERRORS.EMAIL_EXISTS.message },
        { status: AUTH_ERRORS.EMAIL_EXISTS.statusCode }
      )
    }

    // Check subdomain availability if registering as restaurant owner
    if (userData.role === 'restaurant_owner' && userData.subdomain) {
      const { data: existingRestaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('subdomain', userData.subdomain.toLowerCase())
        .single()

      if (existingRestaurant) {
        return NextResponse.json(
          { success: false, error: AUTH_ERRORS.SUBDOMAIN_TAKEN.message },
          { status: AUTH_ERRORS.SUBDOMAIN_TAKEN.statusCode }
        )
      }
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
        },
      },
    })

    if (authError || !authData.user) {
      authRateLimiter.recordAttempt(identifier)
      return NextResponse.json(
        { success: false, error: authError?.message || 'Registration failed' },
        { status: 400 }
      )
    }

    // Create user record in our users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email.toLowerCase(),
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        is_active: true,
        email_verified: false,
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user record:', userError)
      // Cleanup auth user if our user creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Registration failed' },
        { status: 500 }
      )
    }

    // Create restaurant if registering as restaurant owner
    if (userData.role === 'restaurant_owner' && userData.restaurantName && userData.subdomain) {
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: userData.restaurantName,
          slug: userData.subdomain,
          subdomain: userData.subdomain.toLowerCase(),
          status: 'pending',
          email: userData.email,
          phone: '', // Will be updated later
          address_street: '',
          address_city: '',
          address_state: '',
          address_zip_code: '',
          address_country: 'US',
          timezone: 'America/New_York',
          currency: 'USD',
          tax_rate: 0,
          subscription_tier: 'basic',
          subscription_status: 'active',
          owner_id: newUser.id,
        })

      if (restaurantError) {
        console.error('Error creating restaurant:', restaurantError)
        // Don't fail registration, but log the error
      }
    }

    // Reset rate limiter on successful registration
    authRateLimiter.reset(identifier)

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: createUserResponse(newUser),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle magic link authentication
 */
async function handleMagicLink(request: NextRequest, body: any) {
  try {
    const { email, purpose, restaurantId } = MagicLinkRequestSchema.parse(body)
    const clientIP = getClientIP(request)
    const identifier = `magic:${email}:${clientIP}`

    // Check rate limiting
    if (authRateLimiter.isRateLimited(identifier, 3)) {
      return NextResponse.json(
        { success: false, error: AUTH_ERRORS.RATE_LIMITED.message },
        { status: AUTH_ERRORS.RATE_LIMITED.statusCode }
      )
    }

    // Generate magic link token
    const token = await generateMagicLinkToken(email, purpose)
    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic?token=${token}`

    // Here you would send the magic link via email
    // For now, we'll just log it
    console.log(`Magic link for ${email}: ${magicLink}`)

    authRateLimiter.recordAttempt(identifier)

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to your email address.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Magic link error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send magic link' },
      { status: 500 }
    )
  }
}

/**
 * Handle password reset request
 */
async function handleResetPassword(request: NextRequest, body: any) {
  try {
    const { email } = ResetPasswordRequestSchema.parse(body)
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      // Don't reveal if email exists or not
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send password reset email' },
      { status: 500 }
    )
  }
}

/**
 * Handle password update
 */
async function handleUpdatePassword(request: NextRequest, body: any) {
  try {
    const { token, password } = UpdatePasswordRequestSchema.parse(body)
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update password' },
      { status: 500 }
    )
  }
}

/**
 * Handle guest session creation
 */
async function handleGuestSession(request: NextRequest, body: any) {
  try {
    const { restaurantId } = GuestSessionRequestSchema.parse(body)

    // Create guest session
    const { sessionToken, cartId } = await createGuestSession(restaurantId)

    const response = NextResponse.json({
      success: true,
      guestSession: {
        cartId,
        restaurantId,
      },
    })

    // Set guest session cookies
    setGuestSessionCookies(response, sessionToken)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Guest session error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create guest session' },
      { status: 500 }
    )
  }
}

/**
 * Handle logout
 */
async function handleLogout(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Sign out from Supabase
    await supabase.auth.signOut()

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Clear session cookies
    clearSessionCookies(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth - Get current session status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
      })
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
      })
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: createUserResponse(userData),
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check session' },
      { status: 500 }
    )
  }
}