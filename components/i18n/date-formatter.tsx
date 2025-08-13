'use client'

import { useFormatter, useLocale, useTimeZone } from 'next-intl'
import { format, isValid, parseISO } from 'date-fns'
import { enUS, es, fr, de, it, ptBR, zhCN, ja } from 'date-fns/locale'

// Locale mapping for date-fns
const dateFnsLocales = {
  'en': enUS,
  'es': es,
  'fr': fr,
  'de': de,
  'it': it,
  'pt': ptBR,
  'zh-CN': zhCN,
  'ja': ja,
}

interface DateFormatterProps {
  date: Date | string | number
  format?: 'short' | 'medium' | 'long' | 'time' | 'datetime' | 'relative'
  className?: string
  fallback?: string
}

export function DateFormatter({ 
  date, 
  format: formatType = 'medium',
  className = '',
  fallback = 'Invalid date'
}: DateFormatterProps) {
  const formatter = useFormatter()
  const locale = useLocale()
  const timeZone = useTimeZone()

  // Parse and validate date
  const parsedDate = (() => {
    if (date instanceof Date) return date
    if (typeof date === 'string') return parseISO(date)
    if (typeof date === 'number') return new Date(date)
    return null
  })()

  if (!parsedDate || !isValid(parsedDate)) {
    return <span className={className}>{fallback}</span>
  }

  // Format based on type
  const formattedDate = (() => {
    try {
      switch (formatType) {
        case 'short':
          return formatter.dateTime(parsedDate, { 
            dateStyle: 'short',
            timeZone 
          })
        case 'medium':
          return formatter.dateTime(parsedDate, {
            dateStyle: 'medium',
            timeZone
          })
        case 'long':
          return formatter.dateTime(parsedDate, {
            dateStyle: 'full',
            timeZone
          })
        case 'time':
          return formatter.dateTime(parsedDate, {
            timeStyle: 'short',
            timeZone
          })
        case 'datetime':
          return formatter.dateTime(parsedDate, {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone
          })
        case 'relative':
          return formatter.relativeTime(parsedDate)
        default:
          return formatter.dateTime(parsedDate, { timeZone })
      }
    } catch (error) {
      console.error('Date formatting error:', error)
      return fallback
    }
  })()

  return (
    <time dateTime={parsedDate.toISOString()} className={className}>
      {formattedDate}
    </time>
  )
}

// Specialized date components
export function ShortDate({ date, className = '', fallback }: Omit<DateFormatterProps, 'format'>) {
  return <DateFormatter date={date} format="short" className={className} fallback={fallback} />
}

export function LongDate({ date, className = '', fallback }: Omit<DateFormatterProps, 'format'>) {
  return <DateFormatter date={date} format="long" className={className} fallback={fallback} />
}

export function TimeOnly({ date, className = '', fallback }: Omit<DateFormatterProps, 'format'>) {
  return <DateFormatter date={date} format="time" className={className} fallback={fallback} />
}

export function DateTime({ date, className = '', fallback }: Omit<DateFormatterProps, 'format'>) {
  return <DateFormatter date={date} format="datetime" className={className} fallback={fallback} />
}

export function RelativeTime({ date, className = '', fallback }: Omit<DateFormatterProps, 'format'>) {
  return <DateFormatter date={date} format="relative" className={className} fallback={fallback} />
}

// Custom date formatter with pattern
interface CustomDateFormatterProps {
  date: Date | string | number
  pattern: string
  className?: string
  fallback?: string
}

export function CustomDateFormatter({
  date,
  pattern,
  className = '',
  fallback = 'Invalid date'
}: CustomDateFormatterProps) {
  const locale = useLocale()

  const parsedDate = (() => {
    if (date instanceof Date) return date
    if (typeof date === 'string') return parseISO(date)
    if (typeof date === 'number') return new Date(date)
    return null
  })()

  if (!parsedDate || !isValid(parsedDate)) {
    return <span className={className}>{fallback}</span>
  }

  try {
    const dateFnsLocale = dateFnsLocales[locale as keyof typeof dateFnsLocales] || enUS
    const formatted = format(parsedDate, pattern, { locale: dateFnsLocale })
    
    return (
      <time dateTime={parsedDate.toISOString()} className={className}>
        {formatted}
      </time>
    )
  } catch (error) {
    console.error('Custom date formatting error:', error)
    return <span className={className}>{fallback}</span>
  }
}

// Utility hook for date formatting in components
export function useDateFormatter() {
  const formatter = useFormatter()
  const timeZone = useTimeZone()

  return {
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const parsedDate = date instanceof Date ? date 
        : typeof date === 'string' ? parseISO(date)
        : typeof date === 'number' ? new Date(date)
        : null

      if (!parsedDate || !isValid(parsedDate)) return null

      return formatter.dateTime(parsedDate, {
        timeZone,
        ...options
      })
    },
    
    formatRelative: (date: Date | string | number) => {
      const parsedDate = date instanceof Date ? date 
        : typeof date === 'string' ? parseISO(date)
        : typeof date === 'number' ? new Date(date)
        : null

      if (!parsedDate || !isValid(parsedDate)) return null

      return formatter.relativeTime(parsedDate)
    }
  }
}