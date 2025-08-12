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
  GripVertical,
  ImageIcon,
  Plus,
  EyeOff
} from "lucide-react"
import { Database } from "@/lib/supabase/types"
import Image from "next/image"
import { cn } from "@/lib/utils"

type MenuCategory = Database['public']['Tables']['menu_categories']['Row'] & {
  menu_items?: { count: number }
}

interface MenuCategoryListProps {
  categories: MenuCategory[]
  onReorder: (categories: MenuCategory[]) => Promise<void>
  onEdit: (category: MenuCategory) => void
  onDelete: (category: MenuCategory) => void
  onToggleVisibility: (category: MenuCategory) => void
  onAddItem: (categoryId: string) => void
  className?: string
}

export function MenuCategoryList({
  categories,
  onReorder,
  onEdit,
  onDelete,
  onToggleVisibility,
  onAddItem,
  className
}: MenuCategoryListProps) {
  const [draggedItem, setDraggedItem] = useState<MenuCategory | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent, category: MenuCategory) => {
    setDraggedItem(category)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedItem) return

    const dragIndex = categories.findIndex(cat => cat.id === draggedItem.id)
    if (dragIndex === dropIndex) return

    // Create new array with reordered items
    const newCategories = [...categories]
    const [draggedCategory] = newCategories.splice(dragIndex, 1)
    newCategories.splice(dropIndex, 0, draggedCategory)

    // Update sort_order for all categories
    const reorderedCategories = newCategories.map((category, index) => ({
      ...category,
      sort_order: index
    }))

    try {
      await onReorder(reorderedCategories)
    } catch (error) {
      console.error('Error reordering categories:', error)
    }
  }

  const getItemCount = (category: MenuCategory) => {
    return category.menu_items?.count || 0
  }

  if (categories.length === 0) {
    return (
      <Card className={cn("text-center py-12", className)}>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Categories Yet</h3>
              <p className="text-gray-500 max-w-sm">
                Start organizing your menu by creating your first category. 
                Categories help group similar items together.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {categories.map((category, index) => {
        const isBeingDragged = draggedItem?.id === category.id
        const isDropTarget = dragOverIndex === index && !isBeingDragged
        
        return (
          <Card 
            key={category.id}
            className={cn(
              "transition-all duration-200",
              isBeingDragged && "opacity-50 scale-95",
              isDropTarget && "scale-102 shadow-lg border-blue-400",
              isDragging && !isBeingDragged && "opacity-75"
            )}
            draggable
            onDragStart={(e) => handleDragStart(e, category)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Drag Handle */}
                  <div className="flex items-center pt-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </div>

                  {/* Category Image */}
                  <div className="flex-shrink-0">
                    {category.image ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden">
                        <Image
                          src={category.image}
                          alt={category.name}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg truncate">{category.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={category.is_active ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            category.is_active 
                              ? "bg-green-500 hover:bg-green-600" 
                              : "bg-gray-500 hover:bg-gray-600"
                          )}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getItemCount(category)} items
                        </Badge>
                      </div>
                    </div>
                    
                    {category.description && (
                      <CardDescription className="line-clamp-2">
                        {category.description}
                      </CardDescription>
                    )}
                  </div>
                </div>

                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(category)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Category
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleVisibility(category)}>
                      {category.is_active ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide Category
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Show Category
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddItem(category.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(category)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span>Sort order: {category.sort_order}</span>
                  <span>{getItemCount(category)} menu items</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddItem(category.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}