'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Building2,
  CreditCard,
  Home,
  Settings,
  Users,
  Zap,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { name: 'Restaurants', href: '/admin/restaurants', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
  { name: 'System', href: '/admin/system', icon: Zap },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

/**
 * Admin sidebar for platform administration
 */
export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center">
        <span className="text-xl font-bold text-white">Admin Portal</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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