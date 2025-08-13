'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Filter, SortAsc, SortDesc } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReviewCard, { CompactReviewCard } from './review-card';
import { cn } from '@/lib/utils';

// Re-export the Review type for consistency
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

interface ReviewListProps {
  reviews: Review[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onVote?: (reviewId: string, voteType: 'helpful' | 'not_helpful') => void;
  onReport?: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
  onRespond?: (reviewId: string) => void;
  currentUserId?: string;
  canModerate?: boolean;
  canRespond?: boolean;
  className?: string;
  variant?: 'full' | 'compact';
  showFilters?: boolean;
  showSorting?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most_helpful';
type FilterOption = 'all' | 'verified' | 'with_photos' | 'with_responses' | '5_star' | '4_star' | '3_star' | '2_star' | '1_star';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest_rated', label: 'Highest rated' },
  { value: 'lowest_rated', label: 'Lowest rated' },
  { value: 'most_helpful', label: 'Most helpful' },
];

const filterOptions: { value: FilterOption; label: string; count?: number }[] = [
  { value: 'all', label: 'All reviews' },
  { value: 'verified', label: 'Verified purchases' },
  { value: 'with_photos', label: 'With photos' },
  { value: 'with_responses', label: 'With responses' },
  { value: '5_star', label: '5 stars' },
  { value: '4_star', label: '4 stars' },
  { value: '3_star', label: '3 stars' },
  { value: '2_star', label: '2 stars' },
  { value: '1_star', label: '1 star' },
];

export default function ReviewList({
  reviews,
  loading = false,
  onLoadMore,
  hasMore = false,
  onVote,
  onReport,
  onEdit,
  onDelete,
  onRespond,
  currentUserId,
  canModerate = false,
  canRespond = false,
  className,
  variant = 'full',
  showFilters = true,
  showSorting = true,
}: ReviewListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>(['all']);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterOption, number> = {
      all: reviews.length,
      verified: reviews.filter(r => r.is_verified_purchase).length,
      with_photos: reviews.filter(r => r.photos && r.photos.length > 0).length,
      with_responses: reviews.filter(r => r.has_response).length,
      '5_star': reviews.filter(r => r.rating === 5).length,
      '4_star': reviews.filter(r => r.rating === 4).length,
      '3_star': reviews.filter(r => r.rating === 3).length,
      '2_star': reviews.filter(r => r.rating === 2).length,
      '1_star': reviews.filter(r => r.rating === 1).length,
    };
    return counts;
  }, [reviews]);

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let filtered = reviews;

    // Apply filters
    if (!activeFilters.includes('all')) {
      filtered = reviews.filter(review => {
        return activeFilters.some(filter => {
          switch (filter) {
            case 'verified':
              return review.is_verified_purchase;
            case 'with_photos':
              return review.photos && review.photos.length > 0;
            case 'with_responses':
              return review.has_response;
            case '5_star':
              return review.rating === 5;
            case '4_star':
              return review.rating === 4;
            case '3_star':
              return review.rating === 3;
            case '2_star':
              return review.rating === 2;
            case '1_star':
              return review.rating === 1;
            default:
              return true;
          }
        });
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest_rated':
          return b.rating - a.rating;
        case 'lowest_rated':
          return a.rating - b.rating;
        case 'most_helpful':
          return b.helpful_votes - a.helpful_votes;
        default:
          return 0;
      }
    });

    return sorted;
  }, [reviews, activeFilters, sortBy]);

  const handleFilterToggle = (filter: FilterOption) => {
    if (filter === 'all') {
      setActiveFilters(['all']);
    } else {
      const newFilters = activeFilters.includes('all') 
        ? [filter]
        : activeFilters.includes(filter)
          ? activeFilters.filter(f => f !== filter)
          : [...activeFilters.filter(f => f !== 'all'), filter];
      
      setActiveFilters(newFilters.length === 0 ? ['all'] : newFilters);
    }
  };

  const activeFilterCount = activeFilters.includes('all') ? 0 : activeFilters.length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Filters and Sorting */}
      {(showFilters || showSorting) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Filters */}
            {showFilters && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {filterOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={activeFilters.includes(option.value)}
                      onCheckedChange={() => handleFilterToggle(option.value)}
                      className="flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">
                        {filterCounts[option.value]}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeFilters.filter(f => f !== 'all').map((filter) => (
                  <Badge
                    key={filter}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleFilterToggle(filter)}
                  >
                    {filterOptions.find(f => f.value === filter)?.label}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilters(['all'])}
                  className="h-6 px-2 text-xs text-gray-500"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {/* Sorting */}
          {showSorting && (
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredAndSortedReviews.length} of {reviews.length} reviews
        </span>
        
        {loading && (
          <span className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            Loading...
          </span>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredAndSortedReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">No reviews found</p>
            <p className="text-sm">
              {activeFilterCount > 0 
                ? 'Try adjusting your filters to see more reviews.'
                : 'Be the first to leave a review!'
              }
            </p>
          </div>
        ) : (
          <>
            {filteredAndSortedReviews.map((review) => (
              variant === 'compact' ? (
                <CompactReviewCard
                  key={review.id}
                  review={review}
                />
              ) : (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onVote={onVote}
                  onReport={onReport}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRespond={onRespond}
                  currentUserId={currentUserId}
                  canModerate={canModerate}
                  canRespond={canRespond}
                />
              )
            ))}

            {/* Load More Button */}
            {hasMore && onLoadMore && (
              <div className="text-center py-6">
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  disabled={loading}
                  className="min-w-32"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    'Load more reviews'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Simple review list without filters for embedding
interface SimpleReviewListProps {
  reviews: Review[];
  limit?: number;
  variant?: 'full' | 'compact';
  className?: string;
}

export function SimpleReviewList({ 
  reviews, 
  limit, 
  variant = 'compact',
  className 
}: SimpleReviewListProps) {
  const displayReviews = limit ? reviews.slice(0, limit) : reviews;

  return (
    <div className={cn('space-y-4', className)}>
      {displayReviews.map((review) => (
        variant === 'compact' ? (
          <CompactReviewCard
            key={review.id}
            review={review}
          />
        ) : (
          <ReviewCard
            key={review.id}
            review={review}
            showPhotos={false}
            showResponses={false}
          />
        )
      ))}
      
      {limit && reviews.length > limit && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            And {reviews.length - limit} more review{reviews.length - limit !== 1 ? 's' : ''}...
          </p>
        </div>
      )}
    </div>
  );
}