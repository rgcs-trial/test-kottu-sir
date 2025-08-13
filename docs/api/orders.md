# Orders API

The Orders API handles the complete order lifecycle from creation to completion, including order management, status updates, tracking, and customer communication.

## Base Endpoints

```
POST   /api/orders                    # Create new order
GET    /api/orders/{id}               # Get order details
POST   /api/orders/update-status      # Update order status
GET    /api/orders/track/{id}         # Track order progress
GET    /api/orders                    # List orders (restaurant staff)
POST   /api/orders/cancel/{id}        # Cancel order
POST   /api/orders/refund/{id}        # Process refund
GET    /api/orders/analytics          # Order analytics
```

## Authentication

Order endpoints require different authentication levels:
- **Create Order**: Guest session or authenticated user
- **View Order**: Order ownership or restaurant staff
- **Manage Orders**: Restaurant staff/owner authentication

## Create Order

Create a new order for a restaurant.

**Endpoint:** `POST /api/orders`

**Authentication:** Optional (supports guest checkout)

**Request Body:**
```json
{
  "restaurantId": "restaurant-uuid",
  "orderType": "delivery",
  "items": [
    {
      "menuItemId": "item-uuid",
      "quantity": 2,
      "price": 14.99,
      "selectedVariant": {
        "id": "variant-uuid",
        "name": "Medium",
        "price": 14.99
      },
      "selectedModifiers": [
        {
          "groupId": "modifier-group-uuid",
          "groupName": "Extra Toppings",
          "options": [
            {
              "id": "option-uuid",
              "name": "Extra Cheese",
              "price": 2.00
            }
          ]
        }
      ],
      "specialInstructions": "Extra crispy please",
      "itemTotal": 33.98
    }
  ],
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123"
  },
  "deliveryAddress": {
    "street": "456 Oak Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "instructions": "Ring doorbell twice"
  },
  "paymentMethod": "card",
  "subtotal": 33.98,
  "tax": 2.72,
  "deliveryFee": 2.99,
  "tip": 5.00,
  "total": 44.69,
  "scheduledFor": "2024-01-15T19:30:00Z",
  "specialInstructions": "Please call upon arrival"
}
```

**Request Schema:**
- `restaurantId` (string, required): Restaurant UUID
- `orderType` (enum, required): "delivery" | "pickup" | "dine_in"
- `items` (array, required): Order items with selections
  - `menuItemId` (string, required): Menu item UUID
  - `quantity` (number, required): Item quantity (min: 1)
  - `price` (number, required): Base item price
  - `selectedVariant` (object, optional): Selected size/variant
  - `selectedModifiers` (array, optional): Selected modifiers
  - `specialInstructions` (string, optional): Item-specific notes
  - `itemTotal` (number, required): Total for this line item
- `customerInfo` (object, required): Customer contact information
  - `name` (string, required): Customer name
  - `email` (string, required): Customer email
  - `phone` (string, required): Customer phone
- `deliveryAddress` (object, conditional): Required for delivery orders
  - `street` (string, required): Street address
  - `city` (string, required): City
  - `state` (string, required): State/province
  - `zipCode` (string, required): ZIP/postal code
  - `instructions` (string, optional): Delivery instructions
- `paymentMethod` (enum, required): "card" | "cash" | "apple_pay" | "google_pay"
- `subtotal` (number, required): Items total before fees
- `tax` (number, required): Tax amount
- `deliveryFee` (number, optional): Delivery fee (if applicable)
- `tip` (number, optional): Tip amount
- `total` (number, required): Final total amount
- `scheduledFor` (string, optional): Scheduled delivery/pickup time (ISO 8601)
- `specialInstructions` (string, optional): Order-level instructions

**Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "ORD-2024-001234",
      "restaurantId": "restaurant-uuid",
      "customerId": "customer-uuid",
      "status": "pending",
      "orderType": "delivery",
      "items": [
        {
          "id": "order-item-uuid",
          "menuItemId": "item-uuid",
          "menuItemName": "Margherita Pizza",
          "quantity": 2,
          "unitPrice": 14.99,
          "selectedVariant": {
            "id": "variant-uuid",
            "name": "Medium",
            "price": 14.99
          },
          "selectedModifiers": [
            {
              "groupId": "modifier-group-uuid",
              "groupName": "Extra Toppings",
              "options": [
                {
                  "id": "option-uuid",
                  "name": "Extra Cheese",
                  "price": 2.00
                }
              ]
            }
          ],
          "specialInstructions": "Extra crispy please",
          "lineTotal": 33.98
        }
      ],
      "customerInfo": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-555-0123"
      },
      "deliveryAddress": {
        "street": "456 Oak Street",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "instructions": "Ring doorbell twice",
        "coordinates": {
          "latitude": 40.7128,
          "longitude": -74.0060
        }
      },
      "paymentMethod": "card",
      "pricing": {
        "subtotal": 33.98,
        "tax": 2.72,
        "deliveryFee": 2.99,
        "tip": 5.00,
        "total": 44.69
      },
      "timing": {
        "orderPlaced": "2024-01-15T18:30:00.000Z",
        "scheduledFor": "2024-01-15T19:30:00.000Z",
        "estimatedReadyTime": "2024-01-15T19:15:00.000Z",
        "estimatedDeliveryTime": "2024-01-15T19:45:00.000Z"
      },
      "specialInstructions": "Please call upon arrival",
      "paymentIntentId": "pi_xxx",
      "createdAt": "2024-01-15T18:30:00.000Z",
      "updatedAt": "2024-01-15T18:30:00.000Z"
    }
  },
  "message": "Order created successfully"
}
```

**Error Responses:**

*Restaurant Not Accepting Orders (400):*
```json
{
  "success": false,
  "error": "Restaurant is not currently accepting orders",
  "code": "RESTAURANT_NOT_ACCEPTING_ORDERS"
}
```

*Minimum Order Not Met (400):*
```json
{
  "success": false,
  "error": "Order total must be at least $15.00",
  "code": "MINIMUM_ORDER_NOT_MET",
  "details": {
    "minimumAmount": 15.00,
    "currentAmount": 12.50
  }
}
```

*Menu Item Unavailable (400):*
```json
{
  "success": false,
  "error": "Some items are no longer available",
  "code": "ITEMS_UNAVAILABLE",
  "details": {
    "unavailableItems": [
      {
        "menuItemId": "item-uuid",
        "name": "Caesar Salad",
        "reason": "Out of stock"
      }
    ]
  }
}
```

## Get Order Details

Retrieve detailed information about a specific order.

**Endpoint:** `GET /api/orders/{id}`

**Path Parameters:**
- `id` (string, required): Order UUID

**Authentication:** Order owner, restaurant staff, or guest session with order access

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "ORD-2024-001234",
      "restaurantId": "restaurant-uuid",
      "restaurant": {
        "name": "Mario's Pizza",
        "phone": "+1-555-0123",
        "address": "123 Main Street, New York, NY"
      },
      "customerId": "customer-uuid",
      "status": "confirmed",
      "orderType": "delivery",
      "items": [
        // Complete order items with current menu data
      ],
      "customerInfo": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-555-0123"
      },
      "deliveryAddress": {
        // Delivery address details
      },
      "paymentMethod": "card",
      "paymentStatus": "paid",
      "pricing": {
        "subtotal": 33.98,
        "tax": 2.72,
        "deliveryFee": 2.99,
        "tip": 5.00,
        "total": 44.69
      },
      "timing": {
        "orderPlaced": "2024-01-15T18:30:00.000Z",
        "confirmedAt": "2024-01-15T18:32:00.000Z",
        "scheduledFor": "2024-01-15T19:30:00.000Z",
        "estimatedReadyTime": "2024-01-15T19:15:00.000Z",
        "estimatedDeliveryTime": "2024-01-15T19:45:00.000Z"
      },
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2024-01-15T18:30:00.000Z",
          "note": "Order received"
        },
        {
          "status": "confirmed",
          "timestamp": "2024-01-15T18:32:00.000Z",
          "note": "Order confirmed by restaurant"
        }
      ],
      "specialInstructions": "Please call upon arrival",
      "deliveryInstructions": "Ring doorbell twice",
      "notes": "Customer requested extra napkins",
      "createdAt": "2024-01-15T18:30:00.000Z",
      "updatedAt": "2024-01-15T18:32:00.000Z"
    }
  }
}
```

## Update Order Status

Update the status of an order (restaurant staff only).

**Endpoint:** `POST /api/orders/update-status`

**Authentication:** Required (restaurant staff/owner)

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "status": "preparing",
  "estimatedReadyTime": "2024-01-15T19:15:00Z",
  "notes": "Started preparation"
}
```

**Bulk Update:**
```json
{
  "orderIds": ["order-uuid-1", "order-uuid-2", "order-uuid-3"],
  "status": "ready",
  "notes": "All orders ready for pickup"
}
```

**Request Schema:**
- `orderId` (string, conditional): Single order UUID
- `orderIds` (array, conditional): Multiple order UUIDs (max 50)
- `status` (enum, required): New order status
- `estimatedReadyTime` (string, optional): Updated ready time (ISO 8601)
- `actualReadyTime` (string, optional): Actual completion time (ISO 8601)
- `notes` (string, optional): Status update notes

**Order Status Flow:**
```
pending → confirmed → preparing → ready → completed/delivered
       ↘ cancelled ↗
```

**Valid Status Transitions:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `preparing`, `cancelled`
- `preparing` → `ready`, `cancelled`
- `ready` → `completed` (pickup) or `out_for_delivery` (delivery)
- `out_for_delivery` → `delivered`
- `cancelled` → `refunded` (if payment processed)

**Response (200):**
```json
{
  "success": true,
  "order": {
    // Updated order object
    "id": "order-uuid",
    "status": "preparing",
    "estimatedReadyTime": "2024-01-15T19:15:00.000Z",
    "updatedAt": "2024-01-15T18:35:00.000Z"
  },
  "message": "Order status updated to preparing"
}
```

**Bulk Update Response:**
```json
{
  "success": true,
  "updatedCount": 3,
  "orders": [
    // Array of updated order objects
  ],
  "message": "3 orders updated to ready"
}
```

**Error Responses:**

*Invalid Status Transition (400):*
```json
{
  "success": false,
  "error": "Invalid status transition from confirmed to delivered",
  "code": "INVALID_STATUS_TRANSITION"
}
```

*Insufficient Permissions (403):*
```json
{
  "success": false,
  "error": "Insufficient permissions to update this order",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

## Track Order Progress

Get real-time order tracking information (public endpoint for customers).

**Endpoint:** `GET /api/orders/track/{id}`

**Path Parameters:**
- `id` (string, required): Order UUID or order number

**Authentication:** None required (public tracking)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tracking": {
      "orderId": "order-uuid",
      "orderNumber": "ORD-2024-001234",
      "status": "preparing",
      "orderType": "delivery",
      "restaurant": {
        "name": "Mario's Pizza",
        "phone": "+1-555-0123",
        "address": "123 Main Street, New York, NY"
      },
      "customerInfo": {
        "name": "John D.",
        "phone": "+1-555-0123"
      },
      "timing": {
        "orderPlaced": "2024-01-15T18:30:00.000Z",
        "estimatedReadyTime": "2024-01-15T19:15:00.000Z",
        "estimatedDeliveryTime": "2024-01-15T19:45:00.000Z"
      },
      "progress": {
        "currentStep": 2,
        "totalSteps": 4,
        "steps": [
          {
            "step": 1,
            "name": "Order Received",
            "status": "completed",
            "timestamp": "2024-01-15T18:30:00.000Z"
          },
          {
            "step": 2,
            "name": "Preparing",
            "status": "in_progress",
            "timestamp": "2024-01-15T18:35:00.000Z",
            "estimatedCompletion": "2024-01-15T19:15:00.000Z"
          },
          {
            "step": 3,
            "name": "Ready",
            "status": "pending",
            "estimatedStart": "2024-01-15T19:15:00.000Z"
          },
          {
            "step": 4,
            "name": "Delivered",
            "status": "pending",
            "estimatedStart": "2024-01-15T19:30:00.000Z"
          }
        ]
      },
      "liveUpdates": {
        "lastUpdate": "2024-01-15T18:35:00.000Z",
        "message": "Your order is being prepared with care",
        "estimatedTimeRemaining": "40 minutes"
      },
      "deliveryInfo": {
        "address": "456 Oak Street, New York, NY 10001",
        "instructions": "Ring doorbell twice",
        "estimatedDeliveryTime": "2024-01-15T19:45:00.000Z"
      },
      "items": [
        {
          "name": "Margherita Pizza (Medium)",
          "quantity": 2,
          "customizations": ["Extra Cheese"]
        }
      ]
    }
  }
}
```

## List Orders (Restaurant Dashboard)

Get orders for restaurant management dashboard.

**Endpoint:** `GET /api/orders`

**Authentication:** Required (restaurant staff/owner)

**Query Parameters:**
- `restaurantId` (string, required): Restaurant UUID
- `status` (string, optional): Filter by status
- `orderType` (string, optional): Filter by order type
- `date` (string, optional): Filter by date (YYYY-MM-DD)
- `startDate` (string, optional): Date range start
- `endDate` (string, optional): Date range end
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `sort` (string, optional): Sort field (default: "createdAt")
- `order` (string, optional): Sort order ("asc", "desc", default: "desc")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-2024-001234",
        "status": "confirmed",
        "orderType": "delivery",
        "customerInfo": {
          "name": "John Doe",
          "phone": "+1-555-0123"
        },
        "itemCount": 3,
        "total": 44.69,
        "timing": {
          "orderPlaced": "2024-01-15T18:30:00.000Z",
          "estimatedReadyTime": "2024-01-15T19:15:00.000Z"
        },
        "paymentStatus": "paid",
        "isScheduled": false,
        "urgency": "normal"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    },
    "summary": {
      "totalOrders": 150,
      "pendingOrders": 5,
      "preparingOrders": 8,
      "readyOrders": 3,
      "totalRevenue": 3456.78,
      "averageOrderValue": 23.05
    }
  }
}
```

## Cancel Order

Cancel an order (customer or restaurant staff).

**Endpoint:** `POST /api/orders/cancel/{id}`

**Path Parameters:**
- `id` (string, required): Order UUID

**Request Body:**
```json
{
  "reason": "customer_request",
  "note": "Customer changed mind",
  "refundAmount": 44.69
}
```

**Request Schema:**
- `reason` (enum, required): Cancellation reason
  - "customer_request", "restaurant_unavailable", "item_unavailable", "payment_failed", "other"
- `note` (string, optional): Additional notes
- `refundAmount` (number, optional): Refund amount (defaults to full amount)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "status": "cancelled",
      "cancellation": {
        "reason": "customer_request",
        "note": "Customer changed mind",
        "cancelledAt": "2024-01-15T18:45:00.000Z",
        "cancelledBy": "customer"
      },
      "refund": {
        "amount": 44.69,
        "status": "processing",
        "expectedDate": "2024-01-18T00:00:00.000Z"
      }
    }
  },
  "message": "Order cancelled successfully"
}
```

## Process Refund

Process a refund for a completed order.

**Endpoint:** `POST /api/orders/refund/{id}`

**Authentication:** Required (restaurant staff/owner)

**Path Parameters:**
- `id` (string, required): Order UUID

**Request Body:**
```json
{
  "amount": 44.69,
  "reason": "food_quality_issue",
  "note": "Customer reported cold food",
  "refundType": "full"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "refund": {
      "id": "refund-uuid",
      "orderId": "order-uuid",
      "amount": 44.69,
      "reason": "food_quality_issue",
      "status": "processing",
      "refundMethod": "original_payment_method",
      "expectedDate": "2024-01-18T00:00:00.000Z",
      "processedAt": "2024-01-15T19:00:00.000Z"
    }
  },
  "message": "Refund processed successfully"
}
```

## Order Analytics

Get comprehensive order analytics for a restaurant.

**Endpoint:** `GET /api/orders/analytics`

**Authentication:** Required (restaurant staff/owner)

**Query Parameters:**
- `restaurantId` (string, required): Restaurant UUID
- `period` (string, optional): "today", "week", "month", "quarter", "year"
- `startDate` (string, optional): Custom date range start
- `endDate` (string, optional): Custom date range end
- `groupBy` (string, optional): Group results by "hour", "day", "week", "month"

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "period": "month",
      "summary": {
        "totalOrders": 1248,
        "totalRevenue": 28965.50,
        "averageOrderValue": 23.21,
        "completionRate": 96.8,
        "cancellationRate": 3.2,
        "averagePreparationTime": "18 minutes",
        "customerSatisfaction": 4.3
      },
      "ordersByStatus": {
        "completed": 1208,
        "cancelled": 40,
        "refunded": 8
      },
      "ordersByType": {
        "delivery": 745,
        "pickup": 478,
        "dine_in": 25
      },
      "peakHours": [
        { "hour": 12, "orders": 89 },
        { "hour": 18, "orders": 156 },
        { "hour": 19, "orders": 198 }
      ],
      "trends": [
        {
          "date": "2024-01-01",
          "orders": 42,
          "revenue": 976.50,
          "averageOrderValue": 23.25
        }
        // ... more daily data
      ],
      "topItems": [
        {
          "itemId": "item-uuid",
          "name": "Margherita Pizza",
          "orders": 312,
          "revenue": 4668.88
        }
      ]
    }
  }
}
```

## Real-time Updates

The Orders API supports real-time updates via Server-Sent Events (SSE) or WebSocket connections.

### Order Status Updates (SSE)

**Endpoint:** `GET /api/orders/stream/{id}`

**Stream Format:**
```
data: {"type": "status_update", "orderId": "order-uuid", "status": "preparing", "timestamp": "2024-01-15T18:35:00.000Z"}

data: {"type": "ready_time_update", "orderId": "order-uuid", "estimatedReadyTime": "2024-01-15T19:20:00.000Z"}

data: {"type": "driver_assigned", "orderId": "order-uuid", "driver": {"name": "Mike", "phone": "+1-555-0456"}}
```

### Kitchen Display Updates

**Endpoint:** `GET /api/orders/kitchen-stream`

**Authentication:** Required (restaurant staff)

Real-time stream of all order updates for kitchen display systems.

## Code Examples

### JavaScript/TypeScript

**Order Management Class:**
```typescript
interface OrderAPIClient {
  createOrder(orderData: CreateOrderData): Promise<Order>;
  getOrder(orderId: string): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus, options?: UpdateStatusOptions): Promise<Order>;
  trackOrder(orderIdOrNumber: string): Promise<OrderTracking>;
  cancelOrder(orderId: string, reason: string, note?: string): Promise<Order>;
  getOrders(restaurantId: string, filters?: OrderFilters): Promise<OrderList>;
}

class OrderAPI implements OrderAPIClient {
  constructor(private apiClient: APIClient) {}

  async createOrder(orderData: CreateOrderData): Promise<Order> {
    const response = await this.apiClient.post('/api/orders', orderData);
    return response.data.order;
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.apiClient.get(`/api/orders/${orderId}`);
    return response.data.order;
  }

  async updateOrderStatus(
    orderId: string, 
    status: OrderStatus, 
    options: UpdateStatusOptions = {}
  ): Promise<Order> {
    const response = await this.apiClient.post('/api/orders/update-status', {
      orderId,
      status,
      ...options
    });
    return response.data.order;
  }

  async bulkUpdateStatus(
    orderIds: string[], 
    status: OrderStatus,
    options: UpdateStatusOptions = {}
  ): Promise<Order[]> {
    const response = await this.apiClient.post('/api/orders/update-status', {
      orderIds,
      status,
      ...options
    });
    return response.data.orders;
  }

  async trackOrder(orderIdOrNumber: string): Promise<OrderTracking> {
    const response = await this.apiClient.get(`/api/orders/track/${orderIdOrNumber}`);
    return response.data.tracking;
  }

  async cancelOrder(orderId: string, reason: string, note?: string): Promise<Order> {
    const response = await this.apiClient.post(`/api/orders/cancel/${orderId}`, {
      reason,
      note
    });
    return response.data.order;
  }

  async getOrders(restaurantId: string, filters: OrderFilters = {}): Promise<OrderList> {
    const params = new URLSearchParams({
      restaurantId,
      ...filters
    });

    const response = await this.apiClient.get(`/api/orders?${params}`);
    return response.data;
  }

  // Real-time order tracking
  subscribeToOrderUpdates(orderId: string, callback: (update: OrderUpdate) => void): () => void {
    const eventSource = new EventSource(`/api/orders/stream/${orderId}`);
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      callback(update);
    };

    eventSource.onerror = (error) => {
      console.error('Order stream error:', error);
    };

    return () => eventSource.close();
  }
}
```

**React Hook for Order Management:**
```typescript
export function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderAPI = new OrderAPI(apiClient);

  useEffect(() => {
    if (orderId) {
      loadOrder();
      
      // Subscribe to real-time updates
      const unsubscribe = orderAPI.subscribeToOrderUpdates(
        orderId,
        handleOrderUpdate
      );

      return unsubscribe;
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await orderAPI.getOrder(orderId);
      setOrder(orderData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUpdate = (update: OrderUpdate) => {
    setOrder(prev => {
      if (!prev) return null;
      
      switch (update.type) {
        case 'status_update':
          return { ...prev, status: update.status, updatedAt: update.timestamp };
        case 'ready_time_update':
          return {
            ...prev,
            timing: { ...prev.timing, estimatedReadyTime: update.estimatedReadyTime }
          };
        default:
          return prev;
      }
    });
  };

  const updateStatus = async (status: OrderStatus, options?: UpdateStatusOptions) => {
    const updatedOrder = await orderAPI.updateOrderStatus(orderId, status, options);
    setOrder(updatedOrder);
    return updatedOrder;
  };

  const cancelOrder = async (reason: string, note?: string) => {
    const cancelledOrder = await orderAPI.cancelOrder(orderId, reason, note);
    setOrder(cancelledOrder);
    return cancelledOrder;
  };

  return {
    order,
    loading,
    error,
    updateStatus,
    cancelOrder,
    refetch: loadOrder
  };
}

export function useOrderTracking(orderIdOrNumber: string) {
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);

  const orderAPI = new OrderAPI(apiClient);

  useEffect(() => {
    if (orderIdOrNumber) {
      loadTracking();

      // Auto-refresh tracking every 30 seconds
      const interval = setInterval(loadTracking, 30000);
      return () => clearInterval(interval);
    }
  }, [orderIdOrNumber]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      const trackingData = await orderAPI.trackOrder(orderIdOrNumber);
      setTracking(trackingData);
    } catch (err) {
      console.error('Failed to load tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    tracking,
    loading,
    refetch: loadTracking
  };
}
```

**Order Creation Helper:**
```typescript
class OrderBuilder {
  private orderData: Partial<CreateOrderData> = {};

  setRestaurant(restaurantId: string): OrderBuilder {
    this.orderData.restaurantId = restaurantId;
    return this;
  }

  setOrderType(type: OrderType): OrderBuilder {
    this.orderData.orderType = type;
    return this;
  }

  addItem(menuItem: MenuItem, quantity: number, customizations?: ItemCustomizations): OrderBuilder {
    if (!this.orderData.items) {
      this.orderData.items = [];
    }

    const item: OrderItem = {
      menuItemId: menuItem.id,
      quantity,
      price: menuItem.price,
      selectedVariant: customizations?.variant,
      selectedModifiers: customizations?.modifiers || [],
      specialInstructions: customizations?.instructions,
      itemTotal: this.calculateItemTotal(menuItem, quantity, customizations)
    };

    this.orderData.items.push(item);
    return this;
  }

  setCustomer(customerInfo: CustomerInfo): OrderBuilder {
    this.orderData.customerInfo = customerInfo;
    return this;
  }

  setDeliveryAddress(address: DeliveryAddress): OrderBuilder {
    this.orderData.deliveryAddress = address;
    return this;
  }

  setPaymentMethod(method: PaymentMethod): OrderBuilder {
    this.orderData.paymentMethod = method;
    return this;
  }

  schedule(datetime: Date): OrderBuilder {
    this.orderData.scheduledFor = datetime.toISOString();
    return this;
  }

  private calculateItemTotal(menuItem: MenuItem, quantity: number, customizations?: ItemCustomizations): number {
    let total = menuItem.price;
    
    if (customizations?.variant) {
      total = customizations.variant.price;
    }
    
    if (customizations?.modifiers) {
      const modifierTotal = customizations.modifiers.reduce((sum, group) => {
        return sum + group.options.reduce((optionSum, option) => optionSum + option.price, 0);
      }, 0);
      total += modifierTotal;
    }
    
    return total * quantity;
  }

  build(): CreateOrderData {
    if (!this.orderData.items?.length) {
      throw new Error('Order must have at least one item');
    }

    const subtotal = this.orderData.items.reduce((sum, item) => sum + item.itemTotal, 0);
    const tax = subtotal * 0.08; // 8% tax
    const deliveryFee = this.orderData.orderType === 'delivery' ? 2.99 : 0;
    const total = subtotal + tax + deliveryFee + (this.orderData.tip || 0);

    return {
      ...this.orderData,
      subtotal,
      tax,
      deliveryFee,
      total
    } as CreateOrderData;
  }
}

// Usage example
const order = new OrderBuilder()
  .setRestaurant('restaurant-uuid')
  .setOrderType('delivery')
  .addItem(margheritaPizza, 2, {
    variant: mediumSize,
    modifiers: [{ groupId: 'toppings', options: [extraCheese] }]
  })
  .setCustomer({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123'
  })
  .setDeliveryAddress({
    street: '456 Oak Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001'
  })
  .setPaymentMethod('card')
  .build();
```

### Python Example

```python
import requests
from typing import Dict, List, Any, Optional
from datetime import datetime
import json

class OrderAPI:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }

    def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/orders',
            headers=self.headers,
            json=order_data
        )
        response.raise_for_status()
        return response.json()['data']['order']

    def get_order(self, order_id: str) -> Dict[str, Any]:
        response = requests.get(
            f'{self.base_url}/api/orders/{order_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['data']['order']

    def update_order_status(self, order_id: str, status: str, 
                          estimated_ready_time: Optional[str] = None,
                          notes: Optional[str] = None) -> Dict[str, Any]:
        data = {
            'orderId': order_id,
            'status': status
        }
        if estimated_ready_time:
            data['estimatedReadyTime'] = estimated_ready_time
        if notes:
            data['notes'] = notes
            
        response = requests.post(
            f'{self.base_url}/api/orders/update-status',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()['order']

    def track_order(self, order_id_or_number: str) -> Dict[str, Any]:
        response = requests.get(
            f'{self.base_url}/api/orders/track/{order_id_or_number}'
        )
        response.raise_for_status()
        return response.json()['data']['tracking']

    def get_orders(self, restaurant_id: str, **filters) -> Dict[str, Any]:
        params = {'restaurantId': restaurant_id, **filters}
        response = requests.get(
            f'{self.base_url}/api/orders',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()['data']

    def cancel_order(self, order_id: str, reason: str, note: Optional[str] = None):
        data = {'reason': reason}
        if note:
            data['note'] = note
            
        response = requests.post(
            f'{self.base_url}/api/orders/cancel/{order_id}',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()['data']['order']
```

## Rate Limits

| Endpoint | Authenticated | Guest/Public |
|----------|---------------|--------------|
| Create order | 30/minute | 10/minute |
| Get order details | 100/minute | 20/minute |
| Update status | 60/minute | Not allowed |
| Track order | N/A | 60/minute |
| List orders | 100/minute | Not allowed |
| Cancel/Refund | 10/minute | 5/minute |