# Restaurant Management API

The Restaurant Management API provides endpoints for creating, updating, and managing restaurant profiles, settings, and operational data.

## Base Endpoints

```
GET    /api/restaurants              # List restaurants
POST   /api/restaurants              # Create restaurant
GET    /api/restaurants/{id}         # Get restaurant details
PATCH  /api/restaurants/{id}         # Update restaurant
DELETE /api/restaurants/{id}         # Delete restaurant (admin only)
GET    /api/restaurants/{id}/stats   # Get restaurant analytics
```

## Authentication

All restaurant management endpoints require authentication. Users can only access restaurants they own or manage, except for public restaurant information.

**Required Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

## List Restaurants

Get a list of restaurants. Results depend on user permissions.

**Endpoint:** `GET /api/restaurants`

**Query Parameters:**
- `status` (string, optional): Filter by status ("active", "inactive", "pending", "suspended")
- `search` (string, optional): Search restaurants by name, email, or subdomain
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `sort` (string, optional): Sort by field ("name", "created_at", "updated_at") 
- `order` (string, optional): Sort order ("asc", "desc", default: "desc")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "restaurants": [
      {
        "id": "restaurant-uuid",
        "name": "Mario's Pizza",
        "slug": "marios-pizza",
        "subdomain": "marios-pizza",
        "description": "Authentic Italian pizza since 1985",
        "email": "contact@mariospizza.com",
        "phone": "+1-555-0123",
        "website": "https://mariospizza.com",
        "logo": "https://storage.url/logo.jpg",
        "banner": "https://storage.url/banner.jpg",
        "address": {
          "street": "123 Main Street",
          "city": "New York",
          "state": "NY",
          "zipCode": "10001",
          "country": "US"
        },
        "coordinates": {
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "timezone": "America/New_York",
        "currency": "USD",
        "taxRate": 8.25,
        "status": "active",
        "isAcceptingOrders": true,
        "operatingHours": {
          "monday": { "open": "11:00", "close": "22:00" },
          "tuesday": { "open": "11:00", "close": "22:00" },
          "wednesday": { "open": "11:00", "close": "22:00" },
          "thursday": { "open": "11:00", "close": "22:00" },
          "friday": { "open": "11:00", "close": "23:00" },
          "saturday": { "open": "11:00", "close": "23:00" },
          "sunday": { "open": "12:00", "close": "21:00" }
        },
        "deliverySettings": {
          "enabled": true,
          "fee": 2.99,
          "freeDeliveryMinimum": 25.00,
          "estimatedDeliveryTime": 30,
          "deliveryRadius": 5.0
        },
        "pickupSettings": {
          "enabled": true,
          "estimatedPickupTime": 15
        },
        "paymentMethods": ["card", "cash", "apple_pay", "google_pay"],
        "features": ["online_ordering", "delivery", "pickup", "reservations"],
        "subscriptionTier": "premium",
        "subscriptionStatus": "active",
        "stripeConnectAccountId": "acct_xxx",
        "isStripeConnectEnabled": true,
        "ownerId": "owner-uuid",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

## Create Restaurant

Create a new restaurant profile.

**Endpoint:** `POST /api/restaurants`

**Request Body:**
```json
{
  "name": "Mario's Pizza",
  "subdomain": "marios-pizza",
  "description": "Authentic Italian pizza since 1985",
  "email": "contact@mariospizza.com",
  "phone": "+1-555-0123",
  "website": "https://mariospizza.com",
  "address": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "timezone": "America/New_York",
  "currency": "USD",
  "taxRate": 8.25,
  "operatingHours": {
    "monday": { "open": "11:00", "close": "22:00" },
    "tuesday": { "open": "11:00", "close": "22:00" },
    "wednesday": { "open": "11:00", "close": "22:00" },
    "thursday": { "open": "11:00", "close": "22:00" },
    "friday": { "open": "11:00", "close": "23:00" },
    "saturday": { "open": "11:00", "close": "23:00" },
    "sunday": { "open": "12:00", "close": "21:00" }
  },
  "deliverySettings": {
    "enabled": true,
    "fee": 2.99,
    "freeDeliveryMinimum": 25.00,
    "estimatedDeliveryTime": 30,
    "deliveryRadius": 5.0
  },
  "pickupSettings": {
    "enabled": true,
    "estimatedPickupTime": 15
  },
  "subscriptionTier": "basic"
}
```

**Request Schema:**
- `name` (string, required): Restaurant name (1-100 chars)
- `subdomain` (string, required): Unique subdomain (3-50 chars, lowercase, no spaces)
- `description` (string, optional): Restaurant description (max 500 chars)
- `email` (string, required): Contact email
- `phone` (string, required): Contact phone number
- `website` (string, optional): Restaurant website URL
- `address` (object, required): Physical address
  - `street` (string, required): Street address
  - `city` (string, required): City name
  - `state` (string, required): State/province
  - `zipCode` (string, required): ZIP/postal code
  - `country` (string, required): Country code (ISO 3166-1 alpha-2)
- `coordinates` (object, optional): GPS coordinates
  - `latitude` (number): Latitude (-90 to 90)
  - `longitude` (number): Longitude (-180 to 180)
- `timezone` (string, required): IANA timezone identifier
- `currency` (string, required): Currency code (ISO 4217)
- `taxRate` (number, required): Tax rate as percentage (0-50)
- `operatingHours` (object, required): Weekly operating hours
- `deliverySettings` (object, optional): Delivery configuration
- `pickupSettings` (object, optional): Pickup configuration
- `subscriptionTier` (enum): "basic" | "premium" | "enterprise"

**Response (201):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      // Full restaurant object with generated fields
      "id": "restaurant-uuid",
      "slug": "marios-pizza",
      "status": "pending",
      "isAcceptingOrders": false,
      "ownerId": "current-user-uuid",
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  },
  "message": "Restaurant created successfully"
}
```

**Error Responses:**

*Subdomain Already Taken (409):*
```json
{
  "success": false,
  "error": "Subdomain 'marios-pizza' is already taken",
  "code": "SUBDOMAIN_TAKEN"
}
```

*Validation Error (400):*
```json
{
  "success": false,
  "error": "Invalid request data",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "taxRate",
      "message": "Tax rate must be between 0 and 50",
      "code": "out_of_range"
    }
  ]
}
```

## Get Restaurant Details

Get detailed information about a specific restaurant.

**Endpoint:** `GET /api/restaurants/{id}`

**Path Parameters:**
- `id` (string, required): Restaurant UUID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      // Complete restaurant object including:
      "id": "restaurant-uuid",
      "name": "Mario's Pizza",
      // ... all fields from restaurant model
      "menuCategories": [
        {
          "id": "category-uuid",
          "name": "Pizzas",
          "description": "Traditional and specialty pizzas",
          "sortOrder": 1,
          "isActive": true
        }
      ],
      "stats": {
        "totalOrders": 1250,
        "totalRevenue": 28500.00,
        "averageOrderValue": 22.80,
        "menuItemsCount": 45,
        "lastOrderAt": "2024-01-15T11:30:00.000Z"
      }
    }
  }
}
```

## Update Restaurant

Update restaurant information.

**Endpoint:** `PATCH /api/restaurants/{id}`

**Path Parameters:**
- `id` (string, required): Restaurant UUID

**Request Body:** (Partial update - include only fields to update)
```json
{
  "name": "Mario's Authentic Pizza",
  "description": "Updated description",
  "isAcceptingOrders": true,
  "operatingHours": {
    "monday": { "open": "10:00", "close": "23:00" }
  },
  "deliverySettings": {
    "fee": 3.49,
    "freeDeliveryMinimum": 30.00
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      // Updated restaurant object
    }
  },
  "message": "Restaurant updated successfully"
}
```

## Restaurant Analytics

Get comprehensive analytics for a restaurant.

**Endpoint:** `GET /api/restaurants/{id}/stats`

**Path Parameters:**
- `id` (string, required): Restaurant UUID

**Query Parameters:**
- `period` (string, optional): Time period ("today", "week", "month", "quarter", "year", default: "month")
- `startDate` (string, optional): Start date (ISO 8601)
- `endDate` (string, optional): End date (ISO 8601)
- `metrics` (array, optional): Specific metrics to include

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.000Z",
    "summary": {
      "totalOrders": 342,
      "totalRevenue": 7890.50,
      "averageOrderValue": 23.07,
      "uniqueCustomers": 198,
      "repeatCustomers": 84,
      "customerRetentionRate": 42.42,
      "completionRate": 96.2,
      "cancellationRate": 3.8,
      "averagePreparationTime": "18 minutes"
    },
    "revenueBreakdown": {
      "food": 6513.25,
      "delivery": 492.85,
      "tax": 651.33,
      "tips": 233.07
    },
    "ordersByStatus": {
      "completed": 329,
      "cancelled": 13,
      "refunded": 0
    },
    "ordersByType": {
      "delivery": 201,
      "pickup": 127,
      "dine_in": 14
    },
    "topMenuItems": [
      {
        "id": "item-uuid",
        "name": "Margherita Pizza",
        "orders": 89,
        "revenue": 1245.50
      },
      {
        "id": "item-uuid-2",
        "name": "Pepperoni Pizza",
        "orders": 76,
        "revenue": 1064.00
      }
    ],
    "peakHours": [
      { "hour": 12, "orders": 28 },
      { "hour": 18, "orders": 34 },
      { "hour": 19, "orders": 42 }
    ],
    "dailyTrends": [
      {
        "date": "2024-01-01",
        "orders": 12,
        "revenue": 276.50,
        "averageOrderValue": 23.04
      }
      // ... more daily data
    ],
    "customerSatisfaction": {
      "averageRating": 4.3,
      "totalReviews": 156,
      "ratingDistribution": {
        "5": 89,
        "4": 41,
        "3": 18,
        "2": 6,
        "1": 2
      }
    }
  }
}
```

## Advanced Restaurant Operations

### Toggle Order Acceptance

**Endpoint:** `PATCH /api/restaurants/{id}/toggle-orders`

**Request Body:**
```json
{
  "isAcceptingOrders": false,
  "reason": "Kitchen maintenance"
}
```

### Update Operating Hours

**Endpoint:** `PATCH /api/restaurants/{id}/hours`

**Request Body:**
```json
{
  "operatingHours": {
    "monday": { "open": "11:00", "close": "22:00" },
    "tuesday": { "open": "11:00", "close": "22:00" }
  },
  "temporaryHours": {
    "date": "2024-01-15",
    "open": "12:00",
    "close": "20:00",
    "reason": "Staff meeting"
  }
}
```

### Upload Restaurant Images

**Endpoint:** `POST /api/restaurants/{id}/images`

**Request Body:** (multipart/form-data)
```
logo: <file>
banner: <file>
gallery: <file>
gallery: <file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "images": {
      "logo": "https://storage.url/logo-new.jpg",
      "banner": "https://storage.url/banner-new.jpg",
      "gallery": [
        "https://storage.url/gallery-1.jpg",
        "https://storage.url/gallery-2.jpg"
      ]
    }
  }
}
```

## Public Restaurant Data

Some restaurant information is publicly accessible without authentication.

**Endpoint:** `GET /api/public/restaurants/{subdomain}`

**Path Parameters:**
- `subdomain` (string, required): Restaurant subdomain

**Response (200):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "id": "restaurant-uuid",
      "name": "Mario's Pizza",
      "subdomain": "marios-pizza",
      "description": "Authentic Italian pizza since 1985",
      "logo": "https://storage.url/logo.jpg",
      "banner": "https://storage.url/banner.jpg",
      "address": {
        "street": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001"
      },
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "phone": "+1-555-0123",
      "website": "https://mariospizza.com",
      "operatingHours": { /* operating hours */ },
      "deliverySettings": { /* delivery settings */ },
      "pickupSettings": { /* pickup settings */ },
      "paymentMethods": ["card", "cash", "apple_pay"],
      "features": ["online_ordering", "delivery", "pickup"],
      "isAcceptingOrders": true,
      "status": "active",
      "averageRating": 4.3,
      "totalReviews": 156,
      "estimatedDeliveryTime": "25-35 minutes",
      "minimumOrderAmount": 10.00
    }
  }
}
```

## Error Handling

### Common Error Responses

**Restaurant Not Found (404):**
```json
{
  "success": false,
  "error": "Restaurant not found",
  "code": "RESTAURANT_NOT_FOUND"
}
```

**Insufficient Permissions (403):**
```json
{
  "success": false,
  "error": "You don't have permission to access this restaurant",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**Subscription Required (402):**
```json
{
  "success": false,
  "error": "This feature requires a premium subscription",
  "code": "SUBSCRIPTION_REQUIRED"
}
```

## Code Examples

### JavaScript/TypeScript

**Restaurant Management Class:**
```typescript
class RestaurantAPI {
  constructor(private apiClient: APIClient) {}

  async getRestaurants(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.apiClient.get(`/api/restaurants?${params}`);
    return response.data;
  }

  async createRestaurant(restaurantData: CreateRestaurantRequest) {
    const response = await this.apiClient.post('/api/restaurants', restaurantData);
    return response.data.restaurant;
  }

  async updateRestaurant(id: string, updates: Partial<RestaurantData>) {
    const response = await this.apiClient.patch(`/api/restaurants/${id}`, updates);
    return response.data.restaurant;
  }

  async getRestaurantStats(id: string, options?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value);
        }
      });
    }

    const response = await this.apiClient.get(
      `/api/restaurants/${id}/stats?${params}`
    );
    return response.data;
  }

  async toggleOrderAcceptance(id: string, isAccepting: boolean, reason?: string) {
    const response = await this.apiClient.patch(
      `/api/restaurants/${id}/toggle-orders`,
      { isAcceptingOrders: isAccepting, reason }
    );
    return response.data;
  }
}
```

**React Hook for Restaurant Management:**
```typescript
import { useState, useEffect } from 'react';

export function useRestaurant(restaurantId: string) {
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (restaurantId) {
      loadRestaurant();
    }
  }, [restaurantId]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      setError(null);

      const [restaurantResponse, statsResponse] = await Promise.all([
        fetch(`/api/restaurants/${restaurantId}`),
        fetch(`/api/restaurants/${restaurantId}/stats`)
      ]);

      if (!restaurantResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load restaurant data');
      }

      const restaurantData = await restaurantResponse.json();
      const statsData = await statsResponse.json();

      setRestaurant(restaurantData.data.restaurant);
      setStats(statsData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurant = async (updates: Partial<RestaurantData>) => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update restaurant');
      }

      const data = await response.json();
      setRestaurant(data.data.restaurant);
      return data.data.restaurant;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleOrders = async (isAccepting: boolean, reason?: string) => {
    return updateRestaurant({ isAcceptingOrders: isAccepting });
  };

  return {
    restaurant,
    stats,
    loading,
    error,
    updateRestaurant,
    toggleOrders,
    refetch: loadRestaurant,
  };
}
```

### Python Example

```python
import requests
from typing import Optional, Dict, Any

class RestaurantAPI:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }

    def get_restaurants(self, status: Optional[str] = None, 
                       search: Optional[str] = None,
                       page: int = 1, limit: int = 20) -> Dict[str, Any]:
        params = {'page': page, 'limit': limit}
        if status:
            params['status'] = status
        if search:
            params['search'] = search
            
        response = requests.get(
            f'{self.base_url}/api/restaurants',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()['data']

    def create_restaurant(self, restaurant_data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/restaurants',
            headers=self.headers,
            json=restaurant_data
        )
        response.raise_for_status()
        return response.json()['data']['restaurant']

    def get_restaurant_stats(self, restaurant_id: str, 
                           period: str = 'month') -> Dict[str, Any]:
        response = requests.get(
            f'{self.base_url}/api/restaurants/{restaurant_id}/stats',
            headers=self.headers,
            params={'period': period}
        )
        response.raise_for_status()
        return response.json()['data']
```

## Rate Limits

| Endpoint | Authenticated | Unauthenticated |
|----------|---------------|-----------------|
| List restaurants | 60/minute | 20/minute |
| Get restaurant details | 100/minute | 50/minute |
| Create restaurant | 5/minute | Not allowed |
| Update restaurant | 30/minute | Not allowed |
| Restaurant stats | 30/minute | Not allowed |
| Public restaurant data | N/A | 100/minute |