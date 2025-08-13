// Generated types for Supabase database
// This file should be generated using: npx supabase gen types typescript --project-id YOUR_PROJECT_ID

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo: string | null
          cover_image: string | null
          subdomain: string
          custom_domain: string | null
          status: 'active' | 'inactive' | 'suspended' | 'pending'
          
          // Contact Information
          email: string
          phone: string
          website: string | null
          
          // Address
          address_street: string
          address_city: string
          address_state: string
          address_zip_code: string
          address_country: string
          address_latitude: number | null
          address_longitude: number | null
          
          // Business Settings
          timezone: string
          currency: string
          tax_rate: number
          
          // Operating Settings
          is_online: boolean
          is_accepting_orders: boolean
          temporary_closure_reason: string | null
          
          // Service Options
          accepts_delivery: boolean
          accepts_takeout: boolean
          accepts_dine_in: boolean
          
          // Subscription
          subscription_tier: 'basic' | 'premium' | 'enterprise'
          subscription_status: 'active' | 'past_due' | 'canceled' | 'incomplete'
          subscription_ends_at: string | null
          
          // Metadata
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo?: string | null
          cover_image?: string | null
          subdomain: string
          custom_domain?: string | null
          status?: 'active' | 'inactive' | 'suspended' | 'pending'
          
          email: string
          phone: string
          website?: string | null
          
          address_street: string
          address_city: string
          address_state: string
          address_zip_code: string
          address_country: string
          address_latitude?: number | null
          address_longitude?: number | null
          
          timezone: string
          currency?: string
          tax_rate?: number
          
          is_online?: boolean
          is_accepting_orders?: boolean
          temporary_closure_reason?: string | null
          
          accepts_delivery?: boolean
          accepts_takeout?: boolean
          accepts_dine_in?: boolean
          
          subscription_tier?: 'basic' | 'premium' | 'enterprise'
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'incomplete'
          subscription_ends_at?: string | null
          
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo?: string | null
          cover_image?: string | null
          subdomain?: string
          custom_domain?: string | null
          status?: 'active' | 'inactive' | 'suspended' | 'pending'
          
          email?: string
          phone?: string
          website?: string | null
          
          address_street?: string
          address_city?: string
          address_state?: string
          address_zip_code?: string
          address_country?: string
          address_latitude?: number | null
          address_longitude?: number | null
          
          timezone?: string
          currency?: string
          tax_rate?: number
          
          is_online?: boolean
          is_accepting_orders?: boolean
          temporary_closure_reason?: string | null
          
          accepts_delivery?: boolean
          accepts_takeout?: boolean
          accepts_dine_in?: boolean
          
          subscription_tier?: 'basic' | 'premium' | 'enterprise'
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'incomplete'
          subscription_ends_at?: string | null
          
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone_number: string | null
          avatar: string | null
          role: 'super_admin' | 'platform_admin' | 'restaurant_owner' | 'restaurant_admin' | 'staff' | 'customer'
          is_active: boolean
          email_verified: boolean
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          phone_number?: string | null
          avatar?: string | null
          role?: 'super_admin' | 'platform_admin' | 'restaurant_owner' | 'restaurant_admin' | 'staff' | 'customer'
          is_active?: boolean
          email_verified?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone_number?: string | null
          avatar?: string | null
          role?: 'super_admin' | 'platform_admin' | 'restaurant_owner' | 'restaurant_admin' | 'staff' | 'customer'
          is_active?: boolean
          email_verified?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }
      
      menu_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          image: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          description?: string | null
          image?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          description?: string | null
          image?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string
          name: string
          description: string | null
          price: number
          compare_at_price: number | null
          images: string[]
          status: 'active' | 'inactive' | 'out_of_stock'
          
          // Dietary Information
          is_vegetarian: boolean
          is_vegan: boolean
          is_gluten_free: boolean
          allergens: string[]
          
          // Inventory
          track_inventory: boolean
          stock_quantity: number | null
          low_stock_threshold: number | null
          
          // Metadata
          calories: number | null
          preparation_time: number | null
          sort_order: number
          
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          category_id: string
          name: string
          description?: string | null
          price: number
          compare_at_price?: number | null
          images?: string[]
          status?: 'active' | 'inactive' | 'out_of_stock'
          
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          allergens?: string[]
          
          track_inventory?: boolean
          stock_quantity?: number | null
          low_stock_threshold?: number | null
          
          calories?: number | null
          preparation_time?: number | null
          sort_order?: number
          
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          compare_at_price?: number | null
          images?: string[]
          status?: 'active' | 'inactive' | 'out_of_stock'
          
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          allergens?: string[]
          
          track_inventory?: boolean
          stock_quantity?: number | null
          low_stock_threshold?: number | null
          
          calories?: number | null
          preparation_time?: number | null
          sort_order?: number
          
          created_at?: string
          updated_at?: string
        }
      }
      
      orders: {
        Row: {
          id: string
          order_number: string
          restaurant_id: string
          customer_id: string | null
          
          type: 'dine_in' | 'takeout' | 'delivery'
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'completed' | 'canceled' | 'refunded'
          
          // Customer Information (JSON)
          customer_info: any
          
          // Delivery Address (JSON, nullable)
          delivery_address: any | null
          
          // Pricing
          subtotal: number
          tax_amount: number
          delivery_fee: number
          tip_amount: number
          discount_amount: number
          total: number
          
          // Payment
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
          payment_method: string | null
          payment_intent_id: string | null
          
          // Timing
          estimated_ready_time: string | null
          actual_ready_time: string | null
          delivered_at: string | null
          
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          restaurant_id: string
          customer_id?: string | null
          
          type: 'dine_in' | 'takeout' | 'delivery'
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'completed' | 'canceled' | 'refunded'
          
          customer_info: any
          delivery_address?: any | null
          
          subtotal: number
          tax_amount: number
          delivery_fee?: number
          tip_amount?: number
          discount_amount?: number
          total: number
          
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
          payment_method?: string | null
          payment_intent_id?: string | null
          
          estimated_ready_time?: string | null
          actual_ready_time?: string | null
          delivered_at?: string | null
          
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          restaurant_id?: string
          customer_id?: string | null
          
          type?: 'dine_in' | 'takeout' | 'delivery'
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'completed' | 'canceled' | 'refunded'
          
          customer_info?: any
          delivery_address?: any | null
          
          subtotal?: number
          tax_amount?: number
          delivery_fee?: number
          tip_amount?: number
          discount_amount?: number
          total?: number
          
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
          payment_method?: string | null
          payment_intent_id?: string | null
          
          estimated_ready_time?: string | null
          actual_ready_time?: string | null
          delivered_at?: string | null
          
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          name: string
          price: number
          quantity: number
          notes: string | null
          customizations: any // JSON array
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          name: string
          price: number
          quantity: number
          notes?: string | null
          customizations?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          name?: string
          price?: number
          quantity?: number
          notes?: string | null
          customizations?: any
          created_at?: string
          updated_at?: string
        }
      }

      menu_modifiers: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          type: 'single' | 'multiple'
          min_selections: number
          max_selections: number | null
          is_required: boolean
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          type?: 'single' | 'multiple'
          min_selections?: number
          max_selections?: number | null
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          type?: 'single' | 'multiple'
          min_selections?: number
          max_selections?: number | null
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      menu_modifier_options: {
        Row: {
          id: string
          modifier_id: string
          name: string
          price_adjustment: number
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          modifier_id: string
          name: string
          price_adjustment?: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          modifier_id?: string
          name?: string
          price_adjustment?: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      menu_item_modifiers: {
        Row: {
          id: string
          menu_item_id: string
          modifier_id: string
          created_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          modifier_id: string
          created_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          modifier_id?: string
          created_at?: string
        }
      }

      menu_variants: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          price: number
          compare_at_price: number | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          price: number
          compare_at_price?: number | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          price?: number
          compare_at_price?: number | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      menu_schedules: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          start_time: string
          end_time: string
          days_of_week: number[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          start_time: string
          end_time: string
          days_of_week: number[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          start_time?: string
          end_time?: string
          days_of_week?: number[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      menu_category_schedules: {
        Row: {
          id: string
          category_id: string
          schedule_id: string
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          schedule_id: string
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          schedule_id?: string
          created_at?: string
        }
      }

      menu_item_schedules: {
        Row: {
          id: string
          menu_item_id: string
          schedule_id: string
          created_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          schedule_id: string
          created_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          schedule_id?: string
          created_at?: string
        }
      }

      operating_hours: {
        Row: {
          id: string
          restaurant_id: string
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          is_open: boolean
          open_time: string | null
          close_time: string | null
          is_overnight: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          is_open?: boolean
          open_time?: string | null
          close_time?: string | null
          is_overnight?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          is_open?: boolean
          open_time?: string | null
          close_time?: string | null
          is_overnight?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      onboarding_status: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string | null
          is_complete: boolean
          current_step: 'restaurant' | 'menu' | 'payment' | 'complete'
          steps: any // JSON object
          started_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id?: string | null
          is_complete?: boolean
          current_step?: 'restaurant' | 'menu' | 'payment' | 'complete'
          steps: any
          started_at: string
          completed_at?: string | null
          updated_at: string
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string | null
          is_complete?: boolean
          current_step?: 'restaurant' | 'menu' | 'payment' | 'complete'
          steps?: any
          started_at?: string
          completed_at?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'super_admin' | 'platform_admin' | 'restaurant_owner' | 'restaurant_admin' | 'staff' | 'customer'
      restaurant_status: 'active' | 'inactive' | 'suspended' | 'pending'
      subscription_tier: 'basic' | 'premium' | 'enterprise'
      subscription_status: 'active' | 'past_due' | 'canceled' | 'incomplete'
      menu_item_status: 'active' | 'inactive' | 'out_of_stock'
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'completed' | 'canceled' | 'refunded'
      order_type: 'dine_in' | 'takeout' | 'delivery'
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}