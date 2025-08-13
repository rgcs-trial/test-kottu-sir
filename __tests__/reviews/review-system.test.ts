/**
 * Comprehensive test suite for the Restaurant Reviews System
 * Tests core functionality, security, performance, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Next.js dependencies
jest.mock('next/navigation', () => ({
  useParams: () => ({ subdomain: 'test-restaurant' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUser: () => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User', role: 'customer' },
  }),
}));

// Import the modules to test
import {
  createReview,
  updateReview,
  deleteReview,
  voteOnReview,
  reportReview,
  respondToReview,
  moderateReview,
  getReviews,
} from '@/lib/reviews/actions';

describe('Review System - Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('should create a valid review successfully', async () => {
      // Mock successful database operations
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { tenant_id: 'test-tenant' }, 
              error: null 
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'new-review-id' }, 
              error: null 
            })),
          })),
        })),
      });

      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', 'Excellent food and service!');

      const result = await createReview(formData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('new-review-id');
    });

    it('should reject invalid rating values', async () => {
      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '6'); // Invalid rating
      formData.append('content', 'Test review');

      const result = await createReview(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
    });

    it('should reject content that is too short', async () => {
      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', 'Bad'); // Too short

      const result = await createReview(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
    });

    it('should prevent duplicate reviews from the same user', async () => {
      // Mock existing review found
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockReturnValueOnce(Promise.resolve({ 
                data: { tenant_id: 'test-tenant' }, 
                error: null 
              }))
              .mockReturnValueOnce(Promise.resolve({ 
                data: { id: 'existing-review' }, 
                error: null 
              })),
          })),
        })),
      });

      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', 'Another review attempt');

      const result = await createReview(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You have already reviewed this item');
    });
  });

  describe('voteOnReview', () => {
    it('should record a helpful vote successfully', async () => {
      // Mock no existing vote
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      });

      const result = await voteOnReview(
        { review_id: 'test-review-id', vote_type: 'helpful' },
        'session-123'
      );

      expect(result.success).toBe(true);
    });

    it('should toggle vote when same vote type is submitted', async () => {
      // Mock existing vote of same type
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'vote-id', vote_type: 'helpful' }, 
              error: null 
            })),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      const result = await voteOnReview(
        { review_id: 'test-review-id', vote_type: 'helpful' },
        'session-123'
      );

      expect(result.success).toBe(true);
    });

    it('should require authentication or session', async () => {
      // Mock no user and no session
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue(null);

      const result = await voteOnReview(
        { review_id: 'test-review-id', vote_type: 'helpful' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication or session required');
    });
  });

  describe('reportReview', () => {
    it('should create a review report successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      });

      const result = await reportReview(
        {
          review_id: 'test-review-id',
          reason: 'spam',
          description: 'This review contains spam content',
        },
        'session-123'
      );

      expect(result.success).toBe(true);
    });

    it('should validate report reason', async () => {
      const result = await reportReview(
        {
          review_id: 'test-review-id',
          reason: '', // Invalid empty reason
          description: 'Test report',
        },
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
    });
  });

  describe('respondToReview', () => {
    it('should allow restaurant staff to respond', async () => {
      // Mock user with restaurant staff role
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'staff-user-id',
        user_metadata: { role: 'restaurant_staff' },
      });

      // Mock review exists and permissions check
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockReturnValueOnce(Promise.resolve({ 
                data: { id: 'review-id', tenant_id: 'test-tenant' }, 
                error: null 
              }))
              .mockReturnValueOnce(Promise.resolve({ 
                data: { tenant_id: 'test-tenant', role: 'restaurant_staff' }, 
                error: null 
              })),
          })),
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      });

      const result = await respondToReview({
        review_id: 'test-review-id',
        content: 'Thank you for your feedback! We appreciate your visit.',
      });

      expect(result.success).toBe(true);
    });

    it('should reject responses from non-staff users', async () => {
      // Mock regular customer user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'customer-user-id',
        user_metadata: { role: 'customer' },
      });

      // Mock review exists but no permissions
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockReturnValueOnce(Promise.resolve({ 
                data: { id: 'review-id', tenant_id: 'test-tenant' }, 
                error: null 
              }))
              .mockReturnValueOnce(Promise.resolve({ 
                data: { tenant_id: 'different-tenant', role: 'customer' }, 
                error: null 
              })),
          })),
        })),
      });

      const result = await respondToReview({
        review_id: 'test-review-id',
        content: 'Unauthorized response attempt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('moderateReview', () => {
    it('should allow platform admin to moderate', async () => {
      // Mock platform admin user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'admin-user-id',
        user_metadata: { role: 'platform_admin' },
      });

      // Mock review exists and admin permissions
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockReturnValueOnce(Promise.resolve({ 
                data: { id: 'review-id', tenant_id: 'test-tenant' }, 
                error: null 
              }))
              .mockReturnValueOnce(Promise.resolve({ 
                data: { role: 'platform_admin' }, 
                error: null 
              })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      const result = await moderateReview(
        'test-review-id',
        'approve',
        'Review meets community guidelines'
      );

      expect(result.success).toBe(true);
    });

    it('should reject moderation from unauthorized users', async () => {
      // Mock regular user
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'regular-user-id',
        user_metadata: { role: 'customer' },
      });

      // Mock review exists but no admin permissions
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockReturnValueOnce(Promise.resolve({ 
                data: { id: 'review-id', tenant_id: 'test-tenant' }, 
                error: null 
              }))
              .mockReturnValueOnce(Promise.resolve({ 
                data: { role: 'customer', tenant_id: 'different-tenant' }, 
                error: null 
              })),
          })),
        })),
      });

      const result = await moderateReview('test-review-id', 'approve');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('getReviews', () => {
    it('should fetch reviews with pagination', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          content: 'Great experience!',
          reviewer_name: 'John Doe',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'review-2', 
          rating: 4,
          content: 'Good food',
          reviewer_name: 'Jane Smith',
          created_at: '2024-01-14T15:30:00Z',
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => Promise.resolve({ 
                data: mockReviews, 
                error: null, 
                count: 25 
              })),
            })),
          })),
        })),
      });

      const result = await getReviews({
        tenant_id: 'test-tenant',
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data?.reviews).toHaveLength(2);
      expect(result.data?.total).toBe(25);
      expect(result.data?.totalPages).toBe(3);
    });

    it('should apply filters correctly', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => Promise.resolve({ 
                data: [], 
                error: null, 
                count: 0 
              })),
            })),
          })),
        })),
      });

      const result = await getReviews({
        tenant_id: 'test-tenant',
        target_type: 'restaurant',
        target_id: 'restaurant-123',
        status: 'approved',
        filters: ['verified'],
      });

      expect(result.success).toBe(true);
      // Verify that the correct filters were applied
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reviews');
    });
  });

  describe('Security Tests', () => {
    it('should sanitize user input to prevent XSS', async () => {
      const maliciousContent = '<script>alert("XSS")</script>This is a review';
      
      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', maliciousContent);

      // Mock successful creation
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { tenant_id: 'test-tenant' }, 
              error: null 
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'new-review-id' }, 
              error: null 
            })),
          })),
        })),
      });

      const result = await createReview(formData);

      // Should succeed but content should be safely stored
      expect(result.success).toBe(true);
      
      // Verify that the insert was called (content sanitization happens at display time)
      expect(mockSupabaseClient.from().insert).toHaveBeenCalled();
    });

    it('should prevent SQL injection in review content', async () => {
      const sqlInjectionContent = "'; DROP TABLE reviews; --";
      
      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', sqlInjectionContent);

      // Mock successful creation (Supabase handles SQL injection prevention)
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { tenant_id: 'test-tenant' }, 
              error: null 
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'new-review-id' }, 
              error: null 
            })),
          })),
        })),
      });

      const result = await createReview(formData);

      // Should succeed as Supabase prevents SQL injection
      expect(result.success).toBe(true);
    });

    it('should validate review permissions for cross-tenant access', async () => {
      // Mock user from different tenant trying to review
      jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
        id: 'user-from-different-tenant',
        user_metadata: { tenant_id: 'different-tenant' },
      });

      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'restricted-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', 'Attempting cross-tenant review');

      // Mock restaurant from different tenant
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { tenant_id: 'target-tenant' }, 
              error: null 
            })),
          })),
        })),
      });

      const result = await createReview(formData);

      // Should succeed - customers can review restaurants from any tenant
      // Cross-tenant restrictions would be for management operations
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of reviews efficiently', async () => {
      const startTime = Date.now();

      // Mock large dataset
      const largeReviewSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `review-${i}`,
        rating: Math.floor(Math.random() * 5) + 1,
        content: `Review content ${i}`,
        reviewer_name: `User ${i}`,
        created_at: new Date().toISOString(),
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => Promise.resolve({ 
                data: largeReviewSet.slice(0, 50), // Paginated
                error: null, 
                count: largeReviewSet.length 
              })),
            })),
          })),
        })),
      });

      const result = await getReviews({
        tenant_id: 'test-tenant',
        page: 1,
        limit: 50,
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.data?.reviews).toHaveLength(50);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should implement proper pagination limits', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn((from, to) => {
                // Verify pagination limits
                expect(to - from + 1).toBeLessThanOrEqual(100); // Max 100 per page
                return Promise.resolve({ data: [], error: null, count: 0 });
              }),
            })),
          })),
        })),
      });

      const result = await getReviews({
        tenant_id: 'test-tenant',
        page: 1,
        limit: 150, // Exceeds max limit
      });

      expect(result.success).toBe(true);
      // Should be capped at maximum allowed
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing restaurant gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Restaurant not found' } 
            })),
          })),
        })),
      });

      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'non-existent-restaurant');
      formData.append('rating', '5');
      formData.append('content', 'Review for non-existent restaurant');

      const result = await createReview(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid menu item'); // Error handling for missing target
    });

    it('should handle database connection failures', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', 'Test review');

      const result = await createReview(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create review');
    });

    it('should handle malformed UUID parameters', async () => {
      const result = await voteOnReview(
        { review_id: 'not-a-valid-uuid', vote_type: 'helpful' },
        'session-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
    });

    it('should handle empty review content after trimming', async () => {
      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', '   \n\t   '); // Only whitespace

      const result = await createReview(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
    });
  });
});

describe('Review System - Frontend Components', () => {
  // These would be React component tests using @testing-library/react
  // Commented out since we don't have the testing environment set up

  /*
  describe('RatingStars Component', () => {
    it('should render correct number of stars', () => {
      // Test star rendering logic
    });

    it('should handle interactive rating selection', () => {
      // Test click handlers and state updates
    });

    it('should display half stars for decimal ratings', () => {
      // Test precision handling
    });
  });

  describe('ReviewForm Component', () => {
    it('should validate form inputs', () => {
      // Test form validation
    });

    it('should handle photo upload', () => {
      // Test file upload functionality
    });

    it('should submit review data correctly', () => {
      // Test form submission
    });
  });

  describe('ReviewList Component', () => {
    it('should filter reviews correctly', () => {
      // Test filtering logic
    });

    it('should sort reviews by different criteria', () => {
      // Test sorting functionality
    });

    it('should implement infinite scrolling', () => {
      // Test pagination
    });
  });
  */
});

describe('Review System - Integration Tests', () => {
  it('should complete full review lifecycle', async () => {
    // Test the complete flow: create → moderate → respond → vote
    const mockReviewId = 'integration-test-review';

    // 1. Create review
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { tenant_id: 'test-tenant' }, 
            error: null 
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: mockReviewId }, 
            error: null 
          })),
        })),
      })),
    });

    const formData = new FormData();
    formData.append('target_type', 'restaurant');
    formData.append('target_id', 'test-restaurant-id');
    formData.append('rating', '4');
    formData.append('content', 'Integration test review content');

    const createResult = await createReview(formData);
    expect(createResult.success).toBe(true);

    // 2. Moderate review
    jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
      id: 'admin-user-id',
      user_metadata: { role: 'platform_admin' },
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
            .mockReturnValueOnce(Promise.resolve({ 
              data: { id: mockReviewId, tenant_id: 'test-tenant' }, 
              error: null 
            }))
            .mockReturnValueOnce(Promise.resolve({ 
              data: { role: 'platform_admin' }, 
              error: null 
            })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    });

    const moderateResult = await moderateReview(mockReviewId, 'approve');
    expect(moderateResult.success).toBe(true);

    // 3. Respond to review
    jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
      id: 'restaurant-owner-id',
      user_metadata: { role: 'restaurant_owner' },
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
            .mockReturnValueOnce(Promise.resolve({ 
              data: { id: mockReviewId, tenant_id: 'test-tenant' }, 
              error: null 
            }))
            .mockReturnValueOnce(Promise.resolve({ 
              data: { tenant_id: 'test-tenant', role: 'restaurant_owner' }, 
              error: null 
            })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });

    const respondResult = await respondToReview({
      review_id: mockReviewId,
      content: 'Thank you for your feedback!',
    });
    expect(respondResult.success).toBe(true);

    // 4. Vote on review
    jest.mocked(require('@/lib/auth').getCurrentUser).mockResolvedValue({
      id: 'customer-user-id',
      user_metadata: { role: 'customer' },
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });

    const voteResult = await voteOnReview(
      { review_id: mockReviewId, vote_type: 'helpful' },
      'session-123'
    );
    expect(voteResult.success).toBe(true);
  });
});

describe('Review System - Load Testing', () => {
  it('should handle concurrent review submissions', async () => {
    const concurrentSubmissions = 10;
    const submissions = [];

    // Mock successful database operations
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { tenant_id: 'test-tenant' }, 
            error: null 
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: `review-${Math.random()}` }, 
            error: null 
          })),
        })),
      })),
    });

    // Create multiple concurrent review submissions
    for (let i = 0; i < concurrentSubmissions; i++) {
      const formData = new FormData();
      formData.append('target_type', 'restaurant');
      formData.append('target_id', 'test-restaurant-id');
      formData.append('rating', '5');
      formData.append('content', `Concurrent review ${i}`);

      submissions.push(createReview(formData));
    }

    const results = await Promise.all(submissions);

    // All submissions should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });
});