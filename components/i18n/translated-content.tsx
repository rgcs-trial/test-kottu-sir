'use client'

import { useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { type Locale } from '@/i18n'

interface TranslatedContentProps {
  defaultContent: string
  translations?: Record<Locale, string>
  fallbackToDefault?: boolean
  showLanguageBadge?: boolean
  className?: string
}

export function TranslatedContent({
  defaultContent,
  translations = {},
  fallbackToDefault = true,
  showLanguageBadge = false,
  className = ''
}: TranslatedContentProps) {
  const currentLocale = useLocale() as Locale

  // Get content for current locale
  const getLocalizedContent = () => {
    // If current locale is English or no translations provided, use default
    if (currentLocale === 'en' || !translations) {
      return { content: defaultContent, language: 'en' as Locale }
    }

    // Try to get translation for current locale
    const translation = translations[currentLocale]
    if (translation) {
      return { content: translation, language: currentLocale }
    }

    // Fallback to default if enabled
    if (fallbackToDefault) {
      return { content: defaultContent, language: 'en' as Locale }
    }

    // Return empty if no fallback
    return { content: '', language: currentLocale }
  }

  const { content, language } = getLocalizedContent()

  if (!content) return null

  return (
    <div className={`relative ${className}`}>
      {content}
      {showLanguageBadge && language !== currentLocale && (
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 text-xs"
          title={`Content shown in ${language.toUpperCase()} (translation not available)`}
        >
          {language.toUpperCase()}
        </Badge>
      )}
    </div>
  )
}

// Specialized components for different content types
interface MenuItemContentProps {
  name: string
  description?: string
  translations?: {
    name?: Record<Locale, string>
    description?: Record<Locale, string>
  }
  showTranslationStatus?: boolean
  className?: string
}

export function MenuItemContent({
  name,
  description,
  translations,
  showTranslationStatus = false,
  className = ''
}: MenuItemContentProps) {
  const currentLocale = useLocale() as Locale

  const hasTranslation = (field: 'name' | 'description') => {
    return translations?.[field]?.[currentLocale] || false
  }

  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <TranslatedContent
          defaultContent={name}
          translations={translations?.name}
          className="font-semibold"
        />
        {showTranslationStatus && currentLocale !== 'en' && (
          <div className="flex gap-1">
            {!hasTranslation('name') && (
              <Badge variant="outline" className="text-xs">
                Auto
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {description && (
        <div className="flex items-start gap-2 mt-1">
          <TranslatedContent
            defaultContent={description}
            translations={translations?.description}
            className="text-sm text-muted-foreground"
          />
          {showTranslationStatus && currentLocale !== 'en' && !hasTranslation('description') && (
            <Badge variant="outline" className="text-xs">
              Auto
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// Review content with translations
interface ReviewContentProps {
  title?: string
  comment: string
  authorName: string
  translations?: {
    title?: Record<Locale, string>
    comment?: Record<Locale, string>
  }
  showOriginalLanguage?: boolean
  originalLanguage?: Locale
  className?: string
}

export function ReviewContent({
  title,
  comment,
  authorName,
  translations,
  showOriginalLanguage = false,
  originalLanguage = 'en',
  className = ''
}: ReviewContentProps) {
  const currentLocale = useLocale() as Locale

  return (
    <div className={className}>
      {title && (
        <div className="flex items-start gap-2 mb-2">
          <TranslatedContent
            defaultContent={title}
            translations={translations?.title}
            className="font-medium"
          />
          {showOriginalLanguage && originalLanguage !== currentLocale && (
            <Badge variant="secondary" className="text-xs">
              Translated from {originalLanguage.toUpperCase()}
            </Badge>
          )}
        </div>
      )}
      
      <TranslatedContent
        defaultContent={comment}
        translations={translations?.comment}
        className="text-sm"
      />
      
      <div className="mt-2 text-xs text-muted-foreground">
        — {authorName}
      </div>
    </div>
  )
}

// Category content with translations
interface CategoryContentProps {
  name: string
  description?: string
  translations?: {
    name?: Record<Locale, string>
    description?: Record<Locale, string>
  }
  className?: string
}

export function CategoryContent({
  name,
  description,
  translations,
  className = ''
}: CategoryContentProps) {
  return (
    <div className={className}>
      <TranslatedContent
        defaultContent={name}
        translations={translations?.name}
        className="font-medium"
      />
      
      {description && (
        <TranslatedContent
          defaultContent={description}
          translations={translations?.description}
          className="text-sm text-muted-foreground mt-1"
        />
      )}
    </div>
  )
}

// Utility component for showing translation completeness
interface TranslationStatusProps {
  translations?: Record<Locale, string>
  requiredLocales?: Locale[]
  className?: string
}

export function TranslationStatus({
  translations = {},
  requiredLocales = ['es', 'fr', 'de'],
  className = ''
}: TranslationStatusProps) {
  const completedTranslations = requiredLocales.filter(locale => translations[locale])
  const completionPercentage = Math.round((completedTranslations.length / requiredLocales.length) * 100)

  const getStatusColor = () => {
    if (completionPercentage === 100) return 'bg-green-500'
    if (completionPercentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {completedTranslations.length}/{requiredLocales.length}
      </span>
      <Badge 
        variant={completionPercentage === 100 ? 'default' : 'secondary'}
        className="text-xs"
      >
        {completionPercentage}%
      </Badge>
    </div>
  )
}