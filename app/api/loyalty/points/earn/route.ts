import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customer_email,
      restaurant_id,
      order_id,
      order_total,
      order_items = []
    } = body

    if (!customer_email || !restaurant_id || !order_id || !order_total) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get or create customer loyalty account
    let { data: account, error: accountError } = await supabaseAdmin
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
          multiplier
        ),
        loyalty_programs!program_id (
          id,
          name,
          points_per_dollar,
          welcome_bonus
        )
      `)
      .eq('customer_email', customer_email)
      .eq('restaurant_id', restaurant_id)
      .single()

    if (accountError && accountError.code !== 'PGRST116') {
      console.error('Error fetching loyalty account:', accountError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch loyalty account' },
        { status: 500 }
      )
    }

    // If no account exists, create one
    if (!account) {
      // Get the active loyalty program
      const { data: program, error: programError } = await supabaseAdmin
        .from('loyalty_programs')
        .select('*')
        .eq('restaurant_id', restaurant_id)
        .eq('is_active', true)
        .single()

      if (programError || !program) {
        return NextResponse.json(
          { success: false, error: 'No active loyalty program found' },
          { status: 404 }
        )
      }

      // Create new account
      const referralCode = `REF${Date.now().toString(36).toUpperCase()}`
      
      const { data: newAccount, error: createError } = await supabaseAdmin
        .from('customer_loyalty_accounts')
        .insert({
          customer_email,
          restaurant_id,
          program_id: program.id,
          current_points: program.welcome_bonus,
          lifetime_points: program.welcome_bonus,
          referral_code: referralCode,
          total_orders: 1,
          total_spent: order_total,
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

      // Record welcome bonus transaction if applicable
      if (program.welcome_bonus > 0) {
        await supabaseAdmin
          .from('loyalty_transactions')
          .insert({
            account_id: newAccount.id,
            transaction_type: 'bonus',
            points: program.welcome_bonus,
            description: 'Welcome bonus for joining loyalty program',
            order_id
          })
      }

      account = { ...newAccount, loyalty_tiers: null, current_tier: null }
    } else {
      // Update existing account order stats
      await supabaseAdmin
        .from('customer_loyalty_accounts')
        .update({
          total_orders: account.total_orders + 1,
          total_spent: account.total_spent + order_total,
          last_activity: new Date().toISOString()
        })
        .eq('id', account.id)
    }

    // Calculate points to earn
    const basePoints = Math.floor(order_total * account.loyalty_programs.points_per_dollar)
    const multiplier = account.loyalty_tiers?.multiplier || 1
    const pointsToEarn = Math.floor(basePoints * multiplier)

    if (pointsToEarn <= 0) {
      return NextResponse.json({
        success: true,
        data: {
          points_earned: 0,
          new_tier: null,
          achievements_unlocked: [],
          transaction_id: null
        }
      })
    }

    // Award points using the database function
    const { data: transactionResult, error: pointsError } = await supabaseAdmin.rpc('add_loyalty_points', {
      p_account_id: account.id,
      p_points: pointsToEarn,
      p_transaction_type: 'earned',
      p_description: `Points earned from order #${order_id}`,
      p_order_id: order_id,
      p_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
    })

    if (pointsError) {
      console.error('Error awarding points:', pointsError)
      return NextResponse.json(
        { success: false, error: 'Failed to award points' },
        { status: 500 }
      )
    }

    // Get updated account to check for tier upgrade
    const { data: updatedAccount, error: updateError } = await supabaseAdmin
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
        )
      `)
      .eq('id', account.id)
      .single()

    if (updateError) {
      console.error('Error fetching updated account:', updateError)
    }

    // Check if tier upgraded
    const newTier = updatedAccount?.loyalty_tiers
    const previousTierLevel = account.loyalty_tiers?.tier_level || 0
    const newTierLevel = newTier?.tier_level || 0
    const tierUpgraded = newTierLevel > previousTierLevel

    // TODO: Check for achievements unlocked
    const achievementsUnlocked = []

    return NextResponse.json({
      success: true,
      data: {
        points_earned: pointsToEarn,
        new_tier: tierUpgraded ? newTier : null,
        achievements_unlocked: achievementsUnlocked,
        transaction_id: transactionResult,
        account_summary: {
          current_points: updatedAccount?.current_points || account.current_points + pointsToEarn,
          lifetime_points: updatedAccount?.lifetime_points || account.lifetime_points + pointsToEarn,
          current_tier: newTier
        }
      }
    })
  } catch (error) {
    console.error('Error in earn points API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}