'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DisplayRatingStars, RatingStats } from './rating-stars';
import { cn } from '@/lib/utils';

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedReviews?: number;
  reviewsWithPhotos?: number;
  recentReviews?: number;
  className?: string;
  compact?: boolean;
}

export default function ReviewSummary({
  averageRating,
  totalReviews,
  ratingDistribution,
  verifiedReviews = 0,
  reviewsWithPhotos = 0,
  recentReviews = 0,
  className,
  compact = false,
}: ReviewSummaryProps) {
  // Calculate percentages for rating distribution
  const ratingPercentages = Object.entries(ratingDistribution).map(([rating, count]) => ({
    rating: parseInt(rating),
    count,
    percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
  })).reverse(); // Show 5 stars first

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <RatingStats 
          averageRating={averageRating}
          totalReviews={totalReviews}
        />
        
        {totalReviews > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {verifiedReviews > 0 && (
              <span>{verifiedReviews} verified</span>
            )}
            {reviewsWithPhotos > 0 && (
              <span>{reviewsWithPhotos} with photos</span>
            )}
            {recentReviews > 0 && (
              <span>{recentReviews} recent</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Customer Reviews</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {averageRating.toFixed(1)}
              </span>
              <DisplayRatingStars 
                rating={averageRating} 
                size="lg" 
                precision="half"
              />
            </div>
            <p className="text-sm text-gray-600">
              Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Review Badges */}
          {totalReviews > 0 && (
            <div className="space-y-2">
              {verifiedReviews > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {verifiedReviews} verified
                </Badge>
              )}
              {reviewsWithPhotos > 0 && (
                <Badge variant="outline" className="text-xs">
                  {reviewsWithPhotos} with photos
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Rating Distribution */}
        {totalReviews > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Rating Distribution</h4>
            <div className="space-y-2">
              {ratingPercentages.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 min-w-[60px]">
                    <span className="text-sm font-medium">{rating}</span>
                    <DisplayRatingStars 
                      rating={1} 
                      maxRating={1} 
                      size="sm" 
                    />
                  </div>
                  
                  <div className="flex-1">
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-[80px] text-right">
                    <span className="text-sm text-gray-600">{count}</span>
                    <span className="text-xs text-gray-500">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Stats */}
        {(verifiedReviews > 0 || reviewsWithPhotos > 0 || recentReviews > 0) && (
          <div className="pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              {verifiedReviews > 0 && (
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-green-600">
                    {verifiedReviews}
                  </p>
                  <p className="text-xs text-gray-500">Verified Purchases</p>
                </div>
              )}
              
              {reviewsWithPhotos > 0 && (
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-blue-600">
                    {reviewsWithPhotos}
                  </p>
                  <p className="text-xs text-gray-500">With Photos</p>
                </div>
              )}
              
              {recentReviews > 0 && (
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-purple-600">
                    {recentReviews}
                  </p>
                  <p className="text-xs text-gray-500">Last 30 Days</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Reviews State */}
        {totalReviews === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No reviews yet</p>
            <p className="text-xs mt-1">Be the first to leave a review!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick summary component for menu items or compact spaces
interface QuickReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
  className?: string;
}

export function QuickReviewSummary({
  averageRating,
  totalReviews,
  size = 'sm',
  showCount = true,
  className,
}: QuickReviewSummaryProps) {
  if (totalReviews === 0) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <DisplayRatingStars rating={0} size={size} />
        <span className="text-xs text-gray-400">No reviews</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DisplayRatingStars 
        rating={averageRating} 
        size={size} 
        precision="half"
      />
      <span className={cn(
        'font-medium text-gray-700',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {averageRating.toFixed(1)}
      </span>
      {showCount && (
        <span className={cn(
          'text-gray-500',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          ({totalReviews})
        </span>
      )}
    </div>
  );
}

// Rating breakdown for detailed analytics
interface RatingBreakdownProps {
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  totalReviews: number;
  className?: string;
}

export function RatingBreakdown({ 
  ratingDistribution, 
  totalReviews, 
  className 
}: RatingBreakdownProps) {
  const ratings = [5, 4, 3, 2, 1]; // Descending order

  return (
    <div className={cn('space-y-2', className)}>
      {ratings.map((rating) => {
        const count = ratingDistribution[rating as keyof typeof ratingDistribution];
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

        return (
          <div key={rating} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-8">
              <span className="text-sm font-medium">{rating}</span>
              <DisplayRatingStars rating={1} maxRating={1} size="sm" />
            </div>
            
            <div className="flex-1">
              <Progress value={percentage} className="h-1.5" />
            </div>
            
            <span className="text-xs text-gray-500 w-8 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}