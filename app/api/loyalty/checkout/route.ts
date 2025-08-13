import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const customerEmail = searchParams.get('customer_email')
    const orderTotal = parseFloat(searchParams.get('order_total') || '0')

    if (!restaurantId || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID and customer email are required' },
        { status: 400 }
      )
    }

    // Get customer loyalty account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('customer_loyalty_accounts')
      .select(`
        *,
        loyalty_tiers!current_tier_id (
          id,
          tier_name,
          tier_level,
          discount_percentage,
          multiplier
        ),
        loyalty_programs!program_id (
          id,
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
      return NextResponse.json({
        success: true,
        data: {
          account: null,
          available_rewards: [],
          points_to_earn: 0
        }
      })
    }

    // Calculate points to earn
    const basePoints = Math.floor(orderTotal * account.loyalty_programs.points_per_dollar)
    const multiplier = account.loyalty_tiers?.multiplier || 1
    const pointsToEarn = Math.floor(basePoints * multiplier)

    // Get available rewards that customer can afford
    const { data: rewards, error: rewardsError } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .lte('points_cost', account.current_points)
      .gte('valid_until', new Date().toISOString())
      .order('points_cost', { ascending: true })
      .limit(5)

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rewards' },
        { status: 500 }
      )
    }

    // Check which rewards are valid for this order
    const availableRewards = []
    for (const reward of rewards || []) {
      // Check redemption limits
      const { count: userRedemptions } = await supabaseAdmin
        .from('reward_redemptions')
        .select('*', { count: 'exact' })
        .eq('account_id', account.id)
        .eq('reward_id', reward.id)
        .in('status', ['pending', 'applied'])

      const canRedeem = !reward.max_redemptions_per_customer || 
        (userRedemptions || 0) < reward.max_redemptions_per_customer

      if (canRedeem) {
        availableRewards.push({
          ...reward,
          can_redeem: account.current_points >= reward.points_cost,
          user_redemption_count: userRedemptions || 0,
          redemption_limit_reached: false
        })
      }
    }

    const checkoutData = {
      account: {
        ...account,
        current_tier: account.loyalty_tiers,
        program: account.loyalty_programs
      },
      available_rewards: availableRewards,
      points_to_earn: pointsToEarn
    }

    return NextResponse.json({
      success: true,
      data: checkoutData
    })
  } catch (error) {
    console.error('Error in loyalty checkout API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}