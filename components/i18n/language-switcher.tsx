'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n'

interface LanguageSwitcherProps {
  variant?: 'default' | 'header' | 'footer'
  showFlag?: boolean
  showText?: boolean
  className?: string
}

export function LanguageSwitcher({ 
  variant = 'default',
  showFlag = true,
  showText = true,
  className = ''
}: LanguageSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return

    startTransition(() => {
      // Remove current locale from pathname if present
      const pathnameWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/'
      
      // Create new path with selected locale
      const newPath = newLocale === 'en' 
        ? pathnameWithoutLocale 
        : `/${newLocale}${pathnameWithoutLocale}`

      router.push(newPath)
      router.refresh()
    })
  }

  const buttonVariants = {
    default: 'ghost',
    header: 'ghost',
    footer: 'link'
  } as const

  const buttonSizes = {
    default: 'sm',
    header: 'sm', 
    footer: 'sm'
  } as const

  const getCurrentLocaleDisplay = () => {
    const flag = showFlag ? localeFlags[currentLocale] : ''
    const text = showText ? localeNames[currentLocale] : ''
    
    if (flag && text) {
      return `${flag} ${text}`
    } else if (flag) {
      return flag
    } else if (text) {
      return text
    }
    return currentLocale.toUpperCase()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={buttonVariants[variant] as any}
          size={buttonSizes[variant] as any}
          className={`gap-2 ${className}`}
          disabled={isPending}
        >
          {variant === 'default' && <Globe className="h-4 w-4" />}
          <span className="flex items-center gap-1.5">
            {getCurrentLocaleDisplay()}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className="flex items-center justify-between gap-2 cursor-pointer"
            disabled={isPending}
          >
            <span className="flex items-center gap-2">
              {showFlag && (
                <span className="text-sm">{localeFlags[locale]}</span>
              )}
              <span className="text-sm">{localeNames[locale]}</span>
            </span>
            {currentLocale === locale && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Compact version for mobile/space-constrained areas
export function CompactLanguageSwitcher({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitcher
      variant="header"
      showFlag={true}
      showText={false}
      className={className}
    />
  )
}

// Text-only version for footers
export function TextLanguageSwitcher({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitcher
      variant="footer"
      showFlag={false}
      showText={true}
      className={className}
    />
  )
}

// Flag-only version for very compact spaces
export function FlagLanguageSwitcher({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitcher
      variant="header"
      showFlag={true}
      showText={false}
      className={`h-8 w-8 p-1 ${className}`}
    />
  )
}