'use client'

import { Button } from '@/components/ui/button'
import { Bell, Search, User } from 'lucide-react'
import type { Restaurant } from '@/types'

interface StaffHeaderProps {
  restaurant: Restaurant
}

/**
 * Staff header for restaurant management
 */
export function StaffHeader({ restaurant }: StaffHeaderProps) {
  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">Restaurant Dashboard</h1>
          <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-800">
            {restaurant.subscriptionTier}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, menu items..."
              className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User menu */}
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}