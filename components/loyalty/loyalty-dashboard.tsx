'use client'

import { useState, useEffect } from 'react'
import { Star, Gift, Trophy, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

import { PointsDisplay } from './points-display'
import { TierProgress } from './tier-progress'
import { RewardsCatalog } from './rewards-catalog'
import { TransactionHistory } from './transaction-history'
import { ReferralProgram } from './referral-program'
import { LoyaltyDashboardData, RewardCatalogItem } from '@/types/loyalty'

interface LoyaltyDashboardProps {
  restaurantId: string
  customerEmail: string
  className?: string
}

export function LoyaltyDashboard({
  restaurantId,
  customerEmail,
  className
}: LoyaltyDashboardProps) {
  const [data, setData] = useState<LoyaltyDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeemingReward, setRedeemingReward] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchLoyaltyData()
  }, [restaurantId, customerEmail])

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/loyalty/dashboard?restaurant_id=${restaurantId}&customer_email=${customerEmail}`)
      if (!response.ok) throw new Error('Failed to fetch loyalty data')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to load loyalty program')
      
      setData(result.data)
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
      toast({
        title: "Error loading loyalty program",
        description: "Please try refreshing the page",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRewardRedemption = async (rewardId: string) => {
    if (!data) return

    try {
      setRedeemingReward(true)
      const response = await fetch('/api/loyalty/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reward_id: rewardId,
          customer_email: customerEmail,
          restaurant_id: restaurantId,
        }),
      })

      if (!response.ok) throw new Error('Failed to redeem reward')

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Redemption failed')

      // Refresh data to show updated points and redemptions
      await fetchLoyaltyData()
      
      toast({
        title: "Reward redeemed successfully!",
        description: `You've redeemed "${result.data.reward_name}" for ${result.data.points_used} points.`,
      })
    } catch (error) {
      console.error('Error redeeming reward:', error)
      toast({
        title: "Failed to redeem reward",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setRedeemingReward(false)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data || !data.account) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Star className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Welcome to Our Loyalty Program!</h2>
          <p className="text-muted-foreground text-center mb-4">
            Start earning points with your first order and unlock exclusive rewards.
          </p>
          <Button onClick={() => window.location.href = '/menu'}>
            Start Ordering
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { account, recent_transactions, available_rewards, achievements, tier_progress, expiring_points } = data

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header with key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PointsDisplay
          account={account}
          next_tier={tier_progress.next_tier}
          points_to_next_tier={tier_progress.points_to_next_tier}
        />
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-500" />
              Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{available_rewards.length}</div>
            <p className="text-sm text-muted-foreground">
              Ready to redeem
            </p>
            <div className="mt-3">
              {available_rewards.slice(0, 2).map(reward => (
                <div key={reward.id} className="flex justify-between text-sm mb-1">
                  <span className="truncate">{reward.name}</span>
                  <span className="text-muted-foreground">{reward.points_cost}pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{achievements.length}</div>
            <p className="text-sm text-muted-foreground">
              Badges earned
            </p>
            {achievements.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {achievements.slice(0, 3).map(achievement => (
                  <Badge key={achievement.id} variant="secondary" className="text-xs">
                    {achievement.achievement_id}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Points Alert */}
      {expiring_points.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Points Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiring_points.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-orange-700">
                    {item.points.toLocaleString()} points expire on {new Date(item.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="progress">Tier Progress</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="refer">Refer Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <RewardsCatalog
            rewards={available_rewards}
            current_points={account.current_points}
            onRedeemReward={handleRewardRedemption}
            loading={redeemingReward}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <TierProgress
            current_tier={account.current_tier}
            next_tier={tier_progress.next_tier}
            current_points={account.current_points}
            points_to_next_tier={tier_progress.points_to_next_tier}
            all_tiers={data.program.tiers || []}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TransactionHistory
            transactions={recent_transactions}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="refer" className="space-y-4">
          <ReferralProgram
            account={account}
            referral_bonus_points={data.program.settings?.referral_bonus_points || 50}
            restaurant_name={data.program.restaurant_name || 'this restaurant'}
            successful_referrals={account.total_referrals || 0}
            pending_referrals={0} // TODO: Add this to the backend
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold">Keep Earning</h4>
              <p className="text-sm text-muted-foreground">
                Place more orders to earn points
              </p>
            </div>
          </div>
          <Button className="w-full mt-3" onClick={() => window.location.href = '/menu'}>
            Order Now
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Gift className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold">Special Offers</h4>
              <p className="text-sm text-muted-foreground">
                Check for exclusive member deals
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-3">
            View Offers
          </Button>
        </Card>
      </div>
    </div>
  )
}