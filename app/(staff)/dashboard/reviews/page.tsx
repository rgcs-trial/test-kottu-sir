'use client';

import { useState, useEffect } from 'react';
import { 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Calendar,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import ReviewSummary from '@/components/reviews/review-summary';
import ReviewList from '@/components/reviews/review-list';
import { RatingBreakdown } from '@/components/reviews/review-summary';
import { useReviews, useReviewSummary } from '@/hooks/use-reviews';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useAuth } from '@/hooks/use-auth';

export default function StaffReviewsPage() {
  const { user } = useAuth();
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'analytics'>('overview');

  // Get review summary and reviews
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

  const {
    reviews,
    loading: reviewsLoading,
    hasMore,
    loadMore,
    refresh,
    respondToReview,
  } = useReviews({
    tenant_id: restaurant?.id || '',
    target_type: 'restaurant',
    target_id: restaurant?.id,
    initialFilters: {
      sort_by: 'newest',
    },
    autoFetch: !!restaurant?.id,
  });

  // Mock analytics data - in real implementation, this would come from API
  const analyticsData = {
    trends: {
      thisMonth: { rating: 4.3, reviews: 23, change: '+12%' },
      lastMonth: { rating: 4.1, reviews: 18, change: '+8%' },
    },
    topMenuItems: [
      { name: 'Margherita Pizza', rating: 4.8, reviews: 45 },
      { name: 'Caesar Salad', rating: 4.6, reviews: 32 },
      { name: 'Tiramisu', rating: 4.9, reviews: 28 },
    ],
    responseRate: 78,
    avgResponseTime: '4.2 hours',
    commonKeywords: [
      { word: 'delicious', count: 67 },
      { word: 'friendly', count: 52 },
      { word: 'fast', count: 41 },
      { word: 'fresh', count: 38 },
    ],
  };

  // Handle responding to reviews
  const handleRespond = async (reviewId: string) => {
    const response = prompt('Enter your response to this review:');
    if (response && response.trim()) {
      try {
        await respondToReview(reviewId, response.trim());
      } catch (error) {
        console.error('Failed to respond:', error);
        alert('Failed to post response. Please try again.');
      }
    }
  };

  if (restaurantLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No Restaurant Found</h1>
          <p className="text-gray-600 mt-2">Please set up your restaurant first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage and respond to customer reviews for {restaurant.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {averageRating.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Average Rating</div>
                <div className="text-xs text-green-600 font-medium">
                  {analyticsData.trends.thisMonth.change}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalReviews}</div>
                <div className="text-sm text-gray-600">Total Reviews</div>
                <div className="text-xs text-gray-500">
                  {recentReviews} this month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {analyticsData.responseRate}%
                </div>
                <div className="text-sm text-gray-600">Response Rate</div>
                <div className="text-xs text-gray-500">
                  Avg: {analyticsData.avgResponseTime}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{verifiedReviews}</div>
                <div className="text-sm text-gray-600">Verified Reviews</div>
                <div className="text-xs text-gray-500">
                  {Math.round((verifiedReviews / totalReviews) * 100)}% of total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Manage Reviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recent Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewList
                    reviews={reviews.slice(0, 3)}
                    loading={reviewsLoading}
                    variant="compact"
                    showFilters={false}
                    showSorting={false}
                  />
                  {reviews.length > 3 && (
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('reviews')}
                      >
                        View All Reviews
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Menu Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Rated Menu Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topMenuItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.reviews} reviews</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{item.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

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

              {/* Common Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle>Common Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.commonKeywords.map((keyword, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {keyword.word}
                        </span>
                        <Badge variant="secondary">{keyword.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Reviews Management Tab */}
        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Reviews</CardTitle>
              <p className="text-sm text-gray-600">
                Respond to customer reviews and engage with your community
              </p>
            </CardHeader>
            <CardContent>
              <ReviewList
                reviews={reviews}
                loading={reviewsLoading}
                onLoadMore={loadMore}
                hasMore={hasMore}
                onRespond={handleRespond}
                currentUserId={user?.id}
                canRespond={true}
                showFilters={true}
                showSorting={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Rating Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Rating Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">This Month</h4>
                      <p className="text-sm text-gray-600">
                        {analyticsData.trends.thisMonth.reviews} reviews
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {analyticsData.trends.thisMonth.rating}
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        {analyticsData.trends.thisMonth.change}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Last Month</h4>
                      <p className="text-sm text-gray-600">
                        {analyticsData.trends.lastMonth.reviews} reviews
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {analyticsData.trends.lastMonth.rating}
                      </div>
                      <div className="text-sm text-gray-600">
                        {analyticsData.trends.lastMonth.change}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <RatingBreakdown 
                  ratingDistribution={ratingDistribution}
                  totalReviews={totalReviews}
                />
              </CardContent>
            </Card>

            {/* Response Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Response Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="font-medium">{analyticsData.responseRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Response Time</span>
                  <span className="font-medium">{analyticsData.avgResponseTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reviews with Photos</span>
                  <span className="font-medium">{reviewsWithPhotos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Verified Reviews</span>
                  <span className="font-medium">{verifiedReviews}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 text-sm">
                    Respond to more reviews
                  </h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Your response rate is {analyticsData.responseRate}%. 
                    Aim for 90%+ to boost customer engagement.
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 text-sm">
                    Great job on ratings!
                  </h4>
                  <p className="text-xs text-green-700 mt-1">
                    Your average rating of {averageRating.toFixed(1)} is excellent. 
                    Keep up the good work!
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 text-sm">
                    Encourage photo reviews
                  </h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    Only {Math.round((reviewsWithPhotos / totalReviews) * 100)}% of reviews have photos. 
                    Consider incentivizing photo reviews.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}