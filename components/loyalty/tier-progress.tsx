'use client'

import { Crown, Star, TrendingUp, Gift } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoyaltyTier } from '@/types/loyalty'

interface TierProgressProps {
  current_tier?: LoyaltyTier
  next_tier?: LoyaltyTier
  current_points: number
  points_to_next_tier?: number
  all_tiers: LoyaltyTier[]
  className?: string
}

export function TierProgress({
  current_tier,
  next_tier,
  current_points,
  points_to_next_tier,
  all_tiers,
  className
}: TierProgressProps) {
  const progress_percentage = next_tier && points_to_next_tier 
    ? Math.max(0, Math.min(100, ((next_tier.min_points - points_to_next_tier) / next_tier.min_points) * 100))
    : 100

  const getTierColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze':
        return 'bg-orange-500 border-orange-500'
      case 'silver':
        return 'bg-gray-500 border-gray-500'
      case 'gold':
        return 'bg-yellow-500 border-yellow-500'
      case 'platinum':
        return 'bg-purple-500 border-purple-500'
      default:
        return 'bg-blue-500 border-blue-500'
    }
  }

  const getTierIcon = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'platinum':
        return <Crown className="h-4 w-4" />
      case 'gold':
        return <Star className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Membership Tiers
        </CardTitle>
        <CardDescription>
          Your progress through our loyalty program
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Tier Status */}
        <div className="text-center space-y-2">
          {current_tier ? (
            <>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white ${getTierColor(current_tier.tier_name)}`}>
                {getTierIcon(current_tier.tier_name)}
                <span className="font-semibold">{current_tier.tier_name} Member</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {current_points.toLocaleString()} points earned
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground">
                <Gift className="h-4 w-4" />
                <span className="font-semibold">New Member</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Start earning points to unlock tiers!
              </p>
            </>
          )}
        </div>

        {/* Progress to Next Tier */}
        {next_tier && points_to_next_tier ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Next: {next_tier.tier_name}
              </span>
              <span className="text-sm text-muted-foreground">
                {points_to_next_tier} points to go
              </span>
            </div>
            <Progress value={progress_percentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{current_points.toLocaleString()}</span>
              <span>{next_tier.min_points.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-green-50 rounded-lg border border-green-200">
            <Crown className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-800">Highest Tier Achieved!</p>
            <p className="text-sm text-green-600">
              You've reached the top of our loyalty program
            </p>
          </div>
        )}

        {/* All Tiers Overview */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">All Tiers</h4>
          <div className="space-y-2">
            {all_tiers
              .sort((a, b) => a.tier_level - b.tier_level)
              .map((tier) => {
                const isCurrentTier = current_tier?.id === tier.id
                const isCompleted = current_points >= tier.min_points
                
                return (
                  <div
                    key={tier.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isCurrentTier 
                        ? 'bg-primary/5 border-primary' 
                        : isCompleted
                        ? 'bg-green-50 border-green-200'
                        : 'bg-muted/30 border-muted'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      isCurrentTier 
                        ? getTierColor(tier.tier_name)
                        : isCompleted
                        ? 'bg-green-500'
                        : 'bg-muted-foreground/30'
                    }`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${
                          isCurrentTier ? 'text-primary' : isCompleted ? 'text-green-700' : 'text-muted-foreground'
                        }`}>
                          {tier.tier_name}
                        </span>
                        {isCurrentTier && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{tier.min_points.toLocaleString()}+ points</span>
                        {tier.discount_percentage > 0 && (
                          <span>{tier.discount_percentage}% discount</span>
                        )}
                        {tier.multiplier > 1 && (
                          <span>{tier.multiplier}x points</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {tier.perks && tier.perks.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {tier.perks.slice(0, 2).join(', ')}
                          {tier.perks.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Next Tier Benefits Preview */}
        {next_tier && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              Unlock {next_tier.tier_name} Benefits:
            </h4>
            <div className="space-y-1 text-sm text-blue-700">
              {next_tier.discount_percentage > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3" />
                  {next_tier.discount_percentage}% discount on all orders
                </div>
              )}
              {next_tier.multiplier > 1 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  {next_tier.multiplier}x points multiplier
                </div>
              )}
              {next_tier.perks?.map((perk, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Gift className="h-3 w-3" />
                  {perk}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}