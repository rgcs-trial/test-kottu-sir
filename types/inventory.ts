import { z } from 'zod'

// ===== INVENTORY ENUMS =====

export const UnitOfMeasure = z.enum([
  'piece',
  'kg',
  'gram',
  'liter',
  'ml',
  'dozen',
  'pack',
  'box',
  'bottle',
  'can',
  'cup',
  'tablespoon',
  'teaspoon',
  'ounce',
  'pound'
])
export type UnitOfMeasure = z.infer<typeof UnitOfMeasure>

export const InventoryTransactionType = z.enum([
  'restock',
  'sale', 
  'adjustment',
  'waste',
  'return',
  'transfer_in',
  'transfer_out',
  'theft',
  'damage'
])
export type InventoryTransactionType = z.infer<typeof InventoryTransactionType>

export const PurchaseOrderStatus = z.enum([
  'draft',
  'pending',
  'approved',
  'sent',
  'received',
  'partially_received',
  'cancelled',
  'disputed'
])
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatus>

export const SupplierStatus = z.enum([
  'active',
  'inactive',
  'suspended',
  'pending_approval'
])
export type SupplierStatus = z.infer<typeof SupplierStatus>

export const StockAlertLevel = z.enum([
  'out_of_stock',
  'critically_low',
  'low_stock',
  'normal',
  'overstocked'
])
export type StockAlertLevel = z.infer<typeof StockAlertLevel>

export const InventoryCountType = z.enum([
  'full',
  'partial',
  'cycle'
])
export type InventoryCountType = z.infer<typeof InventoryCountType>

export const InventoryCountStatus = z.enum([
  'in_progress',
  'completed',
  'cancelled'
])
export type InventoryCountStatus = z.infer<typeof InventoryCountStatus>

// ===== SUPPLIER SCHEMAS =====

export const SupplierSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  
  // Basic information
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  businessRegistration: z.string().optional(),
  
  // Contact details
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  
  // Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Sri Lanka'),
  
  // Business terms
  paymentTerms: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  discountPercentage: z.number().min(0).max(100).default(0),
  taxId: z.string().optional(),
  
  // Delivery information
  deliveryDays: z.array(z.string()).default([]),
  minOrderAmount: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0),
  leadTimeDays: z.number().min(0).default(7),
  
  // Banking details
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  
  // Status and ratings
  status: SupplierStatus.default('pending_approval'),
  rating: z.number().min(0).max(5).default(0),
  
  // Additional information
  notes: z.string().optional(),
  website: z.string().url().optional(),
  
  // Audit fields
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().optional(),
})

export type Supplier = z.infer<typeof SupplierSchema>

// ===== INVENTORY ITEM SCHEMAS =====

export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  menuItemId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  
  // Item identification
  name: z.string().min(1),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  internalCode: z.string().optional(),
  
  // Stock levels
  currentStock: z.number().min(0).default(0),
  reservedStock: z.number().min(0).default(0),
  availableStock: z.number().min(0).default(0),
  
  // Stock thresholds
  minStockLevel: z.number().min(0).default(0),
  maxStockLevel: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).default(0),
  reorderQuantity: z.number().min(0.01).default(1),
  
  // Measurement and costing
  unitOfMeasure: UnitOfMeasure.default('piece'),
  costPerUnit: z.number().min(0).default(0),
  sellingPricePerUnit: z.number().min(0).default(0),
  
  // Product details
  category: z.string().optional(),
  brand: z.string().optional(),
  
  // Perishable item tracking
  isPerishable: z.boolean().default(false),
  shelfLifeDays: z.number().min(0).optional(),
  storageRequirements: z.string().optional(),
  
  // Stock alerts
  lowStockAlertEnabled: z.boolean().default(true),
  outOfStockAlertEnabled: z.boolean().default(true),
  expiryAlertEnabled: z.boolean().default(false),
  expiryAlertDays: z.number().min(0).default(3),
  
  // Auto-ordering
  autoReorderEnabled: z.boolean().default(false),
  autoReorderSupplierId: z.string().uuid().optional(),
  
  // Inventory status
  isActive: z.boolean().default(true),
  isTracked: z.boolean().default(true),
  
  // Menu integration
  affectsMenuAvailability: z.boolean().default(true),
  recipeYield: z.number().min(0).optional(),
  
  // Location tracking
  storageLocation: z.string().optional(),
  
  // Last activity tracking
  lastRestockedAt: z.date().optional(),
  lastCountedAt: z.date().optional(),
  lastOrderedAt: z.date().optional(),
  
  // Additional metadata
  metadata: z.record(z.any()).default({}),
  
  // Audit fields
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().optional(),
  
  // Computed fields
  stockValue: z.number().optional(),
  alertLevel: StockAlertLevel.optional(),
  needsReorder: z.boolean().optional(),
  supplierName: z.string().optional(),
  menuItemName: z.string().optional(),
})

export type InventoryItem = z.infer<typeof InventoryItemSchema>

// ===== INVENTORY TRANSACTION SCHEMAS =====

export const InventoryTransactionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  
  // Transaction details
  transactionType: InventoryTransactionType,
  quantity: z.number(),
  unitCost: z.number().min(0).default(0),
  totalCost: z.number().min(0).optional(),
  
  // Stock levels
  stockBefore: z.number().min(0),
  stockAfter: z.number().min(0),
  
  // Reference information
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  referenceNumber: z.string().optional(),
  
  // Additional details
  notes: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  lotNumber: z.string().optional(),
  
  // Location tracking
  fromLocation: z.string().optional(),
  toLocation: z.string().optional(),
  
  // Approval workflow
  requiresApproval: z.boolean().default(false),
  approvedAt: z.date().optional(),
  approvedBy: z.string().uuid().optional(),
  
  // Audit fields
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  
  // Additional computed/joined fields
  inventoryItemName: z.string().optional(),
  createdByName: z.string().optional(),
})

export type InventoryTransaction = z.infer<typeof InventoryTransactionSchema>

// ===== PURCHASE ORDER SCHEMAS =====

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  
  // Order identification
  poNumber: z.string().min(1),
  internalReference: z.string().optional(),
  supplierReference: z.string().optional(),
  
  // Order details
  status: PurchaseOrderStatus.default('draft'),
  orderDate: z.date(),
  expectedDeliveryDate: z.date().optional(),
  actualDeliveryDate: z.date().optional(),
  
  // Amounts
  subtotal: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  shippingCost: z.number().min(0).default(0),
  totalAmount: z.number().min(0).default(0),
  
  // Payment information
  paymentTerms: z.string().optional(),
  paymentStatus: z.string().default('pending'),
  paymentDueDate: z.date().optional(),
  
  // Delivery information
  deliveryAddress: z.record(z.any()).optional(),
  deliveryInstructions: z.string().optional(),
  deliveryContactPerson: z.string().optional(),
  deliveryContactPhone: z.string().optional(),
  
  // Order notes
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  
  // Approval workflow
  requiresApproval: z.boolean().default(true),
  approvalStatus: z.string().default('pending'),
  approvedAt: z.date().optional(),
  approvedBy: z.string().uuid().optional(),
  approvalNotes: z.string().optional(),
  
  // Receiving status
  isFullyReceived: z.boolean().default(false),
  partiallyReceivedAt: z.date().optional(),
  fullyReceivedAt: z.date().optional(),
  receivedBy: z.string().uuid().optional(),
  
  // Cancellation details
  cancelledAt: z.date().optional(),
  cancelledBy: z.string().uuid().optional(),
  cancellationReason: z.string().optional(),
  
  // Audit fields
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid(),
  
  // Computed/joined fields
  supplierName: z.string().optional(),
  supplierEmail: z.string().optional(),
  supplierPhone: z.string().optional(),
  itemCount: z.number().optional(),
  totalOrderedQuantity: z.number().optional(),
  totalReceivedQuantity: z.number().optional(),
})

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>

export const PurchaseOrderItemSchema = z.object({
  id: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  
  // Item details
  itemName: z.string().min(1),
  itemSku: z.string().optional(),
  
  // Quantities
  orderedQuantity: z.number().min(0.01),
  receivedQuantity: z.number().min(0).default(0),
  remainingQuantity: z.number().min(0).optional(),
  
  // Pricing
  unitCost: z.number().min(0),
  lineTotal: z.number().min(0).optional(),
  
  // Product specifications
  specifications: z.string().optional(),
  notes: z.string().optional(),
  
  // Receiving details
  receivedAt: z.date().optional(),
  receivedBy: z.string().uuid().optional(),
  receivedNotes: z.string().optional(),
  
  // Quality control
  qualityCheckPassed: z.boolean().optional(),
  qualityCheckNotes: z.string().optional(),
  qualityCheckedBy: z.string().uuid().optional(),
  qualityCheckedAt: z.date().optional(),
  
  // Batch/lot tracking
  batchNumbers: z.array(z.string()).default([]),
  expiryDates: z.array(z.date()).default([]),
  
  // Audit fields
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>

// ===== INVENTORY ALERT SCHEMAS =====

export const InventoryAlertSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  
  // Alert details
  alertType: StockAlertLevel,
  alertMessage: z.string().min(1),
  currentStock: z.number().min(0),
  thresholdValue: z.number().min(0).optional(),
  
  // Alert status
  isActive: z.boolean().default(true),
  isRead: z.boolean().default(false),
  isResolved: z.boolean().default(false),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().uuid().optional(),
  resolutionNotes: z.string().optional(),
  
  // Notification tracking
  notificationSent: z.boolean().default(false),
  notificationSentAt: z.date().optional(),
  emailSent: z.boolean().default(false),
  smsSent: z.boolean().default(false),
  
  // Priority and escalation
  priority: z.string().default('medium'),
  escalated: z.boolean().default(false),
  escalatedAt: z.date().optional(),
  escalatedTo: z.string().uuid().optional(),
  
  // Additional context
  suggestedAction: z.string().optional(),
  estimatedStockoutDate: z.date().optional(),
  
  // Audit fields
  createdAt: z.date(),
  updatedAt: z.date(),
  
  // Computed/joined fields
  inventoryItemName: z.string().optional(),
  inventoryItemSku: z.string().optional(),
})

export type InventoryAlert = z.infer<typeof InventoryAlertSchema>

// ===== INVENTORY COUNT SCHEMAS =====

export const InventoryCountSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  
  // Count session details
  countName: z.string().min(1),
  countType: InventoryCountType.default('full'),
  countDate: z.date(),
  countTime: z.string().optional(),
  
  // Status
  status: InventoryCountStatus.default('in_progress'),
  
  // Locations and scope
  locations: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  
  // Results summary
  totalItemsCounted: z.number().min(0).default(0),
  totalDiscrepancies: z.number().min(0).default(0),
  totalAdjustmentValue: z.number().default(0),
  
  // Audit fields
  startedAt: z.date(),
  completedAt: z.date().optional(),
  startedBy: z.string().uuid(),
  completedBy: z.string().uuid().optional(),
  
  notes: z.string().optional(),
})

export type InventoryCount = z.infer<typeof InventoryCountSchema>

export const InventoryCountItemSchema = z.object({
  id: z.string().uuid(),
  inventoryCountId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  
  // Count details
  systemQuantity: z.number().min(0),
  countedQuantity: z.number().min(0).optional(),
  varianceQuantity: z.number().optional(),
  varianceValue: z.number().optional(),
  
  // Count status
  isCounted: z.boolean().default(false),
  isApproved: z.boolean().default(false),
  requiresRecount: z.boolean().default(false),
  
  // Count details
  location: z.string().optional(),
  notes: z.string().optional(),
  
  // Audit fields
  countedAt: z.date().optional(),
  countedBy: z.string().uuid().optional(),
  approvedAt: z.date().optional(),
  approvedBy: z.string().uuid().optional(),
  
  // Computed/joined fields
  inventoryItemName: z.string().optional(),
  inventoryItemSku: z.string().optional(),
})

export type InventoryCountItem = z.infer<typeof InventoryCountItemSchema>

// ===== FORM SCHEMAS =====

export const SupplierFormSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  
  // Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Sri Lanka'),
  
  // Business terms
  paymentTerms: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  discountPercentage: z.number().min(0).max(100).default(0),
  taxId: z.string().optional(),
  
  // Delivery
  minOrderAmount: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0),
  leadTimeDays: z.number().min(0).default(7),
  
  // Additional
  notes: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

export type SupplierForm = z.infer<typeof SupplierFormSchema>

export const InventoryItemFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  menuItemId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  
  // Stock details
  currentStock: z.number().min(0, 'Stock cannot be negative').default(0),
  minStockLevel: z.number().min(0, 'Minimum stock level cannot be negative').default(0),
  maxStockLevel: z.number().min(0, 'Maximum stock level cannot be negative').optional(),
  reorderPoint: z.number().min(0, 'Reorder point cannot be negative').default(0),
  reorderQuantity: z.number().min(0.01, 'Reorder quantity must be greater than 0').default(1),
  
  // Measurement and costing
  unitOfMeasure: UnitOfMeasure.default('piece'),
  costPerUnit: z.number().min(0, 'Cost cannot be negative').default(0),
  sellingPricePerUnit: z.number().min(0, 'Price cannot be negative').default(0),
  
  // Product details
  category: z.string().optional(),
  brand: z.string().optional(),
  
  // Perishable settings
  isPerishable: z.boolean().default(false),
  shelfLifeDays: z.number().min(0).optional(),
  storageRequirements: z.string().optional(),
  
  // Alert settings
  lowStockAlertEnabled: z.boolean().default(true),
  outOfStockAlertEnabled: z.boolean().default(true),
  expiryAlertEnabled: z.boolean().default(false),
  expiryAlertDays: z.number().min(0).default(3),
  
  // Other settings
  storageLocation: z.string().optional(),
  affectsMenuAvailability: z.boolean().default(true),
  isTracked: z.boolean().default(true),
}).refine(data => {
  if (data.maxStockLevel && data.maxStockLevel < data.minStockLevel) {
    return false
  }
  return true
}, {
  message: 'Maximum stock level must be greater than minimum stock level',
  path: ['maxStockLevel'],
})

export type InventoryItemForm = z.infer<typeof InventoryItemFormSchema>

export const StockAdjustmentFormSchema = z.object({
  inventoryItemId: z.string().uuid('Please select an inventory item'),
  adjustmentType: z.enum(['increase', 'decrease']),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  reason: InventoryTransactionType,
  notes: z.string().optional(),
  unitCost: z.number().min(0).default(0),
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional(),
})

export type StockAdjustmentForm = z.infer<typeof StockAdjustmentFormSchema>

export const PurchaseOrderFormSchema = z.object({
  supplierId: z.string().uuid('Please select a supplier'),
  poNumber: z.string().min(1, 'PO number is required'),
  orderDate: z.date(),
  expectedDeliveryDate: z.date().optional(),
  
  // Delivery details
  deliveryInstructions: z.string().optional(),
  deliveryContactPerson: z.string().optional(),
  deliveryContactPhone: z.string().optional(),
  
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
})

export type PurchaseOrderForm = z.infer<typeof PurchaseOrderFormSchema>

// ===== DASHBOARD ANALYTICS =====

export interface InventoryAnalytics {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  totalAlerts: number
  reorderNeededItems: number
  
  // Stock value by category
  valueByCategory: Array<{
    category: string
    value: number
    count: number
  }>
  
  // Recent transactions
  recentTransactions: InventoryTransaction[]
  
  // Top moving items
  fastMovingItems: Array<{
    id: string
    name: string
    transactionCount: number
    totalQuantityMoved: number
  }>
  
  // Alerts breakdown
  alertsBreakdown: Array<{
    type: StockAlertLevel
    count: number
  }>
}

export interface StockMovementData {
  itemId: string
  itemName: string
  movements: Array<{
    date: string
    quantity: number
    type: InventoryTransactionType
    stockLevel: number
  }>
}

// ===== UTILITY TYPES =====

export type CreateInventoryItemData = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'availableStock' | 'stockValue' | 'alertLevel' | 'needsReorder' | 'supplierName' | 'menuItemName'>
export type UpdateInventoryItemData = Partial<CreateInventoryItemData>

export type CreateSupplierData = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateSupplierData = Partial<CreateSupplierData>

export type CreatePurchaseOrderData = Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'supplierName' | 'supplierEmail' | 'supplierPhone' | 'itemCount' | 'totalOrderedQuantity' | 'totalReceivedQuantity'>
export type UpdatePurchaseOrderData = Partial<CreatePurchaseOrderData>

// ===== API RESPONSE TYPES =====

export interface InventoryApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface InventoryDashboardStats {
  totalItems: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  pendingOrders: number
  activeSuppliers: number
  recentTransactions: InventoryTransaction[]
  criticalAlerts: InventoryAlert[]
}

// ===== TABLE NAMES =====

export const InventoryTables = {
  SUPPLIERS: 'suppliers',
  INVENTORY_ITEMS: 'inventory_items',
  INVENTORY_TRANSACTIONS: 'inventory_transactions',
  PURCHASE_ORDERS: 'purchase_orders',
  PURCHASE_ORDER_ITEMS: 'purchase_order_items',
  INVENTORY_ALERTS: 'inventory_alerts',
  INVENTORY_COUNTS: 'inventory_counts',
  INVENTORY_COUNT_ITEMS: 'inventory_count_items',
} as const

export type InventoryTableName = typeof InventoryTables[keyof typeof InventoryTables]