'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { PermissionChecker, ClientPermissionChecker } from '@/lib/auth/permissions'
import type { Permission, UserRole } from '@/lib/auth/permissions'

interface AuthGuardProps {
  children: React.ReactNode
  requiredPermissions?: Permission[]
  requiredRoles?: UserRole[]
  requireAll?: boolean
  fallback?: React.ReactNode
  redirectTo?: string
  allowGuest?: boolean
}

export function AuthGuard({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = true,
  fallback,
  redirectTo,
  allowGuest = false,
}: AuthGuardProps) {
  const { user, isAuthenticated, isGuest, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading) {
      return
    }

    // Check authentication requirements
    if (!isAuthenticated && !allowGuest) {
      const loginUrl = redirectTo || `/auth/login?redirect=${encodeURIComponent(pathname)}`
      router.push(loginUrl)
      return
    }

    // Allow guest users if permitted
    if (isGuest && allowGuest) {
      setIsAuthorized(true)
      return
    }

    // Check if user is required but we have a guest
    if (isGuest && !allowGuest) {
      const loginUrl = redirectTo || `/auth/login?redirect=${encodeURIComponent(pathname)}`
      router.push(loginUrl)
      return
    }

    // Check role requirements
    if (requiredRoles.length > 0 && user) {
      const hasValidRole = requiredRoles.includes(user.role)
      if (!hasValidRole) {
        setIsAuthorized(false)
        return
      }
    }

    // Check permission requirements
    if (requiredPermissions.length > 0 && user) {
      const hasPermissions = requireAll
        ? PermissionChecker.hasAllPermissions(user.role, requiredPermissions)
        : PermissionChecker.hasAnyPermission(user.role, requiredPermissions)

      if (!hasPermissions) {
        setIsAuthorized(false)
        return
      }
    }

    // Check route-based permissions
    if (user) {
      const userContext = {
        role: user.role,
        restaurantId: user.restaurantId, // This should be added to user context
        userId: user.id,
      }

      const canAccessRoute = ClientPermissionChecker.canAccess(userContext, pathname)
      if (!canAccessRoute) {
        setIsAuthorized(false)
        return
      }
    }

    setIsAuthorized(true)
  }, [
    user,
    isAuthenticated,
    isGuest,
    loading,
    requiredPermissions,
    requiredRoles,
    requireAll,
    allowGuest,
    pathname,
    router,
    redirectTo,
  ])

  // Show loading state
  if (loading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show unauthorized state
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Higher-order component for route protection
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...guardProps}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

/**
 * Permission-based component wrapper
 */
interface PermissionGateProps {
  children: React.ReactNode
  permissions: Permission[]
  userRole?: UserRole
  requireAll?: boolean
  fallback?: React.ReactNode
}

export function PermissionGate({
  children,
  permissions,
  userRole,
  requireAll = true,
  fallback = null,
}: PermissionGateProps) {
  const { user } = useAuth()
  const role = userRole || user?.role

  if (!role) {
    return <>{fallback}</>
  }

  const hasPermissions = requireAll
    ? PermissionChecker.hasAllPermissions(role, permissions)
    : PermissionChecker.hasAnyPermission(role, permissions)

  if (!hasPermissions) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Role-based component wrapper
 */
interface RoleGateProps {
  children: React.ReactNode
  roles: UserRole[]
  userRole?: UserRole
  fallback?: React.ReactNode
}

export function RoleGate({
  children,
  roles,
  userRole,
  fallback = null,
}: RoleGateProps) {
  const { user } = useAuth()
  const role = userRole || user?.role

  if (!role || !roles.includes(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Restaurant-specific access control
 */
interface RestaurantGuardProps {
  children: React.ReactNode
  restaurantId: string
  allowOwnerOnly?: boolean
  fallback?: React.ReactNode
}

export function RestaurantGuard({
  children,
  restaurantId,
  allowOwnerOnly = false,
  fallback = null,
}: RestaurantGuardProps) {
  const { user } = useAuth()

  if (!user) {
    return <>{fallback}</>
  }

  // Super admin and platform admin can access all restaurants
  if (user.role === 'super_admin' || user.role === 'platform_admin') {
    return <>{children}</>
  }

  // Check restaurant access
  const userRestaurantId = (user as any).restaurantId // Assuming this exists in user context
  
  if (!userRestaurantId || userRestaurantId !== restaurantId) {
    return <>{fallback}</>
  }

  // Check owner-only access
  if (allowOwnerOnly && user.role !== 'restaurant_owner') {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Feature flag component
 */
interface FeatureGateProps {
  children: React.ReactNode
  feature: string
  fallback?: React.ReactNode
}

export function FeatureGate({
  children,
  feature,
  fallback = null,
}: FeatureGateProps) {
  const { user } = useAuth()
  
  // This would integrate with a feature flag service
  // For now, we'll use a simple environment variable check
  const isFeatureEnabled = process.env[`NEXT_PUBLIC_FEATURE_${feature.toUpperCase()}`] === 'true'
  
  if (!isFeatureEnabled) {
    return <>{fallback}</>
  }

  // Check user-specific feature access if needed
  if (user) {
    // Could implement user-specific feature flags here
  }

  return <>{children}</>
}

/**
 * Subscription tier gate
 */
interface SubscriptionGateProps {
  children: React.ReactNode
  requiredTier: 'basic' | 'premium' | 'enterprise'
  fallback?: React.ReactNode
}

export function SubscriptionGate({
  children,
  requiredTier,
  fallback = null,
}: SubscriptionGateProps) {
  const { user } = useAuth()

  if (!user) {
    return <>{fallback}</>
  }

  // This would check the user's subscription tier
  // For now, we'll assume all users have basic tier
  const tierOrder = { basic: 1, premium: 2, enterprise: 3 }
  const userTier = 'basic' // This should come from user context or restaurant data
  const requiredLevel = tierOrder[requiredTier]
  const userLevel = tierOrder[userTier as keyof typeof tierOrder]

  if (userLevel < requiredLevel) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Development-only component wrapper
 */
interface DevOnlyProps {
  children: React.ReactNode
}

export function DevOnly({ children }: DevOnlyProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return <>{children}</>
}