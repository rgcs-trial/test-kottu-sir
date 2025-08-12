'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

/**
 * Platform header for marketing pages and authentication
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigation = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
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
            <span className="sr-only">Open main menu</span>
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
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-6">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start Free Trial</Link>
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
                <span className="sr-only">Close menu</span>
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
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/signup">Start Free Trial</Link>
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