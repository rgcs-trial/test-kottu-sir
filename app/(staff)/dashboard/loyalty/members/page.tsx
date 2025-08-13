'use client'

import { useRestaurant } from '@/hooks/use-restaurant'
import { MemberManagement } from '@/components/loyalty/member-management'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function LoyaltyMembersPage() {
  const { restaurant } = useRestaurant()

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading restaurant data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/dashboard/loyalty'}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Loyalty Dashboard
        </Button>
      </div>

      {/* Member Management Component */}
      <MemberManagement restaurantId={restaurant.id} />
    </div>
  )
}