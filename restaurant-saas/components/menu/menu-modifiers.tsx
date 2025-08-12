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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, GripVertical, DollarSign } from "lucide-react"
import { Database } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

type MenuModifier = Database['public']['Tables']['menu_modifiers']['Row'] & {
  options?: Database['public']['Tables']['menu_modifier_options']['Row'][]
}
type MenuModifierInsert = Database['public']['Tables']['menu_modifiers']['Insert']
type MenuModifierUpdate = Database['public']['Tables']['menu_modifiers']['Update']

interface MenuModifiersProps {
  modifiers: MenuModifier[]
  onCreateModifier: (data: MenuModifierInsert) => Promise<void>
  onUpdateModifier: (id: string, data: MenuModifierUpdate) => Promise<void>
  onDeleteModifier: (id: string) => Promise<void>
  onReorderModifiers: (modifiers: MenuModifier[]) => Promise<void>
  restaurantId: string
  className?: string
}

const modifierFormSchema = z.object({
  name: z.string().min(2, "Modifier name must be at least 2 characters"),
  type: z.enum(['single', 'multiple']),
  min_selections: z.number().min(0),
  max_selections: z.number().nullable(),
  is_required: z.boolean(),
  is_active: z.boolean(),
  options: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Option name is required"),
    price_adjustment: z.number().default(0),
    is_active: z.boolean().default(true),
    sort_order: z.number().default(0)
  }))
})

type ModifierFormValues = z.infer<typeof modifierFormSchema>

export function MenuModifiers({
  modifiers,
  onCreateModifier,
  onUpdateModifier,
  onDeleteModifier,
  onReorderModifiers,
  restaurantId,
  className
}: MenuModifiersProps) {
  const [editingModifier, setEditingModifier] = useState<MenuModifier | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [draggedItem, setDraggedItem] = useState<MenuModifier | null>(null)

  const form = useForm<ModifierFormValues>({
    resolver: zodResolver(modifierFormSchema),
    defaultValues: {
      name: "",
      type: "single",
      min_selections: 0,
      max_selections: null,
      is_required: false,
      is_active: true,
      options: []
    }
  })

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "options"
  })

  const watchType = form.watch('type')
  const watchMaxSelections = form.watch('max_selections')

  const handleCreateNew = () => {
    form.reset()
    setEditingModifier(null)
    setIsFormVisible(true)
  }

  const handleEdit = (modifier: MenuModifier) => {
    form.reset({
      name: modifier.name,
      type: modifier.type,
      min_selections: modifier.min_selections,
      max_selections: modifier.max_selections,
      is_required: modifier.is_required,
      is_active: modifier.is_active,
      options: modifier.options?.map((option, index) => ({
        id: option.id,
        name: option.name,
        price_adjustment: option.price_adjustment,
        is_active: option.is_active,
        sort_order: option.sort_order || index
      })) || []
    })
    setEditingModifier(modifier)
    setIsFormVisible(true)
  }

  const handleCancel = () => {
    form.reset()
    setEditingModifier(null)
    setIsFormVisible(false)
  }

  const handleSubmit = async (values: ModifierFormValues) => {
    try {
      const modifierData = {
        restaurant_id: restaurantId,
        name: values.name,
        type: values.type,
        min_selections: values.min_selections,
        max_selections: values.max_selections,
        is_required: values.is_required,
        is_active: values.is_active,
      }

      if (editingModifier) {
        await onUpdateModifier(editingModifier.id, modifierData)
      } else {
        await onCreateModifier(modifierData)
      }

      handleCancel()
    } catch (error) {
      console.error('Error saving modifier:', error)
    }
  }

  const handleAddOption = () => {
    append({
      name: "",
      price_adjustment: 0,
      is_active: true,
      sort_order: fields.length
    })
  }

  const formatPrice = (amount: number) => {
    if (amount === 0) return "No charge"
    const prefix = amount > 0 ? "+" : ""
    return `${prefix}$${amount.toFixed(2)}`
  }

  const handleDragStart = (e: React.DragEvent, modifier: MenuModifier) => {
    setDraggedItem(modifier)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!draggedItem) return

    const dragIndex = modifiers.findIndex(mod => mod.id === draggedItem.id)
    if (dragIndex === dropIndex) return

    const reorderedModifiers = [...modifiers]
    const [draggedModifier] = reorderedModifiers.splice(dragIndex, 1)
    reorderedModifiers.splice(dropIndex, 0, draggedModifier)

    // Update sort order
    const updatedModifiers = reorderedModifiers.map((modifier, index) => ({
      ...modifier,
      sort_order: index
    }))

    await onReorderModifiers(updatedModifiers)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Menu Modifiers</h2>
          <p className="text-gray-600">
            Create customization options like size, toppings, and extras for your menu items.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Modifier
        </Button>
      </div>

      {/* Modifier Form */}
      {isFormVisible && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingModifier ? 'Edit Modifier' : 'Create New Modifier'}
            </CardTitle>
            <CardDescription>
              Set up customization options that customers can choose from.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modifier Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Size, Toppings, Spice Level" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selection Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Single Selection</SelectItem>
                            <SelectItem value="multiple">Multiple Selection</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Single: customers can only pick one option. Multiple: customers can pick several.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Selection Rules */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="min_selections"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Selections</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Minimum options required</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_selections"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Selections</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="Unlimited"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>Leave empty for unlimited</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_required"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Required</FormLabel>
                            <FormDescription className="text-xs">
                              Customer must make a selection
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

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Active</FormLabel>
                            <FormDescription className="text-xs">
                              Show this modifier to customers
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
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Options</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <FormField
                          control={form.control}
                          name={`options.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Option Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Large, Extra Cheese" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`options.${index}.price_adjustment`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price Adjustment</FormLabel>
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
                          name={`options.${index}.is_active`}
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

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}

                  {fields.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">No options added yet. Click "Add Option" to get started.</p>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingModifier ? 'Update Modifier' : 'Create Modifier'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Modifiers List */}
      {!isFormVisible && (
        <div className="space-y-4">
          {modifiers.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <Plus className="w-12 h-12 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-semibold">No Modifiers Yet</h3>
                    <p className="text-gray-500">
                      Create modifiers to let customers customize their orders.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            modifiers.map((modifier, index) => (
              <Card 
                key={modifier.id}
                className="transition-all hover:shadow-md"
                draggable
                onDragStart={(e) => handleDragStart(e, modifier)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <GripVertical className="w-5 h-5 text-gray-400 mt-1 cursor-grab" />
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{modifier.name}</CardTitle>
                          <Badge 
                            variant={modifier.is_active ? "default" : "secondary"}
                            className={modifier.is_active ? "bg-green-500" : "bg-gray-500"}
                          >
                            {modifier.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {modifier.is_required && (
                            <Badge variant="outline">Required</Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {modifier.type === 'single' ? 'Single selection' : 'Multiple selections'} • 
                          Min: {modifier.min_selections} • 
                          Max: {modifier.max_selections || 'Unlimited'} • 
                          {modifier.options?.length || 0} options
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(modifier)}>
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onDeleteModifier(modifier.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {modifier.options && modifier.options.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {modifier.options.map((option) => (
                        <div 
                          key={option.id} 
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <span className={cn(
                              "text-sm",
                              !option.is_active && "text-gray-400 line-through"
                            )}>
                              {option.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {formatPrice(option.price_adjustment)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}