'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, Edit, Trash2, Star, Gift, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useRestaurant } from '@/hooks/use-restaurant'
import { Reward, RewardForm, RewardFormSchema } from '@/types/loyalty'

export default function LoyaltyRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { restaurant } = useRestaurant()
  const { toast } = useToast()

  const form = useForm<RewardForm>({
    resolver: zodResolver(RewardFormSchema),
    defaultValues: {
      name: '',
      description: '',
      points_cost: 100,
      reward_type: 'discount',
      value: 5.00,
      valid_from: new Date(),
      is_featured: false,
    }
  })

  useEffect(() => {
    if (restaurant) {
      fetchRewards()
    }
  }, [restaurant])

  const fetchRewards = async () => {
    if (!restaurant) return

    try {
      setLoading(true)
      const response = await fetch(`/api/loyalty/rewards?restaurant_id=${restaurant.id}`)
      if (!response.ok) throw new Error('Failed to fetch rewards')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to load rewards')
      
      setRewards(result.data)
    } catch (error) {
      console.error('Error fetching rewards:', error)
      toast({
        title: "Error loading rewards",
        description: "Please try refreshing the page",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReward = async (data: RewardForm) => {
    if (!restaurant) return

    try {
      const response = await fetch('/api/loyalty/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          ...data,
        }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to create reward')

      toast({
        title: "Reward created",
        description: `${data.name} has been added to your rewards catalog.`,
      })

      setIsCreateDialogOpen(false)
      form.reset()
      await fetchRewards()
    } catch (error) {
      toast({
        title: "Error creating reward",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    }
  }

  const handleUpdateReward = async (data: RewardForm) => {
    if (!restaurant || !selectedReward) return

    try {
      const response = await fetch(`/api/loyalty/rewards/${selectedReward.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to update reward')

      toast({
        title: "Reward updated",
        description: `${data.name} has been updated successfully.`,
      })

      setIsEditDialogOpen(false)
      setSelectedReward(null)
      form.reset()
      await fetchRewards()
    } catch (error) {
      toast({
        title: "Error updating reward",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    }
  }

  const handleDeleteReward = async (rewardId: string, rewardName: string) => {
    if (!confirm(`Are you sure you want to delete "${rewardName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/loyalty/rewards/${rewardId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to delete reward')

      toast({
        title: "Reward deleted",
        description: `${rewardName} has been removed from your rewards catalog.`,
      })

      await fetchRewards()
    } catch (error) {
      toast({
        title: "Error deleting reward",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    }
  }

  const formatRewardValue = (reward: Reward) => {
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

  const openEditDialog = (reward: Reward) => {
    setSelectedReward(reward)
    form.reset({
      name: reward.name,
      description: reward.description || '',
      points_cost: reward.points_cost,
      reward_type: reward.reward_type,
      value: reward.value,
      max_redemptions_per_customer: reward.max_redemptions_per_customer || undefined,
      max_total_redemptions: reward.max_total_redemptions || undefined,
      valid_from: new Date(reward.valid_from),
      valid_until: reward.valid_until ? new Date(reward.valid_until) : undefined,
      image_url: reward.image_url || '',
      is_featured: reward.is_featured,
    })
    setIsEditDialogOpen(true)
  }

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Reward
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Reward</DialogTitle>
              <DialogDescription>
                Add a new reward that customers can redeem with their points.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateReward)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reward Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., $5 Off Your Order" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="points_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe this reward..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reward_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reward Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reward type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="discount">Fixed Discount ($)</SelectItem>
                            <SelectItem value="percentage_off">Percentage Off (%)</SelectItem>
                            <SelectItem value="free_item">Free Item</SelectItem>
                            <SelectItem value="free_delivery">Free Delivery</SelectItem>
                            <SelectItem value="cashback">Cashback</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="5.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          {form.watch('reward_type') === 'percentage_off' ? 'Percentage discount' : 'Dollar amount'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="max_redemptions_per_customer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Uses Per Customer</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Leave empty for unlimited"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_total_redemptions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Total Redemptions</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Leave empty for unlimited"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Featured Reward</FormLabel>
                        <FormDescription>
                          Display this reward prominently in the rewards catalog
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Reward</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h2 className="text-2xl font-semibold">Rewards Management</h2>
        <p className="text-muted-foreground">
          Create and manage rewards that customers can redeem with their points
        </p>
      </div>

      {/* Rewards Grid */}
      {rewards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gift className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No rewards yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first reward to give customers something to redeem their points for.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Reward
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <Card key={reward.id} className="relative overflow-hidden">
              {reward.is_featured && (
                <Badge className="absolute top-2 right-2 z-10">Featured</Badge>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{reward.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {formatRewardValue(reward)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium ml-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {reward.points_cost}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {reward.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {reward.description}
                  </p>
                )}

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={reward.is_active ? "default" : "secondary"} className="text-xs">
                      {reward.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  {reward.max_redemptions_per_customer && (
                    <div className="flex justify-between">
                      <span>Max per customer:</span>
                      <span>{reward.max_redemptions_per_customer}</span>
                    </div>
                  )}
                  
                  {reward.max_total_redemptions && (
                    <div className="flex justify-between">
                      <span>Total limit:</span>
                      <span>{reward.current_total_redemptions}/{reward.max_total_redemptions}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Valid until:</span>
                    <span>
                      {reward.valid_until 
                        ? new Date(reward.valid_until).toLocaleDateString()
                        : 'No expiry'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(reward)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteReward(reward.id, reward.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reward</DialogTitle>
            <DialogDescription>
              Update the reward details and availability.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateReward)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $5 Off Your Order" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="points_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points Cost</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this reward..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reward_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reward type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="discount">Fixed Discount ($)</SelectItem>
                          <SelectItem value="percentage_off">Percentage Off (%)</SelectItem>
                          <SelectItem value="free_item">Free Item</SelectItem>
                          <SelectItem value="free_delivery">Free Delivery</SelectItem>
                          <SelectItem value="cashback">Cashback</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="5.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Featured Reward</FormLabel>
                      <FormDescription>
                        Display this reward prominently in the rewards catalog
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Reward</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}