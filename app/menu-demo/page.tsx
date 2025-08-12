"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MenuCategoryForm } from '@/components/menu/menu-category-form'
import { MenuItemForm } from '@/components/menu/menu-item-form'
import { MenuItemCard } from '@/components/menu/menu-item-card'
import { MenuCategoryList } from '@/components/menu/menu-category-list'
import { MenuPreview } from '@/components/menu/menu-preview'
import { Database } from '@/lib/supabase/types'

// Mock data for demonstration
const mockCategories: Array<Database['public']['Tables']['menu_categories']['Row'] & {
  menu_items?: { count: number }
}> = [
  {
    id: '1',
    restaurant_id: 'demo-restaurant',
    name: 'Appetizers',
    description: 'Start your meal with our delicious appetizers',
    image: null,
    sort_order: 0,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    menu_items: { count: 5 }
  },
  {
    id: '2',
    restaurant_id: 'demo-restaurant',
    name: 'Main Courses',
    description: 'Hearty main dishes for every taste',
    image: null,
    sort_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    menu_items: { count: 8 }
  }
]

const mockItems: Array<Database['public']['Tables']['menu_items']['Row'] & {
  category?: Database['public']['Tables']['menu_categories']['Row']
}> = [
  {
    id: '1',
    restaurant_id: 'demo-restaurant',
    category_id: '1',
    name: 'Caesar Salad',
    description: 'Fresh romaine lettuce with classic Caesar dressing, croutons, and parmesan cheese',
    price: 12.99,
    compare_at_price: null,
    images: [],
    status: 'active' as const,
    is_vegetarian: true,
    is_vegan: false,
    is_gluten_free: false,
    allergens: ['dairy'],
    track_inventory: false,
    stock_quantity: null,
    low_stock_threshold: null,
    calories: 320,
    preparation_time: 10,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: mockCategories[0]
  },
  {
    id: '2',
    restaurant_id: 'demo-restaurant',
    category_id: '2',
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon grilled to perfection with seasonal vegetables',
    price: 24.99,
    compare_at_price: 29.99,
    images: [],
    status: 'active' as const,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: true,
    allergens: ['fish'],
    track_inventory: true,
    stock_quantity: 8,
    low_stock_threshold: 5,
    calories: 450,
    preparation_time: 20,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: mockCategories[1]
  }
]

const mockMenuData = [
  {
    ...mockCategories[0],
    menu_items: [mockItems[0]]
  },
  {
    ...mockCategories[1],
    menu_items: [mockItems[1]]
  }
]

export default function MenuDemoPage() {
  const [activeTab, setActiveTab] = useState('categories')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Mock handlers
  const handleCategorySubmit = async (data: any) => {
    console.log('Category submitted:', data)
    setShowCategoryForm(false)
    setEditingCategory(null)
  }

  const handleItemSubmit = async (data: any) => {
    console.log('Item submitted:', data)
    setShowItemForm(false)
    setEditingItem(null)
  }

  const handleCategoryReorder = async (categories: any[]) => {
    console.log('Categories reordered:', categories)
  }

  const handleCategoryEdit = (category: any) => {
    setEditingCategory(category)
    setShowCategoryForm(true)
  }

  const handleCategoryDelete = (category: any) => {
    console.log('Delete category:', category)
  }

  const handleCategoryToggleVisibility = (category: any) => {
    console.log('Toggle category visibility:', category)
  }

  const handleAddItem = (categoryId: string) => {
    console.log('Add item to category:', categoryId)
    setShowItemForm(true)
  }

  const handleItemEdit = (item: any) => {
    setEditingItem(item)
    setShowItemForm(true)
  }

  const handleItemDelete = (item: any) => {
    console.log('Delete item:', item)
  }

  const handleItemDuplicate = (item: any) => {
    console.log('Duplicate item:', item)
  }

  const handleItemPreview = (item: any) => {
    console.log('Preview item:', item)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Menu Management System Demo</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This is a demonstration of the comprehensive menu management system with all components working together.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Menu Categories</h2>
            <Button onClick={() => setShowCategoryForm(true)}>
              Add Category
            </Button>
          </div>

          {showCategoryForm ? (
            <MenuCategoryForm
              category={editingCategory}
              restaurantId="demo-restaurant"
              onSubmit={handleCategorySubmit}
              onCancel={() => {
                setShowCategoryForm(false)
                setEditingCategory(null)
              }}
            />
          ) : (
            <MenuCategoryList
              categories={mockCategories}
              onReorder={handleCategoryReorder}
              onEdit={handleCategoryEdit}
              onDelete={handleCategoryDelete}
              onToggleVisibility={handleCategoryToggleVisibility}
              onAddItem={handleAddItem}
            />
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Menu Items</h2>
            <Button onClick={() => setShowItemForm(true)}>
              Add Item
            </Button>
          </div>

          {showItemForm ? (
            <MenuItemForm
              item={editingItem}
              restaurantId="demo-restaurant"
              categories={mockCategories}
              onSubmit={handleItemSubmit}
              onCancel={() => {
                setShowItemForm(false)
                setEditingItem(null)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleItemEdit}
                  onDelete={handleItemDelete}
                  onDuplicate={handleItemDuplicate}
                  onPreview={handleItemPreview}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="modifiers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modifiers & Variants</CardTitle>
              <CardDescription>
                This section would show the MenuModifiers and MenuVariants components in action.
                Due to the complexity and mock data requirements, this is represented as a placeholder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <p>MenuModifiers and MenuVariants components would be displayed here.</p>
                <p className="text-sm mt-2">
                  These components require additional database setup and complex state management.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <MenuPreview menuData={mockMenuData} />
        </TabsContent>
      </Tabs>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">✅ Core Features</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Category management with drag & drop</li>
                <li>• Menu item CRUD operations</li>
                <li>• Image upload support</li>
                <li>• Inventory tracking</li>
                <li>• Dietary information</li>
                <li>• Allergen management</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">✅ Advanced Features</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Real-time updates via Supabase</li>
                <li>• TypeScript with full type safety</li>
                <li>• Form validation with Zod</li>
                <li>• Responsive design</li>
                <li>• Search and filtering</li>
                <li>• Multiple view modes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">✅ Production Ready</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Server actions for data operations</li>
                <li>• Image optimization</li>
                <li>• Error handling</li>
                <li>• Loading states</li>
                <li>• Security validation</li>
                <li>• Performance optimized</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}