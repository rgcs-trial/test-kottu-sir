"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical, DollarSign, Edit, Check, X } from "lucide-react"
import { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type MenuVariant = Database['public']['Tables']['menu_variants']['Row']
type MenuVariantInsert = Database['public']['Tables']['menu_variants']['Insert']
type MenuVariantUpdate = Database['public']['Tables']['menu_variants']['Update']

interface MenuVariantsProps {
  variants: MenuVariant[]
  menuItemId: string
  onCreateVariant: (data: MenuVariantInsert) => Promise<void>
  onUpdateVariant: (id: string, data: MenuVariantUpdate) => Promise<void>
  onDeleteVariant: (id: string) => Promise<void>
  onReorderVariants: (variants: MenuVariant[]) => Promise<void>
  className?: string
}

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  compare_at_price: z.number().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0)
})

type VariantFormValues = z.infer<typeof variantSchema>

export function MenuVariants({
  variants,
  menuItemId,
  onCreateVariant,
  onUpdateVariant,
  onDeleteVariant,
  onReorderVariants,
  className
}: MenuVariantsProps) {
  const [editingVariant, setEditingVariant] = useState<MenuVariant | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draggedItem, setDraggedItem] = useState<MenuVariant | null>(null)

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: "",
      price: 0,
      compare_at_price: undefined,
      is_active: true,
      sort_order: variants.length
    }
  })

  const handleStartCreate = () => {
    form.reset({
      name: "",
      price: 0,
      compare_at_price: undefined,
      is_active: true,
      sort_order: variants.length
    })
    setIsCreating(true)
    setEditingVariant(null)
  }

  const handleStartEdit = (variant: MenuVariant) => {
    form.reset({
      name: variant.name,
      price: variant.price,
      compare_at_price: variant.compare_at_price || undefined,
      is_active: variant.is_active,
      sort_order: variant.sort_order
    })
    setEditingVariant(variant)
    setIsCreating(false)
  }

  const handleCancel = () => {
    form.reset()
    setEditingVariant(null)
    setIsCreating(false)
  }

  const handleSubmit = async (values: VariantFormValues) => {
    try {
      const variantData = {
        ...values,
        menu_item_id: menuItemId,
      }

      if (editingVariant) {
        await onUpdateVariant(editingVariant.id, variantData)
      } else {
        await onCreateVariant(variantData)
      }

      handleCancel()
    } catch (error) {
      console.error('Error saving variant:', error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleToggleActive = async (variant: MenuVariant) => {
    await onUpdateVariant(variant.id, { is_active: !variant.is_active })
  }

  const handleDragStart = (e: React.DragEvent, variant: MenuVariant) => {
    setDraggedItem(variant)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!draggedItem) return

    const dragIndex = variants.findIndex(v => v.id === draggedItem.id)
    if (dragIndex === dropIndex) return

    const reorderedVariants = [...variants]
    const [draggedVariant] = reorderedVariants.splice(dragIndex, 1)
    reorderedVariants.splice(dropIndex, 0, draggedVariant)

    // Update sort order
    const updatedVariants = reorderedVariants.map((variant, index) => ({
      ...variant,
      sort_order: index
    }))

    await onReorderVariants(updatedVariants)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Size Variants</h3>
          <p className="text-sm text-gray-600">
            Create different sizes or variations of this item with different prices.
          </p>
        </div>
        {!isCreating && !editingVariant && (
          <Button size="sm" onClick={handleStartCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Variant
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingVariant) && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {editingVariant ? 'Edit Variant' : 'Create New Variant'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variant Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Small, Medium, Large" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compare_at_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compare Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>For showing discounts</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Active</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    <Check className="w-4 h-4 mr-2" />
                    {editingVariant ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Variants List */}
      <div className="space-y-3">
        {variants.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <Plus className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-500">
                  No variants created yet. Add size options or variations for this item.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          variants
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((variant, index) => {
              const isBeingEdited = editingVariant?.id === variant.id
              const hasDiscount = variant.compare_at_price && variant.compare_at_price > variant.price

              return (
                <Card 
                  key={variant.id}
                  className={cn(
                    "transition-all",
                    isBeingEdited && "ring-2 ring-blue-500",
                    !variant.is_active && "opacity-60"
                  )}
                  draggable={!isCreating && !editingVariant}
                  onDragStart={(e) => handleDragStart(e, variant)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{variant.name}</h4>
                            <Badge 
                              variant={variant.is_active ? "default" : "secondary"}
                              className={cn(
                                "text-xs",
                                variant.is_active 
                                  ? "bg-green-500 hover:bg-green-600" 
                                  : "bg-gray-500 hover:bg-gray-600"
                              )}
                            >
                              {variant.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {hasDiscount && (
                              <Badge variant="outline" className="text-xs text-red-600">
                                Sale
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold text-green-600">
                              {formatPrice(variant.price)}
                            </span>
                            {hasDiscount && (
                              <span className="text-sm text-gray-500 line-through">
                                {formatPrice(variant.compare_at_price!)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(variant)}
                          disabled={isCreating || !!editingVariant}
                        >
                          {variant.is_active ? 'Hide' : 'Show'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(variant)}
                          disabled={isCreating || !!editingVariant}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteVariant(variant.id)}
                          disabled={isCreating || !!editingVariant}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
        )}
      </div>

      {variants.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2">
          Drag and drop to reorder variants
        </div>
      )}
    </div>
  )
}