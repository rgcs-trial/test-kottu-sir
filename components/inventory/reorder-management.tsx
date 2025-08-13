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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  ShoppingCart,
  Plus,
  Edit,
  Eye,
  Send,
  Check,
  X,
  Package,
  Calendar,
  DollarSign,
  Truck,
  FileText,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  PurchaseOrderStatus, 
  PurchaseOrderForm, 
  PurchaseOrderFormSchema,
  Supplier,
  InventoryItem
} from '@/types/inventory'
import { formatDistanceToNow, format } from 'date-fns'

interface ReorderManagementProps {
  tenantId: string
}

export function ReorderManagement({ tenantId }: ReorderManagementProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [reorderItems, setReorderItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')

  const form = useForm<PurchaseOrderForm>({
    resolver: zodResolver(PurchaseOrderFormSchema),
    defaultValues: {
      orderDate: new Date(),
      poNumber: '',
    }
  })

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load purchase orders
      const ordersResponse = await fetch(`/api/inventory/purchase-orders?tenantId=${tenantId}`)
      const ordersData = await ordersResponse.json()
      if (ordersData.success) {
        setPurchaseOrders(ordersData.data)
      }

      // Load suppliers
      const suppliersResponse = await fetch(`/api/inventory/suppliers?tenantId=${tenantId}`)
      const suppliersData = await suppliersResponse.json()
      if (suppliersData.success) {
        setSuppliers(suppliersData.data)
      }

      // Load items that need reordering
      const reorderResponse = await fetch(`/api/inventory/items/reorder-needed?tenantId=${tenantId}`)
      const reorderData = await reorderResponse.json()
      if (reorderData.success) {
        setReorderItems(reorderData.data)
      }

    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePoNumber = () => {
    const date = new Date()
    const dateStr = format(date, 'yyyyMMdd')
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `PO-${dateStr}-${randomStr}`
  }

  const onSubmit = async (data: PurchaseOrderForm) => {
    try {
      const response = await fetch('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tenantId,
        })
      })

      if (response.ok) {
        const result = await response.json()
        setPurchaseOrders(prev => [result.data, ...prev])
        setCreateDialogOpen(false)
        form.reset()
      }
    } catch (error) {
      console.error('Failed to create purchase order:', error)
    }
  }

  const updateOrderStatus = async (orderId: string, status: PurchaseOrderStatus) => {
    try {
      const response = await fetch(`/api/inventory/purchase-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        setPurchaseOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        ))
      }
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  }

  const createAutoReorder = async (itemIds: string[]) => {
    try {
      const response = await fetch('/api/inventory/purchase-orders/auto-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          inventoryItemIds: itemIds
        })
      })

      if (response.ok) {
        const result = await response.json()
        setPurchaseOrders(prev => [...result.data, ...prev])
        loadData() // Refresh to update reorder items
      }
    } catch (error) {
      console.error('Failed to create auto reorder:', error)
    }
  }

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const statusConfig = {
      draft: { variant: 'outline' as const, label: 'Draft' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      approved: { variant: 'default' as const, label: 'Approved' },
      sent: { variant: 'default' as const, label: 'Sent' },
      received: { variant: 'default' as const, label: 'Received' },
      partially_received: { variant: 'secondary' as const, label: 'Partial' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      disputed: { variant: 'destructive' as const, label: 'Disputed' },
    }

    const config = statusConfig[status] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const pendingOrders = purchaseOrders.filter(order => 
    ['pending', 'approved', 'sent'].includes(order.status)
  )
  const recentOrders = purchaseOrders.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reorder Management</h2>
          <p className="text-muted-foreground">
            Manage purchase orders and supplier relationships
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
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
                    name="poNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PO Number</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} placeholder="PO-20231201-ABC" />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => field.onChange(generatePoNumber())}
                          >
                            Generate
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Delivery</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
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
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Order
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Items Need Reorder</p>
                <p className="text-2xl font-bold text-red-500">{reorderItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.filter(s => s.status === 'active').length}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Monthly Spend</p>
                <p className="text-2xl font-bold">$12,450</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Needing Reorder */}
      {reorderItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-red-500" />
                Items Needing Reorder ({reorderItems.length})
              </CardTitle>
              <Button
                size="sm"
                onClick={() => createAutoReorder(reorderItems.map(item => item.id))}
                disabled={reorderItems.length === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Auto Create Orders
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {reorderItems.slice(0, 6).map((item) => (
                <div key={item.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <Badge variant="destructive" className="text-xs">
                      {item.currentStock} {item.unitOfMeasure}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Reorder Point: {item.reorderPoint}</p>
                    <p>Suggested: {item.reorderQuantity} {item.unitOfMeasure}</p>
                    {item.supplierName && <p>Supplier: {item.supplierName}</p>}
                  </div>
                </div>
              ))}
            </div>
            {reorderItems.length > 6 && (
              <p className="text-sm text-muted-foreground mt-4">
                +{reorderItems.length - 6} more items need reordering
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Purchase Orders Tabs */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.poNumber}</TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell>{format(order.orderDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Order
                            </DropdownMenuItem>
                            {order.status === 'draft' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'pending')}>
                                <Send className="mr-2 h-4 w-4" />
                                Send to Supplier
                              </DropdownMenuItem>
                            )}
                            {order.status === 'sent' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'received')}>
                                <Check className="mr-2 h-4 w-4" />
                                Mark as Received
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {pendingOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending orders</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.poNumber}</TableCell>
                        <TableCell>{order.supplierName}</TableCell>
                        <TableCell>
                          {order.expectedDeliveryDate ? 
                            format(order.expectedDeliveryDate, 'MMM dd, yyyy') : 
                            'Not set'
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.poNumber}</TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell>{format(order.orderDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}