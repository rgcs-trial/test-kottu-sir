"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, addDays, parse, isAfter, isBefore } from "date-fns"
import { CalendarIcon, Clock, Users, MapPin, Phone, Mail, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  slot_name: string
  available_tables: number
  duration_minutes: number
}

interface AvailableTable {
  table_id: string
  table_number: string
  table_name: string
  capacity: number
  table_type: string
  is_available: boolean
}

interface ReservationFormProps {
  restaurantId: string
  restaurantName: string
  minAdvanceHours?: number
  maxAdvanceDays?: number
  onSubmit: (data: ReservationFormData) => Promise<void>
  onTimeSlotChange?: (date: Date, timeSlot: string) => void
  loading?: boolean
  availableTimeSlots?: TimeSlot[]
  availableTables?: AvailableTable[]
  className?: string
}

const reservationFormSchema = z.object({
  // Customer Information
  customerName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number too long"),
  
  // Reservation Details  
  partySize: z.number().min(1, "Party size must be at least 1").max(20, "Party size too large"),
  reservationDate: z.date({
    required_error: "Please select a date",
  }),
  reservationTime: z.string({
    required_error: "Please select a time",
  }),
  timeSlotId: z.string().optional(),
  tableId: z.string().optional(),
  
  // Preferences
  occasion: z.string().optional(),
  seatingPreference: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  specialRequests: z.string().optional(),
  
  // Terms and Privacy
  acceptTerms: z.boolean().refine(val => val, "You must accept the terms and conditions"),
  marketingConsent: z.boolean().optional(),
})

export type ReservationFormData = z.infer<typeof reservationFormSchema>

const occasions = [
  { value: "birthday", label: "Birthday Celebration" },
  { value: "anniversary", label: "Anniversary" }, 
  { value: "date_night", label: "Date Night" },
  { value: "business", label: "Business Meeting" },
  { value: "family", label: "Family Gathering" },
  { value: "celebration", label: "Special Celebration" },
  { value: "romantic", label: "Romantic Dinner" },
  { value: "other", label: "Other" },
]

const seatingPreferences = [
  { value: "window", label: "Window Table" },
  { value: "outdoor", label: "Outdoor Seating" },
  { value: "quiet", label: "Quiet Area" },
  { value: "booth", label: "Booth Seating" },
  { value: "bar", label: "Bar Seating" },
  { value: "private", label: "Private Area" },
  { value: "accessible", label: "Wheelchair Accessible" },
  { value: "no_preference", label: "No Preference" },
]

export function ReservationForm({
  restaurantId,
  restaurantName,
  minAdvanceHours = 2,
  maxAdvanceDays = 30,
  onSubmit,
  onTimeSlotChange,
  loading = false,
  availableTimeSlots = [],
  availableTables = [],
  className
}: ReservationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [showTableSelection, setShowTableSelection] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      partySize: 2,
      acceptTerms: false,
      marketingConsent: false,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      specialRequests: "",
      dietaryRequirements: "",
    },
  })

  const watchedDate = form.watch("reservationDate")
  const watchedTime = form.watch("reservationTime")
  const watchedPartySize = form.watch("partySize")

  // Get minimum and maximum dates for booking
  const minDate = addDays(new Date(), 0) // Today
  const maxDate = addDays(new Date(), maxAdvanceDays)

  // Filter available time slots based on party size
  const filteredTimeSlots = availableTimeSlots.filter(slot => slot.available_tables > 0)

  // Update available tables when date/time changes
  useEffect(() => {
    if (watchedDate && watchedTime && watchedPartySize) {
      onTimeSlotChange?.(watchedDate, watchedTime)
      
      // Find the selected time slot
      const timeSlot = availableTimeSlots.find(slot => slot.start_time === watchedTime)
      setSelectedTimeSlot(timeSlot || null)
      
      // Show table selection if tables are available
      const suitableTables = availableTables.filter(
        table => table.is_available && table.capacity >= watchedPartySize
      )
      setShowTableSelection(suitableTables.length > 1)
    }
  }, [watchedDate, watchedTime, watchedPartySize, availableTimeSlots, availableTables, onTimeSlotChange])

  const handleSubmit = async (data: ReservationFormData) => {
    try {
      setIsSubmitting(true)
      
      // Add selected time slot ID if available
      if (selectedTimeSlot) {
        data.timeSlotId = selectedTimeSlot.id
      }
      
      await onSubmit(data)
    } catch (error) {
      console.error("Error submitting reservation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimeSlot = (timeSlot: TimeSlot) => {
    const startTime = format(parse(timeSlot.start_time, "HH:mm", new Date()), "h:mm a")
    const endTime = format(parse(timeSlot.end_time, "HH:mm", new Date()), "h:mm a")
    return `${startTime} - ${endTime}`
  }

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Reserve a Table at {restaurantName}
        </CardTitle>
        <CardDescription>
          Please fill out the form below to make a reservation. We'll confirm your booking shortly.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Party Size and Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="partySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Party Size
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select party size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} {size === 1 ? "guest" : "guests"}
                          </SelectItem>
                        ))}
                        <SelectItem value="11">11+ guests (Large party)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reservationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => isBefore(date, minDate) || isAfter(date, maxDate)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time Selection */}
            <FormField
              control={form.control}
              name="reservationTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Available Times
                  </FormLabel>
                  {availabilityLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-muted-foreground">Loading available times...</span>
                    </div>
                  ) : filteredTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {filteredTimeSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          type="button"
                          variant={field.value === slot.start_time ? "default" : "outline"}
                          size="sm"
                          className="flex flex-col items-center gap-1 h-auto py-2"
                          onClick={() => field.onChange(slot.start_time)}
                        >
                          <span className="font-medium">{formatTimeSlot(slot)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {slot.available_tables} tables
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  ) : watchedDate ? (
                    <Alert>
                      <AlertDescription>
                        No available time slots for the selected date and party size. Please try a different date.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a date to see available times</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Table Selection (if multiple tables available) */}
            {showTableSelection && availableTables.length > 0 && (
              <FormField
                control={form.control}
                name="tableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Choose Your Table (Optional)
                    </FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {availableTables
                        .filter(table => table.is_available && table.capacity >= watchedPartySize)
                        .map((table) => (
                          <Button
                            key={table.table_id}
                            type="button"
                            variant={field.value === table.table_id ? "default" : "outline"}
                            className="flex flex-col items-start gap-1 h-auto p-3"
                            onClick={() => field.onChange(table.table_id)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">
                                {table.table_name || `Table ${table.table_number}`}
                              </span>
                              <Badge variant="secondary">{table.table_type}</Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              Seats {table.capacity} people
                            </span>
                          </Button>
                        ))}
                    </div>
                    <FormDescription>
                      Leave unselected and we'll assign the best available table for you.
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}

            <Separator />

            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number *
                      </FormLabel>
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
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      We'll send confirmation and updates to this email.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preferences (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="occasion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Occasion</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select occasion" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {occasions.map((occasion) => (
                            <SelectItem key={occasion.value} value={occasion.value}>
                              {occasion.label}
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
                  name="seatingPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seating Preference</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {seatingPreferences.map((pref) => (
                            <SelectItem key={pref.value} value={pref.value}>
                              {pref.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dietaryRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dietary Requirements</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Vegetarian, vegan, allergies, etc." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Special Requests
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special requests or notes for your reservation..." 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Terms and Marketing */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I accept the terms and conditions *
                      </FormLabel>
                      <FormDescription>
                        By making a reservation, you agree to our booking policy and terms of service.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value || false}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Send me updates and special offers
                      </FormLabel>
                      <FormDescription>
                        Receive exclusive offers, event invitations, and restaurant updates.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Making Reservation...
                </>
              ) : (
                "Make Reservation"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}