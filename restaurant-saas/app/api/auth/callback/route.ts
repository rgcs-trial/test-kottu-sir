import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectTo = requestUrl.searchParams.get('redirect_to') || '/dashboard'

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
    }

    const supabase = createServerComponentClient({ cookies })
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    // Successful authentication, redirect to the intended page
    return NextResponse.redirect(new URL(redirectTo, request.url))
    
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}