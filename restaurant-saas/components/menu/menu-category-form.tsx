"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Database } from "@/lib/supabase/types"
import Image from "next/image"

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuCategoryInsert = Database['public']['Tables']['menu_categories']['Insert']
type MenuCategoryUpdate = Database['public']['Tables']['menu_categories']['Update']

interface MenuCategoryFormProps {
  category?: MenuCategory
  restaurantId: string
  onSubmit: (data: MenuCategoryInsert | MenuCategoryUpdate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const categoryFormSchema = z.object({
  name: z.string().min(2, {
    message: "Category name must be at least 2 characters."
  }),
  description: z.string().optional(),
  image: z.string().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().min(0).default(0)
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

export function MenuCategoryForm({
  category,
  restaurantId,
  onSubmit,
  onCancel,
  isLoading = false
}: MenuCategoryFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(
    category?.image || null
  )

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
      image: category?.image || "",
      is_active: category?.is_active ?? true,
      sort_order: category?.sort_order || 0,
    },
  })

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // Create FormData for image upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'category')

      const response = await fetch('/api/menu/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const { url } = await response.json()
      
      setImagePreview(url)
      form.setValue('image', url)
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    form.setValue('image', '')
  }

  const handleFormSubmit = async (values: CategoryFormValues) => {
    try {
      const submitData = {
        ...values,
        restaurant_id: restaurantId,
        ...(category?.id && { id: category.id })
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Error submitting category:', error)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {category ? 'Edit Category' : 'Create New Category'}
        </CardTitle>
        <CardDescription>
          {category 
            ? 'Update your menu category details.' 
            : 'Add a new category to organize your menu items.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-4">
              <FormLabel>Category Image</FormLabel>
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                  <Image
                    src={imagePreview}
                    alt="Category preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or WebP (MAX. 2MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </div>
              )}
            </div>

            {/* Basic Information */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Appetizers, Main Courses, Desserts" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the name that will be displayed to customers.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description for this category"
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of this menu category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                    <FormDescription>
                      Lower numbers appear first.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Make this category visible to customers
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
                  category ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}