'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, ShoppingCart, X } from 'lucide-react'
import type { Restaurant } from '@/types'

interface RestaurantHeaderProps {
  restaurant: Restaurant
}

/**
 * Restaurant header for customer-facing pages
 */
export function RestaurantHeader({ restaurant }: RestaurantHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigation = [
    { name: 'Menu', href: '/menu' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ]

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        {/* Restaurant Logo & Name */}
        <div className="flex items-center space-x-4 lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt={restaurant.name} className="h-8 w-auto" />
            ) : (
              <span className="text-xl font-bold text-brand-600">{restaurant.name}</span>
            )}
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

        {/* Cart & Actions */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">Shopping cart</span>
            </Link>
          </Button>
          <Button asChild>
            <Link href="/order">Order Now</Link>
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 bg-white px-6 py-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5">
                <span className="text-xl font-bold text-brand-600">{restaurant.name}</span>
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
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/cart">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Cart
                    </Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/order">Order Now</Link>
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