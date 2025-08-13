import { z } from 'zod'

// ===== CORE ENTITIES =====

// User & Authentication Types
export const UserRole = z.enum(['super_admin', 'platform_admin', 'restaurant_owner', 'restaurant_admin', 'staff', 'customer'])
export type UserRole = z.infer<typeof UserRole>

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  avatar: z.string().url().optional(),
  role: UserRole,
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
})

export type User = z.infer<typeof UserSchema>

// Restaurant Types
export const RestaurantStatus = z.enum(['active', 'inactive', 'suspended', 'pending'])
export type RestaurantStatus = z.infer<typeof RestaurantStatus>

export const RestaurantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  subdomain: z.string().min(1),
  customDomain: z.string().optional(),
  status: RestaurantStatus,
  
  // Contact Information
  email: z.string().email(),
  phone: z.string(),
  website: z.string().url().optional(),
  
  // Address
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  
  // Business Settings
  timezone: z.string(),
  currency: z.string().default('USD'),
  taxRate: z.number().min(0).max(1).default(0),
  
  // Subscription
  subscriptionTier: z.enum(['basic', 'premium', 'enterprise']),
  subscriptionStatus: z.enum(['active', 'past_due', 'canceled', 'incomplete']),
  subscriptionEndsAt: z.date().optional(),
  
  // Metadata
  ownerId: z.string().uuid(),
  
  // Operating Settings
  isOnline: z.boolean().default(true),
  isAcceptingOrders: z.boolean().default(true),
  temporaryClosureReason: z.string().optional(),
  holidaySchedule: z.array(z.object({
    date: z.string(),
    closed: z.boolean(),
    reason: z.string().optional(),
  })).default([]),
  
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Restaurant = z.infer<typeof RestaurantSchema>

// Operating Hours Types
export const DayOfWeek = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
export type DayOfWeek = z.infer<typeof DayOfWeek>

export const OperatingHoursSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  dayOfWeek: DayOfWeek,
  isOpen: z.boolean().default(true),
  openTime: z.string().optional(), // Format: "09:00"
  closeTime: z.string().optional(), // Format: "22:00"
  isOvernight: z.boolean().default(false), // True if closes after midnight
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type OperatingHours = z.infer<typeof OperatingHoursSchema>

// Delivery Zone Types  
export const DeliveryZoneSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  deliveryFee: z.number().min(0),
  minimumOrder: z.number().min(0).default(0),
  estimatedDeliveryTime: z.number().min(1), // in minutes
  isActive: z.boolean().default(true),
  
  // Geographic boundaries (can be extended to use actual geo boundaries)
  zipCodes: z.array(z.string()).default([]),
  radius: z.number().min(0).optional(), // in kilometers from restaurant
  
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>

// Menu & Food Types
export const MenuItemStatus = z.enum(['active', 'inactive', 'out_of_stock'])
export type MenuItemStatus = z.infer<typeof MenuItemStatus>

export const MenuCategorySchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().url().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MenuCategory = z.infer<typeof MenuCategorySchema>

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  images: z.array(z.string().url()).default([]),
  status: MenuItemStatus,
  
  // Dietary Information
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  
  // Inventory
  trackInventory: z.boolean().default(false),
  stockQuantity: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  
  // Metadata
  calories: z.number().min(0).optional(),
  preparationTime: z.number().min(0).optional(), // in minutes
  sortOrder: z.number().default(0),
  
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MenuItem = z.infer<typeof MenuItemSchema>

// Order Types
export const OrderStatus = z.enum([
  'pending',
  'confirmed',
  'preparing', 
  'ready',
  'out_for_delivery',
  'delivered',
  'completed',
  'canceled',
  'refunded'
])
export type OrderStatus = z.infer<typeof OrderStatus>

export const PaymentStatus = z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded'])
export type PaymentStatus = z.infer<typeof PaymentStatus>

export const OrderType = z.enum(['dine_in', 'takeout', 'delivery'])
export type OrderType = z.infer<typeof OrderType>

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  menuItemId: z.string().uuid(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().min(1),
  notes: z.string().optional(),
  customizations: z.array(z.object({
    name: z.string(),
    price: z.number(),
  })).default([]),
})

export type OrderItem = z.infer<typeof OrderItemSchema>

export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  restaurantId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  
  // Order Details
  items: z.array(OrderItemSchema),
  type: OrderType,
  status: OrderStatus,
  
  // Customer Information
  customerInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }),
  
  // Delivery Information (if applicable)
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    instructions: z.string().optional(),
  }).optional(),
  
  // Pricing
  subtotal: z.number(),
  taxAmount: z.number(),
  deliveryFee: z.number().default(0),
  tipAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  total: z.number(),
  
  // Payment
  paymentStatus: PaymentStatus,
  paymentMethod: z.string().optional(),
  paymentIntentId: z.string().optional(),
  
  // Timing
  estimatedReadyTime: z.date().optional(),
  actualReadyTime: z.date().optional(),
  deliveredAt: z.date().optional(),
  
  // Metadata
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Order = z.infer<typeof OrderSchema>

// ===== API TYPES =====

// Generic API Response
export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ===== FORM TYPES =====

// Authentication Forms
export const LoginFormSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
})

export type LoginForm = z.infer<typeof LoginFormSchema>

export const RegisterFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  restaurantName: z.string().min(1, 'Restaurant name is required'),
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type RegisterForm = z.infer<typeof RegisterFormSchema>

// Restaurant Forms
export const RestaurantSettingsSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  description: z.string().optional(),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  
  // Address
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
  
  // Business Settings
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  taxRate: z.number().min(0).max(1),
})

export type RestaurantSettingsForm = z.infer<typeof RestaurantSettingsSchema>

// Menu Item Forms
export const MenuItemFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  categoryId: z.string().uuid('Please select a category'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  compareAtPrice: z.number().min(0).optional(),
  
  // Dietary Information
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  
  // Inventory
  trackInventory: z.boolean().default(false),
  stockQuantity: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  
  // Additional Information
  calories: z.number().min(0).optional(),
  preparationTime: z.number().min(0).optional(),
})

export type MenuItemForm = z.infer<typeof MenuItemFormSchema>

// ===== CONTEXT TYPES =====

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterForm) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

export interface RestaurantContextType {
  restaurant: Restaurant | null
  loading: boolean
  updateRestaurant: (data: Partial<Restaurant>) => Promise<void>
  refreshRestaurant: () => Promise<void>
}

// ===== UTILITY TYPES =====

export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>

// Dashboard Analytics Types
export interface RestaurantStats {
  todayOrders: number
  todayRevenue: number
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  popularItems: Array<{
    id: string
    name: string
    orderCount: number
    revenue: number
  }>
  recentOrders: Order[]
  monthlyRevenue: Array<{
    month: string
    revenue: number
    orders: number
  }>
  orderStatusBreakdown: Array<{
    status: OrderStatus
    count: number
  }>
}

export interface DashboardMetrics {
  revenue: {
    today: number
    yesterday: number
    thisMonth: number
    lastMonth: number
    thisYear: number
    growth: {
      daily: number
      monthly: number
      yearly: number
    }
  }
  orders: {
    today: number
    yesterday: number
    thisMonth: number
    lastMonth: number
    growth: {
      daily: number
      monthly: number
    }
  }
  customers: {
    total: number
    new: number
    returning: number
    growth: number
  }
  avgOrderValue: {
    current: number
    previous: number
    growth: number
  }
}

// Database table names for type safety
export const Tables = {
  USERS: 'users',
  RESTAURANTS: 'restaurants',
  OPERATING_HOURS: 'operating_hours',
  DELIVERY_ZONES: 'delivery_zones',
  MENU_CATEGORIES: 'menu_categories',
  MENU_ITEMS: 'menu_items',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
} as const

export type TableName = typeof Tables[keyof typeof Tables]

// ===== ERROR TYPES =====

export interface AppError {
  code: string
  message: string
  details?: any
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

// ===== TENANT TYPES =====

export interface TenantInfo {
  restaurant: Restaurant
  subdomain: string
  customDomain?: string
  isValidTenant: boolean
}

export interface MiddlewareContext {
  tenant: TenantInfo | null
  pathname: string
  searchParams: URLSearchParams
}

// ===== PROMOTION TYPES =====

export const PromotionType = z.enum([
  'percentage',
  'fixed_amount',
  'buy_x_get_y',
  'free_delivery',
  'happy_hour',
  'first_time_customer',
  'loyalty_reward',
  'category_discount',
  'bundle_deal'
])
export type PromotionType = z.infer<typeof PromotionType>

export const PromotionStatus = z.enum([
  'draft',
  'active', 
  'paused',
  'expired',
  'exhausted',
  'cancelled'
])
export type PromotionStatus = z.infer<typeof PromotionStatus>

export const DiscountScope = z.enum([
  'order_total',
  'subtotal',
  'delivery_fee',
  'category',
  'item',
  'first_item',
  'cheapest_item'
])
export type DiscountScope = z.infer<typeof DiscountScope>

export const CustomerSegment = z.enum([
  'all_customers',
  'new_customers',
  'returning_customers',
  'vip_customers',
  'inactive_customers',
  'birthday_customers',
  'specific_customers'
])
export type CustomerSegment = z.infer<typeof CustomerSegment>

export const UsageFrequency = z.enum([
  'once_per_customer',
  'daily',
  'weekly',
  'monthly',
  'unlimited'
])
export type UsageFrequency = z.infer<typeof UsageFrequency>

export const PromotionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  internalNotes: z.string().optional(),
  
  // Promotion configuration
  promotionType: PromotionType,
  status: PromotionStatus,
  discountScope: DiscountScope,
  
  // Discount values
  discountPercentage: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  
  // Buy X Get Y configuration
  buyQuantity: z.number().min(1).optional(),
  getQuantity: z.number().min(1).optional(),
  getDiscountPercentage: z.number().min(0).max(100).optional(),
  
  // Requirements
  minOrderAmount: z.number().min(0).default(0),
  minItemsQuantity: z.number().min(0).default(0),
  
  // Usage limits
  totalUsageLimit: z.number().min(1).optional(),
  perCustomerLimit: z.number().min(1).optional(),
  usageFrequency: UsageFrequency,
  
  // Time restrictions
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  validDays: z.array(DayOfWeek),
  validHoursStart: z.string().optional(), // HH:MM format
  validHoursEnd: z.string().optional(),   // HH:MM format
  
  // Targeting
  targetSegment: CustomerSegment,
  
  // Stacking rules
  canStackWithOthers: z.boolean().default(false),
  stackPriority: z.number().min(0).max(100).default(0),
  
  // Application settings
  autoApply: z.boolean().default(false),
  requiresCode: z.boolean().default(true),
  
  // Display settings
  isFeatured: z.boolean().default(false),
  displayBanner: z.boolean().default(false),
  bannerText: z.string().optional(),
  bannerColor: z.string().optional(), // Hex color
  
  // Analytics
  totalUses: z.number().default(0),
  totalDiscountGiven: z.number().default(0),
  totalRevenueImpact: z.number().default(0),
  
  // Audit
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid(),
  lastModifiedBy: z.string().uuid().optional(),
})

export type Promotion = z.infer<typeof PromotionSchema>

export const PromotionCodeSchema = z.object({
  id: z.string().uuid(),
  promotionId: z.string().uuid(),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  
  // Usage tracking
  usageLimit: z.number().min(1).optional(),
  currentUsage: z.number().default(0),
  
  // Validity
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  isActive: z.boolean().default(true),
  isSingleUse: z.boolean().default(false),
  
  // QR code
  qrCodeUrl: z.string().url().optional(),
  qrCodeData: z.string().optional(),
  
  // Batch tracking
  generatedBatchId: z.string().uuid().optional(),
  
  // Audit
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PromotionCode = z.infer<typeof PromotionCodeSchema>

export const PromotionUsageSchema = z.object({
  id: z.string().uuid(),
  promotionId: z.string().uuid(),
  promotionCodeId: z.string().uuid().optional(),
  orderId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  
  // Usage details
  discountAmount: z.number().min(0),
  originalOrderAmount: z.number().min(0),
  finalOrderAmount: z.number().min(0),
  
  // Applied items (for item-specific promotions)
  appliedItems: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().min(1),
    discountAmount: z.number().min(0),
  })).default([]),
  
  // Context
  customerSegment: CustomerSegment.optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  
  // Revenue impact
  estimatedLostRevenue: z.number().optional(),
  customerLifetimeValueImpact: z.number().optional(),
  
  // Audit
  createdAt: z.date(),
})

export type PromotionUsage = z.infer<typeof PromotionUsageSchema>

// Cart item with promotion context
export const CartItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  name: z.string(),
  quantity: z.number().min(1),
  unit_price: z.number().min(0),
  category_id: z.string().uuid().optional(),
  modifiers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
  })).default([]),
})

export type CartItem = z.infer<typeof CartItemSchema>

// Order pricing breakdown
export interface OrderPricing {
  subtotal: number
  discountAmount: number
  deliveryFee: number
  deliveryDiscount: number
  taxAmount: number
  totalAmount: number
}

// Discount application details
export interface DiscountApplication {
  promotionId: string
  promotionName: string
  promotionType: string
  discountScope: string
  discountAmount: number
  appliedToItems?: Array<{
    itemId: string
    itemName: string
    quantity: number
    discountAmount: number
  }>
  codeUsed?: string
}

// Promotion validation result
export interface PromotionValidationResult {
  isValid: boolean
  promotionId: string
  promotionCodeId: string
  errorMessage: string
  discountPreview: number
}

// Complete promotion calculation result
export interface PromotionCalculationResult {
  isValid: boolean
  totalDiscount: number
  discountBreakdown: DiscountApplication[]
  finalPricing: OrderPricing
  appliedPromotions: Array<{
    promotionId: string
    promotionName: string
    discountAmount: number
    promotionType: string
    codeUsed?: string
  }>
  errors: string[]
  warnings: string[]
}

// Promotion rules for advanced targeting
export const PromotionRuleSchema = z.object({
  id: z.string().uuid(),
  promotionId: z.string().uuid(),
  ruleType: z.string(), // 'category_include', 'category_exclude', 'item_include', etc.
  ruleValue: z.any(), // Flexible rule data as JSON
  isRequired: z.boolean().default(true),
  rulePriority: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PromotionRule = z.infer<typeof PromotionRuleSchema>

// Promotion analytics data
export interface PromotionAnalytics {
  promotionId: string
  tenantId: string
  date: string
  hour?: number
  
  // Usage metrics
  totalUses: number
  uniqueCustomers: number
  
  // Financial metrics  
  totalDiscountGiven: number
  totalOrderValue: number
  averageOrderValue: number
  
  // Customer metrics
  newCustomers: number
  returningCustomers: number
  
  // Conversion metrics
  views: number
  applications: number
  conversionRate: number
}