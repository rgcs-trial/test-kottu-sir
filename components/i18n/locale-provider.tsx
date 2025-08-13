'use client'

import { NextIntlClientProvider } from 'next-intl'
import { ReactNode } from 'react'

interface LocaleProviderProps {
  children: ReactNode
  messages: any
  locale: string
  timeZone?: string
}

export function LocaleProvider({ 
  children, 
  messages, 
  locale, 
  timeZone 
}: LocaleProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
      formats={{
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          },
          medium: {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          },
          long: {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          },
          time: {
            hour: 'numeric',
            minute: 'numeric'
          },
          datetime: {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          }
        },
        number: {
          precise: {
            maximumFractionDigits: 2
          },
          currency: {
            style: 'currency',
            currency: getCurrencyForLocale(locale)
          },
          percentage: {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }
        }
      }}
      // Error fallback for missing translations
      onError={(error) => {
        console.warn('Translation error:', error.message)
      }}
      // Provide default messages fallback
      getMessageFallback={({ namespace, key, error }) => {
        const path = [namespace, key].filter((part) => part != null).join('.')
        
        if (error.code === 'MISSING_MESSAGE') {
          console.warn(`Missing translation: ${path} for locale: ${locale}`)
          return path // Return the key path as fallback
        } else {
          console.error('Translation error:', error)
          return `Translation Error: ${path}`
        }
      }}
    >
      {children}
    </NextIntlClientProvider>
  )
}

// Helper function to get currency code for locale
function getCurrencyForLocale(locale: string): string {
  const currencyMap: Record<string, string> = {
    'en': 'USD',
    'es': 'EUR',
    'fr': 'EUR',
    'de': 'EUR',
    'it': 'EUR',
    'pt': 'EUR',
    'zh-CN': 'CNY',
    'ja': 'JPY'
  }
  
  return currencyMap[locale] || 'USD'
}