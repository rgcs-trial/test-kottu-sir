"use client"

import { useState, useEffect, useMemo } from "react"
import { format, parseISO, isToday, isTomorrow, addDays, startOfDay, endOfDay } from "date-fns"
import { 
  Calendar, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  MessageSquare, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Download,
  RefreshCw
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"

interface Reservation {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  party_size: number
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
  table_id?: string
  table_number?: string
  table_name?: string
  confirmation_code: string
  special_requests?: string
  occasion?: string
  dietary_requirements?: string
  seating_preference?: string
  source: string
  created_at: string
  updated_at: string
  check_in_time?: string
  departure_time?: string
  notes?: string
}

interface ReservationFilters {
  status?: string
  date_range?: { start: Date; end: Date }
  table_id?: string
  search?: string
  source?: string
}

interface ReservationStats {
  total: number
  confirmed: number
  pending: number
  no_shows: number
  cancellations: number
  utilization_rate: number
  average_party_size: number
}

interface ReservationManagementProps {
  restaurantId: string
  initialView?: 'today' | 'upcoming' | 'all'
  onReservationUpdate?: (reservationId: string, updates: Partial<Reservation>) => void
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

const statusIcons = {
  pending: <Clock className="h-3 w-3" />,
  confirmed: <CheckCircle2 className="h-3 w-3" />,
  seated: <Users className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  no_show: <AlertTriangle className="h-3 w-3" />,
}

export function ReservationManagement({
  restaurantId,
  initialView = 'today',
  onReservationUpdate,
  className
}: ReservationManagementProps) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<ReservationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [newNotes, setNewNotes] = useState("")
  
  // Filters
  const [filters, setFilters] = useState<ReservationFilters>({
    date_range: {
      start: startOfDay(new Date()),
      end: endOfDay(new Date())
    }
  })
  const [activeTab, setActiveTab] = useState(initialView)

  // Fetch reservations
  const fetchReservations = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      const queryParams = new URLSearchParams({
        restaurant_id: restaurantId,
        start_date: format(filters.date_range?.start || new Date(), 'yyyy-MM-dd'),
        end_date: format(filters.date_range?.end || new Date(), 'yyyy-MM-dd'),
        ...(filters.status && { status: filters.status }),
        ...(filters.table_id && { table_id: filters.table_id }),
        ...(filters.search && { search: filters.search }),
        ...(filters.source && { source: filters.source }),
      })

      const response = await fetch(`/api/reservations?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch reservations')
      }

      const data = await response.json()
      setReservations(data.reservations)
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
    fetchReservations()
  }, [restaurantId, filters])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReservations(true)
    }, 30 * 1000)

    return () => clearInterval(interval)
  }, [restaurantId, filters])

  // Update date range based on active tab
  useEffect(() => {
    const today = new Date()
    const tomorrow = addDays(today, 1)
    const weekFromNow = addDays(today, 7)
    
    switch (activeTab) {
      case 'today':
        setFilters(prev => ({
          ...prev,
          date_range: { start: startOfDay(today), end: endOfDay(today) }
        }))
        break
      case 'tomorrow':
        setFilters(prev => ({
          ...prev,
          date_range: { start: startOfDay(tomorrow), end: endOfDay(tomorrow) }
        }))
        break
      case 'upcoming':
        setFilters(prev => ({
          ...prev,
          date_range: { start: startOfDay(today), end: endOfDay(weekFromNow) }
        }))
        break
    }
  }, [activeTab])

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    return reservations
      .filter(reservation => {
        if (filters.search) {
          const search = filters.search.toLowerCase()
          return (
            reservation.customer_name.toLowerCase().includes(search) ||
            reservation.customer_email?.toLowerCase().includes(search) ||
            reservation.customer_phone?.includes(search) ||
            reservation.confirmation_code.toLowerCase().includes(search)
          )
        }
        return true
      })
      .sort((a, b) => {
        // Sort by date and time
        const dateA = new Date(`${a.reservation_date}T${a.reservation_time}`)
        const dateB = new Date(`${b.reservation_date}T${b.reservation_time}`)
        return dateA.getTime() - dateB.getTime()
      })
  }, [reservations, filters.search])

  const updateReservationStatus = async (reservationId: string, newStatus: string, notes?: string) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          ...(notes && { notes }),
          ...(newStatus === 'seated' && { check_in_time: new Date().toISOString() }),
          ...(newStatus === 'completed' && { departure_time: new Date().toISOString() })
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update reservation')
      }

      const updatedReservation = await response.json()
      
      setReservations(prev => 
        prev.map(res => res.id === reservationId ? updatedReservation : res)
      )
      
      onReservationUpdate?.(reservationId, updatedReservation)
      
    } catch (err) {
      console.error('Error updating reservation:', err)
      // Could show toast notification here
    }
  }

  const handleNotesUpdate = async () => {
    if (!selectedReservation) return

    try {
      const response = await fetch(`/api/reservations/${selectedReservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      })

      if (!response.ok) {
        throw new Error('Failed to update notes')
      }

      const updatedReservation = await response.json()
      setSelectedReservation(updatedReservation)
      setReservations(prev => 
        prev.map(res => res.id === selectedReservation.id ? updatedReservation : res)
      )
      setEditingNotes(false)
      
    } catch (err) {
      console.error('Error updating notes:', err)
    }
  }

  const getTimeUntilReservation = (reservation: Reservation) => {
    const reservationDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`)
    const now = new Date()
    const diffInMinutes = Math.floor((reservationDateTime.getTime() - now.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 0) return 'Past due'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m`
    return `${Math.floor(diffInMinutes / 1440)}d`
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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
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
            <Calendar className="h-5 w-5" />
            Reservation Management
            {refreshing && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchReservations(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </div>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
              <div className="text-xs text-muted-foreground">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.no_shows}</div>
              <div className="text-xs text-muted-foreground">No Shows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.cancellations}</div>
              <div className="text-xs text-muted-foreground">Cancelled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.utilization_rate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Utilization</div>
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
                placeholder="Search reservations..."
                value={filters.search || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select 
            value={filters.status || ""} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value || undefined }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="seated">Seated</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Reservations List */}
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredReservations.length === 0 ? (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              No reservations found for the selected criteria.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {filteredReservations.map((reservation) => (
              <Card key={reservation.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Status */}
                      <Badge className={cn("gap-1", statusColors[reservation.status])}>
                        {statusIcons[reservation.status]}
                        {reservation.status}
                      </Badge>

                      {/* Time */}
                      <div className="text-sm">
                        <div className="font-medium">
                          {format(parseISO(`${reservation.reservation_date}T${reservation.reservation_time}`), 'h:mm a')}
                        </div>
                        <div className="text-muted-foreground">
                          {getTimeUntilReservation(reservation)}
                        </div>
                      </div>

                      {/* Customer */}
                      <div>
                        <div className="font-medium">{reservation.customer_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {reservation.party_size} guests
                          {reservation.table_number && (
                            <>
                              • Table {reservation.table_number}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="text-sm text-muted-foreground">
                        {reservation.customer_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {reservation.customer_phone}
                          </div>
                        )}
                        {reservation.customer_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {reservation.customer_email}
                          </div>
                        )}
                      </div>

                      {/* Special indicators */}
                      <div className="flex gap-1">
                        {reservation.special_requests && (
                          <Badge variant="outline" className="text-xs">
                            <MessageSquare className="h-2 w-2 mr-1" />
                            Special
                          </Badge>
                        )}
                        {reservation.occasion && (
                          <Badge variant="outline" className="text-xs">
                            {reservation.occasion}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedReservation(reservation)
                            setNewNotes(reservation.notes || "")
                            setShowDetails(true)
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                        
                        {reservation.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                          >
                            Confirm
                          </DropdownMenuItem>
                        )}
                        
                        {reservation.status === 'confirmed' && (
                          <DropdownMenuItem 
                            onClick={() => updateReservationStatus(reservation.id, 'seated')}
                          >
                            Mark as Seated
                          </DropdownMenuItem>
                        )}
                        
                        {reservation.status === 'seated' && (
                          <DropdownMenuItem 
                            onClick={() => updateReservationStatus(reservation.id, 'completed')}
                          >
                            Mark as Completed
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {!['completed', 'cancelled', 'no_show'].includes(reservation.status) && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                              className="text-red-600"
                            >
                              Cancel Reservation
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateReservationStatus(reservation.id, 'no_show')}
                              className="text-orange-600"
                            >
                              Mark as No Show
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reservation Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reservation Details</DialogTitle>
              <DialogDescription>
                Confirmation Code: {selectedReservation?.confirmation_code}
              </DialogDescription>
            </DialogHeader>
            
            {selectedReservation && (
              <div className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name</Label>
                    <div className="font-medium">{selectedReservation.customer_name}</div>
                  </div>
                  <div>
                    <Label>Party Size</Label>
                    <div className="font-medium">{selectedReservation.party_size} guests</div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <div className="font-medium">{selectedReservation.customer_phone || 'Not provided'}</div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="font-medium">{selectedReservation.customer_email || 'Not provided'}</div>
                  </div>
                </div>

                {/* Reservation Details */}
                <Separator />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Date & Time</Label>
                    <div className="font-medium">
                      {format(parseISO(selectedReservation.reservation_date), 'PPP')}
                      <br />
                      {format(parseISO(`${selectedReservation.reservation_date}T${selectedReservation.reservation_time}`), 'h:mm a')}
                    </div>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <div className="font-medium">{selectedReservation.duration_minutes} minutes</div>
                  </div>
                  <div>
                    <Label>Table</Label>
                    <div className="font-medium">
                      {selectedReservation.table_number ? `Table ${selectedReservation.table_number}` : 'Not assigned'}
                    </div>
                  </div>
                </div>

                {/* Special Information */}
                {(selectedReservation.occasion || selectedReservation.dietary_requirements || selectedReservation.seating_preference || selectedReservation.special_requests) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {selectedReservation.occasion && (
                        <div>
                          <Label>Occasion</Label>
                          <div className="font-medium">{selectedReservation.occasion}</div>
                        </div>
                      )}
                      {selectedReservation.seating_preference && (
                        <div>
                          <Label>Seating Preference</Label>
                          <div className="font-medium">{selectedReservation.seating_preference}</div>
                        </div>
                      )}
                      {selectedReservation.dietary_requirements && (
                        <div>
                          <Label>Dietary Requirements</Label>
                          <div className="font-medium">{selectedReservation.dietary_requirements}</div>
                        </div>
                      )}
                      {selectedReservation.special_requests && (
                        <div>
                          <Label>Special Requests</Label>
                          <div className="font-medium">{selectedReservation.special_requests}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Notes */}
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Staff Notes</Label>
                    {!editingNotes ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingNotes(true)}
                      >
                        Edit Notes
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={handleNotesUpdate}
                        >
                          Save
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingNotes(false)
                            setNewNotes(selectedReservation.notes || "")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {editingNotes ? (
                    <Textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Add staff notes..."
                      className="min-h-[80px]"
                    />
                  ) : (
                    <div className="p-2 border rounded min-h-[80px] bg-muted/50">
                      {selectedReservation.notes || "No notes added"}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <Label>Created</Label>
                    <div>{format(parseISO(selectedReservation.created_at), 'PPp')}</div>
                  </div>
                  <div>
                    <Label>Source</Label>
                    <div className="capitalize">{selectedReservation.source}</div>
                  </div>
                  {selectedReservation.check_in_time && (
                    <div>
                      <Label>Checked In</Label>
                      <div>{format(parseISO(selectedReservation.check_in_time), 'PPp')}</div>
                    </div>
                  )}
                  {selectedReservation.departure_time && (
                    <div>
                      <Label>Departed</Label>
                      <div>{format(parseISO(selectedReservation.departure_time), 'PPp')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}