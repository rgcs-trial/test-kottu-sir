'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'

/**
 * Platform header for marketing pages and authentication
 */
export function Header() {
  const t = useTranslations('common')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigation = [
    { name: t('navigation.features') || 'Features', href: '/features' },
    { name: t('navigation.pricing') || 'Pricing', href: '/pricing' },
    { name: t('navigation.about') || 'About', href: '/about' },
    { name: t('navigation.contact') || 'Contact', href: '/contact' },
  ]

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="text-xl font-bold text-gradient">RestaurantSaaS</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setIsMenuOpen(true)}
          >
            <span className="sr-only">{t('buttons.openMenu') || 'Open main menu'}</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-brand-600"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-6 lg:items-center">
          <LanguageSwitcher variant="header" />
          <Button variant="ghost" asChild>
            <Link href="/login">{t('navigation.login')}</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">{t('buttons.getStarted') || 'Start Free Trial'}</Link>
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 bg-white px-6 py-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5">
                <span className="text-xl font-bold text-gradient">RestaurantSaaS</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="sr-only">{t('buttons.close')}</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6 space-y-4">
                  <div className="flex justify-center pb-4">
                    <LanguageSwitcher variant="header" />
                  </div>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="/login">{t('navigation.login')}</Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/signup">{t('buttons.getStarted') || 'Start Free Trial'}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}