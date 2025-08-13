"use client"

import { useState, useEffect, useMemo } from "react"
import { format, parseISO, addMinutes, differenceInMinutes } from "date-fns"
import { 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Bell,
  BellRing,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Timer
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

interface WaitlistEntry {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  party_size: number
  preferred_date: string
  preferred_time: string
  flexible_time: boolean
  max_wait_minutes: number
  status: 'waiting' | 'notified' | 'seated' | 'expired' | 'cancelled'
  priority: number
  special_requests?: string
  created_at: string
  notified_at?: string
  expires_at: string
  estimated_wait_time?: number
  position_in_queue?: number
}

interface WaitlistStats {
  total_waiting: number
  average_wait_time: number
  conversion_rate: number
  abandonment_rate: number
  notifications_sent: number
}

interface WaitlistManagementProps {
  restaurantId: string
  selectedDate?: Date
  onWaitlistUpdate?: (entryId: string, updates: Partial<WaitlistEntry>) => void
  onTableAssignment?: (entryId: string, tableId: string) => void
  className?: string
}

const waitlistFormSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
  customer_phone: z.string().min(10, "Phone number required"),
  party_size: z.number().min(1).max(20),
  preferred_time: z.string(),
  flexible_time: z.boolean(),
  max_wait_minutes: z.number().min(15).max(480),
  special_requests: z.string().optional(),
  priority: z.number().min(0).max(10),
})

type WaitlistFormData = z.infer<typeof waitlistFormSchema>

const statusColors = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  notified: 'bg-blue-100 text-blue-800 border-blue-200',
  seated: 'bg-green-100 text-green-800 border-green-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
}

const statusIcons = {
  waiting: <Timer className="h-3 w-3" />,
  notified: <BellRing className="h-3 w-3" />,
  seated: <CheckCircle2 className="h-3 w-3" />,
  expired: <XCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
}

const priorityColors = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-blue-100 text-blue-600', 
  2: 'bg-green-100 text-green-600',
  3: 'bg-yellow-100 text-yellow-600',
  4: 'bg-orange-100 text-orange-600',
  5: 'bg-red-100 text-red-600',
}

export function WaitlistManagement({
  restaurantId,
  selectedDate = new Date(),
  onWaitlistUpdate,
  onTableAssignment,
  className
}: WaitlistManagementProps) {
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [stats, setStats] = useState<WaitlistStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [autoNotifications, setAutoNotifications] = useState(true)
  
  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: {
      party_size: 2,
      flexible_time: true,
      max_wait_minutes: 60,
      priority: 0,
    },
  })

  // Fetch waitlist entries
  const fetchWaitlist = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      const queryParams = new URLSearchParams({
        restaurant_id: restaurantId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })

      const response = await fetch(`/api/waitlist?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch waitlist')
      }

      const data = await response.json()
      setWaitlistEntries(data.entries)
      setStats(data.stats)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWaitlist()
  }, [restaurantId, selectedDate, statusFilter])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWaitlist(true)
    }, 30 * 1000)

    return () => clearInterval(interval)
  }, [restaurantId, selectedDate, statusFilter])

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    return waitlistEntries
      .filter(entry => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return (
            entry.customer_name.toLowerCase().includes(query) ||
            entry.customer_email?.toLowerCase().includes(query) ||
            entry.customer_phone?.includes(query)
          )
        }
        return true
      })
      .sort((a, b) => {
        // Sort by priority (higher first), then by creation time
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
  }, [waitlistEntries, searchQuery])

  // Calculate wait times
  const getWaitTime = (entry: WaitlistEntry) => {
    const now = new Date()
    const createdAt = new Date(entry.created_at)
    return differenceInMinutes(now, createdAt)
  }

  const getEstimatedSeatingTime = (entry: WaitlistEntry) => {
    if (entry.estimated_wait_time) {
      const estimatedTime = addMinutes(new Date(), entry.estimated_wait_time)
      return format(estimatedTime, 'h:mm a')
    }
    return 'Unknown'
  }

  // Handle status updates
  const updateEntryStatus = async (entryId: string, newStatus: string, notes?: string) => {
    try {
      const response = await fetch(`/api/waitlist/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          ...(notes && { notes }),
          ...(newStatus === 'notified' && { notified_at: new Date().toISOString() })
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update waitlist entry')
      }

      const updatedEntry = await response.json()
      
      setWaitlistEntries(prev => 
        prev.map(entry => entry.id === entryId ? updatedEntry : entry)
      )
      
      onWaitlistUpdate?.(entryId, updatedEntry)
      
    } catch (err) {
      console.error('Error updating waitlist entry:', err)
    }
  }

  // Handle priority changes
  const updatePriority = async (entryId: string, newPriority: number) => {
    try {
      const response = await fetch(`/api/waitlist/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (!response.ok) {
        throw new Error('Failed to update priority')
      }

      const updatedEntry = await response.json()
      
      setWaitlistEntries(prev => 
        prev.map(entry => entry.id === entryId ? updatedEntry : entry)
      )
      
    } catch (err) {
      console.error('Error updating priority:', err)
    }
  }

  // Handle notifications
  const sendNotification = async (entryId: string) => {
    try {
      const response = await fetch(`/api/waitlist/${entryId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }

      await updateEntryStatus(entryId, 'notified')
      
    } catch (err) {
      console.error('Error sending notification:', err)
    }
  }

  // Handle form submission
  const handleFormSubmit = async (data: WaitlistFormData) => {
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          restaurant_id: restaurantId,
          preferred_date: format(selectedDate, 'yyyy-MM-dd'),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add to waitlist')
      }

      setShowAddDialog(false)
      form.reset()
      fetchWaitlist(true)
      
    } catch (err) {
      console.error('Error adding to waitlist:', err)
    }
  }

  if (loading && !refreshing) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Waitlist Management
            {refreshing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="auto-notify">Auto Notify</Label>
              <Switch
                id="auto-notify"
                checked={autoNotifications}
                onCheckedChange={setAutoNotifications}
              />
            </div>
            <Button 
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Waitlist
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total_waiting}</div>
              <div className="text-xs text-muted-foreground">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.average_wait_time}m</div>
              <div className="text-xs text-muted-foreground">Avg Wait</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.conversion_rate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Conversion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.notifications_sent}</div>
              <div className="text-xs text-muted-foreground">Notified</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search waitlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="notified">Notified</SelectItem>
              <SelectItem value="seated">Seated</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Waitlist Entries */}
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredEntries.length === 0 ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              No waitlist entries found for the selected criteria.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry, index) => (
              <Card key={entry.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Queue Position */}
                      <div className="flex flex-col items-center">
                        <div className="text-xs text-muted-foreground">Queue</div>
                        <div className="text-lg font-bold">#{index + 1}</div>
                      </div>

                      {/* Status and Priority */}
                      <div className="flex flex-col gap-1">
                        <Badge className={cn("gap-1 w-fit", statusColors[entry.status])}>
                          {statusIcons[entry.status]}
                          {entry.status}
                        </Badge>
                        {entry.priority > 0 && (
                          <Badge variant="outline" className="text-xs w-fit">
                            Priority {entry.priority}
                          </Badge>
                        )}
                      </div>

                      {/* Customer Info */}
                      <div>
                        <div className="font-medium">{entry.customer_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {entry.party_size} guests
                          <Clock className="h-3 w-3 ml-2" />
                          {format(parseISO(`2000-01-01T${entry.preferred_time}`), 'h:mm a')}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="text-sm text-muted-foreground">
                        {entry.customer_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {entry.customer_phone}
                          </div>
                        )}
                        {entry.customer_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {entry.customer_email}
                          </div>
                        )}
                      </div>

                      {/* Wait Time */}
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {getWaitTime(entry)}m
                        </div>
                        <div className="text-xs text-muted-foreground">waited</div>
                        {entry.estimated_wait_time && (
                          <div className="text-xs text-green-600">
                            ETA: {getEstimatedSeatingTime(entry)}
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-24">
                        <div className="text-xs text-muted-foreground mb-1">Max wait</div>
                        <Progress 
                          value={(getWaitTime(entry) / entry.max_wait_minutes) * 100}
                          className="h-2"
                        />
                        <div className="text-xs text-center mt-1">
                          {entry.max_wait_minutes}m
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Quick Actions */}
                      {entry.status === 'waiting' && (
                        <Button
                          size="sm"
                          onClick={() => sendNotification(entry.id)}
                          disabled={!entry.customer_phone && !entry.customer_email}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Notify
                        </Button>
                      )}

                      {entry.status === 'notified' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateEntryStatus(entry.id, 'seated')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Seat
                        </Button>
                      )}

                      {/* Priority Controls */}
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updatePriority(entry.id, entry.priority + 1)}
                          disabled={entry.priority >= 5}
                          className="h-6 px-2"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updatePriority(entry.id, Math.max(0, entry.priority - 1))}
                          disabled={entry.priority <= 0}
                          className="h-6 px-2"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* More Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {entry.status === 'waiting' && (
                            <>
                              <DropdownMenuItem onClick={() => sendNotification(entry.id)}>
                                <Bell className="h-4 w-4 mr-2" />
                                Send Notification
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateEntryStatus(entry.id, 'seated')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Seat Now
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => updateEntryStatus(entry.id, 'cancelled')}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Entry
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Special Requests */}
                  {entry.special_requests && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="font-medium">Special Requests: </span>
                        <span className="text-muted-foreground">{entry.special_requests}</span>
                      </div>
                    </div>
                  )}

                  {/* Flexibility Info */}
                  {entry.flexible_time && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Flexible timing
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add to Waitlist Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Customer to Waitlist</DialogTitle>
              <DialogDescription>
                Add a customer to the waitlist for {format(selectedDate, 'PPP')}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Party Details */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="party_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Size *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size} {size === 1 ? 'guest' : 'guests'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferred_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_wait_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Wait (minutes)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Preferences */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="flexible_time"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Flexible Timing</FormLabel>
                          <FormDescription className="text-sm">
                            Can seat at different times if available
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Normal (0)</SelectItem>
                            <SelectItem value="1">Low Priority (1)</SelectItem>
                            <SelectItem value="2">Medium Priority (2)</SelectItem>
                            <SelectItem value="3">High Priority (3)</SelectItem>
                            <SelectItem value="4">VIP (4)</SelectItem>
                            <SelectItem value="5">Emergency (5)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="special_requests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special requests or notes..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add to Waitlist
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}