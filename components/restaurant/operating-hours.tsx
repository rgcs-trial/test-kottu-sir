'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Clock, Save } from 'lucide-react'
import { OperatingHours, DayOfWeek } from '@/types'
import { updateOperatingHours, getOperatingHours } from '@/lib/restaurant/actions'
import { cn } from '@/lib/utils'

interface DaySchedule {
  day: DayOfWeek
  displayName: string
  isOpen: boolean
  openTime: string
  closeTime: string
  isOvernight: boolean
}

const DAYS: Array<{ day: DayOfWeek; displayName: string }> = [
  { day: 'monday', displayName: 'Monday' },
  { day: 'tuesday', displayName: 'Tuesday' },
  { day: 'wednesday', displayName: 'Wednesday' },
  { day: 'thursday', displayName: 'Thursday' },
  { day: 'friday', displayName: 'Friday' },
  { day: 'saturday', displayName: 'Saturday' },
  { day: 'sunday', displayName: 'Sunday' },
]

interface OperatingHoursProps {
  className?: string
  onUpdate?: () => void
}

/**
 * Operating Hours Management Component
 * Allows restaurant owners to set their operating hours for each day
 */
export function OperatingHoursManager({ className, onUpdate }: OperatingHoursProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize schedule with default values
  useEffect(() => {
    loadOperatingHours()
  }, [])

  const loadOperatingHours = async () => {
    try {
      setLoading(true)
      const operatingHours = await getOperatingHours()
      
      // Create schedule array with existing data or defaults
      const newSchedule = DAYS.map(({ day, displayName }) => {
        const existing = operatingHours.find(h => h.dayOfWeek === day)
        return {
          day,
          displayName,
          isOpen: existing?.isOpen ?? true,
          openTime: existing?.openTime ?? '09:00',
          closeTime: existing?.closeTime ?? '22:00',
          isOvernight: existing?.isOvernight ?? false,
        }
      })
      
      setSchedule(newSchedule)
    } catch (error) {
      console.error('Failed to load operating hours:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDaySchedule = (day: DayOfWeek, updates: Partial<DaySchedule>) => {
    setSchedule(prev => prev.map(item => {
      if (item.day === day) {
        const updated = { ...item, ...updates }
        
        // Check if this creates an overnight schedule
        if (updated.isOpen && updated.openTime && updated.closeTime) {
          updated.isOvernight = updated.openTime > updated.closeTime
        }
        
        return updated
      }
      return item
    }))
    setHasChanges(true)
  }

  const saveDaySchedule = async (day: DayOfWeek) => {
    const daySchedule = schedule.find(s => s.day === day)
    if (!daySchedule) return

    try {
      setSaving(day)
      
      const result = await updateOperatingHours(
        day,
        daySchedule.isOpen,
        daySchedule.isOpen ? daySchedule.openTime : undefined,
        daySchedule.isOpen ? daySchedule.closeTime : undefined
      )

      if (result.success) {
        setHasChanges(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to save operating hours:', error)
    } finally {
      setSaving(null)
    }
  }

  const copyToAllDays = (sourceDay: DayOfWeek) => {
    const sourceSchedule = schedule.find(s => s.day === sourceDay)
    if (!sourceSchedule) return

    setSchedule(prev => prev.map(item => ({
      ...item,
      isOpen: sourceSchedule.isOpen,
      openTime: sourceSchedule.openTime,
      closeTime: sourceSchedule.closeTime,
      isOvernight: sourceSchedule.isOvernight,
    })))
    setHasChanges(true)
  }

  const formatTimeForDisplay = (time: string) => {
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  const getScheduleStatus = (daySchedule: DaySchedule) => {
    if (!daySchedule.isOpen) {
      return { status: 'Closed', variant: 'secondary' as const }
    }
    
    if (daySchedule.isOvernight) {
      return {
        status: `${formatTimeForDisplay(daySchedule.openTime)} - ${formatTimeForDisplay(daySchedule.closeTime)} +1`,
        variant: 'warning' as const
      }
    }
    
    return {
      status: `${formatTimeForDisplay(daySchedule.openTime)} - ${formatTimeForDisplay(daySchedule.closeTime)}`,
      variant: 'success' as const
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Operating Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS.map(({ displayName }) => (
              <div key={displayName} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-20 bg-gray-200 h-4 rounded animate-pulse" />
                  <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Operating Hours
        </CardTitle>
        <CardDescription>
          Set your restaurant's opening hours for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedule.map((daySchedule) => {
          const scheduleStatus = getScheduleStatus(daySchedule)
          
          return (
            <div
              key={daySchedule.day}
              className={cn(
                "flex flex-col gap-4 p-4 border rounded-lg transition-colors",
                daySchedule.isOpen ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="w-20 font-medium">
                    {daySchedule.displayName}
                  </Label>
                  <Switch
                    checked={daySchedule.isOpen}
                    onCheckedChange={(checked) => 
                      updateDaySchedule(daySchedule.day, { isOpen: checked })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={scheduleStatus.variant}>
                    {scheduleStatus.status}
                  </Badge>
                  {daySchedule.isOvernight && (
                    <Badge variant="warning" className="text-xs">
                      Next Day
                    </Badge>
                  )}
                </div>
              </div>

              {/* Time Inputs */}
              {daySchedule.isOpen && (
                <div className="flex items-center gap-4 pl-23">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${daySchedule.day}-open`} className="text-sm">
                      Open:
                    </Label>
                    <Input
                      id={`${daySchedule.day}-open`}
                      type="time"
                      value={daySchedule.openTime}
                      onChange={(e) => 
                        updateDaySchedule(daySchedule.day, { openTime: e.target.value })
                      }
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${daySchedule.day}-close`} className="text-sm">
                      Close:
                    </Label>
                    <Input
                      id={`${daySchedule.day}-close`}
                      type="time"
                      value={daySchedule.closeTime}
                      onChange={(e) => 
                        updateDaySchedule(daySchedule.day, { closeTime: e.target.value })
                      }
                      className="w-32"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToAllDays(daySchedule.day)}
                      className="text-xs"
                    >
                      Copy to All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveDaySchedule(daySchedule.day)}
                      disabled={saving === daySchedule.day}
                      className="text-xs"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {saving === daySchedule.day ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Batch Actions */}
        {hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={async () => {
                for (const day of schedule) {
                  await saveDaySchedule(day.day)
                }
              }}
              disabled={saving !== null}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save All Changes
            </Button>
          </div>
        )}

        {/* Helper Text */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Toggle the switch to open/close for each day</p>
          <p>• Overnight hours (e.g., 10:00 PM - 2:00 AM) are automatically detected</p>
          <p>• Use "Copy to All" to apply the same hours to all days</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact Operating Hours Display Component
 * Shows current operating hours in a readable format
 */
export function OperatingHoursDisplay({ className }: { className?: string }) {
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHours()
  }, [])

  const loadHours = async () => {
    try {
      const hours = await getOperatingHours()
      setOperatingHours(hours)
    } catch (error) {
      console.error('Failed to load operating hours:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes}${ampm}`
  }

  const getCurrentDayStatus = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const todayHours = operatingHours.find(h => h.dayOfWeek === today)
    
    if (!todayHours || !todayHours.isOpen) {
      return { status: 'Closed', variant: 'secondary' as const }
    }
    
    return {
      status: `Open ${formatTime(todayHours.openTime!)} - ${formatTime(todayHours.closeTime!)}`,
      variant: 'success' as const
    }
  }

  if (loading) {
    return <div className={cn("animate-pulse bg-gray-200 h-6 rounded", className)} />
  }

  const currentStatus = getCurrentDayStatus()

  return (
    <div className={cn("space-y-2", className)}>
      <Badge variant={currentStatus.variant} className="mb-2">
        Today: {currentStatus.status}
      </Badge>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        {DAYS.map(({ day, displayName }) => {
          const dayHours = operatingHours.find(h => h.dayOfWeek === day)
          
          return (
            <div key={day} className="flex justify-between">
              <span className="font-medium">{displayName.slice(0, 3)}:</span>
              <span className="text-muted-foreground">
                {!dayHours || !dayHours.isOpen 
                  ? 'Closed'
                  : `${formatTime(dayHours.openTime!)} - ${formatTime(dayHours.closeTime!)}`
                }
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}