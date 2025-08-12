'use client'

import { useContext } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthContext } from '@/contexts/auth-context'

// Re-export the hook from context for convenience
export { useAuth } from '@/contexts/auth-context'

/**
 * Additional auth-related hooks
 */

/**
 * Hook for handling authentication redirects
 */
export function useAuthRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectAfterLogin = (fallbackUrl = '/dashboard') => {
    const redirectTo = searchParams.get('redirect') || fallbackUrl
    router.push(redirectTo)
  }

  const redirectToLogin = (currentPath?: string) => {
    const path = currentPath || window.location.pathname
    router.push(`/auth/login?redirect=${encodeURIComponent(path)}`)
  }

  return {
    redirectAfterLogin,
    redirectToLogin,
  }
}

/**
 * Hook for permission checking
 */
export function usePermissions() {
  const { user } = useContext(AuthContext) || {}
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    // This would integrate with your permission system
    return true // Placeholder
  }

  const hasRole = (role: string): boolean => {
    if (!user) return false
    return user.role === role
  }

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
  }
}

/**
 * Hook for handling authentication forms
 */
export function useAuthForm() {
  const { login, register, resetPassword } = useContext(AuthContext) || {}
  const { redirectAfterLogin } = useAuthRedirect()

  const handleLogin = async (
    email: string,
    password: string,
    options?: { rememberMe?: boolean; restaurantId?: string; redirectTo?: string }
  ) => {
    if (!login) throw new Error('Auth context not available')
    
    await login(email, password, options?.rememberMe, options?.restaurantId)
    redirectAfterLogin(options?.redirectTo)
  }

  const handleRegister = async (data: any, options?: { redirectTo?: string }) => {
    if (!register) throw new Error('Auth context not available')
    
    await register(data)
    // Note: Registration doesn't automatically log in, so no redirect
  }

  const handlePasswordReset = async (email: string) => {
    if (!resetPassword) throw new Error('Auth context not available')
    
    await resetPassword(email)
  }

  return {
    handleLogin,
    handleRegister,
    handlePasswordReset,
  }
}

/**
 * Hook for guest session management
 */
export function useGuestSession() {
  const { isGuest, createGuestSession, convertGuestToUser } = useContext(AuthContext) || {}

  const startGuestSession = async (restaurantId: string) => {
    if (!createGuestSession) throw new Error('Auth context not available')
    
    return await createGuestSession(restaurantId)
  }

  const upgradeToUser = async (registerData: any) => {
    if (!convertGuestToUser) throw new Error('Auth context not available')
    
    await convertGuestToUser(registerData)
  }

  return {
    isGuest: isGuest || false,
    startGuestSession,
    upgradeToUser,
  }
}

/**
 * Hook for social authentication
 */
export function useSocialAuth() {
  const { loginWithProvider } = useContext(AuthContext) || {}
  const { redirectAfterLogin } = useAuthRedirect()

  const loginWithGoogle = async (redirectTo?: string) => {
    if (!loginWithProvider) throw new Error('Auth context not available')
    
    await loginWithProvider('google', redirectTo)
  }

  const loginWithFacebook = async (redirectTo?: string) => {
    if (!loginWithProvider) throw new Error('Auth context not available')
    
    await loginWithProvider('facebook', redirectTo)
  }

  return {
    loginWithGoogle,
    loginWithFacebook,
  }
}

/**
 * Hook for magic link authentication
 */
export function useMagicLink() {
  const { loginWithMagicLink } = useContext(AuthContext) || {}

  const sendMagicLink = async (email: string, restaurantId?: string) => {
    if (!loginWithMagicLink) throw new Error('Auth context not available')
    
    await loginWithMagicLink(email, restaurantId)
  }

  return {
    sendMagicLink,
  }
}

/**
 * Hook for user profile management
 */
export function useProfile() {
  const { user, updateProfile, refreshUser } = useContext(AuthContext) || {}

  const updateUserProfile = async (data: any) => {
    if (!updateProfile) throw new Error('Auth context not available')
    
    await updateProfile(data)
  }

  const reloadProfile = async () => {
    if (!refreshUser) throw new Error('Auth context not available')
    
    await refreshUser()
  }

  return {
    user,
    updateUserProfile,
    reloadProfile,
  }
}

/**
 * Hook for session management
 */
export function useSession() {
  const { user, loading, isAuthenticated, isGuest, logout } = useContext(AuthContext) || {}

  const endSession = async () => {
    if (!logout) throw new Error('Auth context not available')
    
    await logout()
  }

  return {
    user,
    loading: loading || false,
    isAuthenticated: isAuthenticated || false,
    isGuest: isGuest || false,
    endSession,
  }
}