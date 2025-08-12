import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const guestSessionToken = cookieStore.get('guest-session-token')
    
    if (!guestSessionToken) {
      return NextResponse.json({
        success: true,
        isGuest: false,
        guestSession: null,
      })
    }

    // For now, return a simple response
    // In production, you'd validate the guest session token
    return NextResponse.json({
      success: true,
      isGuest: true,
      guestSession: {
        token: guestSessionToken.value,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Guest status check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check guest status' },
      { status: 500 }
    )
  }
}