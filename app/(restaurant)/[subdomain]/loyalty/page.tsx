import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Star, Crown } from 'lucide-react'
import { LoyaltyDashboard } from '@/components/loyalty/loyalty-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

interface LoyaltyPageProps {
  params: {
    subdomain: string
  }
  searchParams: {
    email?: string
  }
}

async function getRestaurantBySubdomain(subdomain: string) {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, subdomain')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single()

    if (error) throw error
    return restaurant
  } catch (error) {
    console.error('Error fetching restaurant:', error)
    return null
  }
}

async function hasActiveLoyaltyProgram(restaurantId: string) {
  try {
    const { data, error } = await supabase
      .from('loyalty_programs')
      .select('id, name, is_active')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data
  } catch (error) {
    console.error('Error checking loyalty program:', error)
    return null
  }
}

export async function generateMetadata({ params }: LoyaltyPageProps): Promise<Metadata> {
  const restaurant = await getRestaurantBySubdomain(params.subdomain)
  
  if (!restaurant) {
    return {
      title: 'Restaurant Not Found'
    }
  }

  return {
    title: `Loyalty Program - ${restaurant.name}`,
    description: `Join the ${restaurant.name} loyalty program and start earning points with every order. Unlock exclusive rewards and special offers!`,
    openGraph: {
      title: `${restaurant.name} Loyalty Program`,
      description: `Earn points and unlock rewards at ${restaurant.name}`,
    }
  }
}

export default async function LoyaltyPage({ params, searchParams }: LoyaltyPageProps) {
  const restaurant = await getRestaurantBySubdomain(params.subdomain)
  
  if (!restaurant) {
    notFound()
  }

  const loyaltyProgram = await hasActiveLoyaltyProgram(restaurant.id)

  if (!loyaltyProgram) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                  <Star className="h-10 w-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold mb-4">Loyalty Program Coming Soon</h1>
                <p className="text-gray-600 mb-6 max-w-md">
                  {restaurant.name} is working on an exciting loyalty program. 
                  Check back soon to start earning points and unlocking rewards!
                </p>
                <Button 
                  onClick={() => window.location.href = `/${params.subdomain}`}
                  className="bg-primary hover:bg-primary/90"
                >
                  Back to Restaurant
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Check if user is logged in via email parameter or session
  const customerEmail = searchParams.email

  if (!customerEmail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Crown className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-4">
                  Welcome to {restaurant.name} Loyalty
                </h1>
                <p className="text-gray-600 mb-8 max-w-md">
                  Join our loyalty program to earn points with every order, 
                  unlock exclusive rewards, and enjoy member-only benefits!
                </p>
                
                <div className="space-y-4 w-full max-w-sm">
                  <Button 
                    className="w-full"
                    onClick={() => window.location.href = `/${params.subdomain}/login?redirect=loyalty`}
                  >
                    Sign In to View Rewards
                  </Button>
                  
                  <p className="text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-normal"
                      onClick={() => window.location.href = `/${params.subdomain}/signup?redirect=loyalty`}
                    >
                      Create one here
                    </Button>
                  </p>
                </div>

                {/* Program Preview */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Earn Points</h3>
                    <p className="text-sm text-gray-600">
                      Get points with every order
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Crown className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Unlock Tiers</h3>
                    <p className="text-sm text-gray-600">
                      Reach higher levels for better rewards
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Star className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Redeem Rewards</h3>
                    <p className="text-sm text-gray-600">
                      Use points for discounts and freebies
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Crown className="h-8 w-8 text-primary" />
                {restaurant.name} Loyalty
              </h1>
              <p className="text-gray-600 mt-1">
                Earn points, unlock rewards, and enjoy exclusive benefits
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={() => window.location.href = `/${params.subdomain}`}
            >
              Back to Restaurant
            </Button>
          </div>
        </div>

        {/* Loyalty Dashboard */}
        <LoyaltyDashboard
          restaurantId={restaurant.id}
          customerEmail={customerEmail}
        />
      </div>
    </div>
  )
}