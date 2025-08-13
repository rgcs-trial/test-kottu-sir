import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

// Can be imported from a shared config
export const locales = [
  'en', // English (default)
  'es', // Spanish
  'fr', // French
  'de', // German
  'it', // Italian
  'pt', // Portuguese
  'zh-CN', // Chinese Simplified
  'ja', // Japanese
] as const

export type Locale = typeof locales[number]

export const defaultLocale = 'en' as const

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français', 
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  'zh-CN': '简体中文',
  ja: '日本語',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  'zh-CN': '🇨🇳',
  ja: '🇯🇵',
}

// Currency codes for each locale
export const localeCurrencies: Record<Locale, string> = {
  en: 'USD',
  es: 'EUR',
  fr: 'EUR',
  de: 'EUR',
  it: 'EUR',
  pt: 'EUR',
  'zh-CN': 'CNY',
  ja: 'JPY',
}

// Number formatting styles for each locale
export const localeNumberFormats: Record<Locale, { decimal: string; thousands: string }> = {
  en: { decimal: '.', thousands: ',' },
  es: { decimal: ',', thousands: '.' },
  fr: { decimal: ',', thousands: ' ' },
  de: { decimal: ',', thousands: '.' },
  it: { decimal: ',', thousands: '.' },
  pt: { decimal: ',', thousands: '.' },
  'zh-CN': { decimal: '.', thousands: ',' },
  ja: { decimal: '.', thousands: ',' },
}

// Date format patterns for each locale
export const localeDateFormats: Record<Locale, string> = {
  en: 'MM/dd/yyyy',
  es: 'dd/MM/yyyy',
  fr: 'dd/MM/yyyy',
  de: 'dd.MM.yyyy',
  it: 'dd/MM/yyyy',
  pt: 'dd/MM/yyyy',
  'zh-CN': 'yyyy/MM/dd',
  ja: 'yyyy/MM/dd',
}

// Time zones for each locale (can be overridden by user preference)
export const localeTimezones: Record<Locale, string> = {
  en: 'America/New_York',
  es: 'Europe/Madrid',
  fr: 'Europe/Paris',
  de: 'Europe/Berlin',
  it: 'Europe/Rome',
  pt: 'Europe/Lisbon',
  'zh-CN': 'Asia/Shanghai',
  ja: 'Asia/Tokyo',
}

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  try {
    // Load messages for the current locale
    const messages = await import(`./messages/${locale}/common.json`)
    const authMessages = await import(`./messages/${locale}/auth.json`)
    const menuMessages = await import(`./messages/${locale}/menu.json`)
    const ordersMessages = await import(`./messages/${locale}/orders.json`)
    const dashboardMessages = await import(`./messages/${locale}/dashboard.json`)
    const loyaltyMessages = await import(`./messages/${locale}/loyalty.json`)
    const reservationsMessages = await import(`./messages/${locale}/reservations.json`)
    const inventoryMessages = await import(`./messages/${locale}/inventory.json`)
    const reviewsMessages = await import(`./messages/${locale}/reviews.json`)
    const marketingMessages = await import(`./messages/${locale}/marketing.json`)

    return {
      messages: {
        common: messages.default,
        auth: authMessages.default,
        menu: menuMessages.default,
        orders: ordersMessages.default,
        dashboard: dashboardMessages.default,
        loyalty: loyaltyMessages.default,
        reservations: reservationsMessages.default,
        inventory: inventoryMessages.default,
        reviews: reviewsMessages.default,
        marketing: marketingMessages.default,
      },
      // Configure next-intl options
      timeZone: localeTimezones[locale as Locale],
      now: new Date(),
      // Enable rich text formatting
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }
        },
        number: {
          precise: {
            maximumFractionDigits: 2
          },
          currency: {
            style: 'currency',
            currency: localeCurrencies[locale as Locale]
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error)
    
    // Fallback to English if locale messages fail to load
    if (locale !== defaultLocale) {
      const fallbackMessages = await import(`./messages/${defaultLocale}/common.json`)
      const fallbackAuthMessages = await import(`./messages/${defaultLocale}/auth.json`)
      const fallbackMenuMessages = await import(`./messages/${defaultLocale}/menu.json`)
      const fallbackOrdersMessages = await import(`./messages/${defaultLocale}/orders.json`)
      const fallbackDashboardMessages = await import(`./messages/${defaultLocale}/dashboard.json`)
      const fallbackLoyaltyMessages = await import(`./messages/${defaultLocale}/loyalty.json`)
      const fallbackReservationsMessages = await import(`./messages/${defaultLocale}/reservations.json`)
      const fallbackInventoryMessages = await import(`./messages/${defaultLocale}/inventory.json`)
      const fallbackReviewsMessages = await import(`./messages/${defaultLocale}/reviews.json`)
      const fallbackMarketingMessages = await import(`./messages/${defaultLocale}/marketing.json`)

      return {
        messages: {
          common: fallbackMessages.default,
          auth: fallbackAuthMessages.default,
          menu: fallbackMenuMessages.default,
          orders: fallbackOrdersMessages.default,
          dashboard: fallbackDashboardMessages.default,
          loyalty: fallbackLoyaltyMessages.default,
          reservations: fallbackReservationsMessages.default,
          inventory: fallbackInventoryMessages.default,
          reviews: fallbackReviewsMessages.default,
          marketing: fallbackMarketingMessages.default,
        },
        timeZone: localeTimezones[defaultLocale],
        now: new Date(),
        formats: {
          dateTime: {
            short: {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }
          },
          number: {
            precise: {
              maximumFractionDigits: 2
            },
            currency: {
              style: 'currency',
              currency: localeCurrencies[defaultLocale]
            }
          }
        }
      }
    }
    
    throw error
  }
})