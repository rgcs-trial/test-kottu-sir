import type { Metadata } from 'next'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Menu as MenuIcon, 
  Edit,
  Eye,
  EyeOff,
  DollarSign,
  Package,
  ChefHat,
  Search,
  Filter,
  Grid3X3,
  List
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { MenuCategory, MenuItem } from '@/types'
import { getMenuCategories, getMenuItems } from '@/lib/restaurant/actions'

export const metadata: Metadata = {
  title: 'Menu Management',
  description: 'Manage your restaurant menu items and categories',
}

/**
 * Menu Items Loading Component
 */
function MenuItemsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="w-full h-48 bg-gray-200 animate-pulse" />
          <CardContent className="p-4">
            <div className="w-3/4 h-5 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="w-1/3 h-6 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Menu Category Card Component
 */
function MenuCategoryCard({ 
  category, 
  itemCount 
}: { 
  category: MenuCategory
  itemCount: number 
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {category.description || 'No description'}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Badge>
              <Badge variant={category.isActive ? 'success' : 'secondary'}>
                {category.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          {category.image && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 ml-4">
              <img 
                src={category.image} 
                alt={category.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/menu/category/${category.id}`}>
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/menu?category=${category.id}`}>
              <Eye className="h-3 w-3 mr-1" />
              View Items
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Menu Item Card Component
 */
function MenuItemCard({ item }: { item: MenuItem & { category?: { name: string } } }) {
  const getStatusBadge = () => {
    switch (item.status) {
      case 'active':
        return <Badge variant="success">Available</Badge>
      case 'out_of_stock':
        return <Badge variant="warning">Out of Stock</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      default:
        return <Badge variant="secondary">{item.status}</Badge>
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {item.images.length > 0 ? (
        <div className="w-full h-48 bg-gray-100 overflow-hidden">
          <img 
            src={item.images[0]} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
          <ChefHat className="h-12 w-12 text-gray-400" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 line-clamp-1">{item.name}</h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {item.description || 'No description available'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="font-bold text-lg text-green-600">
              ${item.price.toFixed(2)}
            </span>
            {item.compareAtPrice && item.compareAtPrice > item.price && (
              <span className="text-sm text-muted-foreground line-through">
                ${item.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {item.category && (
            <Badge variant="outline" className="text-xs">
              {item.category.name}
            </Badge>
          )}
          {item.isVegetarian && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              Vegetarian
            </Badge>
          )}
          {item.isVegan && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              Vegan
            </Badge>
          )}
          {item.isGlutenFree && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              Gluten Free
            </Badge>
          )}
        </div>

        {item.trackInventory && (
          <div className="text-xs text-muted-foreground mb-3">
            Stock: {item.stockQuantity || 0} units
            {item.lowStockThreshold && item.stockQuantity && 
             item.stockQuantity <= item.lowStockThreshold && (
              <span className="text-orange-600 ml-1">(Low Stock)</span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/menu/item/${item.id}`}>
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex items-center gap-1"
          >
            {item.status === 'active' ? (
              <>
                <EyeOff className="h-3 w-3" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Show
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Menu Management Page Component
 */
export default async function MenuManagementPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient()
  const headersList = headers()
  
  // Get tenant information from middleware
  const tenantId = headersList.get('x-tenant-id')
  
  if (!tenantId) {
    notFound()
  }

  // Fetch categories and items
  const [categories, items] = await Promise.all([
    getMenuCategories(),
    getMenuItems(searchParams.category as string)
  ])

  const selectedCategory = searchParams.category as string
  const viewMode = searchParams.view === 'list' ? 'list' : 'grid'

  // Get item counts per category
  const categoryItemCounts = new Map<string, number>()
  for (const category of categories) {
    const categoryItems = await getMenuItems(category.id)
    categoryItemCounts.set(category.id, categoryItems.length)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MenuIcon className="h-6 w-6" />
            Menu Management
          </h1>
          <p className="text-gray-600">
            Manage your restaurant's menu items, categories, and pricing
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/menu/category/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/menu/item/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
              <MenuIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
              <ChefHat className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-sm text-muted-foreground">Menu Items</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mr-4">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {items.filter(item => item.status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Active Items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search menu items..." 
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={selectedCategory ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/dashboard/menu">
              All Items
            </Link>
          </Button>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href={{ pathname: '/dashboard/menu', query: { ...searchParams, view: 'grid' } }}>
                <Grid3X3 className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href={{ pathname: '/dashboard/menu', query: { ...searchParams, view: 'list' } }}>
                <List className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/dashboard/menu">All Categories</Link>
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              asChild
              className="whitespace-nowrap"
            >
              <Link href={`/dashboard/menu?category=${category.id}`}>
                {category.name}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {categoryItemCounts.get(category.id) || 0}
                </Badge>
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      {!selectedCategory && categories.length > 0 ? (
        /* Show categories when no specific category is selected */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Menu Categories</h2>
            <Button variant="outline" asChild>
              <Link href="/dashboard/menu/category/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Link>
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <MenuCategoryCard
                key={category.id}
                category={category}
                itemCount={categoryItemCounts.get(category.id) || 0}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Show menu items */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {selectedCategory 
                ? `Items in ${categories.find(c => c.id === selectedCategory)?.name}`
                : 'All Menu Items'
              }
            </h2>
            <Button asChild>
              <Link href="/dashboard/menu/item/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Link>
            </Button>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ChefHat className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No menu items yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Start building your menu by adding your first item
                </p>
                <Button asChild>
                  <Link href="/dashboard/menu/item/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Suspense fallback={<MenuItemsLoading />}>
              <div className={viewMode === 'grid' 
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
                : "space-y-4"
              }>
                {items.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </Suspense>
          )}
        </div>
      )}
    </div>
  )
}