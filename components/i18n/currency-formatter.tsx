'use client'

import { useFormatter, useLocale } from 'next-intl'
import { localeCurrencies } from '@/i18n'

interface CurrencyFormatterProps {
  amount: number | string
  currency?: string
  locale?: string
  showCents?: boolean
  showSymbol?: boolean
  className?: string
  fallback?: string
}

export function CurrencyFormatter({
  amount,
  currency,
  locale,
  showCents = true,
  showSymbol = true,
  className = '',
  fallback = 'Invalid amount'
}: CurrencyFormatterProps) {
  const formatter = useFormatter()
  const currentLocale = useLocale()
  
  // Parse amount to number
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numericAmount)) {
    return <span className={className}>{fallback}</span>
  }

  // Determine currency code
  const currencyCode = currency || 
    localeCurrencies[currentLocale as keyof typeof localeCurrencies] || 
    'USD'

  try {
    const formatted = formatter.number(numericAmount, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    })

    // Remove currency symbol if not wanted
    if (!showSymbol) {
      const withoutSymbol = formatted.replace(/[^\d.,\s]/g, '').trim()
      return <span className={className}>{withoutSymbol}</span>
    }

    return <span className={className}>{formatted}</span>
  } catch (error) {
    console.error('Currency formatting error:', error)
    return <span className={className}>{fallback}</span>
  }
}

// Specialized currency components
export function Price({ 
  amount, 
  currency, 
  className = '',
  showFree = true 
}: Omit<CurrencyFormatterProps, 'showCents' | 'showSymbol'> & { showFree?: boolean }) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (numericAmount === 0 && showFree) {
    return <span className={`text-green-600 ${className}`}>Free</span>
  }

  return (
    <CurrencyFormatter
      amount={amount}
      currency={currency}
      showCents={true}
      showSymbol={true}
      className={className}
    />
  )
}

export function CompactPrice({ 
  amount, 
  currency, 
  className = '' 
}: Omit<CurrencyFormatterProps, 'showCents' | 'showSymbol'>) {
  return (
    <CurrencyFormatter
      amount={amount}
      currency={currency}
      showCents={false}
      showSymbol={true}
      className={className}
    />
  )
}

export function PriceWithoutSymbol({ 
  amount, 
  currency, 
  className = '' 
}: Omit<CurrencyFormatterProps, 'showCents' | 'showSymbol'>) {
  return (
    <CurrencyFormatter
      amount={amount}
      currency={currency}
      showCents={true}
      showSymbol={false}
      className={className}
    />
  )
}

// Large number formatting for revenue, etc.
export function LargeAmount({ 
  amount, 
  currency, 
  className = '',
  compact = false 
}: Omit<CurrencyFormatterProps, 'showCents' | 'showSymbol'> & { compact?: boolean }) {
  const formatter = useFormatter()
  const currentLocale = useLocale()
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numericAmount)) {
    return <span className={className}>Invalid amount</span>
  }

  const currencyCode = currency || 
    localeCurrencies[currentLocale as keyof typeof localeCurrencies] || 
    'USD'

  try {
    if (compact && numericAmount >= 1000) {
      const formatted = formatter.number(numericAmount, {
        style: 'currency',
        currency: currencyCode,
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })
      return <span className={className}>{formatted}</span>
    }

    return (
      <CurrencyFormatter
        amount={amount}
        currency={currency}
        showCents={numericAmount < 100}
        showSymbol={true}
        className={className}
      />
    )
  } catch (error) {
    console.error('Large amount formatting error:', error)
    return <span className={className}>Error</span>
  }
}

// Percentage formatter
interface PercentageFormatterProps {
  value: number | string
  decimals?: number
  className?: string
  fallback?: string
}

export function PercentageFormatter({
  value,
  decimals = 1,
  className = '',
  fallback = 'Invalid percentage'
}: PercentageFormatterProps) {
  const formatter = useFormatter()
  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numericValue)) {
    return <span className={className}>{fallback}</span>
  }

  try {
    // Convert to percentage (divide by 100 if the value is already a percentage)
    const percentageValue = numericValue > 1 ? numericValue / 100 : numericValue
    
    const formatted = formatter.number(percentageValue, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })

    return <span className={className}>{formatted}</span>
  } catch (error) {
    console.error('Percentage formatting error:', error)
    return <span className={className}>{fallback}</span>
  }
}

// Utility hook for currency formatting
export function useCurrencyFormatter() {
  const formatter = useFormatter()
  const locale = useLocale()
  
  return {
    formatCurrency: (
      amount: number, 
      options?: { 
        currency?: string
        showCents?: boolean
        compact?: boolean
      }
    ) => {
      const { currency, showCents = true, compact = false } = options || {}
      const currencyCode = currency || 
        localeCurrencies[locale as keyof typeof localeCurrencies] || 
        'USD'

      try {
        return formatter.number(amount, {
          style: 'currency',
          currency: currencyCode,
          notation: compact ? 'compact' : 'standard',
          minimumFractionDigits: showCents ? 2 : 0,
          maximumFractionDigits: showCents ? 2 : 0,
        })
      } catch (error) {
        console.error('Currency formatting error:', error)
        return amount.toString()
      }
    },
    
    formatPercentage: (value: number, decimals = 1) => {
      try {
        const percentageValue = value > 1 ? value / 100 : value
        return formatter.number(percentageValue, {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      } catch (error) {
        console.error('Percentage formatting error:', error)
        return `${value}%`
      }
    }
  }
}