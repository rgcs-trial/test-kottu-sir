"use client"

import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react"
import { Database } from "@/lib/supabase/types"
import Image from "next/image"

type MenuItem = Database['public']['Tables']['menu_items']['Row']
type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']
type MenuCategory = Database['public']['Tables']['menu_categories']['Row']

interface MenuItemFormProps {
  item?: MenuItem
  restaurantId: string
  categories: MenuCategory[]
  onSubmit: (data: MenuItemInsert | MenuItemUpdate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const itemFormSchema = z.object({
  name: z.string().min(2, {
    message: "Item name must be at least 2 characters."
  }),
  description: z.string().optional(),
  category_id: z.string().min(1, "Please select a category"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  compare_at_price: z.number().optional(),
  images: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'out_of_stock']).default('active'),
  
  // Dietary Information
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  is_gluten_free: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  
  // Inventory
  track_inventory: z.boolean().default(false),
  stock_quantity: z.number().optional(),
  low_stock_threshold: z.number().optional(),
  
  // Metadata
  calories: z.number().optional(),
  preparation_time: z.number().optional(),
  sort_order: z.number().min(0).default(0),
})

type ItemFormValues = z.infer<typeof itemFormSchema>

const ALLERGEN_OPTIONS = [
  'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame'
]

export function MenuItemForm({
  item,
  restaurantId,
  categories,
  onSubmit,
  onCancel,
  isLoading = false
}: MenuItemFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedAllergen, setSelectedAllergen] = useState('')

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: item?.name || "",
      description: item?.description || "",
      category_id: item?.category_id || "",
      price: item?.price || 0,
      compare_at_price: item?.compare_at_price || undefined,
      images: item?.images || [],
      status: item?.status || 'active',
      is_vegetarian: item?.is_vegetarian || false,
      is_vegan: item?.is_vegan || false,
      is_gluten_free: item?.is_gluten_free || false,
      allergens: item?.allergens || [],
      track_inventory: item?.track_inventory || false,
      stock_quantity: item?.stock_quantity || undefined,
      low_stock_threshold: item?.low_stock_threshold || undefined,
      calories: item?.calories || undefined,
      preparation_time: item?.preparation_time || undefined,
      sort_order: item?.sort_order || 0,
    },
  })

  const watchTrackInventory = form.watch('track_inventory')
  const watchImages = form.watch('images')
  const watchAllergens = form.watch('allergens')

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'item')

        const response = await fetch('/api/menu/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const { url } = await response.json()
        return url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      const currentImages = form.getValues('images')
      form.setValue('images', [...currentImages, ...uploadedUrls])
    } catch (error) {
      console.error('Error uploading images:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    const currentImages = form.getValues('images')
    form.setValue('images', currentImages.filter((_, i) => i !== index))
  }

  const handleAddAllergen = () => {
    if (selectedAllergen && !watchAllergens.includes(selectedAllergen)) {
      const currentAllergens = form.getValues('allergens')
      form.setValue('allergens', [...currentAllergens, selectedAllergen])
      setSelectedAllergen('')
    }
  }

  const handleRemoveAllergen = (allergen: string) => {
    const currentAllergens = form.getValues('allergens')
    form.setValue('allergens', currentAllergens.filter(a => a !== allergen))
  }

  const handleFormSubmit = async (values: ItemFormValues) => {
    try {
      const submitData = {
        ...values,
        restaurant_id: restaurantId,
        ...(item?.id && { id: item.id })
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Error submitting item:', error)
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>
          {item ? 'Edit Menu Item' : 'Create New Menu Item'}
        </CardTitle>
        <CardDescription>
          {item 
            ? 'Update your menu item details.' 
            : 'Add a new item to your menu.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            
            {/* Images Section */}
            <div className="space-y-4">
              <FormLabel>Item Images</FormLabel>
              
              {/* Uploaded Images Display */}
              {watchImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {watchImages.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <Image
                        src={image}
                        alt={`Item image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  )}
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> multiple images
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Margherita Pizza" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your menu item..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
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
                    <FormLabel>Compare At Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormDescription>For showing discounts</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dietary Information */}
            <div className="space-y-4">
              <FormLabel>Dietary Information</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="is_vegetarian"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Vegetarian</FormLabel>
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

                <FormField
                  control={form.control}
                  name="is_vegan"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Vegan</FormLabel>
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

                <FormField
                  control={form.control}
                  name="is_gluten_free"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Gluten Free</FormLabel>
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

              {/* Allergens */}
              <div className="space-y-3">
                <FormLabel>Allergens</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {watchAllergens.map((allergen) => (
                    <Badge key={allergen} variant="outline" className="flex items-center gap-1">
                      {allergen}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergen(allergen)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select value={selectedAllergen} onValueChange={setSelectedAllergen}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add allergen" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLERGEN_OPTIONS.filter(allergen => !watchAllergens.includes(allergen)).map((allergen) => (
                        <SelectItem key={allergen} value={allergen}>
                          {allergen}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddAllergen} disabled={!selectedAllergen}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Inventory Management */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="track_inventory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Track Inventory</FormLabel>
                      <FormDescription>
                        Keep track of stock levels for this item
                      </FormDescription>
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

              {watchTrackInventory && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="0"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="low_stock_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Stock Alert</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="5"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Alert when stock goes below this number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="0"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preparation_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prep Time (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="15"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || isUploading}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  item ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}