import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth/index'
import { setSessionCookies } from '@/lib/auth/session'

/**
 * Handle OAuth callback from providers like Google, Facebook
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const redirect_to = requestUrl.searchParams.get('redirect_to') || '/dashboard'
  const signup = requestUrl.searchParams.get('signup') === 'true'

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description)
    
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', error)
    if (error_description) {
      loginUrl.searchParams.set('error_description', error_description)
    }
    
    return NextResponse.redirect(loginUrl.toString())
  }

  if (code) {
    try {
      const supabase = createServerSupabaseClient()
      
      // Exchange the code for a session
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        
        const loginUrl = new URL('/login', requestUrl.origin)
        loginUrl.searchParams.set('error', 'session_error')
        return NextResponse.redirect(loginUrl.toString())
      }

      if (!sessionData.user) {
        const loginUrl = new URL('/login', requestUrl.origin)
        loginUrl.searchParams.set('error', 'no_user')
        return NextResponse.redirect(loginUrl.toString())
      }

      // Check if user exists in our users table
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionData.user.id)
        .single()

      // If user doesn't exist, create them
      if (!existingUser && !userError) {
        const userData = sessionData.user.user_metadata
        
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: sessionData.user.id,
            email: sessionData.user.email!,
            first_name: userData.first_name || userData.given_name || '',
            last_name: userData.last_name || userData.family_name || '',
            avatar: userData.avatar_url || userData.picture,
            role: signup ? 'restaurant_owner' : 'customer',
            is_active: true,
            email_verified: true, // OAuth emails are typically verified
          })

        if (createError) {
          console.error('Error creating user:', createError)
          // Don't fail the login, user exists in auth but not in our table
        }

        // If signing up as restaurant owner, redirect to restaurant setup
        if (signup) {
          const setupUrl = new URL('/onboarding/restaurant', requestUrl.origin)
          return NextResponse.redirect(setupUrl.toString())
        }
      }

      // Update last login time
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', sessionData.user.id)

      // Redirect to the intended destination
      const redirectUrl = new URL(redirect_to, requestUrl.origin)
      return NextResponse.redirect(redirectUrl.toString())

    } catch (error) {
      console.error('OAuth callback error:', error)
      
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'callback_error')
      return NextResponse.redirect(loginUrl.toString())
    }
  }

  // No code provided, redirect to login
  const loginUrl = new URL('/login', requestUrl.origin)
  loginUrl.searchParams.set('error', 'no_code')
  return NextResponse.redirect(loginUrl.toString())
}

/**
 * Handle OAuth provider-specific callbacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, redirectTo = '/dashboard' } = body

    const supabase = createServerSupabaseClient()
    
    // Initiate OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'facebook',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        scopes: provider === 'google' ? 'openid email profile' : 'email',
      },
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      url: data.url,
    })

  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      { success: false, error: 'OAuth initiation failed' },
      { status: 500 }
    )
  }
}