"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, parse, addMinutes } from "date-fns"
import { 
  Clock,
  Plus,
  Edit3,
  Trash2,
  Save,
  Copy,
  Calendar,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Zap
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface TimeSlot {
  id: string
  slot_name: string
  start_time: string
  end_time: string
  duration_minutes: number
  buffer_minutes: number
  max_reservations_per_slot: number
  days_of_week: number[]
  is_active: boolean
  price_multiplier: number
  // Analytics data
  current_bookings?: number
  utilization_rate?: number
  revenue_contribution?: number
  average_party_size?: number
  popularity_score?: number
  recommended_adjustments?: string[]
}

interface TimeSlotManagerProps {
  restaurantId: string
  onSlotUpdate?: (slotId: string, updates: Partial<TimeSlot>) => void
  onSlotCreate?: (slot: Omit<TimeSlot, 'id'>) => void
  onSlotDelete?: (slotId: string) => void
  className?: string
}

const timeSlotFormSchema = z.object({
  slot_name: z.string().min(1, "Slot name is required"),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  duration_minutes: z.number().min(15).max(300),
  buffer_minutes: z.number().min(0).max(60),
  max_reservations_per_slot: z.number().min(1).max(100),
  days_of_week: z.array(z.number().min(0).max(6)).min(1, "Select at least one day"),
  is_active: z.boolean(),
  price_multiplier: z.number().min(0.5).max(3.0),
}).refine((data) => {
  const startTime = parse(data.start_time, 'HH:mm', new Date())
  const endTime = parse(data.end_time, 'HH:mm', new Date())
  return startTime < endTime
}, {
  message: "End time must be after start time",
  path: ["end_time"]
})

type TimeSlotFormData = z.infer<typeof timeSlotFormSchema>

const daysOfWeek = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const quickSlotTemplates = [
  {
    name: "Lunch Service",
    slots: [
      { name: "Early Lunch", start_time: "11:30", end_time: "13:00", duration: 90 },
      { name: "Late Lunch", start_time: "13:15", end_time: "14:45", duration: 90 },
    ]
  },
  {
    name: "Dinner Service", 
    slots: [
      { name: "Early Dinner", start_time: "17:30", end_time: "19:00", duration: 90 },
      { name: "Prime Dinner", start_time: "19:15", end_time: "20:45", duration: 90 },
      { name: "Late Dinner", start_time: "21:00", end_time: "22:30", duration: 90 },
    ]
  },
  {
    name: "All Day Service",
    slots: [
      { name: "Morning", start_time: "09:00", end_time: "11:30", duration: 90 },
      { name: "Lunch", start_time: "12:00", end_time: "15:00", duration: 120 },
      { name: "Afternoon", start_time: "15:30", end_time: "17:30", duration: 90 },
      { name: "Dinner", start_time: "18:00", end_time: "22:00", duration: 120 },
    ]
  }
]

export function TimeSlotManager({
  restaurantId,
  onSlotUpdate,
  onSlotCreate,
  onSlotDelete,
  className
}: TimeSlotManagerProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [showSlotDialog, setShowSlotDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("slots")
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'timeline'>('list')

  const form = useForm<TimeSlotFormData>({
    resolver: zodResolver(timeSlotFormSchema),
    defaultValues: {
      slot_name: "",
      start_time: "12:00",
      end_time: "13:30",
      duration_minutes: 90,
      buffer_minutes: 15,
      max_reservations_per_slot: 10,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      is_active: true,
      price_multiplier: 1.0,
    },
  })

  // Fetch time slots
  const fetchTimeSlots = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/time-slots?restaurant_id=${restaurantId}&include_analytics=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch time slots')
      }

      const data = await response.json()
      setTimeSlots(data.time_slots)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeSlots()
  }, [restaurantId])

  // Sort time slots by start time
  const sortedTimeSlots = useMemo(() => {
    return timeSlots.sort((a, b) => {
      const timeA = parse(a.start_time, 'HH:mm', new Date())
      const timeB = parse(b.start_time, 'HH:mm', new Date())
      return timeA.getTime() - timeB.getTime()
    })
  }, [timeSlots])

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalSlots = timeSlots.length
    const activeSlots = timeSlots.filter(slot => slot.is_active).length
    const averageUtilization = timeSlots.reduce((sum, slot) => sum + (slot.utilization_rate || 0), 0) / totalSlots || 0
    const totalCapacity = timeSlots.reduce((sum, slot) => sum + slot.max_reservations_per_slot, 0)
    
    return {
      totalSlots,
      activeSlots,
      averageUtilization,
      totalCapacity,
      underutilized: timeSlots.filter(slot => (slot.utilization_rate || 0) < 50).length,
      overbooked: timeSlots.filter(slot => (slot.current_bookings || 0) > slot.max_reservations_per_slot * 0.9).length,
    }
  }, [timeSlots])

  // Handle form submission
  const handleFormSubmit = async (data: TimeSlotFormData) => {
    try {
      setSaving(true)
      
      if (editingSlot) {
        // Update existing slot
        const response = await fetch(`/api/time-slots/${editingSlot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error('Failed to update time slot')
        }

        const updatedSlot = await response.json()
        setTimeSlots(prev => prev.map(slot => slot.id === editingSlot.id ? updatedSlot : slot))
        onSlotUpdate?.(editingSlot.id, updatedSlot)
      } else {
        // Create new slot
        const response = await fetch('/api/time-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, restaurant_id: restaurantId }),
        })

        if (!response.ok) {
          throw new Error('Failed to create time slot')
        }

        const newSlot = await response.json()
        setTimeSlots(prev => [...prev, newSlot])
        onSlotCreate?.(newSlot)
      }

      setShowSlotDialog(false)
      setEditingSlot(null)
      form.reset()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  // Handle slot deletion
  const handleDeleteSlot = async (slotId: string) => {
    if (window.confirm('Are you sure you want to delete this time slot?')) {
      try {
        const response = await fetch(`/api/time-slots/${slotId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete time slot')
        }

        setTimeSlots(prev => prev.filter(slot => slot.id !== slotId))
        onSlotDelete?.(slotId)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    }
  }

  // Handle duplicate slot
  const handleDuplicateSlot = (slot: TimeSlot) => {
    form.reset({
      slot_name: `${slot.slot_name} (Copy)`,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      buffer_minutes: slot.buffer_minutes,
      max_reservations_per_slot: slot.max_reservations_per_slot,
      days_of_week: [...slot.days_of_week],
      is_active: slot.is_active,
      price_multiplier: slot.price_multiplier,
    })
    setEditingSlot(null)
    setShowSlotDialog(true)
  }

  // Apply template
  const applyTemplate = async (template: typeof quickSlotTemplates[0]) => {
    try {
      setSaving(true)
      
      for (const slotTemplate of template.slots) {
        const endTime = format(
          addMinutes(parse(slotTemplate.start_time, 'HH:mm', new Date()), slotTemplate.duration),
          'HH:mm'
        )
        
        const response = await fetch('/api/time-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            slot_name: slotTemplate.name,
            start_time: slotTemplate.start_time,
            end_time: endTime,
            duration_minutes: slotTemplate.duration,
            buffer_minutes: 15,
            max_reservations_per_slot: 10,
            days_of_week: [0, 1, 2, 3, 4, 5, 6],
            is_active: true,
            price_multiplier: 1.0,
          }),
        })

        if (response.ok) {
          const newSlot = await response.json()
          setTimeSlots(prev => [...prev, newSlot])
        }
      }
      
      setShowTemplateDialog(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-red-600'
    if (rate >= 60) return 'text-yellow-600'
    if (rate >= 40) return 'text-green-600'
    return 'text-gray-600'
  }

  const getStatusBadge = (slot: TimeSlot) => {
    if (!slot.is_active) return <Badge variant="secondary">Inactive</Badge>
    if ((slot.utilization_rate || 0) >= 90) return <Badge className="bg-red-100 text-red-800">High Demand</Badge>
    if ((slot.utilization_rate || 0) >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Popular</Badge>
    if ((slot.utilization_rate || 0) < 30) return <Badge className="bg-blue-100 text-blue-800">Available</Badge>
    return <Badge className="bg-green-100 text-green-800">Optimal</Badge>
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Slot Manager
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={setViewMode as any}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List View</SelectItem>
                <SelectItem value="grid">Grid View</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTemplateDialog(true)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Templates
            </Button>
            
            <Button 
              size="sm"
              onClick={() => {
                setEditingSlot(null)
                form.reset()
                setShowSlotDialog(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Slot
            </Button>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{analytics.totalSlots}</div>
            <div className="text-xs text-muted-foreground">Total Slots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.activeSlots}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.totalCapacity}</div>
            <div className="text-xs text-muted-foreground">Total Capacity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{analytics.averageUtilization.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Avg Utilization</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{analytics.underutilized}</div>
            <div className="text-xs text-muted-foreground">Underutilized</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{analytics.overbooked}</div>
            <div className="text-xs text-muted-foreground">High Demand</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="slots">Time Slots</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Time Slots Display */}
            {sortedTimeSlots.length === 0 ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  No time slots configured. Add some time slots to get started.
                </AlertDescription>
              </Alert>
            ) : viewMode === 'timeline' ? (
              // Timeline View
              <div className="space-y-4">
                <div className="relative">
                  {/* Timeline Background */}
                  <div className="absolute left-20 top-0 bottom-0 w-px bg-border"></div>
                  
                  {sortedTimeSlots.map((slot, index) => (
                    <div key={slot.id} className="relative flex items-center gap-4 py-3">
                      {/* Time Marker */}
                      <div className="w-16 text-right text-sm font-mono">
                        {format(parse(slot.start_time, 'HH:mm', new Date()), 'h:mm a')}
                      </div>
                      
                      {/* Timeline Dot */}
                      <div className={cn(
                        "w-3 h-3 rounded-full border-2 bg-background z-10",
                        slot.is_active ? "border-primary" : "border-gray-300"
                      )}></div>
                      
                      {/* Slot Card */}
                      <Card className="flex-1">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="font-medium">{slot.slot_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(parse(slot.start_time, 'HH:mm', new Date()), 'h:mm a')} - 
                                  {format(parse(slot.end_time, 'HH:mm', new Date()), 'h:mm a')} 
                                  ({slot.duration_minutes}m)
                                </div>
                              </div>
                              
                              {getStatusBadge(slot)}
                              
                              <div className="text-center">
                                <div className="text-lg font-bold">
                                  {slot.current_bookings || 0}/{slot.max_reservations_per_slot}
                                </div>
                                <div className="text-xs text-muted-foreground">bookings</div>
                              </div>
                              
                              <div className="text-center">
                                <div className={cn("text-lg font-bold", getUtilizationColor(slot.utilization_rate || 0))}>
                                  {(slot.utilization_rate || 0).toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground">utilization</div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingSlot(slot)
                                  form.reset({
                                    slot_name: slot.slot_name,
                                    start_time: slot.start_time,
                                    end_time: slot.end_time,
                                    duration_minutes: slot.duration_minutes,
                                    buffer_minutes: slot.buffer_minutes,
                                    max_reservations_per_slot: slot.max_reservations_per_slot,
                                    days_of_week: slot.days_of_week,
                                    is_active: slot.is_active,
                                    price_multiplier: slot.price_multiplier,
                                  })
                                  setShowSlotDialog(true)
                                }}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateSlot(slot)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // List/Grid View
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                  : "space-y-3"
              )}>
                {sortedTimeSlots.map((slot) => (
                  <Card key={slot.id} className="transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {slot.slot_name}
                              {getStatusBadge(slot)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(parse(slot.start_time, 'HH:mm', new Date()), 'h:mm a')} - 
                              {format(parse(slot.end_time, 'HH:mm', new Date()), 'h:mm a')}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{slot.duration_minutes}m duration</span>
                              <span>{slot.buffer_minutes}m buffer</span>
                              {slot.price_multiplier !== 1.0 && (
                                <span>{slot.price_multiplier}x pricing</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Days Active */}
                            <div className="flex gap-1">
                              {daysOfWeek.map(day => (
                                <span
                                  key={day.value}
                                  className={cn(
                                    "w-6 h-6 rounded text-xs flex items-center justify-center",
                                    slot.days_of_week.includes(day.value)
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-gray-100 text-gray-400"
                                  )}
                                >
                                  {day.short.charAt(0)}
                                </span>
                              ))}
                            </div>

                            {/* Capacity */}
                            <div className="text-center">
                              <div className="text-lg font-bold">
                                {slot.current_bookings || 0}/{slot.max_reservations_per_slot}
                              </div>
                              <div className="text-xs text-muted-foreground">capacity</div>
                            </div>

                            {/* Utilization */}
                            <div className="text-center">
                              <div className={cn("text-lg font-bold", getUtilizationColor(slot.utilization_rate || 0))}>
                                {(slot.utilization_rate || 0).toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">utilization</div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingSlot(slot)
                              form.reset({
                                slot_name: slot.slot_name,
                                start_time: slot.start_time,
                                end_time: slot.end_time,
                                duration_minutes: slot.duration_minutes,
                                buffer_minutes: slot.buffer_minutes,
                                max_reservations_per_slot: slot.max_reservations_per_slot,
                                days_of_week: slot.days_of_week,
                                is_active: slot.is_active,
                                price_multiplier: slot.price_multiplier,
                              })
                              setShowSlotDialog(true)
                            }}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateSlot(slot)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Charts and Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Utilization by Time Slot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sortedTimeSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{slot.slot_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {(slot.utilization_rate || 0).toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={slot.utilization_rate || 0} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sortedTimeSlots.map((slot) => (
                      <div key={slot.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{slot.slot_name}</span>
                          <Badge variant="outline">
                            ${((slot.revenue_contribution || 0)).toFixed(0)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>Avg Party: {(slot.average_party_size || 0).toFixed(1)}</div>
                          <div>Bookings: {slot.current_bookings || 0}</div>
                          <div>Score: {(slot.popularity_score || 0).toFixed(1)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            {/* Optimization Recommendations */}
            <div className="grid grid-cols-1 gap-6">
              {timeSlots
                .filter(slot => slot.recommended_adjustments && slot.recommended_adjustments.length > 0)
                .map((slot) => (
                  <Card key={slot.id}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {slot.slot_name} - Optimization Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {slot.recommended_adjustments?.map((suggestion, index) => (
                          <Alert key={index}>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>{suggestion}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {timeSlots.filter(slot => slot.recommended_adjustments && slot.recommended_adjustments.length > 0).length === 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    No optimization suggestions at this time. Your time slots are performing well!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Time Slot Form Dialog */}
        <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSlot ? 'Edit Time Slot' : 'Add New Time Slot'}
              </DialogTitle>
              <DialogDescription>
                Configure the settings for this time slot
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="slot_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slot Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Lunch Early" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Active</FormLabel>
                          <FormDescription>Enable this time slot</FormDescription>
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

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Minutes)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="60">60 minutes</SelectItem>
                            <SelectItem value="90">90 minutes</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="150">2.5 hours</SelectItem>
                            <SelectItem value="180">3 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="buffer_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buffer Time (Minutes)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">No buffer</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Time between reservations for preparation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_reservations_per_slot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Reservations</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="100"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum reservations for this slot
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="price_multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Multiplier: {field.value}x</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          min={0.5}
                          max={3.0}
                          step={0.1}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Pricing adjustment for peak/off-peak times (0.5x to 3.0x)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="days_of_week"
                  render={() => (
                    <FormItem>
                      <FormLabel>Days of Week *</FormLabel>
                      <div className="grid grid-cols-7 gap-2">
                        {daysOfWeek.map((day) => (
                          <FormField
                            key={day.value}
                            control={form.control}
                            name="days_of_week"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={day.value}
                                  className="flex flex-col items-center space-x-0 space-y-1"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, day.value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== day.value
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs font-normal">
                                    {day.short}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowSlotDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingSlot ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingSlot ? 'Update' : 'Create'} Slot
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Time Slot Templates</DialogTitle>
              <DialogDescription>
                Quickly set up common time slot configurations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {quickSlotTemplates.map((template) => (
                <Card key={template.name} className="cursor-pointer hover:bg-muted/50" onClick={() => applyTemplate(template)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.slots.length} time slots
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.slots.map(slot => `${slot.start_time}-${format(addMinutes(parse(slot.start_time, 'HH:mm', new Date()), slot.duration), 'HH:mm')}`).join(', ')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}