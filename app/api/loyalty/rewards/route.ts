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

    const { data: rewards, error } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rewards:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rewards' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rewards
    })
  } catch (error) {
    console.error('Error in rewards API:', error)
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
      points_cost,
      reward_type,
      value,
      max_redemptions_per_customer,
      max_total_redemptions,
      valid_from,
      valid_until,
      image_url,
      is_featured
    } = body

    if (!restaurant_id || !name || !points_cost || !reward_type || !value) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: reward, error } = await supabaseAdmin
      .from('rewards')
      .insert({
        restaurant_id,
        name,
        description,
        points_cost,
        reward_type,
        value,
        max_redemptions_per_customer,
        max_total_redemptions,
        valid_from: valid_from || new Date().toISOString(),
        valid_until,
        image_url,
        is_featured: is_featured || false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating reward:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create reward' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: reward
    })
  } catch (error) {
    console.error('Error in create reward API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}