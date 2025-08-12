'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User, RegisterForm } from '@/types'
import { createClientComponentClient } from '@/lib/supabase/client'

interface AuthContextType {
  // State
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isGuest: boolean
  
  // Actions
  login: (email: string, password: string, rememberMe?: boolean, restaurantId?: string) => Promise<void>
  register: (data: RegisterForm) => Promise<void>
  logout: () => Promise<void>
  loginWithMagicLink: (email: string, restaurantId?: string) => Promise<void>
  loginWithProvider: (provider: 'google' | 'facebook', redirectTo?: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
  
  // Guest functions
  createGuestSession: (restaurantId: string) => Promise<{ cartId: string }>
  convertGuestToUser: (registerData: RegisterForm) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsGuest(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAuth = async () => {
    try {
      setLoading(true)
      
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }

      if (session) {
        await fetchUser()
      } else {
        // Check for guest session
        await checkGuestSession()
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUser = async () => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      
      if (error || !authUser) {
        setUser(null)
        return
      }

      // Fetch user details from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError || !userData) {
        console.error('Error fetching user data:', userError)
        setUser(null)
        return
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phoneNumber: userData.phone_number,
        avatar: userData.avatar,
        role: userData.role,
        isActive: userData.is_active,
        emailVerified: userData.email_verified,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
        lastLoginAt: userData.last_login_at ? new Date(userData.last_login_at) : undefined,
      }

      setUser(user)
      setIsGuest(false)
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
    }
  }

  const checkGuestSession = async () => {
    try {
      const response = await fetch('/api/auth/guest-status')
      const result = await response.json()
      
      if (result.success && result.isGuest) {
        setIsGuest(true)
        // Could set guest user data here if needed
      }
    } catch (error) {
      console.error('Error checking guest session:', error)
    }
  }

  const login = useCallback(async (
    email: string, 
    password: string, 
    rememberMe: boolean = false,
    restaurantId?: string
  ) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
          rememberMe,
          restaurantId,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Login failed')
      }

      // The auth state change will be handled by the listener
      await fetchUser()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }, [])

  const register = useCallback(async (data: RegisterForm) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...data,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Registration failed')
      }

      // Registration successful, user needs to verify email
      // Don't automatically log them in
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      // Call our logout API
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })

      // Sign out from Supabase
      await supabase.auth.signOut()

      setUser(null)
      setIsGuest(false)
      
      // Redirect to login or home page
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }, [router, supabase])

  const loginWithMagicLink = useCallback(async (email: string, restaurantId?: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'magic-link',
          email,
          purpose: 'login',
          restaurantId,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to send magic link')
      }
    } catch (error) {
      console.error('Magic link error:', error)
      throw error
    }
  }, [])

  const loginWithProvider = useCallback(async (
    provider: 'google' | 'facebook',
    redirectTo?: string
  ) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo ? `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}` : `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('OAuth login error:', error)
      throw error
    }
  }, [supabase])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          email,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email')
      }
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Password update error:', error)
      throw error
    }
  }, [supabase])

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      if (!user) {
        throw new Error('No user logged in')
      }

      // Update user in our database
      const { error } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          avatar: data.avatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      // Update auth user metadata if email changed
      if (data.email && data.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        })

        if (authError) {
          throw authError
        }
      }

      // Refresh user data
      await fetchUser()
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }, [user, supabase])

  const refreshUser = useCallback(async () => {
    await fetchUser()
  }, [])

  const createGuestSession = useCallback(async (restaurantId: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guest-session',
          restaurantId,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create guest session')
      }

      setIsGuest(true)
      return { cartId: result.guestSession.cartId }
    } catch (error) {
      console.error('Guest session error:', error)
      throw error
    }
  }, [])

  const convertGuestToUser = useCallback(async (registerData: RegisterForm) => {
    try {
      // First register the user
      await register(registerData)
      
      // Then migrate guest data
      const response = await fetch('/api/auth/convert-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerData }),
      })

      const result = await response.json()

      if (!result.success) {
        console.error('Failed to migrate guest data:', result.error)
        // Don't throw error here as user registration was successful
      }

      setIsGuest(false)
    } catch (error) {
      console.error('Guest conversion error:', error)
      throw error
    }
  }, [register])

  const value: AuthContextType = {
    // State
    user,
    loading,
    isAuthenticated: !!user && !isGuest,
    isGuest,
    
    // Actions
    login,
    register,
    logout,
    loginWithMagicLink,
    loginWithProvider,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshUser,
    
    // Guest functions
    createGuestSession,
    convertGuestToUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}