'use client'

import { Star, Gift, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CustomerLoyaltyAccount, LoyaltyTier } from '@/types/loyalty'

interface PointsDisplayProps {
  account: CustomerLoyaltyAccount & {
    current_tier?: LoyaltyTier
  }
  next_tier?: LoyaltyTier
  points_to_next_tier?: number
  className?: string
}

export function PointsDisplay({ 
  account, 
  next_tier, 
  points_to_next_tier,
  className 
}: PointsDisplayProps) {
  const progress_percentage = next_tier && points_to_next_tier 
    ? Math.max(0, Math.min(100, ((next_tier.min_points - points_to_next_tier) / next_tier.min_points) * 100))
    : 100

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              {account.current_points.toLocaleString()}
            </CardTitle>
            <CardDescription>Available Points</CardDescription>
          </div>
          {account.current_tier && (
            <Badge 
              variant="secondary" 
              className={`
                px-3 py-1 font-medium
                ${account.current_tier.tier_name === 'Bronze' ? 'bg-orange-100 text-orange-800' : ''}
                ${account.current_tier.tier_name === 'Silver' ? 'bg-gray-100 text-gray-800' : ''}
                ${account.current_tier.tier_name === 'Gold' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${account.current_tier.tier_name === 'Platinum' ? 'bg-purple-100 text-purple-800' : ''}
              `}
            >
              {account.current_tier.tier_name}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tier Progress */}
        {next_tier && points_to_next_tier ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Next tier: {next_tier.tier_name}
              </span>
              <span className="font-medium">
                {points_to_next_tier} points to go
              </span>
            </div>
            <Progress value={progress_percentage} className="h-2" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Gift className="h-4 w-4" />
            <span>Highest tier achieved!</span>
          </div>
        )}

        {/* Points Summary */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold text-lg">
              {account.lifetime_points.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Lifetime Points
            </div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold text-lg flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {account.current_tier?.multiplier ? `${account.current_tier.multiplier}x` : '1x'}
            </div>
            <div className="text-sm text-muted-foreground">
              Points Multiplier
            </div>
          </div>
        </div>

        {/* Current Tier Benefits */}
        {account.current_tier && account.current_tier.perks && account.current_tier.perks.length > 0 && (
          <div className="pt-2 border-t">
            <h4 className="font-medium text-sm mb-2">Current Benefits:</h4>
            <div className="flex flex-wrap gap-1">
              {account.current_tier.perks.map((perk, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {perk}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}