'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Restaurant } from '@/types'
import {
  BarChart3,
  Home,
  Menu as MenuIcon,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Menu', href: '/dashboard/menu', icon: MenuIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Staff', href: '/dashboard/staff', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface StaffSidebarProps {
  restaurant: Restaurant
}

/**
 * Staff sidebar for restaurant management
 */
export function StaffSidebar({ restaurant }: StaffSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex w-64 flex-col bg-white border-r">
      {/* Restaurant Info */}
      <div className="flex h-16 items-center justify-center border-b px-4">
        {restaurant.logo ? (
          <img src={restaurant.logo} alt={restaurant.name} className="h-8 w-auto" />
        ) : (
          <span className="text-lg font-bold text-brand-600">{restaurant.name}</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}