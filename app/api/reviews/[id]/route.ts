import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().max(255).optional(),
  content: z.string().min(10).max(2000).optional(),
});

const voteSchema = z.object({
  vote_type: z.enum(['helpful', 'not_helpful']),
});

const reportSchema = z.object({
  reason: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const respondSchema = z.object({
  content: z.string().min(10).max(1000),
});

const moderateSchema = z.object({
  action: z.enum(['approve', 'reject', 'flag']),
  notes: z.string().max(500).optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// Helper function to check if user can moderate
async function checkModeratorPermissions(userId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', userId)
    .single();

  if (!profile) return false;

  return profile.role === 'platform_admin' || 
         (profile.tenant_id === tenantId && 
          ['restaurant_owner', 'restaurant_staff'].includes(profile.role));
}

// Helper function to check if user can respond to reviews
async function checkRespondPermissions(userId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', userId)
    .single();

  if (!profile) return false;

  return profile.tenant_id === tenantId && 
         ['restaurant_owner', 'restaurant_staff'].includes(profile.role);
}

// GET /api/reviews/[id] - Get specific review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const reviewId = params.id;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .select(`
        id,
        tenant_id,
        target_type,
        target_id,
        rating,
        title,
        content,
        reviewer_name,
        is_verified_purchase,
        helpful_votes,
        not_helpful_votes,
        total_votes,
        has_response,
        status,
        created_at,
        updated_at,
        review_photos (
          id,
          photo_url,
          thumbnail_url,
          caption,
          sort_order
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
      `)
      .eq('id', reviewId)
      .is('deleted_at', null)
      .single();

    if (error || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: review,
    });

  } catch (error) {
    console.error('Get review API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/reviews/[id] - Update review
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    const reviewId = params.id;

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = updateReviewSchema.parse(body);

    // Check if user owns the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, tenant_id')
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found or access denied' },
        { status: 404 }
      );
    }

    // Update review
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        ...validatedData,
        status: 'pending', // Reset to pending after edit
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Review update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
    });

  } catch (error) {
    console.error('Update review API error:', error);
    
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

// DELETE /api/reviews/[id] - Delete review
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    const reviewId = params.id;

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Get review details
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, tenant_id')
      .eq('id', reviewId)
      .is('deleted_at', null)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check permissions (owner or moderator)
    const canDelete = review.user_id === user.id || 
                     await checkModeratorPermissions(user.id, review.tenant_id);
    
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Soft delete review
    const { error: deleteError } = await supabase
      .from('reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reviewId);

    if (deleteError) {
      console.error('Review deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });

  } catch (error) {
    console.error('Delete review API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reviews/[id]/vote - Vote on review helpfulness
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    const reviewId = params.id;
    const { pathname } = new URL(request.url);

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Handle different POST actions based on pathname
    if (pathname.endsWith('/vote')) {
      return handleVote(request, reviewId, user);
    } else if (pathname.endsWith('/report')) {
      return handleReport(request, reviewId, user);
    } else if (pathname.endsWith('/respond')) {
      return handleRespond(request, reviewId, user);
    } else if (pathname.endsWith('/moderate')) {
      return handleModerate(request, reviewId, user);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Review action API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle voting on review
async function handleVote(request: NextRequest, reviewId: string, user: any) {
  const supabase = createClient();
  const body = await request.json();
  const validatedData = voteSchema.parse(body);

  // Get session ID for anonymous voting
  const sessionId = request.headers.get('x-session-id');

  if (!user && !sessionId) {
    return NextResponse.json(
      { error: 'Authentication or session required' },
      { status: 401 }
    );
  }

  // Check for existing vote
  let existingVoteQuery = supabase
    .from('review_votes')
    .select('id, vote_type')
    .eq('review_id', reviewId);

  if (user) {
    existingVoteQuery = existingVoteQuery.eq('user_id', user.id);
  } else {
    existingVoteQuery = existingVoteQuery.eq('session_id', sessionId);
  }

  const { data: existingVote } = await existingVoteQuery.single();

  if (existingVote) {
    if (existingVote.vote_type === validatedData.vote_type) {
      // Remove vote if same type
      const { error: deleteError } = await supabase
        .from('review_votes')
        .delete()
        .eq('id', existingVote.id);

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 }
        );
      }
    } else {
      // Update vote type
      const { error: updateError } = await supabase
        .from('review_votes')
        .update({ vote_type: validatedData.vote_type })
        .eq('id', existingVote.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update vote' },
          { status: 500 }
        );
      }
    }
  } else {
    // Create new vote
    const voteData = {
      review_id: reviewId,
      vote_type: validatedData.vote_type,
      user_id: user?.id || null,
      session_id: sessionId || null,
    };

    const { error: createError } = await supabase
      .from('review_votes')
      .insert(voteData);

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create vote' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Vote recorded successfully',
  });
}

// Handle reporting a review
async function handleReport(request: NextRequest, reviewId: string, user: any) {
  const supabase = createClient();
  const body = await request.json();
  const validatedData = reportSchema.parse(body);

  const sessionId = request.headers.get('x-session-id');

  // Create report
  const reportData = {
    review_id: reviewId,
    reporter_id: user?.id || null,
    reason: validatedData.reason,
    description: validatedData.description,
    session_id: sessionId || null,
  };

  const { error: reportError } = await supabase
    .from('review_reports')
    .insert(reportData);

  if (reportError) {
    console.error('Report review error:', reportError);
    return NextResponse.json(
      { error: 'Failed to report review' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Review reported successfully',
  });
}

// Handle responding to a review
async function handleRespond(request: NextRequest, reviewId: string, user: any) {
  const supabase = createClient();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validatedData = respondSchema.parse(body);

  // Get review details and check permissions
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('id, tenant_id')
    .eq('id', reviewId)
    .single();

  if (reviewError || !review) {
    return NextResponse.json(
      { error: 'Review not found' },
      { status: 404 }
    );
  }

  // Check if user can respond
  const canRespond = await checkRespondPermissions(user.id, review.tenant_id);
  if (!canRespond) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // Create response
  const responseData = {
    review_id: reviewId,
    responder_id: user.id,
    content: validatedData.content,
    is_official: true,
  };

  const { error: responseError } = await supabase
    .from('review_responses')
    .insert(responseData);

  if (responseError) {
    console.error('Review response error:', responseError);
    return NextResponse.json(
      { error: 'Failed to create response' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Response created successfully',
  });
}

// Handle moderating a review
async function handleModerate(request: NextRequest, reviewId: string, user: any) {
  const supabase = createClient();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validatedData = moderateSchema.parse(body);

  // Get review details
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('id, tenant_id')
    .eq('id', reviewId)
    .single();

  if (reviewError || !review) {
    return NextResponse.json(
      { error: 'Review not found' },
      { status: 404 }
    );
  }

  // Check moderator permissions
  const canModerate = await checkModeratorPermissions(user.id, review.tenant_id);
  if (!canModerate) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // Update review status
  const status = validatedData.action === 'approve' ? 'approved' : 
                validatedData.action === 'reject' ? 'rejected' : 'flagged';
  
  const { error: updateError } = await supabase
    .from('reviews')
    .update({
      status,
      moderation_notes: validatedData.notes,
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (updateError) {
    console.error('Review moderation error:', updateError);
    return NextResponse.json(
      { error: 'Failed to moderate review' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Review ${validatedData.action}ed successfully`,
  });
}