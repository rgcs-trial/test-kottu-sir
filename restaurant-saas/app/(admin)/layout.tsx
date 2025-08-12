import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminHeader } from '@/components/admin/header'

export const metadata: Metadata = {
  title: {
    template: '%s | Admin - Restaurant SaaS',
    default: 'Admin Dashboard - Restaurant SaaS',
  },
  description: 'Platform administration for Restaurant SaaS',
  robots: {
    index: false,
    follow: false,
  },
}

interface AdminLayoutProps {
  children: React.ReactNode
}

/**
 * Admin layout for platform administration
 * Used for: Super admin dashboard, platform management, analytics, etc.
 * This is for managing the SaaS platform itself, not individual restaurants
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-neutral-100">
      {/* Admin Sidebar */}
      <AdminSidebar />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin Header */}
        <AdminHeader />
        
        {/* Page Content */}
        <main 
          id="main-content" 
          className="flex-1 overflow-y-auto bg-background p-6"
        >
          {children}
        </main>
      </div>
    </div>
  )
}