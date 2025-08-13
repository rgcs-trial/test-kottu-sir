'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  MoreVertical, 
  MessageSquare,
  Shield,
  Camera,
  Edit,
  Trash2
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DisplayRatingStars } from './rating-stars';
import { cn } from '@/lib/utils';

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

interface ReviewCardProps {
  review: Review;
  onVote?: (reviewId: string, voteType: 'helpful' | 'not_helpful') => void;
  onReport?: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
  onRespond?: (reviewId: string) => void;
  currentUserId?: string;
  canModerate?: boolean;
  canRespond?: boolean;
  className?: string;
  showPhotos?: boolean;
  showResponses?: boolean;
}

export default function ReviewCard({
  review,
  onVote,
  onReport,
  onEdit,
  onDelete,
  onRespond,
  currentUserId,
  canModerate = false,
  canRespond = false,
  className,
  showPhotos = true,
  showResponses = true,
}: ReviewCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const isOwner = currentUserId === review.id;
  const hasPhotos = review.photos && review.photos.length > 0;
  const hasResponses = review.responses && review.responses.length > 0;

  const handleVote = async (voteType: 'helpful' | 'not_helpful') => {
    if (isVoting || !onVote) return;
    
    setIsVoting(true);
    try {
      await onVote(review.id, voteType);
    } finally {
      setIsVoting(false);
    }
  };

  const handleAction = (action: () => void) => {
    action();
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Reviewer Avatar */}
            <Avatar className="h-10 w-10">
              {review.reviewer_avatar ? (
                <Image
                  src={review.reviewer_avatar}
                  alt={review.reviewer_name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 text-sm font-medium">
                  {review.reviewer_name.charAt(0).toUpperCase()}
                </div>
              )}
            </Avatar>

            {/* Reviewer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-gray-900 truncate">
                  {review.reviewer_name}
                </h4>
                
                {review.is_verified_purchase && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
                
                {hasPhotos && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {review.photos!.length}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <DisplayRatingStars rating={review.rating} size="sm" />
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && onEdit && (
                <DropdownMenuItem onClick={() => handleAction(() => onEdit(review.id))}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit review
                </DropdownMenuItem>
              )}
              
              {isOwner && onDelete && (
                <DropdownMenuItem 
                  onClick={() => handleAction(() => onDelete(review.id))}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete review
                </DropdownMenuItem>
              )}
              
              {canRespond && onRespond && (
                <DropdownMenuItem onClick={() => handleAction(() => onRespond(review.id))}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Respond
                </DropdownMenuItem>
              )}
              
              {!isOwner && onReport && (
                <>
                  {(isOwner || canRespond) && <DropdownMenuSeparator />}
                  <DropdownMenuItem 
                    onClick={() => handleAction(() => onReport(review.id))}
                    className="text-red-600"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Review Title */}
        {review.title && (
          <h5 className="font-medium text-gray-900 mb-2">
            {review.title}
          </h5>
        )}

        {/* Review Content */}
        {review.content && (
          <p className="text-gray-700 leading-relaxed mb-4">
            {review.content}
          </p>
        )}

        {/* Review Photos */}
        {showPhotos && hasPhotos && (
          <div className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {review.photos!.slice(0, showAllPhotos ? undefined : 4).map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo.photo_url)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                >
                  <Image
                    src={photo.thumbnail_url || photo.photo_url}
                    alt={photo.caption || `Review photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
              
              {!showAllPhotos && review.photos!.length > 4 && (
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="aspect-square rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm font-medium hover:bg-gray-50"
                >
                  +{review.photos!.length - 4}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Voting and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Helpful Voting */}
            {onVote && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('helpful')}
                  disabled={isVoting}
                  className="h-8 px-2 text-gray-600 hover:text-green-600"
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {review.helpful_votes}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('not_helpful')}
                  disabled={isVoting}
                  className="h-8 px-2 text-gray-600 hover:text-red-600"
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  {review.not_helpful_votes}
                </Button>
              </div>
            )}

            {/* Total Votes */}
            {review.total_votes > 0 && (
              <span className="text-sm text-gray-500">
                {review.total_votes} found helpful
              </span>
            )}
          </div>

          {/* Response Indicator */}
          {review.has_response && (
            <Badge variant="outline" className="text-xs">
              Response from restaurant
            </Badge>
          )}
        </div>

        {/* Responses */}
        {showResponses && hasResponses && (
          <div className="mt-6 space-y-4">
            {review.responses!.map((response) => (
              <div
                key={response.id}
                className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {response.responder_name}
                  </span>
                  {response.is_official && (
                    <Badge variant="secondary" className="text-xs">
                      Restaurant
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {response.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Photo Modal (basic implementation) */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-4xl">
            <Image
              src={selectedPhoto}
              alt="Review photo"
              width={800}
              height={600}
              className="object-contain"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white hover:bg-white/20"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// Compact review card for lists
interface CompactReviewCardProps {
  review: Pick<Review, 'id' | 'rating' | 'content' | 'reviewer_name' | 'created_at' | 'is_verified_purchase'>;
  className?: string;
}

export function CompactReviewCard({ review, className }: CompactReviewCardProps) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DisplayRatingStars rating={review.rating} size="sm" />
          <span className="text-sm font-medium text-gray-900">
            {review.reviewer_name}
          </span>
          {review.is_verified_purchase && (
            <Badge variant="secondary" className="text-xs">
              Verified
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
        </span>
      </div>
      
      {review.content && (
        <p className="text-sm text-gray-700 line-clamp-2">
          {review.content}
        </p>
      )}
    </div>
  );
}