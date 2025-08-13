"use client"

import { useState, useEffect, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns"
import { 
  Calendar as CalendarIcon,
  ChevronLeft, 
  ChevronRight,
  Users,
  Clock,
  MoreVertical,
  Plus,
  Filter,
  Download,
  Eye,
  EyeOff
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface CalendarReservation {
  id: string
  customer_name: string
  party_size: number
  reservation_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
  table_number?: string
  confirmation_code: string
  special_requests?: string
  occasion?: string
}

interface CalendarDay {
  date: Date
  reservations: CalendarReservation[]
  total_reservations: number
  total_guests: number
  utilization_rate: number
  revenue: number
  is_blackout: boolean
  blackout_reason?: string
}

interface ReservationCalendarProps {
  restaurantId: string
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onReservationSelect?: (reservation: CalendarReservation) => void
  viewMode?: 'month' | 'week' | 'day'
  className?: string
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  seated: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-orange-100 text-orange-800 border-orange-200',
}

const occasionEmojis = {
  birthday: '🎂',
  anniversary: '💕',
  date_night: '💑',
  business: '💼',
  family: '👨‍👩‍👧‍👦',
  celebration: '🎉',
  romantic: '🌹',
}

export function ReservationCalendar({
  restaurantId,
  selectedDate,
  onDateSelect,
  onReservationSelect,
  viewMode = 'month',
  className
}: ReservationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [calendarData, setCalendarData] = useState<{ [dateKey: string]: CalendarDay }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<CalendarDay | null>(null)
  const [showDayDetails, setShowDayDetails] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showRevenue, setShowRevenue] = useState(true)
  const [showUtilization, setShowUtilization] = useState(true)
  const [compactView, setCompactView] = useState(false)

  // Get date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'week':
        return {
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate)
        }
      case 'day':
        return {
          start: currentDate,
          end: currentDate
        }
      case 'month':
      default:
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        return {
          start: startOfWeek(monthStart),
          end: endOfWeek(monthEnd)
        }
    }
  }, [currentDate, viewMode])

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    })
  }, [dateRange])

  // Fetch calendar data
  const fetchCalendarData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reservations/calendar?restaurant_id=${restaurantId}&start_date=${format(dateRange.start, 'yyyy-MM-dd')}&end_date=${format(dateRange.end, 'yyyy-MM-dd')}&status=${statusFilter}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar data')
      }

      const data = await response.json()
      setCalendarData(data.calendar)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendarData()
  }, [restaurantId, dateRange.start, dateRange.end, statusFilter])

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayData = calendarData[dateKey]
    
    if (dayData) {
      setSelectedDayData(dayData)
      setShowDayDetails(true)
    }
    
    onDateSelect?.(date)
  }

  const handlePrevious = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => subMonths(prev, 1))
        break
      case 'week':
        setCurrentDate(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))
        break
      case 'day':
        setCurrentDate(prev => new Date(prev.getTime() - 24 * 60 * 60 * 1000))
        break
    }
  }

  const handleNext = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1))
        break
      case 'week':
        setCurrentDate(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))
        break
      case 'day':
        setCurrentDate(prev => new Date(prev.getTime() + 24 * 60 * 60 * 1000))
        break
    }
  }

  const getDateTitle = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      case 'week':
        return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  const getDayUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500'
    if (rate >= 70) return 'bg-yellow-500'
    if (rate >= 50) return 'bg-green-500'
    return 'bg-gray-300'
  }

  const renderCalendarDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayData = calendarData[dateKey]
    const isCurrentMonth = isSameMonth(date, currentDate)
    const isCurrentDay = isToday(date)
    const isSelected = selectedDate && isSameDay(date, selectedDate)

    return (
      <div
        key={dateKey}
        className={cn(
          "p-2 border border-gray-200 cursor-pointer transition-colors min-h-[100px]",
          !isCurrentMonth && "bg-gray-50 text-gray-400",
          isCurrentDay && "bg-blue-50 border-blue-300",
          isSelected && "bg-primary/10 border-primary",
          "hover:bg-muted/50"
        )}
        onClick={() => handleDateClick(date)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            "text-sm font-medium",
            isCurrentDay && "text-blue-600 font-bold"
          )}>
            {format(date, 'd')}
          </span>
          
          {dayData && (
            <div className="flex items-center gap-1">
              {showUtilization && (
                <div 
                  className={cn(
                    "w-2 h-2 rounded-full",
                    getDayUtilizationColor(dayData.utilization_rate)
                  )}
                  title={`${dayData.utilization_rate.toFixed(1)}% utilization`}
                />
              )}
              {dayData.is_blackout && (
                <div className="w-2 h-2 rounded-full bg-black" title={dayData.blackout_reason} />
              )}
            </div>
          )}
        </div>

        {dayData && (
          <div className="space-y-1">
            {/* Summary */}
            <div className="text-xs text-gray-600">
              <div>{dayData.total_reservations} reservations</div>
              <div>{dayData.total_guests} guests</div>
              {showRevenue && dayData.revenue > 0 && (
                <div className="text-green-600 font-medium">
                  ${dayData.revenue.toFixed(0)}
                </div>
              )}
            </div>

            {/* Top reservations (if not compact) */}
            {!compactView && dayData.reservations.slice(0, 2).map((reservation) => (
              <div
                key={reservation.id}
                className={cn(
                  "text-xs p-1 rounded border truncate",
                  statusColors[reservation.status]
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onReservationSelect?.(reservation)
                }}
                title={`${reservation.customer_name} - ${reservation.party_size} guests at ${format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')}`}
              >
                <div className="flex items-center gap-1">
                  {reservation.occasion && occasionEmojis[reservation.occasion as keyof typeof occasionEmojis] && (
                    <span>{occasionEmojis[reservation.occasion as keyof typeof occasionEmojis]}</span>
                  )}
                  <span className="truncate">
                    {format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'HH:mm')} {reservation.customer_name}
                  </span>
                </div>
              </div>
            ))}

            {/* Show more indicator */}
            {!compactView && dayData.reservations.length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{dayData.reservations.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderWeekView = () => {
    return (
      <div className="grid grid-cols-7 gap-0 border">
        {/* Week headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-3 bg-gray-50 border-b font-medium text-center text-sm">
            {day}
          </div>
        ))}
        
        {/* Week days */}
        {calendarDays.map((date) => (
          <div key={format(date, 'yyyy-MM-dd')} className="min-h-[200px]">
            {renderCalendarDay(date)}
          </div>
        ))}
      </div>
    )
  }

  const renderMonthView = () => {
    const weeks = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7))
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Month headers */}
        <div className="grid grid-cols-7 gap-0">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
            <div key={day} className="p-3 bg-gray-50 border-b border-r last:border-r-0 font-medium text-center text-sm">
              {day}
            </div>
          ))}
        </div>
        
        {/* Month grid */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((date) => renderCalendarDay(date))}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dateKey = format(currentDate, 'yyyy-MM-dd')
    const dayData = calendarData[dateKey]

    if (!dayData) {
      return (
        <div className="p-8 text-center text-gray-500">
          No reservations for this date
        </div>
      )
    }

    const timeSlots = Array.from({ length: 24 }, (_, hour) => {
      const timeString = `${hour.toString().padStart(2, '0')}:00`
      const reservationsAtTime = dayData.reservations.filter(res => {
        const resHour = parseInt(res.reservation_time.split(':')[0])
        return resHour === hour
      })

      return {
        time: timeString,
        hour,
        reservations: reservationsAtTime
      }
    }).filter(slot => slot.reservations.length > 0 || (slot.hour >= 10 && slot.hour <= 23))

    return (
      <div className="space-y-4">
        {/* Day Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{dayData.total_reservations}</div>
                <div className="text-sm text-gray-600">Reservations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{dayData.total_guests}</div>
                <div className="text-sm text-gray-600">Guests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{dayData.utilization_rate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Utilization</div>
              </div>
              {showRevenue && (
                <div>
                  <div className="text-2xl font-bold text-purple-600">${dayData.revenue.toFixed(0)}</div>
                  <div className="text-sm text-gray-600">Revenue</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <div key={slot.time} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-mono text-gray-500">
                    {format(parseISO(`2000-01-01T${slot.time}`), 'h:mm a')}
                  </div>
                  <div className="flex-1">
                    {slot.reservations.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {slot.reservations.map((reservation) => (
                          <div
                            key={reservation.id}
                            className={cn(
                              "p-2 rounded border cursor-pointer hover:shadow-sm",
                              statusColors[reservation.status]
                            )}
                            onClick={() => onReservationSelect?.(reservation)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{reservation.customer_name}</div>
                                <div className="text-xs flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  {reservation.party_size} guests
                                  {reservation.table_number && (
                                    <span>• Table {reservation.table_number}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {reservation.occasion && occasionEmojis[reservation.occasion as keyof typeof occasionEmojis] && (
                                  <span className="text-sm">{occasionEmojis[reservation.occasion as keyof typeof occasionEmojis]}</span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {reservation.status}
                                </Badge>
                              </div>
                            </div>
                            {reservation.special_requests && (
                              <div className="text-xs text-gray-600 mt-1 truncate">
                                {reservation.special_requests}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No reservations</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
            <CalendarIcon className="h-5 w-5" />
            Reservation Calendar
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* View Options */}
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="show-revenue">Revenue</Label>
              <Switch
                id="show-revenue"
                checked={showRevenue}
                onCheckedChange={setShowRevenue}
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="compact-view">Compact</Label>
              <Switch
                id="compact-view"
                checked={compactView}
                onCheckedChange={setCompactView}
              />
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Filters */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="seated">Seated</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold ml-4">{getDateTitle()}</h2>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="text-center py-8 text-red-600">
            Error: {error}
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}

        {/* Day Details Dialog */}
        <Dialog open={showDayDetails} onOpenChange={setShowDayDetails}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                {selectedDayData && format(selectedDayData.date, 'EEEE, MMMM d, yyyy')} - Reservations
              </DialogTitle>
              <DialogDescription>
                {selectedDayData && (
                  <>
                    {selectedDayData.total_reservations} reservations • {selectedDayData.total_guests} guests • 
                    {selectedDayData.utilization_rate.toFixed(1)}% utilization
                    {showRevenue && ` • $${selectedDayData.revenue.toFixed(0)} revenue`}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {selectedDayData && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-3">
                  {selectedDayData.reservations
                    .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))
                    .map((reservation) => (
                      <Card key={reservation.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onReservationSelect?.(reservation)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {reservation.customer_name}
                                  {reservation.occasion && occasionEmojis[reservation.occasion as keyof typeof occasionEmojis] && (
                                    <span>{occasionEmojis[reservation.occasion as keyof typeof occasionEmojis]}</span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')}
                                  <Users className="h-3 w-3 ml-2" />
                                  {reservation.party_size} guests
                                  {reservation.table_number && (
                                    <span className="ml-2">Table {reservation.table_number}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={cn("gap-1", statusColors[reservation.status])}>
                                {reservation.status}
                              </Badge>
                              <Badge variant="outline" className="font-mono text-xs">
                                {reservation.confirmation_code}
                              </Badge>
                            </div>
                          </div>
                          
                          {reservation.special_requests && (
                            <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                              <strong>Special requests:</strong> {reservation.special_requests}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}