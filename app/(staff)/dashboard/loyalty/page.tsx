'use client'

import { useState, useEffect } from 'react'
import { Crown, Star, Users, TrendingUp, Settings, Gift, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { LoyaltySettings } from '@/components/loyalty/loyalty-settings'
import { useRestaurant } from '@/hooks/use-restaurant'

interface LoyaltyStats {
  total_members: number
  active_members: number
  points_issued: number
  points_redeemed: number
  rewards_redeemed: number
  tier_breakdown: Array<{
    tier_name: string
    member_count: number
    percentage: number
  }>
}

export default function LoyaltyDashboardPage() {
  const [stats, setStats] = useState<LoyaltyStats | null>(null)
  const [loyaltyProgram, setLoyaltyProgram] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const { restaurant } = useRestaurant()
  const { toast } = useToast()

  useEffect(() => {
    if (restaurant) {
      fetchLoyaltyData()
    }
  }, [restaurant])

  const fetchLoyaltyData = async () => {
    if (!restaurant) return

    try {
      setLoading(true)
      
      // Fetch loyalty program
      const programResponse = await fetch(`/api/loyalty/program?restaurant_id=${restaurant.id}`)
      const programResult = await programResponse.json()
      
      if (programResult.success) {
        setLoyaltyProgram(programResult.data)
        
        // Fetch stats if program exists
        const statsResponse = await fetch(`/api/loyalty/stats?restaurant_id=${restaurant.id}`)
        const statsResult = await statsResponse.json()
        
        if (statsResult.success) {
          setStats(statsResult.data)
        }
      }
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

  const createLoyaltyProgram = async () => {
    if (!restaurant) return

    try {
      const response = await fetch('/api/loyalty/program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          name: `${restaurant.name} Loyalty`,
          description: 'Earn points with every order and unlock exclusive rewards!',
          program_type: 'points',
          points_per_dollar: 1,
          welcome_bonus: 100,
        }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to create program')

      toast({
        title: "Loyalty program created!",
        description: "Your loyalty program is now active and ready for customers.",
      })

      await fetchLoyaltyData()
    } catch (error) {
      toast({
        title: "Error creating loyalty program",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!loyaltyProgram) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Loyalty Program</h1>
          <p className="text-muted-foreground">
            Set up and manage your customer loyalty program
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Crown className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Create Your Loyalty Program</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Increase customer retention and boost revenue with a points-based loyalty program. 
              Reward customers for their loyalty and encourage repeat visits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full max-w-2xl">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Points System</h3>
                <p className="text-sm text-muted-foreground">
                  Customers earn points with every purchase
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Crown className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Tier Levels</h3>
                <p className="text-sm text-muted-foreground">
                  Bronze, Silver, Gold, and Platinum tiers
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Gift className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Rewards Catalog</h3>
                <p className="text-sm text-muted-foreground">
                  Discounts, free items, and special offers
                </p>
              </div>
            </div>

            <Button onClick={createLoyaltyProgram} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Loyalty Program
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            Loyalty Program
          </h1>
          <p className="text-muted-foreground">
            Manage your {loyaltyProgram.name} and track member engagement
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => window.location.href = '/dashboard/loyalty/rewards'}>
            <Gift className="h-4 w-4 mr-2" />
            Manage Rewards
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total_members.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Members</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.active_members.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Active (30d)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.points_issued.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Points Issued</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Gift className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.rewards_redeemed.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Rewards Redeemed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Program Status */}
            <Card>
              <CardHeader>
                <CardTitle>Program Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant={loyaltyProgram.is_active ? "default" : "secondary"}>
                    {loyaltyProgram.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Points per Dollar</span>
                  <span className="font-semibold">{loyaltyProgram.points_per_dollar}x</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Welcome Bonus</span>
                  <span className="font-semibold">{loyaltyProgram.welcome_bonus} points</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Program Type</span>
                  <span className="font-semibold capitalize">{loyaltyProgram.program_type}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tier Breakdown */}
            {stats && stats.tier_breakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Member Tiers</CardTitle>
                  <CardDescription>Distribution of members across tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.tier_breakdown.map((tier) => (
                      <div key={tier.tier_name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            tier.tier_name === 'Bronze' ? 'bg-orange-500' :
                            tier.tier_name === 'Silver' ? 'bg-gray-400' :
                            tier.tier_name === 'Gold' ? 'bg-yellow-500' :
                            tier.tier_name === 'Platinum' ? 'bg-purple-500' : 'bg-blue-500'
                          }`} />
                          <span className="font-medium">{tier.tier_name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{tier.member_count}</div>
                          <div className="text-xs text-muted-foreground">{tier.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => window.location.href = '/dashboard/loyalty/members'}>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Manage Members</h3>
                  <p className="text-sm text-muted-foreground">View and manage loyalty members</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => window.location.href = '/dashboard/loyalty/rewards'}>
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold">Manage Rewards</h3>
                  <p className="text-sm text-muted-foreground">Create and edit reward offerings</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveTab('settings')}>
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold">Program Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure loyalty program rules</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Member Management</h3>
              <p className="text-muted-foreground mb-4">
                View and manage your loyalty program members in the dedicated section.
              </p>
              <Button onClick={() => window.location.href = '/dashboard/loyalty/members'}>
                Go to Member Management
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardContent className="p-6 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Rewards Management</h3>
              <p className="text-muted-foreground mb-4">
                Create and manage rewards that customers can redeem with their points.
              </p>
              <Button onClick={() => window.location.href = '/dashboard/loyalty/rewards'}>
                Go to Rewards Management
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <LoyaltySettings
            initialSettings={{
              birthday_bonus_points: 100,
              referral_bonus_points: 50,
              points_expiry_months: 12,
              send_welcome_email: true,
              send_points_earned_email: true,
              send_tier_upgrade_email: true,
              send_birthday_email: true,
              send_expiry_reminder_email: true,
              show_points_on_receipts: true,
              show_tier_progress: true,
              show_referral_program: true,
              allow_negative_points: false,
              round_points_to_nearest: '1',
            }}
            onSave={async (settings) => {
              if (!restaurant) return
              
              const response = await fetch('/api/loyalty/settings', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  restaurant_id: restaurant.id,
                  ...settings,
                }),
              })

              const result = await response.json()
              if (!result.success) throw new Error(result.error || 'Failed to save settings')
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}