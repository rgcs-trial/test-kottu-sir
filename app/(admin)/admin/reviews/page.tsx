'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Flag,
  Clock,
  TrendingUp,
  Users
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ReviewModerationCard, BulkModerationActions } from '@/components/reviews/review-moderation';
import { moderateReview } from '@/lib/reviews/actions';

// Mock data - in real implementation, this would come from API
const mockReviews = [
  {
    id: '1',
    rating: 4,
    title: 'Great food and service',
    content: 'Had an amazing experience at this restaurant. The food was delicious and the staff was very friendly. Would definitely recommend to others.',
    reviewer_name: 'John Smith',
    is_verified_purchase: true,
    status: 'pending' as const,
    created_at: '2024-01-15T10:30:00Z',
    target_type: 'restaurant' as const,
    target_name: 'Pizza Palace',
    restaurant_name: 'Pizza Palace',
    helpful_votes: 0,
    not_helpful_votes: 0,
    reports: [],
  },
  {
    id: '2',
    rating: 1,
    title: 'Terrible experience',
    content: 'This place is absolutely disgusting. The food was cold and the service was rude. I want my money back!',
    reviewer_name: 'Anonymous',
    is_verified_purchase: false,
    status: 'flagged' as const,
    created_at: '2024-01-14T18:45:00Z',
    target_type: 'restaurant' as const,
    target_name: 'Burger Joint',
    restaurant_name: 'Burger Joint',
    helpful_votes: 2,
    not_helpful_votes: 5,
    reports: [
      {
        id: 'r1',
        reason: 'inappropriate_content',
        description: 'Contains offensive language',
        reporter_name: 'Restaurant Owner',
        created_at: '2024-01-14T19:00:00Z',
        status: 'pending',
      },
    ],
  },
  {
    id: '3',
    rating: 5,
    title: 'Outstanding meal',
    content: 'Best pasta I\'ve ever had! The ambiance was perfect and the wine selection was excellent.',
    reviewer_name: 'Maria Garcia',
    is_verified_purchase: true,
    status: 'approved' as const,
    created_at: '2024-01-13T20:15:00Z',
    target_type: 'menu_item' as const,
    target_name: 'Spaghetti Carbonara',
    restaurant_name: 'Italian Bistro',
    helpful_votes: 8,
    not_helpful_votes: 1,
    moderated_by: 'Admin User',
    moderated_at: '2024-01-14T08:00:00Z',
    reports: [],
  },
];

const mockStats = {
  total: 156,
  pending: 23,
  approved: 98,
  rejected: 15,
  flagged: 20,
  reported: 8,
  avgResponseTime: '2.3 hours',
  todayProcessed: 12,
};

export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState(mockReviews);
  const [stats, setStats] = useState(mockStats);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('pending');

  // Filter reviews based on active tab and filters
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = searchTerm === '' || 
      review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.target_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;

    const matchesTab = activeTab === 'all' || 
      (activeTab === 'pending' && review.status === 'pending') ||
      (activeTab === 'flagged' && review.status === 'flagged') ||
      (activeTab === 'reported' && review.reports && review.reports.length > 0) ||
      (activeTab === 'processed' && ['approved', 'rejected'].includes(review.status));

    return matchesSearch && matchesStatus && matchesTab;
  });

  // Handle individual review moderation
  const handleModerate = useCallback(async (
    reviewId: string, 
    action: 'approve' | 'reject' | 'flag', 
    notes?: string
  ) => {
    setLoading(true);
    try {
      const result = await moderateReview(reviewId, action, notes);
      
      if (result.success) {
        // Update local state
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged',
                moderation_notes: notes,
                moderated_at: new Date().toISOString(),
                moderated_by: 'Current User', // In real app, get from auth
              }
            : review
        ));

        // Update stats
        setStats(prev => ({
          ...prev,
          [action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged']: 
            prev[action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged'] + 1,
          pending: Math.max(0, prev.pending - 1),
          todayProcessed: prev.todayProcessed + 1,
        }));
      }
    } catch (error) {
      console.error('Moderation failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle bulk moderation
  const handleBulkModerate = useCallback(async (
    action: 'approve' | 'reject' | 'flag',
    reviewIds: string[],
    notes?: string
  ) => {
    setLoading(true);
    try {
      // In real implementation, call bulk moderation API
      const promises = reviewIds.map(id => moderateReview(id, action, notes));
      await Promise.all(promises);

      // Update local state
      setReviews(prev => prev.map(review => 
        reviewIds.includes(review.id)
          ? { 
              ...review, 
              status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged',
              moderation_notes: notes,
              moderated_at: new Date().toISOString(),
              moderated_by: 'Current User',
            }
          : review
      ));

      // Update stats
      setStats(prev => ({
        ...prev,
        [action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged']: 
          prev[action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged'] + reviewIds.length,
        pending: Math.max(0, prev.pending - reviewIds.length),
        todayProcessed: prev.todayProcessed + reviewIds.length,
      }));
    } catch (error) {
      console.error('Bulk moderation failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectReview = (reviewId: string, selected: boolean) => {
    if (selected) {
      setSelectedReviews(prev => [...prev, reviewId]);
    } else {
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedReviews(filteredReviews.map(r => r.id));
    } else {
      setSelectedReviews([]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Moderation</h1>
          <p className="text-gray-600 mt-2">
            Moderate customer reviews and handle reports
          </p>
        </div>

        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Reviews</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.flagged}</div>
                <div className="text-sm text-gray-600">Flagged</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.rejected}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.todayProcessed}</div>
                <div className="text-sm text-gray-600">Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search reviews, reviewers, or restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="selectAll"
                checked={selectedReviews.length === filteredReviews.length && filteredReviews.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="selectAll" className="text-sm text-gray-600">
                Select All
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <BulkModerationActions
        selectedReviews={selectedReviews}
        onBulkAction={handleBulkModerate}
        onClearSelection={() => setSelectedReviews([])}
      />

      {/* Review Lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="flagged" className="gap-2">
            <Flag className="h-4 w-4" />
            Flagged ({stats.flagged})
          </TabsTrigger>
          <TabsTrigger value="reported" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reported ({stats.reported})
          </TabsTrigger>
          <TabsTrigger value="processed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Processed ({stats.approved + stats.rejected})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({stats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-6">
            {filteredReviews.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No reviews to moderate</h3>
                    <p className="text-sm">
                      {activeTab === 'pending' && 'All reviews have been processed.'}
                      {activeTab === 'flagged' && 'No flagged reviews at the moment.'}
                      {activeTab === 'reported' && 'No reported reviews to review.'}
                      {activeTab === 'processed' && 'No processed reviews match your filters.'}
                      {activeTab === 'all' && 'No reviews match your search criteria.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {filteredReviews.map((review) => (
                  <div key={review.id} className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedReviews.includes(review.id)}
                      onChange={(e) => handleSelectReview(review.id, e.target.checked)}
                      className="mt-6 rounded"
                    />
                    <ReviewModerationCard
                      review={review}
                      onModerate={handleModerate}
                      className="flex-1"
                    />
                  </div>
                ))}

                {/* Load More */}
                {filteredReviews.length >= 10 && (
                  <div className="text-center pt-6">
                    <Button variant="outline" disabled={loading}>
                      {loading ? 'Loading...' : 'Load More Reviews'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}