import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const customerEmail = searchParams.get('customer_email')

    if (!restaurantId || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID and customer email are required' },
        { status: 400 }
      )
    }

    // Get or create customer loyalty account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('customer_loyalty_accounts')
      .select(`
        *,
        loyalty_tiers!current_tier_id (
          id,
          tier_name,
          tier_level,
          min_points,
          max_points,
          discount_percentage,
          multiplier,
          perks
        ),
        loyalty_programs!program_id (
          id,
          name,
          points_per_dollar,
          welcome_bonus
        )
      `)
      .eq('customer_email', customerEmail)
      .eq('restaurant_id', restaurantId)
      .single()

    if (accountError && accountError.code !== 'PGRST116') {
      console.error('Error fetching loyalty account:', accountError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch loyalty account' },
        { status: 500 }
      )
    }

    if (!account) {
      // Check if restaurant has an active loyalty program
      const { data: program } = await supabaseAdmin
        .from('loyalty_programs')
        .select('id, name, points_per_dollar, welcome_bonus')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .single()

      if (!program) {
        return NextResponse.json(
          { success: false, error: 'No active loyalty program found' },
          { status: 404 }
        )
      }

      // Auto-enroll customer
      const referralCode = `REF${Date.now().toString(36).toUpperCase()}`
      
      const { data: newAccount, error: createError } = await supabaseAdmin
        .from('customer_loyalty_accounts')
        .insert({
          customer_email: customerEmail,
          restaurant_id: restaurantId,
          program_id: program.id,
          current_points: program.welcome_bonus,
          lifetime_points: program.welcome_bonus,
          referral_code: referralCode,
          total_orders: 0,
          total_spent: 0,
        })
        .select(`
          *,
          loyalty_programs!program_id (
            id,
            name,
            points_per_dollar,
            welcome_bonus
          )
        `)
        .single()

      if (createError) {
        console.error('Error creating loyalty account:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create loyalty account' },
          { status: 500 }
        )
      }

      // Record welcome bonus transaction
      if (program.welcome_bonus > 0) {
        await supabaseAdmin
          .from('loyalty_transactions')
          .insert({
            account_id: newAccount.id,
            transaction_type: 'bonus',
            points: program.welcome_bonus,
            description: 'Welcome bonus for joining loyalty program',
          })
      }

      // Use the new account for the rest of the response
      const accountWithTier = { ...newAccount, current_tier: null }
      return buildDashboardResponse(accountWithTier, restaurantId)
    }

    return buildDashboardResponse(account, restaurantId)
  } catch (error) {
    console.error('Error in loyalty dashboard API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function buildDashboardResponse(account: any, restaurantId: string) {
  try {
    // Get recent transactions
    const { data: transactions } = await supabaseAdmin
      .from('loyalty_transactions')
      .select(`
        *,
        rewards (
          id,
          name
        )
      `)
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get available rewards
    const { data: rewards } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .lte('points_cost', account.current_points)
      .order('points_cost', { ascending: true })
      .limit(10)

    // Get all tiers for progress display
    const { data: tiers } = await supabaseAdmin
      .from('loyalty_tiers')
      .select('*')
      .eq('program_id', account.program_id)
      .order('tier_level', { ascending: true })

    // Calculate tier progress
    const nextTier = tiers?.find(tier => 
      tier.tier_level > (account.loyalty_tiers?.tier_level || 0)
    )
    
    const pointsToNextTier = nextTier 
      ? Math.max(0, nextTier.min_points - account.current_points)
      : null

    // Get expiring points
    const { data: expiringPoints } = await supabaseAdmin
      .from('loyalty_transactions')
      .select('points, expires_at')
      .eq('account_id', account.id)
      .eq('transaction_type', 'earned')
      .not('expires_at', 'is', null)
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()) // Next 30 days
      .order('expires_at', { ascending: true })

    // Get customer achievements
    const { data: achievements } = await supabaseAdmin
      .from('customer_achievements')
      .select(`
        *,
        loyalty_achievements (
          id,
          name,
          badge_icon,
          badge_color
        )
      `)
      .eq('account_id', account.id)
      .order('earned_at', { ascending: false })

    const dashboardData = {
      account: {
        ...account,
        current_tier: account.loyalty_tiers
      },
      recent_transactions: transactions?.map(t => ({
        ...t,
        balance_after_transaction: account.current_points // Simplified - would need to calculate actual balance at time
      })) || [],
      available_rewards: rewards?.map(reward => ({
        ...reward,
        can_redeem: account.current_points >= reward.points_cost,
        user_redemption_count: 0, // TODO: Calculate actual usage
        redemption_limit_reached: false
      })) || [],
      achievements: achievements || [],
      tier_progress: {
        current_points: account.current_points,
        next_tier: nextTier,
        points_to_next_tier: pointsToNextTier,
        progress_percentage: nextTier 
          ? Math.min(100, (account.current_points / nextTier.min_points) * 100)
          : 100
      },
      expiring_points: expiringPoints?.map(ep => ({
        points: ep.points,
        expiry_date: ep.expires_at
      })) || [],
      program: {
        name: account.loyalty_programs?.name,
        restaurant_name: 'Restaurant', // TODO: Get actual restaurant name
        tiers: tiers || [],
        settings: {
          referral_bonus_points: 50, // TODO: Get from loyalty_settings
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })
  } catch (error) {
    console.error('Error building dashboard response:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to build dashboard data' },
      { status: 500 }
    )
  }
}