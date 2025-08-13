import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const { data: program, error } = await supabaseAdmin
      .from('loyalty_programs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching loyalty program:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch loyalty program' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: program
    })
  } catch (error) {
    console.error('Error in loyalty program API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      restaurant_id,
      name,
      description,
      program_type,
      points_per_dollar,
      welcome_bonus
    } = body

    if (!restaurant_id || !name || !program_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if restaurant already has an active program
    const { data: existingProgram } = await supabaseAdmin
      .from('loyalty_programs')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .eq('is_active', true)
      .single()

    if (existingProgram) {
      return NextResponse.json(
        { success: false, error: 'Restaurant already has an active loyalty program' },
        { status: 400 }
      )
    }

    // Create loyalty program
    const { data: program, error: programError } = await supabaseAdmin
      .from('loyalty_programs')
      .insert({
        restaurant_id,
        name,
        description,
        program_type,
        points_per_dollar: points_per_dollar || 1,
        welcome_bonus: welcome_bonus || 0,
        is_active: true,
      })
      .select()
      .single()

    if (programError) {
      console.error('Error creating loyalty program:', programError)
      return NextResponse.json(
        { success: false, error: 'Failed to create loyalty program' },
        { status: 500 }
      )
    }

    // Create default tiers
    const defaultTiers = [
      {
        program_id: program.id,
        tier_name: 'Bronze',
        tier_level: 1,
        min_points: 0,
        max_points: 499,
        discount_percentage: 0,
        multiplier: 1.0,
        perks: ['Welcome bonus']
      },
      {
        program_id: program.id,
        tier_name: 'Silver',
        tier_level: 2,
        min_points: 500,
        max_points: 1499,
        discount_percentage: 5,
        multiplier: 1.2,
        perks: ['5% discount', '20% bonus points']
      },
      {
        program_id: program.id,
        tier_name: 'Gold',
        tier_level: 3,
        min_points: 1500,
        max_points: 2999,
        discount_percentage: 10,
        multiplier: 1.5,
        perks: ['10% discount', '50% bonus points', 'Free delivery']
      },
      {
        program_id: program.id,
        tier_name: 'Platinum',
        tier_level: 4,
        min_points: 3000,
        max_points: null,
        discount_percentage: 15,
        multiplier: 2.0,
        perks: ['15% discount', '100% bonus points', 'Free delivery', 'Priority support']
      }
    ]

    const { error: tiersError } = await supabaseAdmin
      .from('loyalty_tiers')
      .insert(defaultTiers)

    if (tiersError) {
      console.error('Error creating loyalty tiers:', tiersError)
      // Don't fail the program creation if tiers fail
    }

    // Create default loyalty settings
    const { error: settingsError } = await supabaseAdmin
      .from('loyalty_settings')
      .insert({
        restaurant_id,
        birthday_bonus_points: 100,
        referral_bonus_points: 50,
        points_expiry_months: 12,
        send_welcome_email: true,
        send_points_earned_email: true,
        send_tier_upgrade_email: true,
        send_birthday_email: true,
        send_expiry_reminder_email: true,
        show_points_on_receipts: true,
        show_tier_progress: true,
        show_referral_program: true,
        allow_negative_points: false,
        round_points_to_nearest: 1,
      })

    if (settingsError) {
      console.error('Error creating loyalty settings:', settingsError)
      // Don't fail the program creation if settings fail
    }

    return NextResponse.json({
      success: true,
      data: program
    })
  } catch (error) {
    console.error('Error in create loyalty program API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}