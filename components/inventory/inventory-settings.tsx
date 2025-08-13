'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  Settings,
  Bell,
  Mail,
  Smartphone,
  Clock,
  Package,
  AlertTriangle,
  Save,
  RefreshCw,
  Users,
  Database,
  Truck
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'

interface InventorySettingsProps {
  tenantId: string
}

interface InventorySettings {
  // Global Settings
  defaultCurrency: string
  defaultUnitOfMeasure: string
  enableBatchTracking: boolean
  enableExpiryTracking: boolean
  enableSerialNumbers: boolean
  
  // Alert Settings
  enableLowStockAlerts: boolean
  enableOutOfStockAlerts: boolean
  enableExpiryAlerts: boolean
  enableOverstockAlerts: boolean
  
  // Alert Thresholds
  globalLowStockPercentage: number
  globalCriticalStockPercentage: number
  expiryAlertDays: number
  overstockThresholdPercentage: number
  
  // Notification Settings
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  notificationEmails: string[]
  notificationPhones: string[]
  
  // Auto-ordering Settings
  enableAutoOrdering: boolean
  autoOrderingThreshold: number
  autoOrderingQuantityMultiplier: number
  autoOrderingMaxAmount: number
  
  // Integration Settings
  enablePosIntegration: boolean
  posSystemType: string
  enableAccountingIntegration: boolean
  accountingSystemType: string
  
  // Audit Settings
  requireApprovalForAdjustments: boolean
  approvalThresholdAmount: number
  enablePhysicalCountReminders: boolean
  physicalCountFrequencyDays: number
  
  // Display Settings
  defaultStockViewMode: string
  showCostPrices: boolean
  showStockValues: boolean
  groupByCategory: boolean
  
  // Backup and Data
  enableAutoBackup: boolean
  backupFrequencyHours: number
  retainTransactionHistoryDays: number
  
  // Custom Fields
  customFields: Array<{
    name: string
    type: string
    required: boolean
  }>
}

export function InventorySettings({ tenantId }: InventorySettingsProps) {
  const [settings, setSettings] = useState<InventorySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    loadSettings()
  }, [tenantId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/settings?tenantId=${tenantId}`)
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (updatedSettings: Partial<InventorySettings>) => {
    try {
      setSaving(true)
      const response = await fetch('/api/inventory/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          ...updatedSettings
        })
      })

      if (response.ok) {
        const result = await response.json()
        setSettings(result.data)
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    if (settings) {
      const updatedSettings = { ...settings, [key]: value }
      setSettings(updatedSettings)
      saveSettings({ [key]: value })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Settings className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load settings</p>
          <Button onClick={loadSettings} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Settings</h2>
          <p className="text-muted-foreground">
            Configure inventory management preferences and alerts
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {saving && (
            <Badge variant="outline" className="px-3 py-1">
              <Save className="h-3 w-3 mr-1" />
              Saving...
            </Badge>
          )}
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select 
                    value={settings.defaultCurrency} 
                    onValueChange={(value) => updateSetting('defaultCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Unit of Measure</Label>
                  <Select 
                    value={settings.defaultUnitOfMeasure} 
                    onValueChange={(value) => updateSetting('defaultUnitOfMeasure', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tracking Options</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Batch Tracking</Label>
                      <p className="text-sm text-muted-foreground">Track inventory by batch/lot numbers</p>
                    </div>
                    <Switch
                      checked={settings.enableBatchTracking}
                      onCheckedChange={(checked) => updateSetting('enableBatchTracking', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Expiry Tracking</Label>
                      <p className="text-sm text-muted-foreground">Track expiration dates for perishable items</p>
                    </div>
                    <Switch
                      checked={settings.enableExpiryTracking}
                      onCheckedChange={(checked) => updateSetting('enableExpiryTracking', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Serial Numbers</Label>
                      <p className="text-sm text-muted-foreground">Track individual items by serial number</p>
                    </div>
                    <Switch
                      checked={settings.enableSerialNumbers}
                      onCheckedChange={(checked) => updateSetting('enableSerialNumbers', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Display Preferences</h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Stock View</Label>
                    <Select 
                      value={settings.defaultStockViewMode} 
                      onValueChange={(value) => updateSetting('defaultStockViewMode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table View</SelectItem>
                        <SelectItem value="grid">Grid View</SelectItem>
                        <SelectItem value="list">List View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Show Cost Prices</Label>
                    <Switch
                      checked={settings.showCostPrices}
                      onCheckedChange={(checked) => updateSetting('showCostPrices', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Show Stock Values</Label>
                    <Switch
                      checked={settings.showStockValues}
                      onCheckedChange={(checked) => updateSetting('showStockValues', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Group by Category</Label>
                    <Switch
                      checked={settings.groupByCategory}
                      onCheckedChange={(checked) => updateSetting('groupByCategory', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Settings */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alert Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Alert Types</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Low Stock Alerts</Label>
                      <p className="text-sm text-muted-foreground">Alert when items reach reorder point</p>
                    </div>
                    <Switch
                      checked={settings.enableLowStockAlerts}
                      onCheckedChange={(checked) => updateSetting('enableLowStockAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Out of Stock Alerts</Label>
                      <p className="text-sm text-muted-foreground">Alert when items are completely out of stock</p>
                    </div>
                    <Switch
                      checked={settings.enableOutOfStockAlerts}
                      onCheckedChange={(checked) => updateSetting('enableOutOfStockAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Expiry Alerts</Label>
                      <p className="text-sm text-muted-foreground">Alert for items approaching expiry date</p>
                    </div>
                    <Switch
                      checked={settings.enableExpiryAlerts}
                      onCheckedChange={(checked) => updateSetting('enableExpiryAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Overstock Alerts</Label>
                      <p className="text-sm text-muted-foreground">Alert when stock exceeds maximum levels</p>
                    </div>
                    <Switch
                      checked={settings.enableOverstockAlerts}
                      onCheckedChange={(checked) => updateSetting('enableOverstockAlerts', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Alert Thresholds</h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Low Stock Percentage</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.globalLowStockPercentage}
                      onChange={(e) => updateSetting('globalLowStockPercentage', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when stock is below this % of reorder point
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Critical Stock Percentage</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.globalCriticalStockPercentage}
                      onChange={(e) => updateSetting('globalCriticalStockPercentage', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when stock is critically low
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Expiry Alert Days</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.expiryAlertDays}
                      onChange={(e) => updateSetting('expiryAlertDays', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert X days before expiry
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Overstock Threshold %</Label>
                    <Input
                      type="number"
                      min="100"
                      max="500"
                      value={settings.overstockThresholdPercentage}
                      onChange={(e) => updateSetting('overstockThresholdPercentage', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when stock exceeds max level by this %
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Notification Methods</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send alerts via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <div>
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send alerts via SMS</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send browser push notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Notification Recipients</h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Addresses</Label>
                    <Textarea
                      placeholder="Enter email addresses, one per line"
                      value={settings.notificationEmails.join('\n')}
                      onChange={(e) => updateSetting('notificationEmails', e.target.value.split('\n').filter(Boolean))}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      One email address per line
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Numbers</Label>
                    <Textarea
                      placeholder="Enter phone numbers, one per line"
                      value={settings.notificationPhones.join('\n')}
                      onChange={(e) => updateSetting('notificationPhones', e.target.value.split('\n').filter(Boolean))}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      One phone number per line (include country code)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Automation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Auto-Ordering</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Auto-Ordering</Label>
                    <p className="text-sm text-muted-foreground">Automatically create purchase orders for low stock items</p>
                  </div>
                  <Switch
                    checked={settings.enableAutoOrdering}
                    onCheckedChange={(checked) => updateSetting('enableAutoOrdering', checked)}
                  />
                </div>

                {settings.enableAutoOrdering && (
                  <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label>Auto-Order Threshold</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.autoOrderingThreshold}
                        onChange={(e) => updateSetting('autoOrderingThreshold', parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Trigger when stock is below this % of reorder point
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity Multiplier</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        step="0.1"
                        value={settings.autoOrderingQuantityMultiplier}
                        onChange={(e) => updateSetting('autoOrderingQuantityMultiplier', parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Order quantity = reorder quantity × multiplier
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Maximum Order Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.autoOrderingMaxAmount}
                        onChange={(e) => updateSetting('autoOrderingMaxAmount', parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum total value for auto-generated orders
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Approval Workflows</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval for Adjustments</Label>
                    <p className="text-sm text-muted-foreground">Large stock adjustments need manager approval</p>
                  </div>
                  <Switch
                    checked={settings.requireApprovalForAdjustments}
                    onCheckedChange={(checked) => updateSetting('requireApprovalForAdjustments', checked)}
                  />
                </div>

                {settings.requireApprovalForAdjustments && (
                  <div className="pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label>Approval Threshold Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.approvalThresholdAmount}
                        onChange={(e) => updateSetting('approvalThresholdAmount', parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjustments above this value require approval
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Physical Count Reminders</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Physical Count Reminders</Label>
                    <p className="text-sm text-muted-foreground">Remind staff to perform physical inventory counts</p>
                  </div>
                  <Switch
                    checked={settings.enablePhysicalCountReminders}
                    onCheckedChange={(checked) => updateSetting('enablePhysicalCountReminders', checked)}
                  />
                </div>

                {settings.enablePhysicalCountReminders && (
                  <div className="pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label>Reminder Frequency (Days)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.physicalCountFrequencyDays}
                        onChange={(e) => updateSetting('physicalCountFrequencyDays', parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Remind every X days to perform physical counts
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Point of Sale Integration</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable POS Integration</Label>
                    <p className="text-sm text-muted-foreground">Sync inventory with POS system</p>
                  </div>
                  <Switch
                    checked={settings.enablePosIntegration}
                    onCheckedChange={(checked) => updateSetting('enablePosIntegration', checked)}
                  />
                </div>

                {settings.enablePosIntegration && (
                  <div className="pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label>POS System Type</Label>
                      <Select 
                        value={settings.posSystemType} 
                        onValueChange={(value) => updateSetting('posSystemType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="toast">Toast</SelectItem>
                          <SelectItem value="clover">Clover</SelectItem>
                          <SelectItem value="shopify">Shopify POS</SelectItem>
                          <SelectItem value="custom">Custom API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Accounting Integration</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Accounting Integration</Label>
                    <p className="text-sm text-muted-foreground">Sync inventory values with accounting system</p>
                  </div>
                  <Switch
                    checked={settings.enableAccountingIntegration}
                    onCheckedChange={(checked) => updateSetting('enableAccountingIntegration', checked)}
                  />
                </div>

                {settings.enableAccountingIntegration && (
                  <div className="pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label>Accounting System</Label>
                      <Select 
                        value={settings.accountingSystemType} 
                        onValueChange={(value) => updateSetting('accountingSystemType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quickbooks">QuickBooks</SelectItem>
                          <SelectItem value="xero">Xero</SelectItem>
                          <SelectItem value="sage">Sage</SelectItem>
                          <SelectItem value="wave">Wave</SelectItem>
                          <SelectItem value="custom">Custom API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Data Management</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Auto Backup</Label>
                      <p className="text-sm text-muted-foreground">Automatically backup inventory data</p>
                    </div>
                    <Switch
                      checked={settings.enableAutoBackup}
                      onCheckedChange={(checked) => updateSetting('enableAutoBackup', checked)}
                    />
                  </div>

                  {settings.enableAutoBackup && (
                    <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2">
                      <div className="space-y-2">
                        <Label>Backup Frequency (Hours)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          value={settings.backupFrequencyHours}
                          onChange={(e) => updateSetting('backupFrequencyHours', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Retain History (Days)</Label>
                        <Input
                          type="number"
                          min="30"
                          max="3650"
                          value={settings.retainTransactionHistoryDays}
                          onChange={(e) => updateSetting('retainTransactionHistoryDays', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}