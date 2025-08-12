'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Star, Clock, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MenuItemModal } from './menu-item-modal'
import { cn } from '@/lib/utils'
import type { MenuCategoryWithItems, MenuItemWithRelations } from '@/hooks/use-restaurant-public'

interface CustomerMenuProps {
  categories: MenuCategoryWithItems[]
  className?: string
}

export function CustomerMenu({ categories, className }: CustomerMenuProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItemWithRelations | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Available filters
  const availableFilters = [
    { id: 'vegetarian', label: 'Vegetarian', key: 'is_vegetarian' },
    { id: 'vegan', label: 'Vegan', key: 'is_vegan' },
    { id: 'gluten_free', label: 'Gluten-Free', key: 'is_gluten_free' },
    { id: 'popular', label: 'Popular', key: null }, // This would need to be tracked separately
  ]

  // Filter and search logic
  const filteredCategories = useMemo(() => {
    let filtered = categories

    // Filter by selected category
    if (selectedCategory) {
      filtered = filtered.filter(cat => cat.id === selectedCategory)
    }

    // Search and filter items within categories
    return filtered.map(category => {
      let items = category.items

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        items = items.filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      }

      // Dietary filters
      if (selectedFilters.length > 0) {
        items = items.filter(item => {
          return selectedFilters.every(filterId => {
            const filter = availableFilters.find(f => f.id === filterId)
            if (!filter || !filter.key) return true
            return (item as any)[filter.key] === true
          })
        })
      }

      return {
        ...category,
        items: items.filter(item => item.status === 'active')
      }
    }).filter(category => category.items.length > 0)
  }, [categories, searchQuery, selectedCategory, selectedFilters])

  // Toggle filter
  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    )
  }

  // Handle item click
  const handleItemClick = (item: MenuItemWithRelations) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedItem(null), 300)
  }

  // Quick add to cart (for simple items)
  const handleQuickAdd = (item: MenuItemWithRelations, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // If item has variants or required modifiers, open modal instead
    const hasVariants = item.variants && item.variants.filter(v => v.is_active).length > 0
    const hasRequiredModifiers = item.modifiers && item.modifiers.some(m => m.is_required && m.is_active)
    
    if (hasVariants || hasRequiredModifiers) {
      handleItemClick(item)
      return
    }

    // Simple add to cart logic would go here
    handleItemClick(item) // For now, always open modal
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and Filters */}
      <div className="sticky top-0 z-10 bg-white border-b pb-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="whitespace-nowrap"
          >
            All Items
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="whitespace-nowrap"
            >
              {category.name}
              <span className="ml-1 text-xs">({category.items.length})</span>
            </Button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {availableFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilters.includes(filter.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter(filter.id)}
              className="h-8 text-xs"
            >
              <Filter className="h-3 w-3 mr-1" />
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Categories */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        filteredCategories.map((category) => (
          <div key={category.id} className="space-y-4">
            {/* Category Header */}
            <div className="border-b pb-2">
              <h2 className="text-2xl font-bold mb-1">{category.name}</h2>
              {category.description && (
                <p className="text-gray-600">{category.description}</p>
              )}
            </div>

            {/* Menu Items Grid */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="flex gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow cursor-pointer group"
                >
                  {/* Item Image */}
                  {item.images && item.images.length > 0 && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </h3>
                        
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {/* Meta Information */}
                        <div className="flex items-center gap-3 mb-2 text-sm text-gray-500">
                          {item.preparation_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.preparation_time} min
                            </div>
                          )}
                          
                          {item.calories && (
                            <div>{item.calories} cal</div>
                          )}
                        </div>

                        {/* Dietary Badges */}
                        <div className="flex gap-1 mb-2 flex-wrap">
                          {item.is_vegetarian && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Vegetarian
                            </Badge>
                          )}
                          {item.is_vegan && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Vegan
                            </Badge>
                          )}
                          {item.is_gluten_free && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              Gluten-Free
                            </Badge>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-lg font-bold text-green-600">
                              ${item.price.toFixed(2)}
                            </span>
                            {item.compare_at_price && item.compare_at_price > item.price && (
                              <span className="text-sm text-gray-400 line-through ml-2">
                                ${item.compare_at_price.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Quick Add Button */}
                          <Button
                            size="sm"
                            onClick={(e) => handleQuickAdd(item, e)}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Stock Status */}
                        {item.status === 'out_of_stock' && (
                          <div className="text-red-600 text-sm font-medium mt-1">
                            Currently unavailable
                          </div>
                        )}
                        
                        {item.track_inventory && item.stock_quantity !== null && item.stock_quantity <= (item.low_stock_threshold || 5) && (
                          <div className="text-orange-600 text-sm font-medium mt-1">
                            Only {item.stock_quantity} left
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Menu Item Modal */}
      <MenuItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  )
}