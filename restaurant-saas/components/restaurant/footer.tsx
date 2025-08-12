import Link from 'next/link'
import type { Restaurant } from '@/types'
import { formatPhoneNumber } from '@/lib/utils'

interface RestaurantFooterProps {
  restaurant: Restaurant
}

/**
 * Restaurant footer for customer-facing pages
 */
export function RestaurantFooter({ restaurant }: RestaurantFooterProps) {
  return (
    <footer className="border-t bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Restaurant Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{restaurant.name}</h3>
            <p className="text-gray-600 mb-4">{restaurant.description}</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <strong>Address:</strong><br />
                {restaurant.address.street}<br />
                {restaurant.address.city}, {restaurant.address.state} {restaurant.address.zipCode}
              </div>
              <div>
                <strong>Phone:</strong> {formatPhoneNumber(restaurant.phone)}
              </div>
              <div>
                <strong>Email:</strong> {restaurant.email}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/menu" className="text-gray-600 hover:text-brand-600">
                  Our Menu
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-brand-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-brand-600">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/order-tracking" className="text-gray-600 hover:text-brand-600">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Hours & Policies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Information</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/hours" className="hover:text-brand-600">
                  Hours of Operation
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="hover:text-brand-600">
                  Delivery Information
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-600">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} {restaurant.name}. All rights reserved.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Powered by RestaurantSaaS
          </p>
        </div>
      </div>
    </footer>
  )
}