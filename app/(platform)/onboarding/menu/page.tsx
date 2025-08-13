'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, ArrowRight, Save, Upload, Plus, ChefHat } from 'lucide-react'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { MenuImport } from '@/components/onboarding/menu-import'
import { useOnboarding } from '@/hooks/use-onboarding'

/**
 * Menu Setup Onboarding Page
 * Step 2: Set up initial menu with templates, import, or manual creation
 */
export default function MenuOnboardingPage() {
  const router = useRouter()
  const { updateStep, onboardingStatus } = useOnboarding()
  const [loading, setLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'template' | 'import' | 'manual'>('template')
  const [menuData, setMenuData] = useState<any>(null)

  const handleSave = async (data: any) => {
    try {
      setLoading(true)
      await updateStep('menu', data, 'completed')
      router.push('/onboarding/payment')
    } catch (error) {
      console.error('Failed to save menu:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndContinueLater = async (data: any) => {
    try {
      setLoading(true)
      await updateStep('menu', data, 'in_progress')
      router.push('/onboarding')
    } catch (error) {
      console.error('Failed to save progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipForNow = async () => {
    try {
      setLoading(true)
      await updateStep('menu', { skipped: true }, 'completed')
      router.push('/onboarding/payment')
    } catch (error) {
      console.error('Failed to skip menu setup:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/onboarding/restaurant')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Restaurant Details
            </Button>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Menu Setup</h1>
              <p className="text-sm text-gray-600">Step 2 of 4</p>
            </div>
            
            <div className="w-20"></div>
          </div>
          
          <div className="mt-4">
            <ProgressBar currentStep="menu" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Set up your menu
            </h2>
            <p className="text-gray-600">
              Choose how you'd like to create your menu. You can always add more items later.
            </p>
          </div>

          {/* Menu Setup Options */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Choose Your Setup Method
              </CardTitle>
              <CardDescription>
                Select the method that works best for you to get started quickly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as any)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="template" className="flex items-center gap-2">
                    <ChefHat className="h-4 w-4" />
                    Use Template
                  </TabsTrigger>
                  <TabsTrigger value="import" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Start Fresh
                  </TabsTrigger>
                </TabsList>

                {/* Template Method */}
                <TabsContent value="template" className="space-y-6">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Quick Start Templates
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Choose a template based on your cuisine type to get started instantly.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { type: 'american', name: 'American Diner', items: '12 items', image: '🍔' },
                        { type: 'italian', name: 'Italian Restaurant', items: '15 items', image: '🍝' },
                        { type: 'mexican', name: 'Mexican Cantina', items: '18 items', image: '🌮' },
                        { type: 'asian', name: 'Asian Fusion', items: '14 items', image: '🍜' },
                        { type: 'cafe', name: 'Coffee & Cafe', items: '10 items', image: '☕' },
                        { type: 'pizza', name: 'Pizza Place', items: '8 items', image: '🍕' }
                      ].map((template) => (
                        <Card 
                          key={template.type}
                          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                          onClick={() => setMenuData({ method: 'template', template: template.type })}
                        >
                          <CardContent className="p-6 text-center">
                            <div className="text-4xl mb-3">{template.image}</div>
                            <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.items}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Import Method */}
                <TabsContent value="import" className="space-y-6">
                  <MenuImport 
                    onImportComplete={(data) => setMenuData({ method: 'import', ...data })}
                  />
                </TabsContent>

                {/* Manual Method */}
                <TabsContent value="manual" className="space-y-6">
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Start with a blank menu
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Perfect if you want to build your menu from scratch or have a unique setup.
                      You'll be taken to the menu management section after completing onboarding.
                    </p>
                    <Button 
                      onClick={() => setMenuData({ method: 'manual', categories: [], items: [] })}
                      variant="outline"
                      size="lg"
                    >
                      Choose Blank Menu
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Sample Menu Preview */}
          {menuData && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Menu Preview</CardTitle>
                <CardDescription>
                  This is what your menu setup will include:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4">
                  {menuData.method === 'template' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Template:</strong> {menuData.template} cuisine
                      </p>
                      <p className="text-sm text-gray-600">
                        Includes categories, sample items, and suggested pricing that you can customize.
                      </p>
                    </div>
                  )}
                  {menuData.method === 'import' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Imported:</strong> {menuData.itemCount} items from CSV
                      </p>
                      <p className="text-sm text-gray-600">
                        All items have been validated and are ready to use.
                      </p>
                    </div>
                  )}
                  {menuData.method === 'manual' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Blank Menu:</strong> Ready for your custom items
                      </p>
                      <p className="text-sm text-gray-600">
                        You'll add categories and items in the dashboard after onboarding.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  💡
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">
                    Menu setup tips
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Templates are pre-configured with popular items for your cuisine type</li>
                    <li>• CSV import supports: Name, Description, Price, Category columns</li>
                    <li>• You can always modify, add, or remove items after setup</li>
                    <li>• Consider starting simple and expanding your menu over time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Button 
              variant="outline" 
              onClick={() => router.push('/onboarding/restaurant')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost"
                onClick={handleSkipForNow}
                disabled={loading}
              >
                Skip for Now
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => menuData && handleSaveAndContinueLater(menuData)}
                disabled={!menuData || loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save & Continue Later
              </Button>
              
              <Button 
                onClick={() => menuData && handleSave(menuData)}
                disabled={!menuData || loading}
                className="flex items-center gap-2"
              >
                {loading ? 'Setting up...' : 'Continue to Payment'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  )
}