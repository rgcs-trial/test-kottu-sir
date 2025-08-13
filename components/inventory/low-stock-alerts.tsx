'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  AlertTriangle,
  XCircle,
  Eye,
  Check,
  X,
  Package,
  Clock,
  Bell,
  BellOff,
  RefreshCw,
  ShoppingCart
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InventoryAlert, StockAlertLevel } from '@/types/inventory'
import { formatDistanceToNow } from 'date-fns'

interface LowStockAlertsProps {
  tenantId: string
}

export function LowStockAlerts({ tenantId }: LowStockAlertsProps) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'active'>('active')
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('all')

  useEffect(() => {
    loadAlerts()
  }, [tenantId])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/alerts?tenantId=${tenantId}`)
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.data)
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/inventory/alerts/${alertId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, isRead: true } : alert
        ))
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error)
    }
  }

  const resolveAlert = async (alertId: string, resolutionNotes?: string) => {
    try {
      const response = await fetch(`/api/inventory/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes }),
      })
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, isResolved: true, isActive: false, resolvedAt: new Date() }
            : alert
        ))
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const dismissAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/inventory/alerts/${alertId}/dismiss`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, isActive: false } : alert
        ))
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  const getAlertIcon = (alertType: StockAlertLevel) => {
    switch (alertType) {
      case 'out_of_stock':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'critically_low':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'low_stock':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getAlertBadge = (alertType: StockAlertLevel) => {
    switch (alertType) {
      case 'out_of_stock':
        return <Badge variant="destructive">Out of Stock</Badge>
      case 'critically_low':
        return <Badge variant="destructive">Critical</Badge>
      case 'low_stock':
        return <Badge variant="secondary">Low Stock</Badge>
      case 'overstocked':
        return <Badge variant="outline">Overstocked</Badge>
      default:
        return <Badge variant="default">Alert</Badge>
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'text-red-500'
      case 'high': return 'text-orange-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-green-500'
      default: return 'text-muted-foreground'
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const statusMatch = (() => {
      switch (filter) {
        case 'unread': return !alert.isRead
        case 'active': return alert.isActive && !alert.isResolved
        default: return true
      }
    })()

    const typeMatch = alertTypeFilter === 'all' || alert.alertType === alertTypeFilter

    return statusMatch && typeMatch
  })

  const activeAlerts = alerts.filter(alert => alert.isActive && !alert.isResolved)
  const criticalAlerts = activeAlerts.filter(alert => 
    alert.alertType === 'out_of_stock' || alert.alertType === 'critically_low'
  )
  const unreadAlerts = alerts.filter(alert => !alert.isRead)

  return (
    <div className="space-y-4">
      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active Alerts</p>
                <p className="text-2xl font-bold">{activeAlerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-500">{criticalAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Unread Alerts</p>
                <p className="text-2xl font-bold">{unreadAlerts.length}</p>
              </div>
              <BellOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Inventory Alerts
            </CardTitle>
            
            <div className="flex gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                </SelectContent>
              </Select>

              <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Alert Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="critically_low">Critical</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="overstocked">Overstocked</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={loadAlerts}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No alerts found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {filter === 'active' 
                  ? 'All inventory levels are normal'
                  : 'Try adjusting your filters'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Alert Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow 
                    key={alert.id} 
                    className={!alert.isRead ? 'bg-muted/20' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getAlertIcon(alert.alertType)}
                        <div>
                          <p className="font-medium">{alert.inventoryItemName}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {alert.inventoryItemSku || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getAlertBadge(alert.alertType)}
                    </TableCell>
                    
                    <TableCell>
                      <p className="text-sm">{alert.alertMessage}</p>
                      {alert.suggestedAction && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.suggestedAction}
                        </p>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">
                          {alert.currentStock}
                        </span>
                        {alert.thresholdValue && (
                          <span className="text-xs text-muted-foreground">
                            Threshold: {alert.thresholdValue}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getPriorityColor(alert.priority)}
                      >
                        {alert.priority}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        {!alert.isRead && (
                          <Badge variant="outline" className="text-xs">Unread</Badge>
                        )}
                        {alert.isResolved ? (
                          <Badge variant="default" className="text-xs">Resolved</Badge>
                        ) : alert.isActive ? (
                          <Badge variant="destructive" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Dismissed</Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Package className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markAsRead(alert.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Mark as Read
                          </DropdownMenuItem>
                          
                          {!alert.isResolved && (
                            <>
                              <DropdownMenuItem onClick={() => resolveAlert(alert.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                Mark as Resolved
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => dismissAlert(alert.id)}>
                                <X className="mr-2 h-4 w-4" />
                                Dismiss Alert
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {(alert.alertType === 'low_stock' || alert.alertType === 'out_of_stock') && (
                            <DropdownMenuItem>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Create Purchase Order
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
    </div>
  )
}