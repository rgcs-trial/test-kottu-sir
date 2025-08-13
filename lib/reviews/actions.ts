'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

// Validation schemas
const createReviewSchema = z.object({
  target_type: z.enum(['restaurant', 'menu_item']),
  target_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(10).max(2000),
  order_id: z.string().uuid().optional(),
  reviewer_name: z.string().optional(),
  reviewer_email: z.string().email().optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().optional(),
  content: z.string().min(10).max(2000).optional(),
});

const voteReviewSchema = z.object({
  review_id: z.string().uuid(),
  vote_type: z.enum(['helpful', 'not_helpful']),
});

const reportReviewSchema = z.object({
  review_id: z.string().uuid(),
  reason: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const respondToReviewSchema = z.object({
  review_id: z.string().uuid(),
  content: z.string().min(10).max(1000),
});

// Error types
export type ReviewActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Create a new review
export async function createReview(
  formData: FormData
): Promise<ReviewActionResult<{ id: string }>> {
  try {
    const supabase = createClient();
    
    // Parse form data
    const data = {
      target_type: formData.get('target_type') as string,
      target_id: formData.get('target_id') as string,
      rating: parseInt(formData.get('rating') as string),
      title: formData.get('title') as string || undefined,
      content: formData.get('content') as string,
      order_id: formData.get('order_id') as string || undefined,
      reviewer_name: formData.get('reviewer_name') as string || undefined,
      reviewer_email: formData.get('reviewer_email') as string || undefined,
    };

    // Validate input
    const validatedData = createReviewSchema.parse(data);

    // Get current user (if authenticated)
    const user = await getCurrentUser();
    
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
        return { success: false, error: 'Invalid menu item' };
      }
      tenant_id = menuItem.tenant_id;
    }

    // Check if user has already reviewed this target
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
        return { success: false, error: 'You have already reviewed this item' };
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
      reviewer_name: user?.user_metadata?.full_name || validatedData.reviewer_name,
      reviewer_email: user?.email || validatedData.reviewer_email,
      status: 'pending', // All reviews start as pending
    };

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select('id')
      .single();

    if (reviewError) {
      console.error('Review creation error:', reviewError);
      return { success: false, error: 'Failed to create review' };
    }

    // Handle photo uploads if any
    const photos = formData.getAll('photos') as File[];
    if (photos.length > 0) {
      await handlePhotoUploads(review.id, photos);
    }

    // Revalidate relevant pages
    revalidatePath(`/[subdomain]`, 'page');
    revalidatePath(`/[subdomain]/reviews`, 'page');
    
    return { success: true, data: { id: review.id } };

  } catch (error) {
    console.error('Create review error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: 'Failed to create review' };
  }
}

// Update an existing review
export async function updateReview(
  reviewId: string,
  data: z.infer<typeof updateReviewSchema>
): Promise<ReviewActionResult> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    // Validate input
    const validatedData = updateReviewSchema.parse(data);

    // Check if user owns the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (reviewError || !review) {
      return { success: false, error: 'Review not found or access denied' };
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
      return { success: false, error: 'Failed to update review' };
    }

    // Revalidate relevant pages
    revalidatePath(`/[subdomain]`, 'page');
    revalidatePath(`/[subdomain]/reviews`, 'page');

    return { success: true };

  } catch (error) {
    console.error('Update review error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: 'Failed to update review' };
  }
}

// Delete a review (soft delete)
export async function deleteReview(reviewId: string): Promise<ReviewActionResult> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if user owns the review or has admin permissions
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, tenant_id')
      .eq('id', reviewId)
      .is('deleted_at', null)
      .single();

    if (reviewError || !review) {
      return { success: false, error: 'Review not found' };
    }

    // Check permissions
    const canDelete = review.user_id === user.id || await checkModeratorPermissions(user.id, review.tenant_id);
    
    if (!canDelete) {
      return { success: false, error: 'Access denied' };
    }

    // Soft delete review
    const { error: deleteError } = await supabase
      .from('reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reviewId);

    if (deleteError) {
      console.error('Review deletion error:', deleteError);
      return { success: false, error: 'Failed to delete review' };
    }

    // Revalidate relevant pages
    revalidatePath(`/[subdomain]`, 'page');
    revalidatePath(`/[subdomain]/reviews`, 'page');

    return { success: true };

  } catch (error) {
    console.error('Delete review error:', error);
    return { success: false, error: 'Failed to delete review' };
  }
}

// Vote on review helpfulness
export async function voteOnReview(
  data: z.infer<typeof voteReviewSchema>,
  sessionId?: string
): Promise<ReviewActionResult> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    // Validate input
    const validatedData = voteReviewSchema.parse(data);

    if (!user && !sessionId) {
      return { success: false, error: 'Authentication or session required' };
    }

    // Check for existing vote
    let existingVoteQuery = supabase
      .from('review_votes')
      .select('id, vote_type')
      .eq('review_id', validatedData.review_id);

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
          return { success: false, error: 'Failed to remove vote' };
        }
      } else {
        // Update vote type
        const { error: updateError } = await supabase
          .from('review_votes')
          .update({ vote_type: validatedData.vote_type })
          .eq('id', existingVote.id);

        if (updateError) {
          return { success: false, error: 'Failed to update vote' };
        }
      }
    } else {
      // Create new vote
      const voteData = {
        review_id: validatedData.review_id,
        vote_type: validatedData.vote_type,
        user_id: user?.id || null,
        session_id: sessionId || null,
      };

      const { error: createError } = await supabase
        .from('review_votes')
        .insert(voteData);

      if (createError) {
        return { success: false, error: 'Failed to create vote' };
      }
    }

    // Revalidate relevant pages
    revalidatePath(`/[subdomain]`, 'page');
    revalidatePath(`/[subdomain]/reviews`, 'page');

    return { success: true };

  } catch (error) {
    console.error('Vote on review error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: 'Failed to vote on review' };
  }
}

// Report a review
export async function reportReview(
  data: z.infer<typeof reportReviewSchema>,
  sessionId?: string
): Promise<ReviewActionResult> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    // Validate input
    const validatedData = reportReviewSchema.parse(data);

    // Create report
    const reportData = {
      review_id: validatedData.review_id,
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
      return { success: false, error: 'Failed to report review' };
    }

    return { success: true };

  } catch (error) {
    console.error('Report review error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: 'Failed to report review' };
  }
}

// Respond to a review (restaurant owner)
export async function respondToReview(
  data: z.infer<typeof respondToReviewSchema>
): Promise<ReviewActionResult> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    // Validate input
    const validatedData = respondToReviewSchema.parse(data);

    // Get review details and check permissions
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, tenant_id')
      .eq('id', validatedData.review_id)
      .single();

    if (reviewError || !review) {
      return { success: false, error: 'Review not found' };
    }

    // Check if user can respond (restaurant owner/staff)
    const canRespond = await checkRespondPermissions(user.id, review.tenant_id);
    if (!canRespond) {
      return { success: false, error: 'Access denied' };
    }

    // Create response
    const responseData = {
      review_id: validatedData.review_id,
      responder_id: user.id,
      content: validatedData.content,
      is_official: true,
    };

    const { error: responseError } = await supabase
      .from('review_responses')
      .insert(responseData);

    if (responseError) {
      console.error('Review response error:', responseError);
      return { success: false, error: 'Failed to create response' };
    }

    // Revalidate relevant pages
    revalidatePath(`/[subdomain]`, 'page');
    revalidatePath(`/[subdomain]/reviews`, 'page');

    return { success: true };

  } catch (error) {
    console.error('Respond to review error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: 'Failed to respond to review' };
  }
}

// Moderate a review (admin action)
export async function moderateReview(
  reviewId: string,
  action: 'approve' | 'reject' | 'flag',
  notes?: string
): Promise<ReviewActionResult> {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get review details
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, tenant_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return { success: false, error: 'Review not found' };
    }

    // Check moderator permissions
    const canModerate = await checkModeratorPermissions(user.id, review.tenant_id);
    if (!canModerate) {
      return { success: false, error: 'Access denied' };
    }

    // Update review status
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged';
    
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        status,
        moderation_notes: notes,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Review moderation error:', updateError);
      return { success: false, error: 'Failed to moderate review' };
    }

    // Revalidate relevant pages
    revalidatePath(`/[subdomain]`, 'page');
    revalidatePath(`/[subdomain]/reviews`, 'page');
    revalidatePath('/admin/reviews', 'page');

    return { success: true };

  } catch (error) {
    console.error('Moderate review error:', error);
    return { success: false, error: 'Failed to moderate review' };
  }
}

// Helper functions
async function handlePhotoUploads(reviewId: string, photos: File[]): Promise<void> {
  const supabase = createClient();
  
  // In a real implementation, you would upload to a storage service
  // For now, we'll simulate photo metadata storage
  const photoPromises = photos.map(async (photo, index) => {
    // Generate a simulated URL (in production, upload to cloud storage)
    const photo_url = `/uploads/reviews/${reviewId}/${photo.name}`;
    
    return supabase
      .from('review_photos')
      .insert({
        review_id: reviewId,
        photo_url,
        file_size: photo.size,
        mime_type: photo.type,
        sort_order: index,
      });
  });

  await Promise.all(photoPromises);
}

async function checkModeratorPermissions(userId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', userId)
    .single();

  if (!profile) return false;

  // Platform admin or restaurant owner/staff for the specific tenant
  return profile.role === 'platform_admin' || 
         (profile.tenant_id === tenantId && 
          ['restaurant_owner', 'restaurant_staff'].includes(profile.role));
}

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

// Get reviews with filters and pagination
export async function getReviews(params: {
  tenant_id: string;
  target_type?: 'restaurant' | 'menu_item';
  target_id?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';
  page?: number;
  limit?: number;
  sort_by?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most_helpful';
  filters?: string[];
}) {
  try {
    const supabase = createClient();
    const { 
      tenant_id, 
      target_type, 
      target_id, 
      status = 'approved',
      page = 1, 
      limit = 10,
      sort_by = 'newest',
      filters = []
    } = params;

    let query = supabase
      .from('reviews')
      .select(`
        *,
        review_photos (*),
        review_responses (*)
      `)
      .eq('tenant_id', tenant_id)
      .eq('status', status)
      .is('deleted_at', null);

    // Apply filters
    if (target_type) {
      query = query.eq('target_type', target_type);
    }
    
    if (target_id) {
      query = query.eq('target_id', target_id);
    }

    // Apply additional filters
    filters.forEach(filter => {
      switch (filter) {
        case 'verified':
          query = query.eq('is_verified_purchase', true);
          break;
        case 'with_photos':
          // This would need a more complex query in practice
          break;
      }
    });

    // Apply sorting
    switch (sort_by) {
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
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error('Get reviews error:', error);
      return { success: false, error: 'Failed to fetch reviews' };
    }

    return {
      success: true,
      data: {
        reviews: reviews || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

  } catch (error) {
    console.error('Get reviews error:', error);
    return { success: false, error: 'Failed to fetch reviews' };
  }
}