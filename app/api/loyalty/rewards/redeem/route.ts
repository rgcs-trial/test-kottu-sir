import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      reward_id,
      customer_email,
      restaurant_id
    } = body

    if (!reward_id || !customer_email || !restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get customer loyalty account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('customer_loyalty_accounts')
      .select('*')
      .eq('customer_email', customer_email)
      .eq('restaurant_id', restaurant_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: 'Customer loyalty account not found' },
        { status: 404 }
      )
    }

    // Get reward details
    const { data: reward, error: rewardError } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .eq('id', reward_id)
      .eq('restaurant_id', restaurant_id)
      .eq('is_active', true)
      .single()

    if (rewardError || !reward) {
      return NextResponse.json(
        { success: false, error: 'Reward not found or inactive' },
        { status: 404 }
      )
    }

    // Validate customer has enough points
    if (account.current_points < reward.points_cost) {
      return NextResponse.json(
        { success: false, error: 'Insufficient points' },
        { status: 400 }
      )
    }

    // Check reward validity
    const now = new Date()
    const validFrom = new Date(reward.valid_from)
    const validUntil = reward.valid_until ? new Date(reward.valid_until) : null

    if (now < validFrom || (validUntil && now > validUntil)) {
      return NextResponse.json(
        { success: false, error: 'Reward is not currently valid' },
        { status: 400 }
      )
    }

    // Check per-customer redemption limit
    if (reward.max_redemptions_per_customer) {
      const { count: userRedemptions } = await supabaseAdmin
        .from('reward_redemptions')
        .select('*', { count: 'exact' })
        .eq('account_id', account.id)
        .eq('reward_id', reward_id)
        .in('status', ['pending', 'applied'])

      if (userRedemptions && userRedemptions >= reward.max_redemptions_per_customer) {
        return NextResponse.json(
          { success: false, error: 'Customer redemption limit reached' },
          { status: 400 }
        )
      }
    }

    // Check total redemption limit
    if (reward.max_total_redemptions && reward.current_total_redemptions >= reward.max_total_redemptions) {
      return NextResponse.json(
        { success: false, error: 'Reward redemption limit reached' },
        { status: 400 }
      )
    }

    // Start transaction
    const { data: redemption, error: redemptionError } = await supabaseAdmin
      .from('reward_redemptions')
      .insert({
        account_id: account.id,
        reward_id: reward_id,
        points_used: reward.points_cost,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours to use
      })
      .select()
      .single()

    if (redemptionError) {
      console.error('Error creating redemption:', redemptionError)
      return NextResponse.json(
        { success: false, error: 'Failed to redeem reward' },
        { status: 500 }
      )
    }

    // Deduct points using the loyalty function
    const { error: deductError } = await supabaseAdmin.rpc('add_loyalty_points', {
      p_account_id: account.id,
      p_points: -reward.points_cost,
      p_transaction_type: 'redeemed',
      p_description: `Redeemed reward: ${reward.name}`
    })

    if (deductError) {
      // Rollback redemption
      await supabaseAdmin
        .from('reward_redemptions')
        .delete()
        .eq('id', redemption.id)

      console.error('Error deducting points:', deductError)
      return NextResponse.json(
        { success: false, error: 'Failed to deduct points' },
        { status: 500 }
      )
    }

    // Update reward redemption count
    await supabaseAdmin
      .from('rewards')
      .update({ 
        current_total_redemptions: reward.current_total_redemptions + 1 
      })
      .eq('id', reward_id)

    return NextResponse.json({
      success: true,
      data: {
        redemption_id: redemption.id,
        points_used: reward.points_cost,
        remaining_points: account.current_points - reward.points_cost,
        reward_name: reward.name,
        expires_at: redemption.expires_at,
      }
    })
  } catch (error) {
    console.error('Error in redeem reward API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}