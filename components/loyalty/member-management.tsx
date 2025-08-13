'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Mail, Star, TrendingUp, Crown, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { CustomerLoyaltyAccount, LoyaltyTier } from '@/types/loyalty'

interface MemberWithTier extends CustomerLoyaltyAccount {
  current_tier?: LoyaltyTier
}

interface MemberManagementProps {
  restaurantId: string
  className?: string
}

export function MemberManagement({
  restaurantId,
  className
}: MemberManagementProps) {
  const [members, setMembers] = useState<MemberWithTier[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberWithTier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<MemberWithTier | null>(null)
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchMembers()
    fetchTiers()
  }, [restaurantId])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, tierFilter])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/loyalty/members?restaurant_id=${restaurantId}`)
      if (!response.ok) throw new Error('Failed to fetch members')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to load members')
      
      setMembers(result.data)
    } catch (error) {
      console.error('Error fetching members:', error)
      toast({
        title: "Error loading members",
        description: "Please try refreshing the page",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTiers = async () => {
    try {
      const response = await fetch(`/api/loyalty/tiers?restaurant_id=${restaurantId}`)
      if (!response.ok) throw new Error('Failed to fetch tiers')
      
      const result = await response.json()
      if (result.success) {
        setTiers(result.data)
      }
    } catch (error) {
      console.error('Error fetching tiers:', error)
    }
  }

  const filterMembers = () => {
    let filtered = members

    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(member => 
        member.current_tier?.tier_name.toLowerCase() === tierFilter.toLowerCase()
      )
    }

    setFilteredMembers(filtered)
  }

  const exportMembers = async () => {
    try {
      const response = await fetch(`/api/loyalty/members/export?restaurant_id=${restaurantId}`)
      if (!response.ok) throw new Error('Failed to export members')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `loyalty-members-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Export successful",
        description: "Member data has been downloaded as CSV",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export member data",
        variant: "destructive"
      })
    }
  }

  const adjustPoints = async (memberId: string, points: number, description: string) => {
    try {
      const response = await fetch('/api/loyalty/points/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: memberId,
          points,
          description,
        }),
      })

      if (!response.ok) throw new Error('Failed to adjust points')

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Points adjustment failed')

      await fetchMembers()
      toast({
        title: "Points adjusted",
        description: `Successfully ${points > 0 ? 'added' : 'removed'} ${Math.abs(points)} points`,
      })
    } catch (error) {
      toast({
        title: "Error adjusting points",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    }
  }

  const getTierColor = (tierName?: string) => {
    if (!tierName) return 'bg-gray-100 text-gray-800'
    
    switch (tierName.toLowerCase()) {
      case 'bronze':
        return 'bg-orange-100 text-orange-800'
      case 'silver':
        return 'bg-gray-100 text-gray-800'
      case 'gold':
        return 'bg-yellow-100 text-yellow-800'
      case 'platinum':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getTierIcon = (tierName?: string) => {
    if (!tierName) return <Star className="h-4 w-4" />
    
    switch (tierName.toLowerCase()) {
      case 'platinum':
        return <Crown className="h-4 w-4" />
      case 'gold':
        return <Star className="h-4 w-4" />
      default:
        return <Star className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Loyalty Members</h2>
          <p className="text-muted-foreground">
            Manage your loyalty program members and their accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportMembers}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{members.length}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {members.filter(m => {
                    const lastActivity = new Date(m.last_activity)
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                    return lastActivity > thirtyDaysAgo
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Active (30d)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {members.filter(m => m.current_tier?.tier_name.toLowerCase().includes('gold') || m.current_tier?.tier_name.toLowerCase().includes('platinum')).length}
                </div>
                <div className="text-sm text-muted-foreground">VIP Members</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(members.reduce((sum, m) => sum + m.current_points, 0) / members.length) || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg Points</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {tiers.map(tier => (
                  <SelectItem key={tier.id} value={tier.tier_name.toLowerCase()}>
                    {tier.tier_name}
                  </SelectItem>
                ))}
                <SelectItem value="none">No Tier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {member.customer_email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <div className="font-medium">{member.customer_email}</div>
                    <div className="text-sm text-muted-foreground">
                      Joined {new Date(member.join_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="font-semibold">
                      {member.current_points.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>

                  <div className="text-center">
                    <div className="font-semibold">{member.total_orders}</div>
                    <div className="text-xs text-muted-foreground">Orders</div>
                  </div>

                  <div className="text-center">
                    <div className="font-semibold">
                      ${member.total_spent.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Spent</div>
                  </div>

                  <Badge className={getTierColor(member.current_tier?.tier_name)}>
                    <div className="flex items-center gap-1">
                      {getTierIcon(member.current_tier?.tier_name)}
                      {member.current_tier?.tier_name || 'No Tier'}
                    </div>
                  </Badge>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMember(member)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    
                    {selectedMember && (
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Member Details</DialogTitle>
                          <DialogDescription>
                            {selectedMember.customer_email}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Current Points</div>
                              <div className="font-semibold text-lg">
                                {selectedMember.current_points.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Lifetime Points</div>
                              <div className="font-semibold text-lg">
                                {selectedMember.lifetime_points.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Total Orders</div>
                              <div className="font-semibold">{selectedMember.total_orders}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Total Spent</div>
                              <div className="font-semibold">
                                ${selectedMember.total_spent.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground mb-2">Current Tier</div>
                            <Badge className={getTierColor(selectedMember.current_tier?.tier_name)}>
                              <div className="flex items-center gap-1">
                                {getTierIcon(selectedMember.current_tier?.tier_name)}
                                {selectedMember.current_tier?.tier_name || 'No Tier'}
                              </div>
                            </Badge>
                          </div>

                          <div>
                            <div className="text-sm text-muted-foreground">Last Activity</div>
                            <div>{new Date(selectedMember.last_activity).toLocaleDateString()}</div>
                          </div>

                          {selectedMember.referral_code && (
                            <div>
                              <div className="text-sm text-muted-foreground">Referral Code</div>
                              <div className="font-mono text-sm">
                                {selectedMember.referral_code}
                              </div>
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustPoints(selectedMember.id, 50, 'Manual bonus points')}
                            >
                              +50 Points
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustPoints(selectedMember.id, -50, 'Manual point deduction')}
                            >
                              -50 Points
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No members found</h3>
                <p className="text-muted-foreground">
                  {members.length === 0 
                    ? "No customers have joined your loyalty program yet"
                    : "No members match your current filters"
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}