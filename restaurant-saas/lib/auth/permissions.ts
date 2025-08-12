import type { UserRole } from '../../types'
import { AuthorizationError } from './index'

/**
 * Permission definitions for role-based access control
 */
export enum Permission {
  // Platform Admin Permissions
  MANAGE_PLATFORM = 'manage_platform',
  VIEW_ALL_RESTAURANTS = 'view_all_restaurants',
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_USERS = 'manage_users',
  
  // Restaurant Owner Permissions
  MANAGE_RESTAURANT = 'manage_restaurant',
  MANAGE_RESTAURANT_SETTINGS = 'manage_restaurant_settings',
  MANAGE_MENU = 'manage_menu',
  MANAGE_ORDERS = 'manage_orders',
  MANAGE_STAFF = 'manage_staff',
  VIEW_RESTAURANT_ANALYTICS = 'view_restaurant_analytics',
  MANAGE_PAYMENT_SETTINGS = 'manage_payment_settings',
  
  // Restaurant Admin Permissions
  MANAGE_MENU_ITEMS = 'manage_menu_items',
  MANAGE_ORDER_STATUS = 'manage_order_status',
  VIEW_ORDERS = 'view_orders',
  MANAGE_INVENTORY = 'manage_inventory',
  
  // Staff Permissions
  VIEW_MENU = 'view_menu',
  UPDATE_ORDER_STATUS = 'update_order_status',
  VIEW_TODAY_ORDERS = 'view_today_orders',
  
  // Customer Permissions
  PLACE_ORDER = 'place_order',
  VIEW_ORDER_HISTORY = 'view_order_history',
  MANAGE_PROFILE = 'manage_profile',
}

/**
 * Role-based permission matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Super admin has all permissions
    ...Object.values(Permission),
  ],
  
  platform_admin: [
    Permission.MANAGE_PLATFORM,
    Permission.VIEW_ALL_RESTAURANTS,
    Permission.MANAGE_SUBSCRIPTIONS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_USERS,
  ],
  
  restaurant_owner: [
    Permission.MANAGE_RESTAURANT,
    Permission.MANAGE_RESTAURANT_SETTINGS,
    Permission.MANAGE_MENU,
    Permission.MANAGE_ORDERS,
    Permission.MANAGE_STAFF,
    Permission.VIEW_RESTAURANT_ANALYTICS,
    Permission.MANAGE_PAYMENT_SETTINGS,
    Permission.MANAGE_MENU_ITEMS,
    Permission.MANAGE_ORDER_STATUS,
    Permission.VIEW_ORDERS,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_MENU,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_TODAY_ORDERS,
    Permission.PLACE_ORDER,
    Permission.VIEW_ORDER_HISTORY,
    Permission.MANAGE_PROFILE,
  ],
  
  restaurant_admin: [
    Permission.MANAGE_MENU_ITEMS,
    Permission.MANAGE_ORDER_STATUS,
    Permission.VIEW_ORDERS,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_MENU,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_TODAY_ORDERS,
    Permission.MANAGE_PROFILE,
  ],
  
  staff: [
    Permission.VIEW_MENU,
    Permission.UPDATE_ORDER_STATUS,
    Permission.VIEW_TODAY_ORDERS,
    Permission.MANAGE_PROFILE,
  ],
  
  customer: [
    Permission.PLACE_ORDER,
    Permission.VIEW_ORDER_HISTORY,
    Permission.MANAGE_PROFILE,
  ],
}

/**
 * Resource-based permissions for tenant isolation
 */
export interface ResourcePermission {
  resource: string
  action: string
  conditions?: {
    restaurantId?: string
    ownerId?: string
    customConditions?: Record<string, any>
  }
}

/**
 * Permission checker class for comprehensive authorization
 */
export class PermissionChecker {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole]
    return rolePermissions.includes(permission)
  }

  /**
   * Check multiple permissions (user must have ALL)
   */
  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission))
  }

  /**
   * Check multiple permissions (user must have ANY)
   */
  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission))
  }

  /**
   * Check resource-specific permission with tenant isolation
   */
  static hasResourcePermission(
    userRole: UserRole,
    userId: string,
    userRestaurantId: string | undefined,
    resource: ResourcePermission
  ): boolean {
    // First check if user has the basic permission
    const hasBasicPermission = this.hasPermission(userRole, resource.action as Permission)
    if (!hasBasicPermission) {
      return false
    }

    // Apply resource-specific conditions
    if (resource.conditions) {
      // Check restaurant ownership/access
      if (resource.conditions.restaurantId) {
        // Super admin and platform admin can access all restaurants
        if (userRole === 'super_admin' || userRole === 'platform_admin') {
          return true
        }

        // Restaurant owner can only access their own restaurant
        if (userRole === 'restaurant_owner' && userRestaurantId === resource.conditions.restaurantId) {
          return true
        }

        // Staff can only access their assigned restaurant
        if (['restaurant_admin', 'staff'].includes(userRole) && userRestaurantId === resource.conditions.restaurantId) {
          return true
        }

        // Deny access if restaurant doesn't match
        return false
      }

      // Check ownership conditions
      if (resource.conditions.ownerId && resource.conditions.ownerId !== userId) {
        return false
      }

      // Apply custom conditions
      if (resource.conditions.customConditions) {
        // Implement custom condition logic as needed
        return this.evaluateCustomConditions(userRole, userId, resource.conditions.customConditions)
      }
    }

    return true
  }

  /**
   * Evaluate custom conditions
   */
  private static evaluateCustomConditions(
    userRole: UserRole,
    userId: string,
    conditions: Record<string, any>
  ): boolean {
    // Implement custom condition evaluation logic
    // This is extensible for future complex authorization rules
    return true
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(userRole: UserRole): Permission[] {
    return ROLE_PERMISSIONS[userRole] || []
  }

  /**
   * Check if role can manage another role
   */
  static canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      super_admin: 5,
      platform_admin: 4,
      restaurant_owner: 3,
      restaurant_admin: 2,
      staff: 1,
      customer: 0,
    }

    return roleHierarchy[managerRole] > roleHierarchy[targetRole]
  }
}

/**
 * Permission decorators and utilities for API routes
 */
export function requirePermission(permission: Permission) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // This would be implemented with request context
      // For now, it's a placeholder for the decorator pattern
      const hasPermission = true // Replace with actual permission check
      
      if (!hasPermission) {
        throw new AuthorizationError(`Permission denied: ${permission}`)
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Permission middleware for API routes
 */
export function createPermissionMiddleware(
  requiredPermissions: Permission[],
  requireAll = true
) {
  return (userRole: UserRole) => {
    const hasPermissions = requireAll
      ? PermissionChecker.hasAllPermissions(userRole, requiredPermissions)
      : PermissionChecker.hasAnyPermission(userRole, requiredPermissions)

    if (!hasPermissions) {
      throw new AuthorizationError('Insufficient permissions')
    }

    return true
  }
}

/**
 * Route-specific permission definitions
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Platform routes
  '/admin': [Permission.MANAGE_PLATFORM],
  '/admin/restaurants': [Permission.VIEW_ALL_RESTAURANTS],
  '/admin/users': [Permission.MANAGE_USERS],
  '/admin/analytics': [Permission.VIEW_ANALYTICS],

  // Restaurant management routes
  '/dashboard': [Permission.MANAGE_RESTAURANT, Permission.VIEW_ORDERS],
  '/dashboard/settings': [Permission.MANAGE_RESTAURANT_SETTINGS],
  '/dashboard/menu': [Permission.MANAGE_MENU],
  '/dashboard/orders': [Permission.MANAGE_ORDERS, Permission.VIEW_ORDERS],
  '/dashboard/staff': [Permission.MANAGE_STAFF],
  '/dashboard/analytics': [Permission.VIEW_RESTAURANT_ANALYTICS],

  // Staff routes
  '/staff': [Permission.VIEW_TODAY_ORDERS],
  '/staff/orders': [Permission.UPDATE_ORDER_STATUS],

  // Customer routes
  '/menu': [Permission.PLACE_ORDER],
  '/checkout': [Permission.PLACE_ORDER],
  '/orders': [Permission.VIEW_ORDER_HISTORY],
  '/profile': [Permission.MANAGE_PROFILE],
}

/**
 * API endpoint permission requirements
 */
export const API_PERMISSIONS: Record<string, Permission[]> = {
  // Restaurant API
  'GET /api/restaurants': [Permission.VIEW_ALL_RESTAURANTS],
  'POST /api/restaurants': [Permission.MANAGE_PLATFORM],
  'PUT /api/restaurants/:id': [Permission.MANAGE_RESTAURANT],
  'DELETE /api/restaurants/:id': [Permission.MANAGE_PLATFORM],

  // Menu API
  'GET /api/menu': [], // Public endpoint
  'POST /api/menu/items': [Permission.MANAGE_MENU_ITEMS],
  'PUT /api/menu/items/:id': [Permission.MANAGE_MENU_ITEMS],
  'DELETE /api/menu/items/:id': [Permission.MANAGE_MENU_ITEMS],

  // Order API
  'GET /api/orders': [Permission.VIEW_ORDERS, Permission.VIEW_ORDER_HISTORY],
  'POST /api/orders': [Permission.PLACE_ORDER],
  'PUT /api/orders/:id': [Permission.MANAGE_ORDER_STATUS],
  'DELETE /api/orders/:id': [Permission.MANAGE_ORDERS],

  // User API
  'GET /api/users': [Permission.MANAGE_USERS, Permission.MANAGE_STAFF],
  'POST /api/users': [Permission.MANAGE_USERS, Permission.MANAGE_STAFF],
  'PUT /api/users/:id': [Permission.MANAGE_USERS, Permission.MANAGE_STAFF],
  'DELETE /api/users/:id': [Permission.MANAGE_USERS, Permission.MANAGE_STAFF],

  // Analytics API
  'GET /api/analytics/platform': [Permission.VIEW_ANALYTICS],
  'GET /api/analytics/restaurant': [Permission.VIEW_RESTAURANT_ANALYTICS],
}

/**
 * Permission validation utilities for client-side
 */
export interface UserContext {
  role: UserRole
  restaurantId?: string
  userId: string
}

export class ClientPermissionChecker {
  static canAccess(userContext: UserContext, route: string): boolean {
    const requiredPermissions = ROUTE_PERMISSIONS[route]
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true // Public route
    }

    return PermissionChecker.hasAnyPermission(userContext.role, requiredPermissions)
  }

  static canAccessAPI(userContext: UserContext, method: string, endpoint: string): boolean {
    const key = `${method.toUpperCase()} ${endpoint}`
    const requiredPermissions = API_PERMISSIONS[key]
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true // Public endpoint
    }

    return PermissionChecker.hasAnyPermission(userContext.role, requiredPermissions)
  }

  static getAccessibleRoutes(userContext: UserContext): string[] {
    return Object.keys(ROUTE_PERMISSIONS).filter(route =>
      this.canAccess(userContext, route)
    )
  }
}

/**
 * Permission error handling
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public permission: Permission,
    public resource?: string
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

/**
 * Utility functions for common permission checks
 */
export const PermissionUtils = {
  /**
   * Check if user can manage a specific restaurant
   */
  canManageRestaurant(userRole: UserRole, userRestaurantId: string, targetRestaurantId: string): boolean {
    if (userRole === 'super_admin' || userRole === 'platform_admin') {
      return true
    }

    return userRestaurantId === targetRestaurantId && 
           PermissionChecker.hasPermission(userRole, Permission.MANAGE_RESTAURANT)
  },

  /**
   * Check if user can view restaurant data
   */
  canViewRestaurant(userRole: UserRole, userRestaurantId: string, targetRestaurantId: string): boolean {
    if (userRole === 'super_admin' || userRole === 'platform_admin') {
      return true
    }

    return userRestaurantId === targetRestaurantId
  },

  /**
   * Check if user can manage orders for a restaurant
   */
  canManageOrders(userRole: UserRole, userRestaurantId: string, orderRestaurantId: string): boolean {
    if (!PermissionChecker.hasPermission(userRole, Permission.MANAGE_ORDERS) &&
        !PermissionChecker.hasPermission(userRole, Permission.MANAGE_ORDER_STATUS)) {
      return false
    }

    return this.canViewRestaurant(userRole, userRestaurantId, orderRestaurantId)
  },

  /**
   * Check if user can access customer data
   */
  canAccessCustomerData(userRole: UserRole): boolean {
    return PermissionChecker.hasAnyPermission(userRole, [
      Permission.MANAGE_ORDERS,
      Permission.VIEW_ORDERS,
      Permission.MANAGE_PLATFORM,
    ])
  },
}