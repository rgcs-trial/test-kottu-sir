import type { Metadata } from 'next'
import { Header } from '@/components/platform/header'
import { Footer } from '@/components/platform/footer'

export const metadata: Metadata = {
  title: 'Restaurant SaaS Platform',
  description: 'Join thousands of restaurants using our complete management platform.',
}

interface PlatformLayoutProps {
  children: React.ReactNode
}

/**
 * Platform layout for main marketing pages, authentication, and onboarding
 * Used for: Landing page, login, signup, pricing, about, etc.
 */
export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Platform Header */}
      <Header />
      
      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      
      {/* Platform Footer */}
      <Footer />
    </div>
  )
}