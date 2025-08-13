'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Package,
  Calculator,
  Save,
  X
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { 
  InventoryItem,
  InventoryTransactionType,
  StockAdjustmentForm, 
  StockAdjustmentFormSchema
} from '@/types/inventory'

interface StockAdjustmentProps {
  tenantId: string
  onAdjustmentComplete?: () => void
}

export function StockAdjustment({ tenantId, onAdjustmentComplete }: StockAdjustmentProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const form = useForm<StockAdjustmentForm>({
    resolver: zodResolver(StockAdjustmentFormSchema),
    defaultValues: {
      adjustmentType: 'increase',
      quantity: 0,
      reason: 'adjustment',
      unitCost: 0,
    }
  })

  const adjustmentType = form.watch('adjustmentType')
  const quantity = form.watch('quantity')
  const inventoryItemId = form.watch('inventoryItemId')

  useEffect(() => {
    loadItems()
  }, [tenantId])

  useEffect(() => {
    if (inventoryItemId) {
      const item = items.find(i => i.id === inventoryItemId)
      setSelectedItem(item || null)
      if (item) {
        form.setValue('unitCost', item.costPerUnit)
      }
    }
  }, [inventoryItemId, items])

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/items?tenantId=${tenantId}&active=true`)
      const data = await response.json()
      
      if (data.success) {
        setItems(data.data)
      }
    } catch (error) {
      console.error('Failed to load inventory items:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: StockAdjustmentForm) => {
    try {
      const adjustmentQuantity = data.adjustmentType === 'decrease' ? -data.quantity : data.quantity
      
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          inventoryItemId: data.inventoryItemId,
          quantity: adjustmentQuantity,
          transactionType: data.reason,
          notes: data.notes,
          unitCost: data.unitCost,
          batchNumber: data.batchNumber,
          expiryDate: data.expiryDate,
        })
      })

      if (response.ok) {
        setDialogOpen(false)
        form.reset()
        setSelectedItem(null)
        onAdjustmentComplete?.()
        // Show success message
        console.log('Stock adjustment completed successfully')
      } else {
        const error = await response.json()
        console.error('Failed to adjust stock:', error)
        // Show error message
      }
    } catch (error) {
      console.error('Failed to adjust stock:', error)
    }
  }

  const getNewStockLevel = () => {
    if (!selectedItem || !quantity) return null
    
    const adjustment = adjustmentType === 'decrease' ? -quantity : quantity
    return selectedItem.currentStock + adjustment
  }

  const getAdjustmentIcon = (type: 'increase' | 'decrease') => {
    return type === 'increase' 
      ? <TrendingUp className="h-4 w-4 text-green-500" />
      : <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const reasonOptions = [
    { value: 'adjustment', label: 'Manual Adjustment' },
    { value: 'waste', label: 'Waste/Spoilage' },
    { value: 'damage', label: 'Damage' },
    { value: 'theft', label: 'Theft/Loss' },
    { value: 'return', label: 'Customer Return' },
    { value: 'transfer_in', label: 'Transfer In' },
    { value: 'transfer_out', label: 'Transfer Out' },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Stock Adjustment
            </CardTitle>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Adjustment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Adjust Stock Levels</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="inventoryItemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inventory Item *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select item to adjust" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{item.name}</span>
                                    <Badge variant="outline" className="ml-2">
                                      {item.currentStock} {item.unitOfMeasure}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedItem && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Current Stock:</span>
                          <span className="font-mono">
                            {selectedItem.currentStock} {selectedItem.unitOfMeasure}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Cost per Unit:</span>
                          <span className="font-mono">
                            ${selectedItem.costPerUnit.toFixed(2)}
                          </span>
                        </div>
                        {selectedItem.currentStock <= selectedItem.reorderPoint && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">Below reorder point</span>
                          </div>
                        )}
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="adjustmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adjustment Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="increase">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                  Increase Stock
                                </div>
                              </SelectItem>
                              <SelectItem value="decrease">
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                  Decrease Stock
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0.01"
                              step="0.01"
                              placeholder="Enter quantity to adjust"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedItem && quantity > 0 && (
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Stock Change:</span>
                          <div className="flex items-center gap-2">
                            {getAdjustmentIcon(adjustmentType)}
                            <span className={`font-mono ${
                              adjustmentType === 'increase' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {adjustmentType === 'increase' ? '+' : '-'}{quantity}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">New Stock Level:</span>
                          <span className="font-mono font-bold">
                            {getNewStockLevel()} {selectedItem.unitOfMeasure}
                          </span>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {reasonOptions.map((reason) => (
                                <SelectItem key={reason.value} value={reason.value}>
                                  {reason.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unitCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Cost</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              step="0.01"
                              placeholder="Cost per unit"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="batchNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Optional batch number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={3} 
                              placeholder="Additional details about this adjustment..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Save className="h-4 w-4 mr-2" />
                        Apply Adjustment
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-600">Stock Increases</p>
              <p className="text-muted-foreground text-xs">
                Add inventory from restocks, returns, or corrections
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-600">Stock Decreases</p>
              <p className="text-muted-foreground text-xs">
                Remove inventory for waste, damage, or theft
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-600">Stock Corrections</p>
              <p className="text-muted-foreground text-xs">
                Correct discrepancies from physical counts
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Important Notes</p>
                <ul className="text-xs text-amber-700 mt-1 space-y-1">
                  <li>• All adjustments are logged with timestamp and user information</li>
                  <li>• Stock decreases cannot result in negative inventory levels</li>
                  <li>• Consider creating purchase orders for items below reorder point</li>
                  <li>• Batch numbers and expiry dates help with traceability</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}