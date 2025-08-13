import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const getReviewsSchema = z.object({
  tenant_id: z.string().uuid(),
  target_type: z.enum(['restaurant', 'menu_item']).optional(),
  target_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'flagged']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sort_by: z.enum(['newest', 'oldest', 'highest_rated', 'lowest_rated', 'most_helpful']).default('newest'),
  rating_filter: z.coerce.number().min(1).max(5).optional(),
  verified_only: z.coerce.boolean().default(false),
  with_photos_only: z.coerce.boolean().default(false),
  with_responses_only: z.coerce.boolean().default(false),
});

const createReviewSchema = z.object({
  target_type: z.enum(['restaurant', 'menu_item']),
  target_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().min(10).max(2000),
  order_id: z.string().uuid().optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

// GET /api/reviews - Fetch reviews with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const params = {
      tenant_id: searchParams.get('tenant_id'),
      target_type: searchParams.get('target_type'),
      target_id: searchParams.get('target_id'),
      status: searchParams.get('status') || 'approved',
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sort_by: searchParams.get('sort_by') || 'newest',
      rating_filter: searchParams.get('rating_filter'),
      verified_only: searchParams.get('verified_only'),
      with_photos_only: searchParams.get('with_photos_only'),
      with_responses_only: searchParams.get('with_responses_only'),
    };

    if (!params.tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

    const validatedParams = getReviewsSchema.parse(params);

    // Build base query
    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        content,
        reviewer_name,
        is_verified_purchase,
        helpful_votes,
        not_helpful_votes,
        total_votes,
        has_response,
        created_at,
        updated_at,
        review_photos (
          id,
          photo_url,
          thumbnail_url,
          caption
        ),
        review_responses (
          id,
          content,
          responder_id,
          is_official,
          created_at,
          profiles:responder_id (
            first_name,
            last_name
          )
        )
      `, { count: 'exact' })
      .eq('tenant_id', validatedParams.tenant_id)
      .eq('status', validatedParams.status)
      .is('deleted_at', null);

    // Apply filters
    if (validatedParams.target_type) {
      query = query.eq('target_type', validatedParams.target_type);
    }

    if (validatedParams.target_id) {
      query = query.eq('target_id', validatedParams.target_id);
    }

    if (validatedParams.rating_filter) {
      query = query.eq('rating', validatedParams.rating_filter);
    }

    if (validatedParams.verified_only) {
      query = query.eq('is_verified_purchase', true);
    }

    if (validatedParams.with_responses_only) {
      query = query.eq('has_response', true);
    }

    // Note: with_photos_only filter would need a more complex query
    // This is a simplified version

    // Apply sorting
    switch (validatedParams.sort_by) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'highest_rated':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest_rated':
        query = query.order('rating', { ascending: true });
        break;
      case 'most_helpful':
        query = query.order('helpful_votes', { ascending: false });
        break;
    }

    // Apply pagination
    const from = (validatedParams.page - 1) * validatedParams.limit;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPreviousPage = validatedParams.page > 1;

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews || [],
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total: count || 0,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });

  } catch (error) {
    console.error('Get reviews API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    // Parse request body
    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);

    // Get tenant information
    let tenant_id: string;
    if (validatedData.target_type === 'restaurant') {
      tenant_id = validatedData.target_id;
    } else {
      // Get tenant_id from menu item
      const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .select('tenant_id')
        .eq('id', validatedData.target_id)
        .single();

      if (menuError || !menuItem) {
        return NextResponse.json(
          { error: 'Invalid menu item' },
          { status: 400 }
        );
      }
      tenant_id = menuItem.tenant_id;
    }

    // Check if user has already reviewed this target (if authenticated)
    if (user) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_type', validatedData.target_type)
        .eq('target_id', validatedData.target_id)
        .eq('tenant_id', tenant_id)
        .is('deleted_at', null)
        .single();

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this item' },
          { status: 409 }
        );
      }
    }

    // Verify order if provided
    let is_verified_purchase = false;
    if (validatedData.order_id && user) {
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('id', validatedData.order_id)
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .eq('status', 'delivered')
        .single();

      is_verified_purchase = !!order;
    }

    // Create review
    const reviewData = {
      tenant_id,
      user_id: user?.id || null,
      target_type: validatedData.target_type,
      target_id: validatedData.target_id,
      rating: validatedData.rating,
      title: validatedData.title,
      content: validatedData.content,
      order_id: validatedData.order_id,
      is_verified_purchase,
      reviewer_name: user?.user_metadata?.full_name || 'Anonymous',
      reviewer_email: user?.email,
      status: 'pending', // All reviews start as pending
    };

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select('id')
      .single();

    if (reviewError) {
      console.error('Review creation error:', reviewError);
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      );
    }

    // Handle photo uploads if any
    if (validatedData.photos && validatedData.photos.length > 0) {
      const photoPromises = validatedData.photos.map((photoUrl, index) => 
        supabase
          .from('review_photos')
          .insert({
            review_id: review.id,
            photo_url: photoUrl,
            sort_order: index,
          })
      );

      await Promise.all(photoPromises);
    }

    return NextResponse.json({
      success: true,
      data: { id: review.id },
    });

  } catch (error) {
    console.error('Create review API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/reviews - Update review (would need review ID in the route)
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use /api/reviews/[id] for updates' },
    { status: 405 }
  );
}

// DELETE /api/reviews - Delete review (would need review ID in the route)
export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use /api/reviews/[id] for deletion' },
    { status: 405 }
  );
}