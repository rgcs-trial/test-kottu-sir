'use client'

import { useFormatter } from 'next-intl'

interface NumberFormatterProps {
  value: number | string
  format?: 'decimal' | 'compact' | 'scientific' | 'engineering'
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  className?: string
  fallback?: string
}

export function NumberFormatter({
  value,
  format = 'decimal',
  minimumFractionDigits,
  maximumFractionDigits,
  className = '',
  fallback = 'Invalid number'
}: NumberFormatterProps) {
  const formatter = useFormatter()
  
  // Parse value to number
  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numericValue)) {
    return <span className={className}>{fallback}</span>
  }

  try {
    const formatted = formatter.number(numericValue, {
      notation: format === 'decimal' ? 'standard' : format,
      minimumFractionDigits,
      maximumFractionDigits,
    })

    return <span className={className}>{formatted}</span>
  } catch (error) {
    console.error('Number formatting error:', error)
    return <span className={className}>{fallback}</span>
  }
}

// Specialized number components
export function CompactNumber({ 
  value, 
  className = '',
  maximumFractionDigits = 1 
}: Omit<NumberFormatterProps, 'format'>) {
  return (
    <NumberFormatter
      value={value}
      format="compact"
      maximumFractionDigits={maximumFractionDigits}
      className={className}
    />
  )
}

export function PreciseNumber({ 
  value, 
  className = '',
  decimals = 2 
}: Omit<NumberFormatterProps, 'format' | 'minimumFractionDigits' | 'maximumFractionDigits'> & { decimals?: number }) {
  return (
    <NumberFormatter
      value={value}
      format="decimal"
      minimumFractionDigits={decimals}
      maximumFractionDigits={decimals}
      className={className}
    />
  )
}

export function WholeNumber({ 
  value, 
  className = '' 
}: Omit<NumberFormatterProps, 'format' | 'minimumFractionDigits' | 'maximumFractionDigits'>) {
  return (
    <NumberFormatter
      value={value}
      format="decimal"
      minimumFractionDigits={0}
      maximumFractionDigits={0}
      className={className}
    />
  )
}

// File size formatter
interface FileSizeFormatterProps {
  bytes: number | string
  className?: string
  fallback?: string
}

export function FileSizeFormatter({
  bytes,
  className = '',
  fallback = 'Invalid size'
}: FileSizeFormatterProps) {
  const formatter = useFormatter()
  const numericBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes
  
  if (isNaN(numericBytes) || numericBytes < 0) {
    return <span className={className}>{fallback}</span>
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let size = numericBytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  try {
    const formattedSize = formatter.number(size, {
      minimumFractionDigits: 0,
      maximumFractionDigits: unitIndex === 0 ? 0 : 1,
    })

    return <span className={className}>{formattedSize} {units[unitIndex]}</span>
  } catch (error) {
    console.error('File size formatting error:', error)
    return <span className={className}>{fallback}</span>
  }
}

// Duration formatter (in seconds)
interface DurationFormatterProps {
  seconds: number | string
  format?: 'short' | 'long' | 'compact'
  className?: string
  fallback?: string
}

export function DurationFormatter({
  seconds,
  format = 'short',
  className = '',
  fallback = 'Invalid duration'
}: DurationFormatterProps) {
  const numericSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds
  
  if (isNaN(numericSeconds) || numericSeconds < 0) {
    return <span className={className}>{fallback}</span>
  }

  const hours = Math.floor(numericSeconds / 3600)
  const minutes = Math.floor((numericSeconds % 3600) / 60)
  const remainingSeconds = Math.floor(numericSeconds % 60)

  const formatDuration = () => {
    switch (format) {
      case 'short':
        if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
        if (minutes > 0) return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
        return `0:${remainingSeconds.toString().padStart(2, '0')}`
      
      case 'long':
        const parts = []
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
        if (remainingSeconds > 0 || parts.length === 0) {
          parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`)
        }
        return parts.join(', ')
      
      case 'compact':
        if (hours > 0) return `${hours}h ${minutes}m`
        if (minutes > 0) return `${minutes}m`
        return `${remainingSeconds}s`
      
      default:
        return `${numericSeconds}s`
    }
  }

  return <span className={className}>{formatDuration()}</span>
}

// Rating formatter (out of 5 stars)
interface RatingFormatterProps {
  rating: number | string
  maxRating?: number
  showDecimals?: boolean
  className?: string
  fallback?: string
}

export function RatingFormatter({
  rating,
  maxRating = 5,
  showDecimals = true,
  className = '',
  fallback = 'No rating'
}: RatingFormatterProps) {
  const formatter = useFormatter()
  const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating
  
  if (isNaN(numericRating)) {
    return <span className={className}>{fallback}</span>
  }

  // Clamp rating to max rating
  const clampedRating = Math.min(Math.max(numericRating, 0), maxRating)

  try {
    const formatted = formatter.number(clampedRating, {
      minimumFractionDigits: 0,
      maximumFractionDigits: showDecimals ? 1 : 0,
    })

    return (
      <span className={className}>
        {formatted}/{maxRating}
      </span>
    )
  } catch (error) {
    console.error('Rating formatting error:', error)
    return <span className={className}>{fallback}</span>
  }
}

// Distance formatter (in meters)
interface DistanceFormatterProps {
  meters: number | string
  unit?: 'metric' | 'imperial'
  className?: string
  fallback?: string
}

export function DistanceFormatter({
  meters,
  unit = 'metric',
  className = '',
  fallback = 'Invalid distance'
}: DistanceFormatterProps) {
  const formatter = useFormatter()
  const numericMeters = typeof meters === 'string' ? parseFloat(meters) : meters
  
  if (isNaN(numericMeters) || numericMeters < 0) {
    return <span className={className}>{fallback}</span>
  }

  try {
    if (unit === 'imperial') {
      // Convert to feet
      const feet = numericMeters * 3.28084
      
      if (feet < 5280) {
        const formatted = formatter.number(feet, {
          minimumFractionDigits: 0,
          maximumFractionDigits: feet < 10 ? 1 : 0,
        })
        return <span className={className}>{formatted} ft</span>
      } else {
        // Convert to miles
        const miles = feet / 5280
        const formatted = formatter.number(miles, {
          minimumFractionDigits: 0,
          maximumFractionDigits: miles < 10 ? 1 : 0,
        })
        return <span className={className}>{formatted} mi</span>
      }
    } else {
      // Metric
      if (numericMeters < 1000) {
        const formatted = formatter.number(numericMeters, {
          minimumFractionDigits: 0,
          maximumFractionDigits: numericMeters < 10 ? 1 : 0,
        })
        return <span className={className}>{formatted} m</span>
      } else {
        // Convert to kilometers
        const kilometers = numericMeters / 1000
        const formatted = formatter.number(kilometers, {
          minimumFractionDigits: 0,
          maximumFractionDigits: kilometers < 10 ? 1 : 0,
        })
        return <span className={className}>{formatted} km</span>
      }
    }
  } catch (error) {
    console.error('Distance formatting error:', error)
    return <span className={className}>{fallback}</span>
  }
}

// Utility hook for number formatting
export function useNumberFormatter() {
  const formatter = useFormatter()
  
  return {
    formatNumber: (
      value: number, 
      options?: Intl.NumberFormatOptions
    ) => {
      try {
        return formatter.number(value, options)
      } catch (error) {
        console.error('Number formatting error:', error)
        return value.toString()
      }
    },
    
    formatCompact: (value: number, decimals = 1) => {
      try {
        return formatter.number(value, {
          notation: 'compact',
          maximumFractionDigits: decimals,
        })
      } catch (error) {
        console.error('Compact number formatting error:', error)
        return value.toString()
      }
    }
  }
}