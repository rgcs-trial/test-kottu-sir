"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  ImageIcon,
  Clock,
  Package,
  AlertTriangle,
  Leaf,
  Wheat,
  Zap
} from "lucide-react"
import { Database } from "@/lib/supabase/types"
import Image from "next/image"
import { cn } from "@/lib/utils"

type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category?: Database['public']['Tables']['menu_categories']['Row']
}

interface MenuItemCardProps {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  onDuplicate: (item: MenuItem) => void
  onPreview: (item: MenuItem) => void
  className?: string
}

export function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  className
}: MenuItemCardProps) {
  const [imageError, setImageError] = useState(false)
  
  const primaryImage = item.images?.[0]
  const hasMultipleImages = (item.images?.length || 0) > 1

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-500'
      case 'out_of_stock':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'inactive':
        return 'Inactive'
      case 'out_of_stock':
        return 'Out of Stock'
      default:
        return status
    }
  }

  const isLowStock = item.track_inventory && 
    item.stock_quantity !== null && 
    item.low_stock_threshold !== null && 
    item.stock_quantity <= item.low_stock_threshold

  return (
    <Card className={cn("group hover:shadow-md transition-shadow", className)}>
      <div className="relative">
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          {primaryImage && !imageError ? (
            <>
              <Image
                src={primaryImage}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                onError={() => setImageError(true)}
              />
              {hasMultipleImages && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    +{(item.images?.length || 1) - 1}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <Badge className={cn("text-white", getStatusColor(item.status))}>
              {getStatusText(item.status)}
            </Badge>
          </div>

          {/* Low Stock Warning */}
          {isLowStock && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Low Stock
              </Badge>
            </div>
          )}
        </div>

        {/* More Options Menu */}
        <div className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(item)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(item)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(item)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{item.name}</CardTitle>
            {item.category && (
              <CardDescription className="text-sm text-gray-500">
                {item.category.name}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Pricing */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl font-bold text-green-600">
            {formatPrice(item.price)}
          </span>
          {item.compare_at_price && item.compare_at_price > item.price && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(item.compare_at_price)}
            </span>
          )}
        </div>

        {/* Dietary Information */}
        {(item.is_vegetarian || item.is_vegan || item.is_gluten_free) && (
          <div className="flex flex-wrap gap-1 mb-4">
            {item.is_vegan && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Leaf className="w-3 h-3 mr-1" />
                Vegan
              </Badge>
            )}
            {item.is_vegetarian && !item.is_vegan && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Leaf className="w-3 h-3 mr-1" />
                Vegetarian
              </Badge>
            )}
            {item.is_gluten_free && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Wheat className="w-3 h-3 mr-1" />
                Gluten Free
              </Badge>
            )}
          </div>
        )}

        {/* Allergens */}
        {item.allergens && item.allergens.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Contains:</p>
            <div className="flex flex-wrap gap-1">
              {item.allergens.slice(0, 3).map((allergen) => (
                <Badge key={allergen} variant="outline" className="text-xs">
                  {allergen}
                </Badge>
              ))}
              {item.allergens.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.allergens.length - 3}
                </Badge>
              )}
            </div>
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
          
          {item.track_inventory && (
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {item.stock_quantity || 0} in stock
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}