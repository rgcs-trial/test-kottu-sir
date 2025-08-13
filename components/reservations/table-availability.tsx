"use client"

import { useState, useEffect, useMemo } from "react"
import { format, addDays, startOfDay, isSameDay, isAfter, isBefore, parseISO } from "date-fns"
import { Calendar, Clock, Users, AlertCircle, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimeSlotAvailability {
  time_slot: string
  slot_name: string
  available_tables: number
  total_capacity: number
  utilization: number
  status: 'available' | 'limited' | 'full' | 'closed'
}

interface DayAvailability {
  date: string
  day_name: string
  is_open: boolean
  time_slots: TimeSlotAvailability[]
  total_available_tables: number
  peak_hours: string[]
  blackout_reason?: string
}

interface TableAvailabilityProps {
  restaurantId: string
  selectedDate?: Date
  selectedPartySize?: number
  daysToShow?: number
  onDateSelect?: (date: Date) => void
  onTimeSlotSelect?: (date: Date, timeSlot: string) => void
  className?: string
  compact?: boolean
  showWaitlist?: boolean
}

interface AvailabilityData {
  [dateKey: string]: DayAvailability
}

export function TableAvailability({
  restaurantId,
  selectedDate,
  selectedPartySize = 2,
  daysToShow = 14,
  onDateSelect,
  onTimeSlotSelect,
  className,
  compact = false,
  showWaitlist = true
}: TableAvailabilityProps) {
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Generate date range
  const dateRange = useMemo(() => {
    const dates: Date[] = []
    const startDate = startOfDay(new Date())
    
    for (let i = 0; i < daysToShow; i++) {
      dates.push(addDays(startDate, i))
    }
    return dates
  }, [daysToShow])

  // Fetch availability data
  const fetchAvailability = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      const startDate = format(dateRange[0], 'yyyy-MM-dd')
      const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd')
      
      const response = await fetch(`/api/reservations/availability?restaurant_id=${restaurantId}&start_date=${startDate}&end_date=${endDate}&party_size=${selectedPartySize}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch availability')
      }

      const data = await response.json()
      setAvailabilityData(data.availability)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAvailability()
  }, [restaurantId, selectedPartySize, daysToShow])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAvailability(true)
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [restaurantId, selectedPartySize])

  const getAvailabilityStatus = (timeSlot: TimeSlotAvailability) => {
    if (timeSlot.available_tables === 0) return 'full'
    if (timeSlot.available_tables <= 2) return 'limited'
    return 'available'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200'
      case 'limited': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'full': return 'bg-red-100 text-red-800 border-red-200'
      case 'closed': return 'bg-gray-100 text-gray-600 border-gray-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle2 className="h-3 w-3" />
      case 'limited': return <AlertCircle className="h-3 w-3" />
      case 'full': return <XCircle className="h-3 w-3" />
      default: return null
    }
  }

  const handleTimeSlotClick = (date: Date, timeSlot: string) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayData = availabilityData[dateKey]
    const slotData = dayData?.time_slots.find(slot => slot.time_slot === timeSlot)
    
    if (slotData && slotData.status === 'available') {
      onTimeSlotSelect?.(date, timeSlot)
    }
  }

  if (loading && !refreshing) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-10" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => fetchAvailability()} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Table Availability
            {refreshing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={setViewMode as any}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchAvailability(true)}
              disabled={refreshing}
            >
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Showing availability for {selectedPartySize} {selectedPartySize === 1 ? 'person' : 'people'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge className={cn("gap-1", getStatusColor('available'))}>
            {getStatusIcon('available')} Available
          </Badge>
          <Badge className={cn("gap-1", getStatusColor('limited'))}>
            {getStatusIcon('limited')} Limited
          </Badge>
          <Badge className={cn("gap-1", getStatusColor('full'))}>
            {getStatusIcon('full')} Full
          </Badge>
          <Badge className={cn("gap-1", getStatusColor('closed'))}>
            Closed
          </Badge>
        </div>

        {/* Availability Display */}
        <div className={cn(
          "space-y-6",
          viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-4"
        )}>
          {dateRange.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const dayData = availabilityData[dateKey]
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isToday = isSameDay(date, new Date())

            return (
              <div 
                key={dateKey} 
                className={cn(
                  "border rounded-lg p-4 transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "border-border",
                  !dayData?.is_open && "opacity-60"
                )}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="cursor-pointer"
                    onClick={() => onDateSelect?.(date)}
                  >
                    <h3 className={cn(
                      "font-medium",
                      isToday && "text-primary"
                    )}>
                      {format(date, 'EEEE, MMMM d')}
                      {isToday && (
                        <Badge variant="outline" className="ml-2">Today</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {dayData?.total_available_tables || 0} tables available
                    </p>
                  </div>
                  
                  {dayData?.peak_hours && dayData.peak_hours.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Peak: {dayData.peak_hours.join(', ')}
                    </Badge>
                  )}
                </div>

                {/* Time Slots */}
                {!dayData?.is_open ? (
                  <Alert>
                    <AlertDescription>
                      {dayData?.blackout_reason || 'Restaurant is closed on this day'}
                    </AlertDescription>
                  </Alert>
                ) : dayData.time_slots && dayData.time_slots.length > 0 ? (
                  <div className={cn(
                    "grid gap-2",
                    compact ? "grid-cols-2" : "grid-cols-3"
                  )}>
                    {dayData.time_slots.map((slot) => {
                      const status = getAvailabilityStatus(slot)
                      const isClickable = status === 'available' && onTimeSlotSelect
                      
                      return (
                        <Button
                          key={slot.time_slot}
                          variant={status === 'available' ? 'default' : 'outline'}
                          size="sm"
                          disabled={status === 'full' || status === 'closed'}
                          className={cn(
                            "flex flex-col items-center gap-1 h-auto py-2 px-2",
                            status === 'limited' && "border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100",
                            status === 'full' && "opacity-50 cursor-not-allowed",
                            isClickable && "cursor-pointer"
                          )}
                          onClick={() => isClickable && handleTimeSlotClick(date, slot.time_slot)}
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              {format(parseISO(`2000-01-01T${slot.time_slot}`), 'h:mm a')}
                            </span>
                          </div>
                          {slot.slot_name && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {slot.slot_name}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-[10px]">
                            {getStatusIcon(status)}
                            <span>
                              {slot.available_tables} {status === 'available' ? 'tables' : status}
                            </span>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No time slots available for the selected party size.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Waitlist Option */}
                {showWaitlist && dayData?.time_slots.every(slot => slot.status === 'full') && (
                  <div className="mt-3 pt-3 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      Join Waitlist for {format(date, 'MMMM d')}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* No availability message */}
        {Object.keys(availabilityData).length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No availability data found for the selected dates. Please try a different date range or party size.
            </AlertDescription>
          </Alert>
        )}

        {/* Real-time update notice */}
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          Last updated: {format(new Date(), 'h:mm a')} • Updates every 5 minutes
        </div>
      </CardContent>
    </Card>
  )
}