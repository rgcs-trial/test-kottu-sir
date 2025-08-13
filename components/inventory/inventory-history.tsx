'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  History,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  RefreshCw,
  Filter,
  Download,
  Search,
  Eye,
  Calendar
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InventoryTransaction, InventoryTransactionType, StockMovementData } from '@/types/inventory'
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'

interface InventoryHistoryProps {
  tenantId: string
  limit?: number
  itemId?: string // Optional - to show history for specific item
}

interface RecentTransactionsProps {
  tenantId: string
  limit: number
}

export function RecentTransactions({ tenantId, limit }: RecentTransactionsProps) {
  return <InventoryHistory tenantId={tenantId} limit={limit} />
}

export function InventoryHistory({ tenantId, limit, itemId }: InventoryHistoryProps) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<InventoryTransaction[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovementData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = limit || 50

  useEffect(() => {
    loadTransactions()
  }, [tenantId, itemId])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchQuery, transactionTypeFilter, dateFilter])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const url = itemId 
        ? `/api/inventory/transactions?tenantId=${tenantId}&itemId=${itemId}&limit=${limit || 100}`
        : `/api/inventory/transactions?tenantId=${tenantId}&limit=${limit || 200}`
        
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.data)
      }
    } catch (error) {
      console.error('Failed to load inventory transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStockMovements = async () => {
    try {
      const response = await fetch(`/api/inventory/analytics/stock-movements?tenantId=${tenantId}`)
      const data = await response.json()
      
      if (data.success) {
        setStockMovements(data.data)
      }
    } catch (error) {
      console.error('Failed to load stock movements:', error)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = transaction.inventoryItemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           transaction.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           transaction.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesType = transactionTypeFilter === 'all' || transaction.transactionType === transactionTypeFilter
      
      const matchesDate = (() => {
        const transactionDate = transaction.createdAt
        const now = new Date()
        
        switch (dateFilter) {
          case 'today':
            return isAfter(transactionDate, startOfDay(now)) && isBefore(transactionDate, endOfDay(now))
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return isAfter(transactionDate, weekAgo)
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return isAfter(transactionDate, monthAgo)
          default:
            return true
        }
      })()
      
      return matchesSearch && matchesType && matchesDate
    })

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }

  const exportTransactions = async () => {
    try {
      const response = await fetch(`/api/inventory/transactions/export?tenantId=${tenantId}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
    } catch (error) {
      console.error('Failed to export transactions:', error)
    }
  }

  const getTransactionIcon = (type: InventoryTransactionType) => {
    switch (type) {
      case 'restock':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'sale':
        return <TrendingDown className="h-4 w-4 text-blue-500" />
      case 'adjustment':
        return <RefreshCw className="h-4 w-4 text-orange-500" />
      case 'waste':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'return':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTransactionBadge = (type: InventoryTransactionType) => {
    const config = {
      restock: { variant: 'default' as const, label: 'Restock' },
      sale: { variant: 'secondary' as const, label: 'Sale' },
      adjustment: { variant: 'outline' as const, label: 'Adjustment' },
      waste: { variant: 'destructive' as const, label: 'Waste' },
      return: { variant: 'default' as const, label: 'Return' },
      transfer_in: { variant: 'default' as const, label: 'Transfer In' },
      transfer_out: { variant: 'secondary' as const, label: 'Transfer Out' },
      theft: { variant: 'destructive' as const, label: 'Theft' },
      damage: { variant: 'destructive' as const, label: 'Damage' },
    }

    const typeConfig = config[type] || { variant: 'outline' as const, label: type }
    return <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
  }

  const getQuantityDisplay = (transaction: InventoryTransaction) => {
    const isPositive = transaction.quantity > 0
    return (
      <span className={`font-mono ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{transaction.quantity}
      </span>
    )
  }

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading transaction history...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              {itemId ? 'Item History' : 'Inventory Transactions'}
              {filteredTransactions.length > 0 && (
                <Badge variant="outline">
                  {filteredTransactions.length} records
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportTransactions}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={loadTransactions}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="waste">Waste</SelectItem>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="transfer_in">Transfer In</SelectItem>
                <SelectItem value="transfer_out">Transfer Out</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    {!itemId && <TableHead>Item</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Stock Levels</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {format(transaction.createdAt, 'MMM dd, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(transaction.createdAt, 'HH:mm')} • {formatDistanceToNow(transaction.createdAt, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      {!itemId && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{transaction.inventoryItemName}</p>
                          </div>
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transactionType)}
                          {getTransactionBadge(transaction.transactionType)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getQuantityDisplay(transaction)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">
                            {transaction.stockBefore}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono">
                            {transaction.stockAfter}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {transaction.referenceNumber ? (
                          <div>
                            <p className="font-mono text-sm">{transaction.referenceNumber}</p>
                            {transaction.referenceType && (
                              <p className="text-xs text-muted-foreground capitalize">
                                {transaction.referenceType}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {transaction.notes ? (
                          <p className="text-sm max-w-xs truncate" title={transaction.notes}>
                            {transaction.notes}
                          </p>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <p className="text-sm">{transaction.createdByName || 'System'}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
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