"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  Filter, 
  Monitor, 
  Smartphone, 
  Tablet,
  Clock,
  Zap,
  Leaf,
  Wheat,
  DollarSign,
  Eye,
  EyeOff,
  Star,
  Heart,
  Plus,
  Minus
} from "lucide-react"
import { Database } from "@/lib/supabase/types"
import Image from "next/image"
import { cn } from "@/lib/utils"

type MenuCategory = Database['public']['Tables']['menu_categories']['Row'] & {
  menu_items: Database['public']['Tables']['menu_items']['Row'][]
}

type MenuItem = Database['public']['Tables']['menu_items']['Row']

interface MenuPreviewProps {
  menuData: MenuCategory[]
  className?: string
}

type ViewMode = 'desktop' | 'tablet' | 'mobile'
type FilterType = 'all' | 'vegetarian' | 'vegan' | 'gluten_free'

export function MenuPreview({ menuData, className }: MenuPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dietaryFilter, setDietaryFilter] = useState<FilterType>('all')
  const [showPrices, setShowPrices] = useState(true)
  const [filteredData, setFilteredData] = useState<MenuCategory[]>(menuData)

  // Filter menu data based on search and filters
  useEffect(() => {
    let filtered = menuData

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.map(category => ({
        ...category,
        menu_items: category.menu_items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.menu_items.length > 0)
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(category => category.id === selectedCategory)
    }

    // Filter by dietary restrictions
    if (dietaryFilter !== 'all') {
      filtered = filtered.map(category => ({
        ...category,
        menu_items: category.menu_items.filter(item => {
          switch (dietaryFilter) {
            case 'vegetarian':
              return item.is_vegetarian
            case 'vegan':
              return item.is_vegan
            case 'gluten_free':
              return item.is_gluten_free
            default:
              return true
          }
        })
      })).filter(category => category.menu_items.length > 0)
    }

    setFilteredData(filtered)
  }, [menuData, searchQuery, selectedCategory, dietaryFilter])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getViewModeStyles = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm mx-auto'
      case 'tablet':
        return 'max-w-2xl mx-auto'
      case 'desktop':
      default:
        return 'max-w-7xl mx-auto'
    }
  }

  const getItemGridCols = () => {
    switch (viewMode) {
      case 'mobile':
        return 'grid-cols-1'
      case 'tablet':
        return 'grid-cols-2'
      case 'desktop':
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    }
  }

  const MenuItem = ({ item }: { item: MenuItem }) => {
    const [quantity, setQuantity] = useState(0)
    const primaryImage = item.images?.[0]
    const hasDiscount = item.compare_at_price && item.compare_at_price > item.price

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
        {/* Image Section */}
        {primaryImage && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={primaryImage}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
            {hasDiscount && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-red-500 text-white">
                  Save {Math.round(((item.compare_at_price! - item.price) / item.compare_at_price!) * 100)}%
                </Badge>
              </div>
            )}
            <div className="absolute top-3 right-3">
              <Button variant="ghost" size="icon" className="bg-white/80 hover:bg-white">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-4">
          {/* Item Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
              <div className="flex items-center gap-1 ml-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-gray-600">4.8</span>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Dietary Info */}
            {(item.is_vegetarian || item.is_vegan || item.is_gluten_free) && (
              <div className="flex gap-1 flex-wrap">
                {item.is_vegan && (
                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                    <Leaf className="w-3 h-3 mr-1" />
                    Vegan
                  </Badge>
                )}
                {item.is_vegetarian && !item.is_vegan && (
                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                    <Leaf className="w-3 h-3 mr-1" />
                    Vegetarian
                  </Badge>
                )}
                {item.is_gluten_free && (
                  <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                    <Wheat className="w-3 h-3 mr-1" />
                    Gluten Free
                  </Badge>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                {item.preparation_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.preparation_time}m
                  </div>
                )}
                {item.calories && (
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {item.calories} cal
                  </div>
                )}
              </div>
              {item.track_inventory && item.stock_quantity !== null && item.stock_quantity < 5 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                  Only {item.stock_quantity} left
                </Badge>
              )}
            </div>

            {/* Pricing and Add to Cart */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                {showPrices && (
                  <>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(item.price)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(item.compare_at_price!)}
                      </span>
                    )}
                  </>
                )}
              </div>

              {quantity === 0 ? (
                <Button size="sm" onClick={() => setQuantity(1)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-8 text-center">{quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Preview Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Menu Preview</h2>
              <p className="text-sm text-gray-600">
                See how your menu looks to customers
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* View Mode Selector */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <Button
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('desktop')}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tablet')}
                >
                  <Tablet className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>

              {/* Price Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrices(!showPrices)}
              >
                {showPrices ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="ml-2">Prices</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Preview Container */}
      <div className={cn("mx-auto transition-all duration-300", getViewModeStyles())}>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Search and Filters */}
            <div className="p-4 border-b bg-gray-50">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter Row */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <Filter className="w-4 h-4" />
                    <span>Filters:</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {menuData.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={dietaryFilter} onValueChange={(value) => setDietaryFilter(value as FilterType)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Dietary" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="gluten_free">Gluten Free</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Content */}
            <div className="p-6">
              {filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">No items found</h3>
                  <p className="text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {filteredData.map((category) => (
                    <div key={category.id} className="space-y-4">
                      {/* Category Header */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {category.image && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={category.image}
                                alt={category.name}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                            {category.description && (
                              <p className="text-gray-600">{category.description}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Menu Items Grid */}
                      <div className={cn("grid gap-4", getItemGridCols())}>
                        {category.menu_items
                          .filter(item => item.status === 'active')
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((item) => (
                            <MenuItem key={item.id} item={item} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}