'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, Save, Mail, Star, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { LoyaltySettingsForm, LoyaltySettingsFormSchema } from '@/types/loyalty'

interface LoyaltySettingsProps {
  initialSettings: LoyaltySettingsForm
  onSave: (settings: LoyaltySettingsForm) => Promise<void>
  loading?: boolean
  className?: string
}

export function LoyaltySettings({
  initialSettings,
  onSave,
  loading = false,
  className
}: LoyaltySettingsProps) {
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const form = useForm<LoyaltySettingsForm>({
    resolver: zodResolver(LoyaltySettingsFormSchema),
    defaultValues: initialSettings
  })

  const handleSave = async (data: LoyaltySettingsForm) => {
    try {
      setSaving(true)
      await onSave(data)
      toast({
        title: "Settings saved",
        description: "Your loyalty program settings have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Loyalty Program Settings</h2>
          <p className="text-muted-foreground">
            Configure your loyalty program behavior and customer communications
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Points & Rewards Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Points & Rewards
              </CardTitle>
              <CardDescription>
                Configure point earning and special bonuses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birthday_bonus_points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birthday Bonus Points</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Points awarded on customer's birthday
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referral_bonus_points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referral Bonus Points</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Points for successful referrals
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="points_expiry_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points Expiry (Months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="12"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        How long points remain valid
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="round_points_to_nearest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round Points To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rounding" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Nearest 1 point</SelectItem>
                          <SelectItem value="5">Nearest 5 points</SelectItem>
                          <SelectItem value="10">Nearest 10 points</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How to round fractional points
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="allow_negative_points"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Allow Negative Points</FormLabel>
                      <FormDescription>
                        Permit customers to redeem more points than they have (creates debt)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure automatic email communications with customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="send_welcome_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Welcome Email</FormLabel>
                      <FormDescription>
                        Send welcome email when customer joins loyalty program
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="send_points_earned_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Points Earned Email</FormLabel>
                      <FormDescription>
                        Notify customers when they earn points from orders
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="send_tier_upgrade_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Tier Upgrade Email</FormLabel>
                      <FormDescription>
                        Congratulate customers when they reach new tiers
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="send_birthday_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Birthday Email</FormLabel>
                      <FormDescription>
                        Send birthday wishes with bonus points
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="send_expiry_reminder_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Points Expiry Reminder</FormLabel>
                      <FormDescription>
                        Remind customers before their points expire
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Display Settings
              </CardTitle>
              <CardDescription>
                Control what customers see in their loyalty experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="show_points_on_receipts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Points on Receipts</FormLabel>
                      <FormDescription>
                        Display points earned and balance on order receipts
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="show_tier_progress"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Tier Progress</FormLabel>
                      <FormDescription>
                        Display progress towards next tier in customer dashboard
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="show_referral_program"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Referral Program</FormLabel>
                      <FormDescription>
                        Enable referral program features for customers
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving || loading}
              className="min-w-[120px]"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}