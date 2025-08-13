// import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle, Star, Users, Zap } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Complete Restaurant Management Platform',
  description: 'Streamline your restaurant operations with our all-in-one platform. Online ordering, menu management, analytics, and more.',
}

/**
 * Platform landing page
 * This is the main marketing page for the SaaS platform
 */
export default function PlatformHomePage() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast Setup',
      description: 'Get your restaurant online in minutes, not days. Our intuitive setup process gets you serving customers quickly.',
    },
    {
      icon: Users,
      title: 'Customer Engagement',
      description: 'Build lasting relationships with powerful customer management tools, loyalty programs, and automated marketing.',
    },
    {
      icon: CheckCircle,
      title: 'Complete Solution',
      description: 'Everything you need in one platform: online ordering, menu management, payment processing, and analytics.',
    },
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Owner, Golden Dragon Restaurant',
      content: 'Our online orders increased by 300% in the first month. The platform is incredibly easy to use and our customers love it.',
      rating: 5,
    },
    {
      name: 'Marco Rodriguez',
      role: 'Manager, Bella Vista Pizzeria',
      content: 'The analytics dashboard helped us optimize our menu and increase profits by 45%. Best investment we ever made.',
      rating: 5,
    },
    {
      name: 'Jennifer Kim',
      role: 'Owner, Fusion Bites',
      content: 'Customer support is amazing and the features just keep getting better. Our operations are now completely streamlined.',
      rating: 5,
    },
  ]

  const stats = [
    { value: '10,000+', label: 'Restaurants Served' },
    { value: '50M+', label: 'Orders Processed' },
    { value: '99.9%', label: 'Uptime Guarantee' },
    { value: '4.9/5', label: 'Customer Rating' },
  ]

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-brand-50 to-white">
        <div className="container-padding mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Hero Content */}
            <div className="flex flex-col justify-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                  Your Restaurant,{' '}
                  <span className="text-gradient font-display">Online & Thriving</span>
                </h1>
                <p className="text-xl text-gray-600">
                  The complete platform to manage your restaurant, engage customers, and grow your business.
                  From online ordering to analytics, we've got everything covered.
                </p>
              </div>
              
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="restaurant-primary">
                  <Link href="/signup">
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/demo">Watch Demo</Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-brand-200 border-2 border-white" />
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="ml-1 font-medium">4.9/5 from 1,000+ reviews</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 p-8">
                <div className="h-full w-full rounded-xl bg-white shadow-2xl">
                  {/* Placeholder for hero image/demo */}
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto h-24 w-24 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                        <Zap className="h-12 w-12 text-brand-600" />
                      </div>
                      <p className="text-gray-600">Dashboard Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-white">
        <div className="container-padding mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-gray-900 lg:text-4xl">{stat.value}</div>
                <div className="text-sm text-gray-600 lg:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-neutral-50">
        <div className="container-padding mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything Your Restaurant Needs
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Powerful features designed specifically for restaurant success
            </p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="card-elevated p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100">
                  <feature.icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding bg-white">
        <div className="container-padding mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Loved by Restaurant Owners
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              See what our customers have to say about their success
            </p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card-elevated p-6">
                <div className="mb-4 flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-brand-600">
        <div className="container-padding mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Transform Your Restaurant?
          </h2>
          <p className="mt-4 text-xl text-brand-100">
            Join thousands of successful restaurants. Start your free trial today.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-brand-600" asChild>
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}