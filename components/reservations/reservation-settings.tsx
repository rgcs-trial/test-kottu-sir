"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { 
  Settings,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Bell,
  CreditCard,
  Shield,
  Mail,
  MessageSquare
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface ReservationSettingsProps {
  restaurantId: string
  onSettingsUpdate?: (settings: any) => void
  className?: string
}

const operatingHoursSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  is_closed: z.boolean(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  break_start: z.string().optional(),
  break_end: z.string().optional(),
  accept_reservations: z.boolean(),
  max_party_size: z.number().min(1).max(50),
})

const reservationSettingsSchema = z.object({
  // General Settings
  accept_reservations: z.boolean(),
  advance_booking_days: z.number().min(1).max(90),
  min_advance_hours: z.number().min(0).max(48),
  max_party_size: z.number().min(1).max(50),
  default_duration_minutes: z.number().min(30).max(300),
  buffer_minutes: z.number().min(0).max(60),
  
  // Time Slots
  enable_time_slots: z.boolean(),
  slot_duration_minutes: z.number().min(15).max(120),
  max_reservations_per_slot: z.number().min(1).max(100),
  
  // Waitlist
  enable_waitlist: z.boolean(),
  max_waitlist_size: z.number().min(1).max(100),
  auto_waitlist_notifications: z.boolean(),
  waitlist_expiry_hours: z.number().min(1).max(48),
  
  // Deposits & Payments
  require_deposit: z.boolean(),
  deposit_amount: z.number().min(0),
  deposit_type: z.enum(['fixed', 'per_person']),
  cancellation_fee: z.number().min(0),
  no_show_fee: z.number().min(0),
  
  // Policies
  cancellation_hours: z.number().min(0).max(72),
  modification_hours: z.number().min(0).max(48),
  auto_confirm: z.boolean(),
  auto_release_minutes: z.number().min(5).max(60),
  
  // Notifications
  email_confirmations: z.boolean(),
  sms_confirmations: z.boolean(),
  email_reminders: z.boolean(),
  sms_reminders: z.boolean(),
  reminder_hours: z.number().min(1).max(48),
  
  // Special Occasions
  special_occasion_handling: z.boolean(),
  birthday_perks: z.boolean(),
  anniversary_perks: z.boolean(),
  
  // Operating Hours
  operating_hours: z.array(operatingHoursSchema),
  
  // Custom Messages
  booking_confirmation_message: z.string().optional(),
  cancellation_policy_message: z.string().optional(),
  special_instructions: z.string().optional(),
})

type ReservationSettingsData = z.infer<typeof reservationSettingsSchema>

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function ReservationSettings({
  restaurantId,
  onSettingsUpdate,
  className
}: ReservationSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const form = useForm<ReservationSettingsData>({
    resolver: zodResolver(reservationSettingsSchema),
    defaultValues: {
      accept_reservations: true,
      advance_booking_days: 30,
      min_advance_hours: 2,
      max_party_size: 8,
      default_duration_minutes: 90,
      buffer_minutes: 15,
      enable_time_slots: true,
      slot_duration_minutes: 30,
      max_reservations_per_slot: 10,
      enable_waitlist: true,
      max_waitlist_size: 50,
      auto_waitlist_notifications: true,
      waitlist_expiry_hours: 24,
      require_deposit: false,
      deposit_amount: 0,
      deposit_type: 'fixed',
      cancellation_fee: 0,
      no_show_fee: 0,
      cancellation_hours: 24,
      modification_hours: 2,
      auto_confirm: false,
      auto_release_minutes: 15,
      email_confirmations: true,
      sms_confirmations: false,
      email_reminders: true,
      sms_reminders: false,
      reminder_hours: 24,
      special_occasion_handling: true,
      birthday_perks: true,
      anniversary_perks: true,
      operating_hours: daysOfWeek.map(day => ({
        day_of_week: day.value,
        is_closed: day.value === 1, // Closed on Mondays by default
        open_time: day.value === 1 ? undefined : "11:30",
        close_time: day.value === 1 ? undefined : "22:00",
        accept_reservations: day.value !== 1,
        max_party_size: 8,
      })),
    },
  })

  const { fields: hourFields } = useFieldArray({
    control: form.control,
    name: "operating_hours",
  })

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/restaurants/${restaurantId}/reservation-settings`)
      
      if (response.ok) {
        const data = await response.json()
        form.reset(data.settings)
      }
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [restaurantId])

  // Watch for changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Handle form submission
  const handleSubmit = async (data: ReservationSettingsData) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/restaurants/${restaurantId}/reservation-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const updatedSettings = await response.json()
      onSettingsUpdate?.(updatedSettings)
      setHasChanges(false)
      setError(null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    form.reset()
    setHasChanges(false)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Reservation Settings
        </CardTitle>
        <CardDescription>
          Configure how reservations work for your restaurant
        </CardDescription>
        
        {hasChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don't forget to save your settings.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="hours">Hours</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="accept_reservations"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Accept Reservations</FormLabel>
                            <FormDescription>
                              Allow customers to make reservations online
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

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="advance_booking_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Advance Booking (Days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="90"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              How far in advance customers can book
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="min_advance_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Notice (Hours)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="48"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Minimum hours before reservation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_party_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Party Size</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="50"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum guests per reservation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Time Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="default_duration_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Duration (Minutes)</FormLabel>
                            <FormControl>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="60">60 minutes</SelectItem>
                                  <SelectItem value="90">90 minutes</SelectItem>
                                  <SelectItem value="120">2 hours</SelectItem>
                                  <SelectItem value="150">2.5 hours</SelectItem>
                                  <SelectItem value="180">3 hours</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="buffer_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Buffer Time (Minutes)</FormLabel>
                            <FormControl>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">No buffer</SelectItem>
                                  <SelectItem value="15">15 minutes</SelectItem>
                                  <SelectItem value="30">30 minutes</SelectItem>
                                  <SelectItem value="45">45 minutes</SelectItem>
                                  <SelectItem value="60">60 minutes</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Time between reservations for cleaning/setup
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="enable_time_slots"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Enable Time Slots</FormLabel>
                            <FormDescription>
                              Organize reservations into specific time slots
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

                    {form.watch('enable_time_slots') && (
                      <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                        <FormField
                          control={form.control}
                          name="slot_duration_minutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slot Duration (Minutes)</FormLabel>
                              <FormControl>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="15">15 minutes</SelectItem>
                                    <SelectItem value="30">30 minutes</SelectItem>
                                    <SelectItem value="45">45 minutes</SelectItem>
                                    <SelectItem value="60">60 minutes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="max_reservations_per_slot"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Reservations Per Slot</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="100"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Waitlist Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="enable_waitlist"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Enable Waitlist</FormLabel>
                            <FormDescription>
                              Allow customers to join a waitlist when no tables are available
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

                    {form.watch('enable_waitlist') && (
                      <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="max_waitlist_size"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Waitlist Size</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    max="100"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="waitlist_expiry_hours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Entry Expiry (Hours)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    max="48"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  How long waitlist entries stay active
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="auto_waitlist_notifications"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Auto Notifications</FormLabel>
                                <FormDescription>
                                  Automatically notify waitlist customers when tables become available
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Operating Hours */}
              <TabsContent value="hours" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Operating Hours</CardTitle>
                    <CardDescription>
                      Set your restaurant's operating hours for each day of the week
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hourFields.map((field, index) => (
                      <div key={field.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">{daysOfWeek[index].label}</h4>
                          <FormField
                            control={form.control}
                            name={`operating_hours.${index}.is_closed`}
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormLabel className="text-sm">Closed</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        {!form.watch(`operating_hours.${index}.is_closed`) && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField
                              control={form.control}
                              name={`operating_hours.${index}.open_time`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Open Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`operating_hours.${index}.close_time`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Close Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`operating_hours.${index}.break_start`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Break Start (Optional)</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`operating_hours.${index}.break_end`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Break End (Optional)</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {!form.watch(`operating_hours.${index}.is_closed`) && (
                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                            <FormField
                              control={form.control}
                              name={`operating_hours.${index}.accept_reservations`}
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                  <FormLabel>Accept Reservations</FormLabel>
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
                              name={`operating_hours.${index}.max_party_size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Max Party Size</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      max="50"
                                      {...field}
                                      onChange={e => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Policies */}
              <TabsContent value="policies" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Policies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cancellation_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cancellation Notice (Hours)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="72"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Hours before reservation that cancellation is allowed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="modification_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modification Notice (Hours)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="48"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Hours before reservation that modifications are allowed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="auto_confirm"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Auto-Confirm Reservations</FormLabel>
                            <FormDescription>
                              Automatically confirm new reservations without manual review
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
                      name="auto_release_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Auto-Release No-Show Tables (Minutes)</FormLabel>
                          <FormControl>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="45">45 minutes</SelectItem>
                                <SelectItem value="60">60 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            How long to wait before marking no-shows and releasing tables
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Special Occasions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="special_occasion_handling"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Special Occasion Handling</FormLabel>
                            <FormDescription>
                              Offer special perks for birthdays, anniversaries, etc.
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

                    {form.watch('special_occasion_handling') && (
                      <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                        <FormField
                          control={form.control}
                          name="birthday_perks"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <FormLabel>Birthday Perks</FormLabel>
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
                          name="anniversary_perks"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <FormLabel>Anniversary Perks</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payments */}
              <TabsContent value="payments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Deposits & Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="require_deposit"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Require Deposit</FormLabel>
                            <FormDescription>
                              Require customers to pay a deposit when booking
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

                    {form.watch('require_deposit') && (
                      <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="deposit_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deposit Amount ($)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="deposit_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deposit Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                    <SelectItem value="per_person">Per Person</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cancellation_fee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cancellation Fee ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Fee charged for late cancellations
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="no_show_fee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>No-Show Fee ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Fee charged for no-shows
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Confirmation Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email_confirmations"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email Confirmations
                              </FormLabel>
                              <FormDescription>
                                Send email confirmation for new bookings
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
                        name="sms_confirmations"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                SMS Confirmations
                              </FormLabel>
                              <FormDescription>
                                Send SMS confirmation for new bookings
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
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reminder Messages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email_reminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Email Reminders</FormLabel>
                              <FormDescription>
                                Send email reminders before reservations
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
                        name="sms_reminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>SMS Reminders</FormLabel>
                              <FormDescription>
                                Send SMS reminders before reservations
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
                    </div>

                    {(form.watch('email_reminders') || form.watch('sms_reminders')) && (
                      <FormField
                        control={form.control}
                        name="reminder_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reminder Timing (Hours Before)</FormLabel>
                            <FormControl>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 hour</SelectItem>
                                  <SelectItem value="2">2 hours</SelectItem>
                                  <SelectItem value="4">4 hours</SelectItem>
                                  <SelectItem value="24">24 hours</SelectItem>
                                  <SelectItem value="48">48 hours</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Custom Messages */}
              <TabsContent value="messages" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Custom Messages</CardTitle>
                    <CardDescription>
                      Customize the messages sent to customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="booking_confirmation_message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Booking Confirmation Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Thank you for your reservation! We look forward to seeing you..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Custom message included in booking confirmations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cancellation_policy_message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cancellation Policy Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please cancel at least 24 hours in advance to avoid cancellation fees..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Explanation of your cancellation policy
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="special_instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Instructions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please arrive 10 minutes early for your reservation..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional instructions for customers
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button 
                type="button" 
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Changes
              </Button>
              
              <div className="flex gap-2">
                {error && (
                  <Alert variant="destructive" className="flex-1">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  disabled={saving || !hasChanges}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}