'use client'

import { useState, useEffect } from 'react'
import { Star, Gift, CheckCircle, AlertCircle, Crown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { CustomerLoyaltyAccount, RewardCatalogItem, LoyaltyTier } from '@/types/loyalty'

interface LoyaltyCheckoutProps {
  restaurantId: string
  customerEmail?: string
  orderTotal: number
  onPointsToEarn?: (points: number) => void
  onRewardApplied?: (rewardId: string, discount: number) => void
  onRewardRemoved?: () => void
  className?: string
}

interface LoyaltyCheckoutData {
  account?: CustomerLoyaltyAccount & {
    current_tier?: LoyaltyTier
    program: {
      points_per_dollar: number
    }
  }
  available_rewards: RewardCatalogItem[]
  points_to_earn: number
}

export function LoyaltyCheckout({
  restaurantId,
  customerEmail,
  orderTotal,
  onPointsToEarn,
  onRewardApplied,
  onRewardRemoved,
  className
}: LoyaltyCheckoutProps) {
  const [data, setData] = useState<LoyaltyCheckoutData | null>(null)
  const [selectedRewardId, setSelectedRewardId] = useState<string>('')
  const [appliedReward, setAppliedReward] = useState<RewardCatalogItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (customerEmail) {
      fetchLoyaltyData()
    }
  }, [customerEmail, restaurantId, orderTotal])

  useEffect(() => {
    if (data?.points_to_earn && onPointsToEarn) {
      onPointsToEarn(data.points_to_earn)
    }
  }, [data?.points_to_earn, onPointsToEarn])

  const fetchLoyaltyData = async () => {
    if (!customerEmail) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/loyalty/checkout?restaurant_id=${restaurantId}&customer_email=${encodeURIComponent(customerEmail)}&order_total=${orderTotal}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch loyalty data')
      
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
      // Don't show error toast for loyalty data - it's optional
    } finally {
      setLoading(false)
    }
  }

  const applyReward = async (rewardId: string) => {
    if (!data?.account || !customerEmail) return

    const reward = data.available_rewards.find(r => r.id === rewardId)
    if (!reward) return

    if (data.account.current_points < reward.points_cost) {
      toast({
        title: "Insufficient points",
        description: `You need ${reward.points_cost} points but only have ${data.account.current_points}.`,
        variant: "destructive"
      })
      return
    }

    try {
      setApplying(true)
      const response = await fetch('/api/loyalty/rewards/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reward_id: rewardId,
          customer_email: customerEmail,
          restaurant_id: restaurantId,
          order_total: orderTotal,
        }),
      })

      if (!response.ok) throw new Error('Failed to apply reward')

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to apply reward')

      setAppliedReward(reward)
      setSelectedRewardId('')
      
      if (onRewardApplied) {
        onRewardApplied(rewardId, result.data.discount_amount)
      }

      toast({
        title: "Reward applied!",
        description: `${reward.name} has been applied to your order.`,
      })

      // Refresh loyalty data to show updated points
      await fetchLoyaltyData()
    } catch (error) {
      toast({
        title: "Error applying reward",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setApplying(false)
    }
  }

  const removeReward = async () => {
    if (!appliedReward || !customerEmail) return

    try {
      const response = await fetch('/api/loyalty/rewards/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reward_id: appliedReward.id,
          customer_email: customerEmail,
          restaurant_id: restaurantId,
        }),
      })

      if (!response.ok) throw new Error('Failed to remove reward')

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to remove reward')

      setAppliedReward(null)
      
      if (onRewardRemoved) {
        onRewardRemoved()
      }

      toast({
        title: "Reward removed",
        description: `${appliedReward.name} has been removed from your order.`,
      })

      // Refresh loyalty data to show updated points
      await fetchLoyaltyData()
    } catch (error) {
      toast({
        title: "Error removing reward",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    }
  }

  const formatRewardValue = (reward: RewardCatalogItem) => {
    switch (reward.reward_type) {
      case 'percentage_off':
        return `${reward.value}% off`
      case 'discount':
      case 'cashback':
        return `$${reward.value.toFixed(2)} off`
      case 'free_delivery':
        return 'Free delivery'
      case 'free_item':
        return 'Free item'
      default:
        return `$${reward.value.toFixed(2)} value`
    }
  }

  const getTierColor = (tierName?: string) => {
    if (!tierName) return 'text-gray-600'
    
    switch (tierName.toLowerCase()) {
      case 'bronze':
        return 'text-orange-600'
      case 'silver':
        return 'text-gray-600'
      case 'gold':
        return 'text-yellow-600'
      case 'platinum':
        return 'text-purple-600'
      default:
        return 'text-blue-600'
    }
  }

  // Don't show anything if no customer email or still loading initial data
  if (!customerEmail || loading) {
    return null
  }

  // Show login prompt if no loyalty account
  if (!data?.account) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Join Our Loyalty Program</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sign up to earn points on this order and unlock exclusive rewards!
              </p>
              <Button 
                size="sm" 
                onClick={() => window.location.href = '/signup?redirect=checkout'}
              >
                Join Now & Earn Points
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Loyalty Rewards
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Points & Tier */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <div className="font-semibold flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              {data.account.current_points.toLocaleString()} points
            </div>
            {data.account.current_tier && (
              <div className={`text-sm font-medium ${getTierColor(data.account.current_tier.tier_name)}`}>
                {data.account.current_tier.tier_name} Member
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-sm text-muted-foreground">You'll earn</div>
            <div className="font-semibold text-green-600">
              +{data.points_to_earn} points
            </div>
          </div>
        </div>

        {/* Applied Reward */}
        {appliedReward && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-green-800">{appliedReward.name}</div>
                  <div className="text-sm text-green-600">
                    {formatRewardValue(appliedReward)} • {appliedReward.points_cost} points used
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeReward}
                className="text-green-700 hover:text-green-800 hover:bg-green-100"
              >
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Available Rewards */}
        {!appliedReward && data.available_rewards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Available Rewards</span>
            </div>
            
            <div className="grid gap-2">
              {data.available_rewards.slice(0, 3).map((reward) => {
                const canAfford = data.account!.current_points >= reward.points_cost
                
                return (
                  <div
                    key={reward.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      canAfford 
                        ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' 
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{reward.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatRewardValue(reward)} • {reward.points_cost} points
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant={canAfford ? "default" : "secondary"}
                        disabled={!canAfford || applying}
                        onClick={() => applyReward(reward.id)}
                        className="ml-2"
                      >
                        {!canAfford ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Need {reward.points_cost - data.account!.current_points} more
                          </>
                        ) : applying ? (
                          'Applying...'
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Apply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {data.available_rewards.length > 3 && (
              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => window.location.href = `/loyalty`}
                  className="text-xs"
                >
                  View all {data.available_rewards.length} rewards
                </Button>
              </div>
            )}
          </div>
        )}

        {/* No rewards available */}
        {!appliedReward && data.available_rewards.length === 0 && (
          <div className="text-center py-4">
            <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">
              No rewards available for redemption.
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Keep earning points to unlock rewards!
            </div>
          </div>
        )}

        {/* Tier Benefits Info */}
        {data.account.current_tier && data.account.current_tier.discount_percentage > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                {data.account.current_tier.tier_name} Member Benefit
              </span>
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {data.account.current_tier.discount_percentage}% discount automatically applied
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}