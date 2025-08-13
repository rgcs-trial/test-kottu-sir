'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'filled' | 'outlined' | 'interactive';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
  showValue?: boolean;
  precision?: 'full' | 'half';
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

export default function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  variant = 'filled',
  interactive = false,
  onRatingChange,
  className,
  showValue = false,
  precision = 'full',
}: RatingStarsProps) {
  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (starRating: number) => {
    if (interactive && onRatingChange) {
      // Optional: implement hover preview
    }
  };

  const renderStar = (index: number) => {
    const starNumber = index + 1;
    const isActive = rating >= starNumber;
    const isHalfActive = precision === 'half' && rating >= starNumber - 0.5 && rating < starNumber;

    return (
      <button
        key={index}
        type="button"
        className={cn(
          'relative transition-all duration-200',
          interactive && 'hover:scale-110 cursor-pointer',
          !interactive && 'cursor-default',
          className
        )}
        onClick={() => handleStarClick(starNumber)}
        onMouseEnter={() => handleStarHover(starNumber)}
        disabled={!interactive}
        aria-label={`${starNumber} star${starNumber > 1 ? 's' : ''}`}
      >
        <Star
          className={cn(
            sizeClasses[size],
            'transition-colors duration-200',
            variant === 'filled' && {
              'fill-yellow-400 text-yellow-400': isActive,
              'fill-gray-200 text-gray-200': !isActive && !isHalfActive,
            },
            variant === 'outlined' && {
              'text-yellow-400': isActive,
              'text-gray-300': !isActive && !isHalfActive,
            },
            variant === 'interactive' && interactive && {
              'fill-yellow-400 text-yellow-400 hover:fill-yellow-500 hover:text-yellow-500': isActive,
              'fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200': !isActive && !isHalfActive,
            }
          )}
        />
        
        {/* Half star overlay for precise ratings */}
        {isHalfActive && precision === 'half' && (
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star
              className={cn(
                sizeClasses[size],
                'fill-yellow-400 text-yellow-400'
              )}
            />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
      </div>
      
      {showValue && (
        <span className={cn(
          'ml-2 font-medium text-gray-700',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          size === 'xl' && 'text-lg'
        )}>
          {rating.toFixed(precision === 'half' ? 1 : 0)}
        </span>
      )}
    </div>
  );
}

// Predefined rating star components for common use cases
export const InteractiveRatingStars = (props: Omit<RatingStarsProps, 'interactive' | 'variant'>) => (
  <RatingStars {...props} interactive variant="interactive" />
);

export const DisplayRatingStars = (props: Omit<RatingStarsProps, 'interactive' | 'variant'>) => (
  <RatingStars {...props} interactive={false} variant="filled" />
);

export const CompactRatingStars = (props: Omit<RatingStarsProps, 'size' | 'showValue'>) => (
  <RatingStars {...props} size="sm" showValue />
);

// Rating statistics component
interface RatingStatsProps {
  averageRating: number;
  totalReviews: number;
  className?: string;
}

export function RatingStats({ averageRating, totalReviews, className }: RatingStatsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DisplayRatingStars 
        rating={averageRating} 
        size="md" 
        precision="half"
      />
      <span className="text-sm font-medium text-gray-700">
        {averageRating.toFixed(1)}
      </span>
      <span className="text-sm text-gray-500">
        ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
      </span>
    </div>
  );
}