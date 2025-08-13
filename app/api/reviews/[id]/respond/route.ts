import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const respondSchema = z.object({
  content: z.string().min(10, 'Response must be at least 10 characters').max(1000, 'Response must be less than 1000 characters'),
});

interface RouteParams {
  params: {
    id: string;
  };
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

  // Restaurant owner/staff for the specific tenant
  return profile.tenant_id === tenantId && 
         ['restaurant_owner', 'restaurant_staff'].includes(profile.role);
}

// POST /api/reviews/[id]/respond - Create a response to a review
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const validatedData = respondSchema.parse(body);

    // Get review details and check permissions
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, tenant_id, status')
      .eq('id', reviewId)
      .is('deleted_at', null)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Only allow responses to approved reviews
    if (review.status !== 'approved') {
      return NextResponse.json(
        { error: 'Can only respond to approved reviews' },
        { status: 400 }
      );
    }

    // Check if user can respond (restaurant owner/staff)
    const canRespond = await checkRespondPermissions(user.id, review.tenant_id);
    if (!canRespond) {
      return NextResponse.json(
        { error: 'Access denied. Only restaurant staff can respond to reviews.' },
        { status: 403 }
      );
    }

    // Check if user has already responded to this review
    const { data: existingResponse } = await supabase
      .from('review_responses')
      .select('id')
      .eq('review_id', reviewId)
      .eq('responder_id', user.id)
      .is('deleted_at', null)
      .single();

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already responded to this review' },
        { status: 409 }
      );
    }

    // Get responder name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const responderName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Restaurant Staff'
      : 'Restaurant Staff';

    // Create response
    const responseData = {
      review_id: reviewId,
      responder_id: user.id,
      content: validatedData.content,
      is_official: true,
      status: 'approved', // Restaurant responses are auto-approved
    };

    const { data: response, error: responseError } = await supabase
      .from('review_responses')
      .insert(responseData)
      .select(`
        id,
        content,
        is_official,
        created_at
      `)
      .single();

    if (responseError) {
      console.error('Review response creation error:', responseError);
      return NextResponse.json(
        { error: 'Failed to create response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...response,
        responder_name: responderName,
      },
      message: 'Response created successfully',
    });

  } catch (error) {
    console.error('Respond to review API error:', error);
    
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

// GET /api/reviews/[id]/respond - Get responses for a review
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

    // Get all responses for this review
    const { data: responses, error } = await supabase
      .from('review_responses')
      .select(`
        id,
        content,
        is_official,
        created_at,
        profiles:responder_id (
          first_name,
          last_name
        )
      `)
      .eq('review_id', reviewId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get review responses error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      );
    }

    // Format responses with responder names
    const formattedResponses = responses?.map(response => ({
      id: response.id,
      content: response.content,
      is_official: response.is_official,
      created_at: response.created_at,
      responder_name: response.profiles 
        ? `${response.profiles.first_name || ''} ${response.profiles.last_name || ''}`.trim() || 'Restaurant Staff'
        : 'Restaurant Staff',
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedResponses,
    });

  } catch (error) {
    console.error('Get review responses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/reviews/[id]/respond - Update a response (if user owns it)
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
    const { response_id, ...updateData } = body;
    const validatedData = respondSchema.parse(updateData);

    if (!response_id) {
      return NextResponse.json(
        { error: 'Response ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the response
    const { data: response, error: responseError } = await supabase
      .from('review_responses')
      .select('id, responder_id')
      .eq('id', response_id)
      .eq('review_id', reviewId)
      .eq('responder_id', user.id)
      .is('deleted_at', null)
      .single();

    if (responseError || !response) {
      return NextResponse.json(
        { error: 'Response not found or access denied' },
        { status: 404 }
      );
    }

    // Update response
    const { error: updateError } = await supabase
      .from('review_responses')
      .update({
        content: validatedData.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', response_id);

    if (updateError) {
      console.error('Response update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Response updated successfully',
    });

  } catch (error) {
    console.error('Update response API error:', error);
    
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

// DELETE /api/reviews/[id]/respond - Delete a response
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

    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('response_id');

    if (!responseId) {
      return NextResponse.json(
        { error: 'Response ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the response
    const { data: response, error: responseError } = await supabase
      .from('review_responses')
      .select('id, responder_id')
      .eq('id', responseId)
      .eq('review_id', reviewId)
      .eq('responder_id', user.id)
      .is('deleted_at', null)
      .single();

    if (responseError || !response) {
      return NextResponse.json(
        { error: 'Response not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete response
    const { error: deleteError } = await supabase
      .from('review_responses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', responseId);

    if (deleteError) {
      console.error('Response deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Response deleted successfully',
    });

  } catch (error) {
    console.error('Delete response API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}