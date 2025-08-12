import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Kottu</h1>
            <span className="text-sm text-gray-500">Restaurant SaaS</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Your Restaurant, Online in Minutes
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Create your restaurant's online ordering system with unique links, 
            menu management, and integrated payments. Start accepting orders today.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/signup?type=restaurant">
              <Button size="lg" className="px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="px-8">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>🔗 Unique Restaurant Links</CardTitle>
              <CardDescription>
                Each restaurant gets their own subdomain for easy customer access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                yourrestaurant.kottu.app - Professional and memorable URLs for your customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📱 Complete Order Management</CardTitle>
              <CardDescription>
                Real-time order tracking and kitchen management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Manage orders, track deliveries, and communicate with customers seamlessly
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>💳 Integrated Payments</CardTitle>
              <CardDescription>
                Secure payment processing with Stripe Connect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Accept cards, digital wallets, and manage payouts automatically
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* User Types */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Built for Everyone</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👨‍💼</span>
            </div>
            <h4 className="font-semibold mb-2">Platform Owner</h4>
            <p className="text-sm text-gray-600">
              Manage all restaurants, view analytics, and grow your platform
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🍕</span>
            </div>
            <h4 className="font-semibold mb-2">Restaurant Staff</h4>
            <p className="text-sm text-gray-600">
              Manage menus, process orders, and track performance
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🛍️</span>
            </div>
            <h4 className="font-semibold mb-2">Customers</h4>
            <p className="text-sm text-gray-600">
              Browse menus, order easily, and track deliveries - no login required
            </p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Quick Access</h3>
          <div className="space-y-4">
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full justify-start">
                📊 Restaurant Dashboard
              </Button>
            </Link>
            <Link href="/menu-demo" className="block">
              <Button variant="outline" className="w-full justify-start">
                🍽️ Menu Management Demo
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full justify-start">
                🔐 Login Page
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="text-center text-gray-600">
          <p>© 2024 Kottu - Restaurant SaaS Platform</p>
          <p className="text-sm mt-2">Built with Next.js, Supabase, and Stripe</p>
        </div>
      </footer>
    </div>
  )
}