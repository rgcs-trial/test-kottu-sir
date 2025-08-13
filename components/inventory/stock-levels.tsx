'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  MoreHorizontal, 
  Edit, 
  Package, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InventoryItem, StockAlertLevel, UnitOfMeasure } from '@/types/inventory'

interface StockLevelsProps {
  tenantId: string
  searchQuery?: string
}

export function StockLevels({ tenantId, searchQuery = '' }: StockLevelsProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('name')
  const [filterBy, setFilterBy] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadStockLevels()
  }, [tenantId])

  useEffect(() => {
    filterAndSortItems()
  }, [items, searchQuery, sortBy, filterBy])

  const loadStockLevels = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/items?tenantId=${tenantId}`)
      const data = await response.json()
      
      if (data.success) {
        setItems(data.data)
      }
    } catch (error) {
      console.error('Failed to load stock levels:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortItems = () => {
    let filtered = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = (() => {
        switch (filterBy) {
          case 'low_stock': return item.needsReorder || item.currentStock <= item.reorderPoint
          case 'out_of_stock': return item.currentStock <= 0
          case 'normal': return item.currentStock > item.reorderPoint
          case 'overstocked': return item.maxStockLevel && item.currentStock > item.maxStockLevel
          case 'inactive': return !item.isActive
          case 'untracked': return !item.isTracked
          default: return true
        }
      })()
      
      return matchesSearch && matchesFilter
    })

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'stock':
          return b.currentStock - a.currentStock
        case 'value':
          return (b.currentStock * b.costPerUnit) - (a.currentStock * a.costPerUnit)
        case 'alert':
          const alertOrder = {
            'out_of_stock': 0,
            'critically_low': 1,
            'low_stock': 2,
            'normal': 3,
            'overstocked': 4
          }
          return (alertOrder[a.alertLevel as StockAlertLevel] || 3) - 
                 (alertOrder[b.alertLevel as StockAlertLevel] || 3)
        case 'category':
          return (a.category || '').localeCompare(b.category || '')
        default:
          return 0
      }
    })

    setFilteredItems(filtered)
    setCurrentPage(1)
  }

  const getStockStatusIcon = (item: InventoryItem) => {
    if (!item.isActive) {
      return <XCircle className="h-4 w-4 text-muted-foreground" />
    }
    if (item.currentStock <= 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (item.currentStock <= item.reorderPoint) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getStockStatusBadge = (alertLevel?: StockAlertLevel) => {
    switch (alertLevel) {
      case 'out_of_stock':
        return <Badge variant="destructive">Out of Stock</Badge>
      case 'critically_low':
        return <Badge variant="destructive">Critical</Badge>
      case 'low_stock':
        return <Badge variant="secondary">Low Stock</Badge>
      case 'overstocked':
        return <Badge variant="outline">Overstocked</Badge>
      default:
        return <Badge variant="default">Normal</Badge>
    }
  }

  const calculateStockPercentage = (item: InventoryItem) => {
    if (!item.maxStockLevel) return 50 // Default to 50% if no max level set
    return Math.min((item.currentStock / item.maxStockLevel) * 100, 100)
  }

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="normal">Normal Stock</SelectItem>
                  <SelectItem value="overstocked">Overstocked</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="untracked">Untracked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock Level</SelectItem>
                  <SelectItem value="value">Stock Value</SelectItem>
                  <SelectItem value="alert">Alert Status</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadStockLevels}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mt-2">
            Showing {filteredItems.length} of {items.length} items
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading stock levels...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No items found matching your criteria</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getStockStatusIcon(item)}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.sku || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.category || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono">
                          {item.currentStock} {item.unitOfMeasure}
                        </div>
                        {item.reservedStock > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {item.reservedStock} reserved
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <div className="space-y-2">
                          <Progress 
                            value={calculateStockPercentage(item)} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Min: {item.minStockLevel}</span>
                            <span>Reorder: {item.reorderPoint}</span>
                            {item.maxStockLevel && <span>Max: {item.maxStockLevel}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStockStatusBadge(item.alertLevel)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${(item.currentStock * item.costPerUnit).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @ ${item.costPerUnit.toFixed(2)} per {item.unitOfMeasure}
                        </div>
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
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Adjust Stock
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}