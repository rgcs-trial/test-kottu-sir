import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const voteSchema = z.object({
  vote_type: z.enum(['helpful', 'not_helpful']),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/reviews/[id]/vote - Vote on review helpfulness
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    const reviewId = params.id;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
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

    // Verify review exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
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

    let action = 'created';

    if (existingVote) {
      if (existingVote.vote_type === validatedData.vote_type) {
        // Remove vote if same type (toggle off)
        const { error: deleteError } = await supabase
          .from('review_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Vote deletion error:', deleteError);
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          );
        }
        action = 'removed';
      } else {
        // Update vote type (change from helpful to not helpful or vice versa)
        const { error: updateError } = await supabase
          .from('review_votes')
          .update({ 
            vote_type: validatedData.vote_type,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingVote.id);

        if (updateError) {
          console.error('Vote update error:', updateError);
          return NextResponse.json(
            { error: 'Failed to update vote' },
            { status: 500 }
          );
        }
        action = 'updated';
      }
    } else {
      // Create new vote
      const voteData = {
        review_id: reviewId,
        vote_type: validatedData.vote_type,
        user_id: user?.id || null,
        session_id: sessionId || null,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
      };

      const { error: createError } = await supabase
        .from('review_votes')
        .insert(voteData);

      if (createError) {
        console.error('Vote creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create vote' },
          { status: 500 }
        );
      }
    }

    // Get updated vote counts
    const { data: voteCounts } = await supabase
      .from('reviews')
      .select('helpful_votes, not_helpful_votes, total_votes')
      .eq('id', reviewId)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        action,
        vote_type: action === 'removed' ? null : validatedData.vote_type,
        counts: voteCounts || { helpful_votes: 0, not_helpful_votes: 0, total_votes: 0 },
      },
      message: `Vote ${action} successfully`,
    });

  } catch (error) {
    console.error('Vote on review API error:', error);
    
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

// GET /api/reviews/[id]/vote - Get user's vote on this review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    const reviewId = params.id;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const sessionId = request.headers.get('x-session-id');

    if (!user && !sessionId) {
      return NextResponse.json({
        success: true,
        data: { vote_type: null },
      });
    }

    // Check for existing vote
    let voteQuery = supabase
      .from('review_votes')
      .select('vote_type')
      .eq('review_id', reviewId);

    if (user) {
      voteQuery = voteQuery.eq('user_id', user.id);
    } else {
      voteQuery = voteQuery.eq('session_id', sessionId);
    }

    const { data: vote } = await voteQuery.single();

    return NextResponse.json({
      success: true,
      data: {
        vote_type: vote?.vote_type || null,
      },
    });

  } catch (error) {
    console.error('Get vote API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}