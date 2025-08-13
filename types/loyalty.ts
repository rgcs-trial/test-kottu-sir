import { z } from 'zod'

// ===== LOYALTY PROGRAM CORE TYPES =====

export const LoyaltyProgramType = z.enum(['points', 'visits', 'spending', 'tiered'])
export type LoyaltyProgramType = z.infer<typeof LoyaltyProgramType>

export const LoyaltyProgramSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  name: z.string().min(1, 'Program name is required'),
  description: z.string().optional(),
  program_type: LoyaltyProgramType,
  points_per_dollar: z.number().min(0).default(1.0),
  welcome_bonus: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
})

export type LoyaltyProgram = z.infer<typeof LoyaltyProgramSchema>

// ===== LOYALTY TIERS =====

export const LoyaltyTierSchema = z.object({
  id: z.string().uuid(),
  program_id: z.string().uuid(),
  tier_name: z.string().min(1, 'Tier name is required'),
  tier_level: z.number().min(1),
  min_points: z.number().min(0).default(0),
  max_points: z.number().min(0).optional(),
  benefits: z.record(z.any()).default({}), // JSONB for flexible benefits
  discount_percentage: z.number().min(0).max(100).default(0),
  multiplier: z.number().min(0).default(1.0),
  perks: z.array(z.string()).default([]),
  created_at: z.date(),
  updated_at: z.date(),
})

export type LoyaltyTier = z.infer<typeof LoyaltyTierSchema>

// ===== CUSTOMER LOYALTY ACCOUNTS =====

export const CustomerLoyaltyAccountSchema = z.object({
  id: z.string().uuid(),
  customer_email: z.string().email(),
  restaurant_id: z.string().uuid(),
  program_id: z.string().uuid(),
  current_points: z.number().default(0),
  lifetime_points: z.number().default(0),
  current_tier_id: z.string().uuid().optional(),
  join_date: z.date(),
  referral_code: z.string().optional(),
  referred_by: z.string().uuid().optional(),
  last_activity: z.date(),
  total_orders: z.number().default(0),
  total_spent: z.number().default(0),
  created_at: z.date(),
  updated_at: z.date(),
})

export type CustomerLoyaltyAccount = z.infer<typeof CustomerLoyaltyAccountSchema>

// ===== LOYALTY TRANSACTIONS =====

export const LoyaltyTransactionType = z.enum([
  'earned',
  'redeemed', 
  'expired',
  'bonus',
  'referral',
  'birthday',
  'adjustment'
])
export type LoyaltyTransactionType = z.infer<typeof LoyaltyTransactionType>

export const LoyaltyTransactionSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  transaction_type: LoyaltyTransactionType,
  points: z.number(),
  description: z.string().min(1),
  order_id: z.string().uuid().optional(),
  expires_at: z.date().optional(),
  created_at: z.date(),
  created_by: z.string().uuid().optional(),
})

export type LoyaltyTransaction = z.infer<typeof LoyaltyTransactionSchema>

// ===== REWARDS =====

export const RewardType = z.enum([
  'discount',
  'free_item', 
  'cashback',
  'free_delivery',
  'percentage_off'
])
export type RewardType = z.infer<typeof RewardType>

export const RewardSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  name: z.string().min(1, 'Reward name is required'),
  description: z.string().optional(),
  points_cost: z.number().min(1, 'Points cost must be greater than 0'),
  reward_type: RewardType,
  value: z.number().min(0, 'Reward value must be positive'),
  max_redemptions_per_customer: z.number().min(1).optional(),
  max_total_redemptions: z.number().min(1).optional(),
  current_total_redemptions: z.number().default(0),
  valid_from: z.date(),
  valid_until: z.date().optional(),
  is_active: z.boolean().default(true),
  restrictions: z.record(z.any()).default({}),
  image_url: z.string().url().optional(),
  is_featured: z.boolean().default(false),
  sort_order: z.number().default(0),
  created_at: z.date(),
  updated_at: z.date(),
})

export type Reward = z.infer<typeof RewardSchema>

// ===== REWARD REDEMPTIONS =====

export const RedemptionStatus = z.enum(['pending', 'applied', 'expired', 'cancelled'])
export type RedemptionStatus = z.infer<typeof RedemptionStatus>

export const RewardRedemptionSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  reward_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
  points_used: z.number().min(1),
  discount_applied: z.number().default(0),
  status: RedemptionStatus.default('pending'),
  redeemed_at: z.date(),
  expires_at: z.date().optional(),
  applied_at: z.date().optional(),
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
})

export type RewardRedemption = z.infer<typeof RewardRedemptionSchema>

// ===== LOYALTY EVENTS =====

export const LoyaltyEventType = z.enum([
  'double_points',
  'bonus_points', 
  'free_reward',
  'tier_upgrade'
])
export type LoyaltyEventType = z.infer<typeof LoyaltyEventType>

export const LoyaltyEventSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  event_name: z.string().min(1),
  event_type: LoyaltyEventType,
  multiplier: z.number().default(1.0),
  bonus_points: z.number().default(0),
  target_tiers: z.array(z.string().uuid()).default([]),
  target_customers: z.array(z.string().uuid()).default([]),
  start_date: z.date(),
  end_date: z.date(),
  min_order_amount: z.number().min(0).optional(),
  valid_days: z.array(z.number().min(0).max(6)).default([]), // 0=Sunday
  valid_hours_start: z.string().optional(),
  valid_hours_end: z.string().optional(),
  is_active: z.boolean().default(true),
  max_uses_per_customer: z.number().min(1).optional(),
  total_uses: z.number().default(0),
  created_at: z.date(),
  updated_at: z.date(),
})

export type LoyaltyEvent = z.infer<typeof LoyaltyEventSchema>

// ===== LOYALTY ACHIEVEMENTS =====

export const LoyaltyAchievementSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  badge_icon: z.string().optional(),
  badge_color: z.string().optional(),
  criteria: z.record(z.any()), // JSONB for flexible criteria
  reward_points: z.number().default(0),
  reward_description: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
})

export type LoyaltyAchievement = z.infer<typeof LoyaltyAchievementSchema>

export const CustomerAchievementSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  achievement_id: z.string().uuid(),
  earned_at: z.date(),
  points_awarded: z.number().default(0),
})

export type CustomerAchievement = z.infer<typeof CustomerAchievementSchema>

// ===== LOYALTY SETTINGS =====

export const LoyaltySettingsSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  birthday_bonus_points: z.number().default(100),
  referral_bonus_points: z.number().default(50),
  points_expiry_months: z.number().default(12),
  send_welcome_email: z.boolean().default(true),
  send_points_earned_email: z.boolean().default(true),
  send_tier_upgrade_email: z.boolean().default(true),
  send_birthday_email: z.boolean().default(true),
  send_expiry_reminder_email: z.boolean().default(true),
  show_points_on_receipts: z.boolean().default(true),
  show_tier_progress: z.boolean().default(true),
  show_referral_program: z.boolean().default(true),
  allow_negative_points: z.boolean().default(false),
  round_points_to_nearest: z.number().default(1),
  created_at: z.date(),
  updated_at: z.date(),
})

export type LoyaltySettings = z.infer<typeof LoyaltySettingsSchema>

// ===== FORM SCHEMAS =====

// Loyalty Program Form
export const LoyaltyProgramFormSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  description: z.string().optional(),
  program_type: LoyaltyProgramType,
  points_per_dollar: z.number().min(0.1, 'Must be at least 0.1 points per dollar').max(10, 'Cannot exceed 10 points per dollar'),
  welcome_bonus: z.number().min(0).max(1000, 'Welcome bonus cannot exceed 1000 points'),
})

export type LoyaltyProgramForm = z.infer<typeof LoyaltyProgramFormSchema>

// Loyalty Tier Form
export const LoyaltyTierFormSchema = z.object({
  tier_name: z.string().min(1, 'Tier name is required'),
  tier_level: z.number().min(1, 'Tier level must be at least 1'),
  min_points: z.number().min(0, 'Minimum points cannot be negative'),
  max_points: z.number().min(1).optional(),
  discount_percentage: z.number().min(0).max(50, 'Discount cannot exceed 50%'),
  multiplier: z.number().min(1, 'Multiplier must be at least 1x').max(5, 'Multiplier cannot exceed 5x'),
  perks: z.array(z.string()).default([]),
})

export type LoyaltyTierForm = z.infer<typeof LoyaltyTierFormSchema>

// Reward Form
export const RewardFormSchema = z.object({
  name: z.string().min(1, 'Reward name is required'),
  description: z.string().optional(),
  points_cost: z.number().min(1, 'Points cost must be at least 1'),
  reward_type: RewardType,
  value: z.number().min(0.01, 'Value must be greater than 0'),
  max_redemptions_per_customer: z.number().min(1).optional(),
  max_total_redemptions: z.number().min(1).optional(),
  valid_from: z.date(),
  valid_until: z.date().optional(),
  image_url: z.string().url().optional(),
  is_featured: z.boolean().default(false),
})

export type RewardForm = z.infer<typeof RewardFormSchema>

// Loyalty Settings Form
export const LoyaltySettingsFormSchema = z.object({
  birthday_bonus_points: z.number().min(0).max(500),
  referral_bonus_points: z.number().min(0).max(500),
  points_expiry_months: z.number().min(1).max(60),
  send_welcome_email: z.boolean(),
  send_points_earned_email: z.boolean(),
  send_tier_upgrade_email: z.boolean(),
  send_birthday_email: z.boolean(),
  send_expiry_reminder_email: z.boolean(),
  show_points_on_receipts: z.boolean(),
  show_tier_progress: z.boolean(),
  show_referral_program: z.boolean(),
  allow_negative_points: z.boolean(),
  round_points_to_nearest: z.enum(['1', '5', '10']),
})

export type LoyaltySettingsForm = z.infer<typeof LoyaltySettingsFormSchema>

// ===== DISPLAY/UI TYPES =====

// Customer loyalty dashboard data
export interface LoyaltyDashboardData {
  account: CustomerLoyaltyAccount & {
    current_tier?: LoyaltyTier
    program: LoyaltyProgram
  }
  recent_transactions: LoyaltyTransaction[]
  available_rewards: Reward[]
  achievements: CustomerAchievement[]
  tier_progress: {
    current_points: number
    next_tier?: LoyaltyTier
    points_to_next_tier?: number
    progress_percentage: number
  }
  expiring_points: {
    points: number
    expiry_date: Date
  }[]
}

// Loyalty analytics for restaurants
export interface LoyaltyAnalytics {
  program_id: string
  date_range: {
    start: Date
    end: Date
  }
  metrics: {
    total_members: number
    new_members: number
    active_members: number
    points_issued: number
    points_redeemed: number
    rewards_redeemed: number
    tier_breakdown: Array<{
      tier_name: string
      member_count: number
      percentage: number
    }>
    engagement_metrics: {
      avg_points_per_member: number
      redemption_rate: number
      member_retention_rate: number
    }
  }
  trends: Array<{
    date: string
    new_members: number
    points_earned: number
    points_redeemed: number
  }>
}

// Reward catalog item (for display)
export interface RewardCatalogItem extends Reward {
  can_redeem: boolean
  user_redemption_count?: number
  redemption_limit_reached?: boolean
}

// Loyalty transaction with context
export interface LoyaltyTransactionWithContext extends LoyaltyTransaction {
  reward?: Reward
  order_number?: string
  balance_after_transaction: number
}

// ===== API RESPONSE TYPES =====

export interface LoyaltyApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PointsEarnedResponse {
  points_earned: number
  new_tier?: LoyaltyTier
  achievements_unlocked?: LoyaltyAchievement[]
  transaction_id: string
}

export interface RewardRedemptionResponse {
  redemption_id: string
  points_used: number
  discount_amount: number
  remaining_points: number
  expires_at?: Date
}

export interface TierUpgradeData {
  previous_tier?: LoyaltyTier
  new_tier: LoyaltyTier
  benefits_unlocked: string[]
  bonus_points?: number
}

// ===== UTILITY TYPES =====

export type CreateLoyaltyData<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
export type UpdateLoyaltyData<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>

// Points calculation context
export interface PointsCalculationContext {
  order_total: number
  customer_email: string
  restaurant_id: string
  order_items: Array<{
    menu_item_id: string
    category_id: string
    quantity: number
    price: number
  }>
  special_events?: LoyaltyEvent[]
  tier_multiplier?: number
}

// Reward validation context
export interface RewardValidationContext {
  reward_id: string
  customer_email: string
  restaurant_id: string
  order_total?: number
  order_items?: Array<{
    menu_item_id: string
    category_id: string
    quantity: number
    price: number
  }>
}

// ===== ERROR TYPES =====

export class LoyaltyError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'LoyaltyError'
  }
}

export class InsufficientPointsError extends LoyaltyError {
  constructor(required: number, available: number) {
    super(`Insufficient points. Required: ${required}, Available: ${available}`, 'INSUFFICIENT_POINTS')
  }
}

export class RewardNotAvailableError extends LoyaltyError {
  constructor(rewardId: string) {
    super(`Reward ${rewardId} is not available for redemption`, 'REWARD_NOT_AVAILABLE')
  }
}

export class LoyaltyProgramNotFoundError extends LoyaltyError {
  constructor(restaurantId: string) {
    super(`No active loyalty program found for restaurant ${restaurantId}`, 'PROGRAM_NOT_FOUND')
  }
}

// ===== DATABASE TABLE NAMES =====

export const LoyaltyTables = {
  LOYALTY_PROGRAMS: 'loyalty_programs',
  LOYALTY_TIERS: 'loyalty_tiers',
  CUSTOMER_LOYALTY_ACCOUNTS: 'customer_loyalty_accounts',
  LOYALTY_TRANSACTIONS: 'loyalty_transactions',
  REWARDS: 'rewards',
  REWARD_REDEMPTIONS: 'reward_redemptions',
  LOYALTY_EVENTS: 'loyalty_events',
  LOYALTY_ACHIEVEMENTS: 'loyalty_achievements',
  CUSTOMER_ACHIEVEMENTS: 'customer_achievements',
  LOYALTY_SETTINGS: 'loyalty_settings',
} as const

export type LoyaltyTableName = typeof LoyaltyTables[keyof typeof LoyaltyTables]