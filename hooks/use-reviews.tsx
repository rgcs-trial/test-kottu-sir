'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface ReviewPhoto {
  id: string;
  photo_url: string;
  thumbnail_url?: string;
  caption?: string;
}

interface ReviewResponse {
  id: string;
  content: string;
  responder_name: string;
  is_official: boolean;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  is_verified_purchase: boolean;
  helpful_votes: number;
  not_helpful_votes: number;
  total_votes: number;
  has_response: boolean;
  created_at: string;
  photos?: ReviewPhoto[];
  responses?: ReviewResponse[];
}

interface ReviewsState {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}

interface ReviewFilters {
  rating?: number;
  verified_only?: boolean;
  with_photos_only?: boolean;
  with_responses_only?: boolean;
  sort_by?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most_helpful';
}

interface UseReviewsOptions {
  tenant_id: string;
  target_type?: 'restaurant' | 'menu_item';
  target_id?: string;
  initialFilters?: ReviewFilters;
  pageSize?: number;
  autoFetch?: boolean;
}

// Generate a session ID for anonymous users
const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('reviews_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('reviews_session_id', sessionId);
  }
  return sessionId;
};

export function useReviews(options: UseReviewsOptions) {
  const {
    tenant_id,
    target_type,
    target_id,
    initialFilters = {},
    pageSize = 10,
    autoFetch = true,
  } = options;

  const router = useRouter();
  const [state, setState] = useState<ReviewsState>({
    reviews: [],
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
    currentPage: 1,
  });

  const [filters, setFilters] = useState<ReviewFilters>(initialFilters);
  const [sessionId] = useState(() => getSessionId());

  // Fetch reviews from API
  const fetchReviews = useCallback(async (
    page: number = 1,
    reset: boolean = false
  ) => {
    if (state.loading && !reset) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        tenant_id,
        page: page.toString(),
        limit: pageSize.toString(),
        ...(target_type && { target_type }),
        ...(target_id && { target_id }),
        ...(filters.rating && { rating_filter: filters.rating.toString() }),
        ...(filters.verified_only && { verified_only: 'true' }),
        ...(filters.with_photos_only && { with_photos_only: 'true' }),
        ...(filters.with_responses_only && { with_responses_only: 'true' }),
        ...(filters.sort_by && { sort_by: filters.sort_by }),
      });

      const response = await fetch(`/api/reviews?${params}`, {
        headers: {
          'x-session-id': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          reviews: reset ? result.data.reviews : [...prev.reviews, ...result.data.reviews],
          totalCount: result.data.pagination.total,
          currentPage: page,
          hasMore: result.data.pagination.hasNextPage,
          loading: false,
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch reviews');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
        loading: false,
      }));
    }
  }, [tenant_id, target_type, target_id, filters, pageSize, sessionId, state.loading]);

  // Load more reviews (pagination)
  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading) return;
    fetchReviews(state.currentPage + 1, false);
  }, [fetchReviews, state.hasMore, state.loading, state.currentPage]);

  // Refresh reviews (reset and fetch first page)
  const refresh = useCallback(() => {
    fetchReviews(1, true);
  }, [fetchReviews]);

  // Update filters and refetch
  const updateFilters = useCallback((newFilters: Partial<ReviewFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Vote on a review
  const voteOnReview = useCallback(async (
    reviewId: string, 
    voteType: 'helpful' | 'not_helpful'
  ) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ vote_type: voteType }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote on review');
      }

      const result = await response.json();

      if (result.success) {
        // Update local state with new vote counts
        setState(prev => ({
          ...prev,
          reviews: prev.reviews.map(review =>
            review.id === reviewId
              ? {
                  ...review,
                  helpful_votes: result.data.counts.helpful_votes,
                  not_helpful_votes: result.data.counts.not_helpful_votes,
                  total_votes: result.data.counts.total_votes,
                }
              : review
          ),
        }));
      } else {
        throw new Error(result.error || 'Failed to vote on review');
      }
    } catch (error) {
      throw error;
    }
  }, [sessionId]);

  // Report a review
  const reportReview = useCallback(async (
    reviewId: string,
    reason: string,
    description?: string
  ) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ reason, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to report review');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to report review');
      }
    } catch (error) {
      throw error;
    }
  }, [sessionId]);

  // Respond to a review (restaurant owner/staff)
  const respondToReview = useCallback(async (
    reviewId: string,
    content: string
  ) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to respond to review');
      }

      const result = await response.json();

      if (result.success) {
        // Update local state to include the new response
        setState(prev => ({
          ...prev,
          reviews: prev.reviews.map(review =>
            review.id === reviewId
              ? {
                  ...review,
                  has_response: true,
                  responses: [
                    ...(review.responses || []),
                    result.data,
                  ],
                }
              : review
          ),
        }));
      } else {
        throw new Error(result.error || 'Failed to respond to review');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  // Submit a new review
  const submitReview = useCallback(async (reviewData: {
    target_type: 'restaurant' | 'menu_item';
    target_id: string;
    rating: number;
    title?: string;
    content: string;
    order_id?: string;
    photos?: string[];
  }) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const result = await response.json();

      if (result.success) {
        // Refresh reviews to include the new one (if approved)
        refresh();
        return result.data.id;
      } else {
        throw new Error(result.error || 'Failed to submit review');
      }
    } catch (error) {
      throw error;
    }
  }, [refresh]);

  // Delete a review
  const deleteReview = useCallback(async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      const result = await response.json();

      if (result.success) {
        // Remove from local state
        setState(prev => ({
          ...prev,
          reviews: prev.reviews.filter(review => review.id !== reviewId),
          totalCount: prev.totalCount - 1,
        }));
      } else {
        throw new Error(result.error || 'Failed to delete review');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch && tenant_id) {
      fetchReviews(1, true);
    }
  }, [autoFetch, tenant_id, fetchReviews]);

  // Memoized computed values
  const averageRating = useMemo(() => {
    if (state.reviews.length === 0) return 0;
    const total = state.reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / state.reviews.length;
  }, [state.reviews]);

  const ratingDistribution = useMemo(() => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    state.reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  }, [state.reviews]);

  const verifiedReviewsCount = useMemo(() => {
    return state.reviews.filter(review => review.is_verified_purchase).length;
  }, [state.reviews]);

  const reviewsWithPhotosCount = useMemo(() => {
    return state.reviews.filter(review => review.photos && review.photos.length > 0).length;
  }, [state.reviews]);

  return {
    // State
    reviews: state.reviews,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    totalCount: state.totalCount,
    currentPage: state.currentPage,

    // Computed values
    averageRating,
    ratingDistribution,
    verifiedReviewsCount,
    reviewsWithPhotosCount,

    // Filters
    filters,
    updateFilters,

    // Actions
    loadMore,
    refresh,
    voteOnReview,
    reportReview,
    respondToReview,
    submitReview,
    deleteReview,

    // Utilities
    sessionId,
  };
}

// Hook for review aggregations (summary data)
export function useReviewSummary(tenant_id: string, target_type?: string, target_id?: string) {
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    verifiedReviews: 0,
    reviewsWithPhotos: 0,
    recentReviews: 0,
    loading: true,
    error: null as string | null,
  });

  const fetchSummary = useCallback(async () => {
    try {
      setSummary(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams({
        tenant_id,
        limit: '0', // Only fetch summary, no reviews
        ...(target_type && { target_type }),
        ...(target_id && { target_id }),
      });

      const response = await fetch(`/api/reviews?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch review summary');
      }

      const result = await response.json();

      if (result.success) {
        // Calculate summary from the pagination metadata and any other data
        const { total } = result.data.pagination;
        
        // For now, using basic calculation
        // In a real implementation, you might have a dedicated aggregations endpoint
        setSummary(prev => ({
          ...prev,
          totalReviews: total,
          loading: false,
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch review summary');
      }
    } catch (error) {
      setSummary(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch summary',
        loading: false,
      }));
    }
  }, [tenant_id, target_type, target_id]);

  useEffect(() => {
    if (tenant_id) {
      fetchSummary();
    }
  }, [fetchSummary]);

  return {
    ...summary,
    refresh: fetchSummary,
  };
}

// Hook for individual review management
export function useReview(reviewId: string) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    if (!reviewId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${reviewId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch review');
      }

      const result = await response.json();

      if (result.success) {
        setReview(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch review');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch review');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  return {
    review,
    loading,
    error,
    refresh: fetchReview,
  };
}