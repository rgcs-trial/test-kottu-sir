'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Star, MessageSquare, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import ReviewSummary, { QuickReviewSummary } from '@/components/reviews/review-summary';
import ReviewList from '@/components/reviews/review-list';
import ReviewForm from '@/components/reviews/review-form';
import { useReviews, useReviewSummary } from '@/hooks/use-reviews';
import { useRestaurantPublic } from '@/hooks/use-restaurant-public';
import { useAuth } from '@/hooks/use-auth';

interface RestaurantReviewsPageProps {
  params: {
    subdomain: string;
  };
}

export default function RestaurantReviewsPage({ params }: RestaurantReviewsPageProps) {
  const { subdomain } = useParams();
  const { user } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'photos'>('all');

  // Get restaurant data
  const { restaurant, loading: restaurantLoading, error: restaurantError } = useRestaurantPublic(subdomain as string);

  // Get review summary
  const {
    averageRating,
    totalReviews,
    ratingDistribution,
    verifiedReviews,
    reviewsWithPhotos,
    recentReviews,
    loading: summaryLoading,
  } = useReviewSummary(
    restaurant?.id || '',
    'restaurant',
    restaurant?.id
  );

  // Get reviews with filtering
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    hasMore,
    totalCount,
    filters,
    updateFilters,
    loadMore,
    refresh,
    voteOnReview,
    reportReview,
    respondToReview,
    submitReview,
    deleteReview,
  } = useReviews({
    tenant_id: restaurant?.id || '',
    target_type: 'restaurant',
    target_id: restaurant?.id,
    initialFilters: {
      sort_by: 'newest',
    },
    autoFetch: !!restaurant?.id,
  });

  // Filter reviews based on active tab
  const filteredReviews = reviews.filter(review => {
    switch (activeTab) {
      case 'recent':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(review.created_at) > thirtyDaysAgo;
      case 'photos':
        return review.photos && review.photos.length > 0;
      default:
        return true;
    }
  });

  // Handle review submission
  const handleSubmitReview = async (reviewData: any) => {
    try {
      await submitReview({
        target_type: 'restaurant',
        target_id: restaurant!.id,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        photos: reviewData.photos?.map((file: File) => URL.createObjectURL(file)), // Simplified for demo
      });
      setShowReviewForm(false);
    } catch (error) {
      throw error;
    }
  };

  // Handle voting
  const handleVote = async (reviewId: string, voteType: 'helpful' | 'not_helpful') => {
    try {
      await voteOnReview(reviewId, voteType);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  // Handle reporting
  const handleReport = async (reviewId: string) => {
    try {
      await reportReview(reviewId, 'inappropriate_content', 'User reported this review');
    } catch (error) {
      console.error('Failed to report:', error);
    }
  };

  // Handle responding (restaurant owner/staff only)
  const handleRespond = async (reviewId: string) => {
    // This would typically open a modal or inline form
    const response = prompt('Enter your response:');
    if (response) {
      try {
        await respondToReview(reviewId, response);
      } catch (error) {
        console.error('Failed to respond:', error);
      }
    }
  };

  if (restaurantLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (restaurantError || !restaurant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Not Found</h1>
          <p className="text-gray-600 mt-2">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Reviews</h1>
          <p className="text-gray-600 mt-2">
            Read what customers say about {restaurant.name}
          </p>
        </div>

        {/* Write Review Button */}
        <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Write a Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Write a Review for {restaurant.name}</DialogTitle>
            </DialogHeader>
            <ReviewForm
              targetType="restaurant"
              targetId={restaurant.id}
              targetName={restaurant.name}
              onSubmit={handleSubmitReview}
              onCancel={() => setShowReviewForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {averageRating.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalReviews}</div>
                <div className="text-sm text-gray-600">Total Reviews</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{recentReviews}</div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">V</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{verifiedReviews}</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    All Reviews ({totalCount})
                  </TabsTrigger>
                  <TabsTrigger value="recent">
                    Recent ({recentReviews})
                  </TabsTrigger>
                  <TabsTrigger value="photos">
                    With Photos ({reviewsWithPhotos})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <ReviewList
                    reviews={filteredReviews}
                    loading={reviewsLoading}
                    onLoadMore={loadMore}
                    hasMore={hasMore}
                    onVote={handleVote}
                    onReport={handleReport}
                    onRespond={handleRespond}
                    onDelete={deleteReview}
                    currentUserId={user?.id}
                    canRespond={user?.user_metadata?.role === 'restaurant_owner'}
                    showFilters={true}
                    showSorting={true}
                  />
                </TabsContent>

                <TabsContent value="recent" className="mt-6">
                  <ReviewList
                    reviews={filteredReviews}
                    loading={reviewsLoading}
                    onLoadMore={loadMore}
                    hasMore={hasMore}
                    onVote={handleVote}
                    onReport={handleReport}
                    onRespond={handleRespond}
                    onDelete={deleteReview}
                    currentUserId={user?.id}
                    canRespond={user?.user_metadata?.role === 'restaurant_owner'}
                    showFilters={false}
                    showSorting={true}
                  />
                </TabsContent>

                <TabsContent value="photos" className="mt-6">
                  <ReviewList
                    reviews={filteredReviews}
                    loading={reviewsLoading}
                    onLoadMore={loadMore}
                    hasMore={hasMore}
                    onVote={handleVote}
                    onReport={handleReport}
                    onRespond={handleRespond}
                    onDelete={deleteReview}
                    currentUserId={user?.id}
                    canRespond={user?.user_metadata?.role === 'restaurant_owner'}
                    showFilters={false}
                    showSorting={true}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Review Summary */}
          <ReviewSummary
            averageRating={averageRating}
            totalReviews={totalReviews}
            ratingDistribution={ratingDistribution}
            verifiedReviews={verifiedReviews}
            reviewsWithPhotos={reviewsWithPhotos}
            recentReviews={recentReviews}
          />

          {/* Restaurant Info */}
          <Card>
            <CardHeader>
              <CardTitle>About {restaurant.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {restaurant.description && (
                <p className="text-gray-600 text-sm">{restaurant.description}</p>
              )}
              
              {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Cuisine</h4>
                  <div className="flex flex-wrap gap-2">
                    {restaurant.cuisine_types.map((cuisine, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {restaurant.address_line_1 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                  <p className="text-gray-600 text-sm">
                    {restaurant.address_line_1}
                    {restaurant.address_line_2 && `, ${restaurant.address_line_2}`}
                    <br />
                    {restaurant.city}, {restaurant.state} {restaurant.postal_code}
                  </p>
                </div>
              )}

              {restaurant.phone && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Phone</h4>
                  <p className="text-gray-600 text-sm">{restaurant.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowReviewForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Write a Review
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.history.back()}
              >
                Back to Menu
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Error State */}
      {reviewsError && (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="font-medium">Failed to load reviews</p>
              <p className="text-sm mt-1">{reviewsError}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refresh()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}