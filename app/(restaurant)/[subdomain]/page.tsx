import { Suspense } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Clock, 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  ArrowRight,
  ChefHat,
  Truck,
  ShoppingBag
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CartProvider } from '@/hooks/use-cart'

// Loading component
function RestaurantPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section Skeleton */}
      <div className="relative h-64 md:h-96 bg-gray-300 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="h-8 bg-white/20 rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface RestaurantPageProps {
  params: {
    subdomain: string
  }
}

async function RestaurantPageContent({ params }: RestaurantPageProps) {
  const supabase = await createClient()
  const headersList = await headers()
  
  // Get tenant information from middleware headers
  const tenantId = headersList.get('x-tenant-id')
  
  if (!tenantId) {
    notFound()
  }
  
  // Fetch restaurant data with operating hours
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', tenantId)
    .eq('status', 'active')
    .single()

  if (restaurantError || !restaurant) {
    notFound()
  }

  // Fetch sample menu items for preview
  const { data: featuredItems } = await supabase
    .from('menu_items')
    .select(`
      *,
      menu_categories (name)
    `)
    .eq('restaurant_id', tenantId)
    .eq('status', 'active')
    .limit(6)

  // Check if restaurant is currently open (simplified)
  const isOpen = restaurant.status === 'active' // This would be more complex with operating hours

  return (
    <CartProvider restaurantId={restaurant.id}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative">
          {restaurant.cover_image ? (
            <div className="relative h-64 md:h-96 overflow-hidden">
              <img
                src={restaurant.cover_image}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="relative h-64 md:h-96 bg-gradient-to-br from-blue-600 to-purple-700">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}
          
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-start gap-4 mb-4">
              {restaurant.logo && (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white p-2 flex-shrink-0">
                  <img
                    src={restaurant.logo}
                    alt={`${restaurant.name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              <div className="flex-1 text-white">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {restaurant.name}
                </h1>
                {restaurant.description && (
                  <p className="text-lg opacity-90 max-w-2xl">
                    {restaurant.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={isOpen ? "default" : "secondary"}
                className={isOpen ? "bg-green-600 hover:bg-green-700" : "bg-gray-600"}
              >
                {isOpen ? "Open Now" : "Closed"}
              </Badge>
              
              {/* Rating (placeholder) */}
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-white text-sm font-medium">4.8</span>
                <span className="text-white/70 text-sm">(120+ reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Restaurant Info & Featured Items */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href={`/${params.subdomain}/menu`}>
                  <Button size="lg" className="w-full h-16 flex-col gap-1">
                    <ChefHat className="h-6 w-6" />
                    <span>View Menu</span>
                  </Button>
                </Link>
                
                <Link href={`/${params.subdomain}/menu`}>
                  <Button size="lg" variant="outline" className="w-full h-16 flex-col gap-1">
                    <Truck className="h-6 w-6" />
                    <span>Order Delivery</span>
                  </Button>
                </Link>
                
                <Link href={`/${params.subdomain}/menu`}>
                  <Button size="lg" variant="outline" className="w-full h-16 flex-col gap-1">
                    <ShoppingBag className="h-6 w-6" />
                    <span>Order Pickup</span>
                  </Button>
                </Link>
              </div>

              {/* About Section */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">About {restaurant.name}</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 leading-relaxed">
                    {restaurant.description || `Welcome to ${restaurant.name}! We're passionate about serving delicious food made with fresh, quality ingredients. Whether you're dining in, picking up, or having food delivered, we're committed to providing you with an exceptional experience.`}
                  </p>
                </div>
                
                {/* Cuisine Type & Specialties (placeholder) */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Italian</Badge>
                  <Badge variant="secondary">Pizza</Badge>
                  <Badge variant="secondary">Pasta</Badge>
                  <Badge variant="secondary">Family-Friendly</Badge>
                </div>
              </div>

              {/* Featured Menu Items */}
              {featuredItems && featuredItems.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Popular Items</h2>
                    <Link href={`/${params.subdomain}/menu`}>
                      <Button variant="ghost" className="group">
                        View Full Menu 
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    {featuredItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/${params.subdomain}/menu`}
                        className="group flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {item.images && item.images.length > 0 && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-1">
                            <span className="font-semibold text-green-600">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Restaurant Details */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Contact & Location</h3>
                
                <div className="space-y-3">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">
                        {restaurant.address_street}<br />
                        {restaurant.address_city}, {restaurant.address_state} {restaurant.address_zip_code}
                      </div>
                    </div>
                  </div>
                  
                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <a 
                      href={`tel:${restaurant.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {restaurant.phone}
                    </a>
                  </div>
                  
                  {/* Website */}
                  {restaurant.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <a 
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Hours (placeholder) */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Hours</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monday - Thursday</span>
                    <span>11:00 AM - 9:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Friday - Saturday</span>
                    <span>11:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>12:00 PM - 8:00 PM</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {isOpen ? "Open Now" : "Closed Now"}
                    </span>
                    <Badge 
                      variant={isOpen ? "default" : "secondary"}
                      className={isOpen ? "bg-green-600" : "bg-gray-600"}
                    >
                      {isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Delivery & Pickup</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-medium">$2.99</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Order</span>
                    <span className="font-medium">$15.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Time</span>
                    <span className="font-medium">30-45 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pickup Time</span>
                    <span className="font-medium">15-25 min</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Link href={`/${params.subdomain}/menu`}>
                <Button size="lg" className="w-full">
                  Start Your Order
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </CartProvider>
  )
}

export default function RestaurantPage({ params }: RestaurantPageProps) {
  return (
    <Suspense fallback={<RestaurantPageSkeleton />}>
      <RestaurantPageContent params={params} />
    </Suspense>
  )
}