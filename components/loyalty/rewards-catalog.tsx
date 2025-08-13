'use client'

import { useState } from 'react'
import { Gift, Star, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { RewardCatalogItem } from '@/types/loyalty'
import { OptimizedImage } from '@/components/common/optimized-image'

interface RewardsCatalogProps {
  rewards: RewardCatalogItem[]
  current_points: number
  onRedeemReward: (rewardId: string) => Promise<void>
  loading?: boolean
  className?: string
}

export function RewardsCatalog({
  rewards,
  current_points,
  onRedeemReward,
  loading = false,
  className
}: RewardsCatalogProps) {
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [selectedReward, setSelectedReward] = useState<RewardCatalogItem | null>(null)
  const { toast } = useToast()

  const handleRedemption = async (reward: RewardCatalogItem) => {
    if (!reward.can_redeem || current_points < reward.points_cost) {
      toast({
        title: "Cannot redeem reward",
        description: "You don't have enough points for this reward.",
        variant: "destructive"
      })
      return
    }

    setRedeeming(reward.id)
    try {
      await onRedeemReward(reward.id)
      toast({
        title: "Reward redeemed!",
        description: `You've successfully redeemed ${reward.name}. Check your orders to use it.`,
      })
      setSelectedReward(null)
    } catch (error) {
      toast({
        title: "Redemption failed",
        description: "There was an error redeeming your reward. Please try again.",
        variant: "destructive"
      })
    } finally {
      setRedeeming(null)
    }
  }

  const formatRewardValue = (reward: RewardCatalogItem) => {
    switch (reward.reward_type) {
      case 'percentage_off':
        return `${reward.value}% off`
      case 'discount':
      case 'cashback':
        return `$${reward.value.toFixed(2)}`
      case 'free_delivery':
        return 'Free delivery'
      case 'free_item':
        return 'Free item'
      default:
        return `$${reward.value.toFixed(2)} value`
    }
  }

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'free_delivery':
        return <Gift className="h-5 w-5" />
      case 'percentage_off':
      case 'discount':
        return <Star className="h-5 w-5" />
      default:
        return <Gift className="h-5 w-5" />
    }
  }

  if (rewards.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Gift className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No rewards available</h3>
          <p className="text-muted-foreground text-center">
            Check back later for new rewards to redeem with your points!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Available Rewards</h3>
        <Badge variant="secondary">
          {current_points.toLocaleString()} points available
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => {
          const canAfford = current_points >= reward.points_cost
          const canRedeem = reward.can_redeem && canAfford && !reward.redemption_limit_reached

          return (
            <Card 
              key={reward.id} 
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                !canRedeem ? 'opacity-60' : 'hover:shadow-lg'
              }`}
            >
              {reward.is_featured && (
                <Badge className="absolute top-2 right-2 z-10" variant="default">
                  Featured
                </Badge>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {reward.image_url ? (
                    <OptimizedImage
                      src={reward.image_url}
                      alt={reward.name}
                      width={60}
                      height={60}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-15 h-15 bg-muted rounded-lg flex items-center justify-center">
                      {getRewardIcon(reward.reward_type)}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">
                      {reward.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {formatRewardValue(reward)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {reward.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {reward.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {reward.points_cost.toLocaleString()} points
                  </div>
                  
                  {reward.valid_until && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Expires {new Date(reward.valid_until).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Usage limits display */}
                {reward.max_redemptions_per_customer && (
                  <div className="text-xs text-muted-foreground">
                    {reward.redemption_limit_reached 
                      ? 'Limit reached' 
                      : `${(reward.user_redemption_count || 0)} of ${reward.max_redemptions_per_customer} used`
                    }
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant={canRedeem ? "default" : "secondary"}
                      className="w-full"
                      disabled={!canRedeem || loading}
                      onClick={() => setSelectedReward(reward)}
                    >
                      {!canAfford ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Not enough points
                        </>
                      ) : !canRedeem ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Cannot redeem
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Redeem
                        </>
                      )}
                    </Button>
                  </DialogTrigger>

                  {selectedReward && (
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Redeem Reward</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to redeem "{selectedReward.name}" for {selectedReward.points_cost.toLocaleString()} points?
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                          {selectedReward.image_url ? (
                            <OptimizedImage
                              src={selectedReward.image_url}
                              alt={selectedReward.name}
                              width={60}
                              height={60}
                              className="rounded object-cover"
                            />
                          ) : (
                            <div className="w-15 h-15 bg-background rounded flex items-center justify-center">
                              {getRewardIcon(selectedReward.reward_type)}
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-semibold">{selectedReward.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatRewardValue(selectedReward)}
                            </p>
                            {selectedReward.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedReward.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span>Current points:</span>
                          <span className="font-medium">{current_points.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Points needed:</span>
                          <span className="font-medium">{selectedReward.points_cost.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold border-t pt-2">
                          <span>Points after redemption:</span>
                          <span>{(current_points - selectedReward.points_cost).toLocaleString()}</span>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedReward(null)}
                          disabled={redeeming === selectedReward.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleRedemption(selectedReward)}
                          disabled={redeeming === selectedReward.id || !canRedeem}
                          loading={redeeming === selectedReward.id}
                        >
                          {redeeming === selectedReward.id ? 'Redeeming...' : 'Confirm Redemption'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  )}
                </Dialog>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}