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
  Truck,
  Plus,
  Edit,
  Eye,
  Mail,
  Phone,
  MapPin,
  Star,
  DollarSign,
  Calendar,
  Package,
  MoreHorizontal,
  RefreshCw,
  Search
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { 
  Supplier, 
  SupplierStatus, 
  SupplierForm, 
  SupplierFormSchema
} from '@/types/inventory'

interface SupplierManagementProps {
  tenantId: string
}

export function SupplierManagement({ tenantId }: SupplierManagementProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const form = useForm<SupplierForm>({
    resolver: zodResolver(SupplierFormSchema),
    defaultValues: {
      name: '',
      creditLimit: 0,
      discountPercentage: 0,
      minOrderAmount: 0,
      deliveryFee: 0,
      leadTimeDays: 7,
      country: 'Sri Lanka',
    }
  })

  useEffect(() => {
    loadSuppliers()
  }, [tenantId])

  useEffect(() => {
    filterSuppliers()
  }, [suppliers, searchQuery, statusFilter])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/suppliers?tenantId=${tenantId}`)
      const data = await response.json()
      
      if (data.success) {
        setSuppliers(data.data)
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterSuppliers = () => {
    let filtered = suppliers.filter(supplier => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name))
    
    setFilteredSuppliers(filtered)
  }

  const onSubmit = async (data: SupplierForm) => {
    try {
      const url = selectedSupplier 
        ? `/api/inventory/suppliers/${selectedSupplier.id}`
        : '/api/inventory/suppliers'
      
      const method = selectedSupplier ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tenantId,
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (selectedSupplier) {
          setSuppliers(prev => prev.map(supplier => 
            supplier.id === selectedSupplier.id ? result.data : supplier
          ))
          setEditDialogOpen(false)
        } else {
          setSuppliers(prev => [result.data, ...prev])
          setCreateDialogOpen(false)
        }
        
        form.reset()
        setSelectedSupplier(null)
      }
    } catch (error) {
      console.error('Failed to save supplier:', error)
    }
  }

  const updateSupplierStatus = async (supplierId: string, status: SupplierStatus) => {
    try {
      const response = await fetch(`/api/inventory/suppliers/${supplierId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        setSuppliers(prev => prev.map(supplier => 
          supplier.id === supplierId ? { ...supplier, status } : supplier
        ))
      }
    } catch (error) {
      console.error('Failed to update supplier status:', error)
    }
  }

  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    form.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      mobile: supplier.mobile || '',
      addressLine1: supplier.addressLine1 || '',
      addressLine2: supplier.addressLine2 || '',
      city: supplier.city || '',
      state: supplier.state || '',
      postalCode: supplier.postalCode || '',
      country: supplier.country,
      paymentTerms: supplier.paymentTerms || '',
      creditLimit: supplier.creditLimit,
      discountPercentage: supplier.discountPercentage,
      taxId: supplier.taxId || '',
      minOrderAmount: supplier.minOrderAmount,
      deliveryFee: supplier.deliveryFee,
      leadTimeDays: supplier.leadTimeDays,
      notes: supplier.notes || '',
      website: supplier.website || '',
    })
    setEditDialogOpen(true)
  }

  const getStatusBadge = (status: SupplierStatus) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active' },
      inactive: { variant: 'secondary' as const, label: 'Inactive' },
      suspended: { variant: 'destructive' as const, label: 'Suspended' },
      pending_approval: { variant: 'outline' as const, label: 'Pending' },
    }

    const config = statusConfig[status] || statusConfig.pending_approval
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  const activeSuppliers = suppliers.filter(s => s.status === 'active')
  const pendingSuppliers = suppliers.filter(s => s.status === 'pending_approval')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supplier Management</h2>
          <p className="text-muted-foreground">
            Manage your supplier relationships and contacts
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSuppliers}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ABC Food Supplies" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="contact@supplier.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1234567890" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1234567890" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://supplier.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Address</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="addressLine1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123 Main Street" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="addressLine2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Suite 100" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Colombo" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Western Province" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="10001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Business Terms</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Terms</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Net 30" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="creditLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credit Limit</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                step="0.01"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount %</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                max="100"
                                step="0.01"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123456789" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minOrderAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Order Amount</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                step="0.01"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Fee</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                step="0.01"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="leadTimeDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead Time (Days)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

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
                      Create Supplier
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
                <p className="text-sm font-medium">Total Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-500">{activeSuppliers.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pending Approval</p>
                <p className="text-2xl font-bold text-orange-500">{pendingSuppliers.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avg. Rating</p>
                <p className="text-2xl font-bold">
                  {suppliers.length > 0 
                    ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Suppliers ({filteredSuppliers.length})
            </CardTitle>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No suppliers found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Add your first supplier to get started'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.contactPerson && (
                          <p className="text-sm text-muted-foreground">
                            Contact: {supplier.contactPerson}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {supplier.city || supplier.state || supplier.country ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {[supplier.city, supplier.state, supplier.country]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {supplier.paymentTerms && (
                          <p>{supplier.paymentTerms}</p>
                        )}
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Min: ${supplier.minOrderAmount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Lead: {supplier.leadTimeDays}d
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {renderStarRating(supplier.rating)}
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(supplier.status)}
                    </TableCell>
                    
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
                          <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Supplier
                          </DropdownMenuItem>
                          {supplier.status === 'active' && (
                            <DropdownMenuItem 
                              onClick={() => updateSupplierStatus(supplier.id, 'inactive')}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {supplier.status === 'inactive' && (
                            <DropdownMenuItem 
                              onClick={() => updateSupplierStatus(supplier.id, 'active')}
                            >
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Supplier Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Same form fields as create dialog */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false)
                    setSelectedSupplier(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Update Supplier
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}