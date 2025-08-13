'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Flag, 
  Eye, 
  MessageSquare,
  Shield,
  AlertTriangle,
  User,
  Calendar,
  Star
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DisplayRatingStars } from './rating-stars';
import { cn } from '@/lib/utils';

interface ReviewReport {
  id: string;
  reason: string;
  description?: string;
  reporter_name?: string;
  created_at: string;
  status: string;
}

interface ModerationReview {
  id: string;
  rating: number;
  title?: string;
  content: string;
  reviewer_name: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: string;
  target_type: 'restaurant' | 'menu_item';
  target_name: string;
  restaurant_name: string;
  helpful_votes: number;
  not_helpful_votes: number;
  moderation_notes?: string;
  moderated_by?: string;
  moderated_at?: string;
  reports?: ReviewReport[];
  photos?: { id: string; photo_url: string }[];
}

interface ReviewModerationCardProps {
  review: ModerationReview;
  onModerate: (reviewId: string, action: 'approve' | 'reject' | 'flag', notes?: string) => Promise<void>;
  onViewDetails?: (reviewId: string) => void;
  className?: string;
}

export function ReviewModerationCard({
  review,
  onModerate,
  onViewDetails,
  className,
}: ReviewModerationCardProps) {
  const [isActioning, setIsActioning] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'flag' | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'flagged':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleModerate = async () => {
    if (!selectedAction) return;

    setIsActioning(true);
    try {
      await onModerate(review.id, selectedAction, moderationNotes || undefined);
      setShowModerationDialog(false);
      setSelectedAction(null);
      setModerationNotes('');
    } catch (error) {
      console.error('Moderation failed:', error);
    } finally {
      setIsActioning(false);
    }
  };

  const openModerationDialog = (action: 'approve' | 'reject' | 'flag') => {
    setSelectedAction(action);
    setShowModerationDialog(true);
  };

  return (
    <>
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              
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
                  
                  <Badge className={cn('text-xs', getStatusColor(review.status))}>
                    {review.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <DisplayRatingStars rating={review.rating} size="sm" />
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mt-1">
                  Review for: <span className="font-medium">{review.target_name}</span>
                  {review.target_type === 'menu_item' && (
                    <span> at {review.restaurant_name}</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails?.(review.id)}
              className="flex-shrink-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
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
          <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
            {review.content}
          </p>

          {/* Photos Preview */}
          {review.photos && review.photos.length > 0 && (
            <div className="flex gap-2 mb-4">
              {review.photos.slice(0, 3).map((photo, index) => (
                <div
                  key={photo.id}
                  className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center"
                >
                  <span className="text-xs text-gray-500">IMG</span>
                </div>
              ))}
              {review.photos.length > 3 && (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-500">
                    +{review.photos.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          {review.reports && review.reports.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {review.reports.length} Report{review.reports.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-xs text-red-700">
                {review.reports.slice(0, 2).map((report, index) => (
                  <div key={report.id}>
                    {report.reason.replace('_', ' ')} - {report.description}
                  </div>
                ))}
                {review.reports.length > 2 && (
                  <div>And {review.reports.length - 2} more...</div>
                )}
              </div>
            </div>
          )}

          {/* Previous Moderation */}
          {review.moderated_at && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-600">
                <strong>Previous moderation:</strong> {review.status} by {review.moderated_by}
                <br />
                <span className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(review.moderated_at), { addSuffix: true })}
                </span>
                {review.moderation_notes && (
                  <div className="mt-2 italic">"{review.moderation_notes}"</div>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <span>{review.helpful_votes} helpful</span>
            <span>{review.not_helpful_votes} not helpful</span>
          </div>

          {/* Moderation Actions */}
          {review.status === 'pending' || review.status === 'flagged' ? (
            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openModerationDialog('approve')}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                disabled={isActioning}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => openModerationDialog('reject')}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={isActioning}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => openModerationDialog('flag')}
                className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                disabled={isActioning}
              >
                <Flag className="h-4 w-4 mr-1" />
                Flag
              </Button>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Status: <span className="font-medium capitalize">{review.status}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderation Dialog */}
      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === 'approve' && 'Approve Review'}
              {selectedAction === 'reject' && 'Reject Review'}
              {selectedAction === 'flag' && 'Flag Review'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Moderation Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about your decision..."
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="text-sm text-gray-600">
              <strong>Review:</strong> "{review.content.substring(0, 100)}..."
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModerationDialog(false)}
              disabled={isActioning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleModerate}
              disabled={isActioning}
              className={cn(
                selectedAction === 'approve' && 'bg-green-600 hover:bg-green-700',
                selectedAction === 'reject' && 'bg-red-600 hover:bg-red-700',
                selectedAction === 'flag' && 'bg-yellow-600 hover:bg-yellow-700'
              )}
            >
              {isActioning ? 'Processing...' : `Confirm ${selectedAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Bulk moderation component
interface BulkModerationProps {
  selectedReviews: string[];
  onBulkAction: (action: 'approve' | 'reject' | 'flag', reviewIds: string[], notes?: string) => Promise<void>;
  onClearSelection: () => void;
}

export function BulkModerationActions({
  selectedReviews,
  onBulkAction,
  onClearSelection,
}: BulkModerationProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'flag' | null>(null);
  const [notes, setNotes] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  const handleBulkAction = async () => {
    if (!selectedAction) return;

    setIsActioning(true);
    try {
      await onBulkAction(selectedAction, selectedReviews, notes || undefined);
      setShowDialog(false);
      setSelectedAction(null);
      setNotes('');
      onClearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsActioning(false);
    }
  };

  if (selectedReviews.length === 0) return null;

  return (
    <>
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedReviews.length} review{selectedReviews.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select onValueChange={(value) => setSelectedAction(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="flag">Flag</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={() => setShowDialog(true)}
                disabled={!selectedAction}
              >
                Apply
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={onClearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Bulk {selectedAction} - {selectedReviews.length} Review{selectedReviews.length !== 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bulkNotes">Notes (Optional)</Label>
              <Textarea
                id="bulkNotes"
                placeholder="Add notes about this bulk action..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="text-sm text-gray-600">
              This will {selectedAction} {selectedReviews.length} selected review{selectedReviews.length !== 1 ? 's' : ''}.
              This action cannot be undone.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isActioning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={isActioning}
            >
              {isActioning ? 'Processing...' : `${selectedAction} All`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}