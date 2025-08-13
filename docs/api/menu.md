# Menu Management API

The Menu Management API provides comprehensive endpoints for managing restaurant menus, including categories, items, modifiers, pricing, and image uploads.

## Base Endpoints

```
GET    /api/menu                     # Get menu structure
POST   /api/menu/categories          # Create menu category
PATCH  /api/menu/categories/{id}     # Update category
DELETE /api/menu/categories/{id}     # Delete category
POST   /api/menu/items               # Create menu item
PATCH  /api/menu/items/{id}          # Update menu item
DELETE /api/menu/items/{id}          # Delete menu item
POST   /api/menu/upload              # Upload menu images
GET    /api/menu/public/{subdomain}  # Get public menu
```

## Authentication

Most menu management endpoints require authentication and restaurant ownership/management permissions.

**Required Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Get Menu Structure

Retrieve the complete menu structure for a restaurant.

**Endpoint:** `GET /api/menu`

**Query Parameters:**
- `restaurantId` (string, required): Restaurant UUID
- `includeInactive` (boolean, optional): Include inactive items (default: false)
- `categoryId` (string, optional): Filter by specific category

**Response (200):**
```json
{
  "success": true,
  "data": {
    "menu": {
      "restaurantId": "restaurant-uuid",
      "restaurantName": "Mario's Pizza",
      "categories": [
        {
          "id": "category-uuid",
          "name": "Pizzas",
          "description": "Traditional and specialty pizzas",
          "imageUrl": "https://storage.url/category-image.jpg",
          "sortOrder": 1,
          "isActive": true,
          "createdAt": "2024-01-01T00:00:00.000Z",
          "items": [
            {
              "id": "item-uuid",
              "name": "Margherita Pizza",
              "description": "Fresh mozzarella, tomato sauce, and basil",
              "price": 14.99,
              "images": [
                "https://storage.url/margherita-1.jpg",
                "https://storage.url/margherita-2.jpg"
              ],
              "categoryId": "category-uuid",
              "isActive": true,
              "isAvailable": true,
              "prepTime": 15,
              "calories": 320,
              "allergens": ["gluten", "dairy"],
              "dietaryInfo": ["vegetarian"],
              "spiceLevel": 0,
              "tags": ["popular", "classic"],
              "variants": [
                {
                  "id": "variant-uuid",
                  "name": "Small",
                  "price": 12.99,
                  "isDefault": false
                },
                {
                  "id": "variant-uuid-2",
                  "name": "Medium",
                  "price": 14.99,
                  "isDefault": true
                },
                {
                  "id": "variant-uuid-3",
                  "name": "Large",
                  "price": 17.99,
                  "isDefault": false
                }
              ],
              "modifiers": [
                {
                  "id": "modifier-group-uuid",
                  "name": "Extra Toppings",
                  "type": "multiple",
                  "required": false,
                  "maxSelections": 5,
                  "options": [
                    {
                      "id": "option-uuid",
                      "name": "Extra Cheese",
                      "price": 2.00,
                      "isDefault": false
                    },
                    {
                      "id": "option-uuid-2",
                      "name": "Pepperoni",
                      "price": 2.50,
                      "isDefault": false
                    }
                  ]
                }
              ],
              "sortOrder": 1,
              "createdAt": "2024-01-01T00:00:00.000Z",
              "updatedAt": "2024-01-15T12:00:00.000Z"
            }
          ]
        }
      ],
      "lastUpdated": "2024-01-15T12:00:00.000Z"
    }
  }
}
```

## Menu Categories

### Create Menu Category

Create a new menu category.

**Endpoint:** `POST /api/menu/categories`

**Request Body:**
```json
{
  "restaurantId": "restaurant-uuid",
  "name": "Appetizers",
  "description": "Start your meal with our delicious appetizers",
  "imageUrl": "https://storage.url/appetizers-category.jpg",
  "sortOrder": 1,
  "isActive": true
}
```

**Request Schema:**
- `restaurantId` (string, required): Restaurant UUID
- `name` (string, required): Category name (1-100 chars)
- `description` (string, optional): Category description (max 500 chars)
- `imageUrl` (string, optional): Category image URL
- `sortOrder` (number, required): Display order (positive integer)
- `isActive` (boolean, optional): Category visibility (default: true)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "category-uuid",
      "restaurantId": "restaurant-uuid",
      "name": "Appetizers",
      "description": "Start your meal with our delicious appetizers",
      "imageUrl": "https://storage.url/appetizers-category.jpg",
      "sortOrder": 1,
      "isActive": true,
      "itemCount": 0,
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  },
  "message": "Category created successfully"
}
```

### Update Menu Category

Update an existing menu category.

**Endpoint:** `PATCH /api/menu/categories/{id}`

**Path Parameters:**
- `id` (string, required): Category UUID

**Request Body:** (Partial update)
```json
{
  "name": "Starters & Appetizers",
  "description": "Updated description",
  "sortOrder": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "category": {
      // Updated category object
    }
  },
  "message": "Category updated successfully"
}
```

### Delete Menu Category

Delete a menu category and optionally move items to another category.

**Endpoint:** `DELETE /api/menu/categories/{id}`

**Path Parameters:**
- `id` (string, required): Category UUID

**Query Parameters:**
- `moveItemsTo` (string, optional): UUID of category to move items to

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "deletedCategoryId": "category-uuid",
    "movedItemsCount": 5,
    "movedToCategoryId": "target-category-uuid"
  }
}
```

## Menu Items

### Create Menu Item

Create a new menu item.

**Endpoint:** `POST /api/menu/items`

**Request Body:**
```json
{
  "restaurantId": "restaurant-uuid",
  "categoryId": "category-uuid",
  "name": "Caesar Salad",
  "description": "Crisp romaine lettuce, parmesan cheese, croutons, and caesar dressing",
  "price": 12.99,
  "images": [
    "https://storage.url/caesar-salad-1.jpg",
    "https://storage.url/caesar-salad-2.jpg"
  ],
  "isActive": true,
  "isAvailable": true,
  "prepTime": 10,
  "calories": 280,
  "allergens": ["dairy", "eggs"],
  "dietaryInfo": ["vegetarian"],
  "spiceLevel": 0,
  "tags": ["healthy", "fresh"],
  "variants": [
    {
      "name": "Regular",
      "price": 12.99,
      "isDefault": true
    },
    {
      "name": "Large",
      "price": 16.99,
      "isDefault": false
    }
  ],
  "modifiers": [
    {
      "name": "Protein Add-ons",
      "type": "single",
      "required": false,
      "maxSelections": 1,
      "options": [
        {
          "name": "Grilled Chicken",
          "price": 4.00,
          "isDefault": false
        },
        {
          "name": "Grilled Shrimp",
          "price": 6.00,
          "isDefault": false
        }
      ]
    }
  ],
  "sortOrder": 1
}
```

**Request Schema:**
- `restaurantId` (string, required): Restaurant UUID
- `categoryId` (string, required): Category UUID
- `name` (string, required): Item name (1-100 chars)
- `description` (string, required): Item description (max 1000 chars)
- `price` (number, required): Base price (min 0.01)
- `images` (array, optional): Array of image URLs (max 5)
- `isActive` (boolean, optional): Item visibility (default: true)
- `isAvailable` (boolean, optional): Item availability (default: true)
- `prepTime` (number, optional): Preparation time in minutes
- `calories` (number, optional): Calorie count
- `allergens` (array, optional): Array of allergen strings
- `dietaryInfo` (array, optional): Dietary information (vegetarian, vegan, gluten-free, etc.)
- `spiceLevel` (number, optional): Spice level 0-5 (default: 0)
- `tags` (array, optional): Item tags for filtering
- `variants` (array, optional): Price variants (sizes, etc.)
- `modifiers` (array, optional): Modifier groups
- `sortOrder` (number, required): Display order

**Modifier Schema:**
- `name` (string, required): Modifier group name
- `type` (enum, required): "single" | "multiple"
- `required` (boolean, required): Whether selection is required
- `maxSelections` (number, optional): Maximum selections for multiple type
- `options` (array, required): Modifier options
  - `name` (string, required): Option name
  - `price` (number, required): Additional price (can be 0)
  - `isDefault` (boolean, optional): Default selection

**Response (201):**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "item-uuid",
      // Complete item object with generated IDs for variants/modifiers
      "variants": [
        {
          "id": "variant-uuid",
          "name": "Regular",
          "price": 12.99,
          "isDefault": true
        }
      ],
      "modifiers": [
        {
          "id": "modifier-group-uuid",
          "name": "Protein Add-ons",
          "type": "single",
          "required": false,
          "maxSelections": 1,
          "options": [
            {
              "id": "option-uuid",
              "name": "Grilled Chicken",
              "price": 4.00,
              "isDefault": false
            }
          ]
        }
      ],
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  },
  "message": "Menu item created successfully"
}
```

### Update Menu Item

Update an existing menu item.

**Endpoint:** `PATCH /api/menu/items/{id}`

**Path Parameters:**
- `id` (string, required): Item UUID

**Request Body:** (Partial update)
```json
{
  "name": "Classic Caesar Salad",
  "price": 13.99,
  "isAvailable": false,
  "tags": ["healthy", "fresh", "bestseller"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "item": {
      // Updated item object
    }
  },
  "message": "Menu item updated successfully"
}
```

### Delete Menu Item

Delete a menu item.

**Endpoint:** `DELETE /api/menu/items/{id}`

**Path Parameters:**
- `id` (string, required): Item UUID

**Response (200):**
```json
{
  "success": true,
  "message": "Menu item deleted successfully",
  "data": {
    "deletedItemId": "item-uuid"
  }
}
```

## Image Upload

Upload images for menu categories or items.

**Endpoint:** `POST /api/menu/upload`

**Request Body:** (multipart/form-data)
```
file: <image-file>
type: "category" | "item"
```

**File Requirements:**
- **Max Size:** 2MB
- **Formats:** JPEG, PNG, WebP
- **Recommended Dimensions:** 800x600px (4:3 ratio)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.supabase.co/menu-images/item/uuid.jpg",
    "fileName": "item/uuid.jpg",
    "size": 245760,
    "type": "image/jpeg"
  }
}
```

**Error Responses:**

*File Too Large (400):*
```json
{
  "success": false,
  "error": "File too large. Maximum size is 2MB",
  "code": "FILE_TOO_LARGE"
}
```

*Invalid File Type (400):*
```json
{
  "success": false,
  "error": "Invalid file type. Only JPEG, PNG, and WebP are allowed",
  "code": "INVALID_FILE_TYPE"
}
```

## Public Menu Access

Get public menu data for customer-facing applications.

**Endpoint:** `GET /api/menu/public/{subdomain}`

**Path Parameters:**
- `subdomain` (string, required): Restaurant subdomain

**Query Parameters:**
- `categoryId` (string, optional): Filter by category
- `available` (boolean, optional): Only available items (default: true)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "menu": {
      "restaurant": {
        "id": "restaurant-uuid",
        "name": "Mario's Pizza",
        "subdomain": "marios-pizza",
        "logo": "https://storage.url/logo.jpg",
        "isAcceptingOrders": true,
        "minimumOrderAmount": 10.00,
        "estimatedDeliveryTime": "25-35 minutes"
      },
      "categories": [
        {
          "id": "category-uuid",
          "name": "Pizzas",
          "description": "Traditional and specialty pizzas",
          "imageUrl": "https://storage.url/category.jpg",
          "sortOrder": 1,
          "items": [
            // Only active and available items
            {
              "id": "item-uuid",
              "name": "Margherita Pizza",
              "description": "Fresh mozzarella, tomato sauce, and basil",
              "price": 14.99,
              "images": ["https://storage.url/margherita.jpg"],
              "prepTime": 15,
              "calories": 320,
              "allergens": ["gluten", "dairy"],
              "dietaryInfo": ["vegetarian"],
              "spiceLevel": 0,
              "tags": ["popular", "classic"],
              "variants": [
                {
                  "id": "variant-uuid",
                  "name": "Medium",
                  "price": 14.99,
                  "isDefault": true
                }
              ],
              "modifiers": [
                {
                  "id": "modifier-group-uuid",
                  "name": "Extra Toppings",
                  "type": "multiple",
                  "required": false,
                  "maxSelections": 5,
                  "options": [
                    {
                      "id": "option-uuid",
                      "name": "Extra Cheese",
                      "price": 2.00
                    }
                  ]
                }
              ],
              "sortOrder": 1
            }
          ]
        }
      ],
      "lastUpdated": "2024-01-15T12:00:00.000Z"
    }
  }
}
```

## Bulk Operations

### Bulk Update Item Availability

**Endpoint:** `PATCH /api/menu/items/bulk-availability`

**Request Body:**
```json
{
  "itemIds": ["item-uuid-1", "item-uuid-2", "item-uuid-3"],
  "isAvailable": false,
  "reason": "Out of stock"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updatedCount": 3,
    "updatedItems": ["item-uuid-1", "item-uuid-2", "item-uuid-3"]
  },
  "message": "3 items updated successfully"
}
```

### Bulk Update Pricing

**Endpoint:** `PATCH /api/menu/items/bulk-pricing`

**Request Body:**
```json
{
  "categoryId": "category-uuid",
  "priceAdjustment": {
    "type": "percentage", // "percentage" | "fixed"
    "value": 10 // 10% increase or $10 increase
  }
}
```

### Import Menu from CSV

**Endpoint:** `POST /api/menu/import`

**Request Body:** (multipart/form-data)
```
file: <csv-file>
restaurantId: <restaurant-uuid>
```

**CSV Format:**
```csv
category,name,description,price,allergens,dietary_info
Pizzas,Margherita,Fresh mozzarella and basil,14.99,"gluten,dairy",vegetarian
Pizzas,Pepperoni,Classic pepperoni pizza,16.99,"gluten,dairy",
```

## Menu Analytics

### Item Performance

**Endpoint:** `GET /api/menu/analytics/items`

**Query Parameters:**
- `restaurantId` (string, required): Restaurant UUID
- `period` (string, optional): "week", "month", "quarter" (default: "month")
- `sortBy` (string, optional): "orders", "revenue", "rating" (default: "orders")

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "items": [
      {
        "id": "item-uuid",
        "name": "Margherita Pizza",
        "categoryName": "Pizzas",
        "totalOrders": 89,
        "totalRevenue": 1334.11,
        "averageOrderQuantity": 1.2,
        "averageRating": 4.5,
        "profitMargin": 68.5,
        "trendDirection": "up"
      }
    ]
  }
}
```

## Search and Filtering

### Search Menu Items

**Endpoint:** `GET /api/menu/search`

**Query Parameters:**
- `restaurantId` (string, required): Restaurant UUID
- `q` (string, required): Search query
- `category` (string, optional): Filter by category ID
- `dietaryInfo` (array, optional): Filter by dietary information
- `allergens` (array, optional): Exclude items with these allergens
- `maxPrice` (number, optional): Maximum price filter
- `minPrice` (number, optional): Minimum price filter

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "pizza",
    "results": [
      {
        "id": "item-uuid",
        "name": "Margherita Pizza",
        "description": "Fresh mozzarella, tomato sauce, and basil",
        "price": 14.99,
        "categoryName": "Pizzas",
        "match_score": 0.95,
        "images": ["https://storage.url/margherita.jpg"]
      }
    ],
    "totalResults": 12,
    "categories": [
      {
        "id": "category-uuid",
        "name": "Pizzas",
        "matchCount": 8
      }
    ]
  }
}
```

## Code Examples

### JavaScript/TypeScript

**Menu Management Class:**
```typescript
interface MenuAPIClient {
  getMenu(restaurantId: string, options?: GetMenuOptions): Promise<Menu>;
  createCategory(categoryData: CreateCategoryData): Promise<MenuCategory>;
  createItem(itemData: CreateItemData): Promise<MenuItem>;
  updateItem(itemId: string, updates: Partial<MenuItem>): Promise<MenuItem>;
  uploadImage(file: File, type: 'category' | 'item'): Promise<ImageUploadResult>;
}

class MenuAPI implements MenuAPIClient {
  constructor(private apiClient: APIClient) {}

  async getMenu(restaurantId: string, options: GetMenuOptions = {}) {
    const params = new URLSearchParams({
      restaurantId,
      ...options
    });

    const response = await this.apiClient.get(`/api/menu?${params}`);
    return response.data.menu;
  }

  async createCategory(categoryData: CreateCategoryData) {
    const response = await this.apiClient.post('/api/menu/categories', categoryData);
    return response.data.category;
  }

  async createItem(itemData: CreateItemData) {
    const response = await this.apiClient.post('/api/menu/items', itemData);
    return response.data.item;
  }

  async updateItem(itemId: string, updates: Partial<MenuItem>) {
    const response = await this.apiClient.patch(`/api/menu/items/${itemId}`, updates);
    return response.data.item;
  }

  async uploadImage(file: File, type: 'category' | 'item') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await this.apiClient.post('/api/menu/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async bulkUpdateAvailability(itemIds: string[], isAvailable: boolean, reason?: string) {
    const response = await this.apiClient.patch('/api/menu/items/bulk-availability', {
      itemIds,
      isAvailable,
      reason
    });
    return response.data;
  }
}
```

**React Hook for Menu Management:**
```typescript
import { useState, useEffect } from 'react';

export function useMenu(restaurantId: string) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const menuAPI = new MenuAPI(apiClient);

  useEffect(() => {
    if (restaurantId) {
      loadMenu();
    }
  }, [restaurantId]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const menuData = await menuAPI.getMenu(restaurantId);
      setMenu(menuData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (categoryData: CreateCategoryData) => {
    const newCategory = await menuAPI.createCategory({
      ...categoryData,
      restaurantId
    });
    
    setMenu(prev => prev ? {
      ...prev,
      categories: [...prev.categories, newCategory].sort((a, b) => a.sortOrder - b.sortOrder)
    } : null);
    
    return newCategory;
  };

  const addItem = async (itemData: CreateItemData) => {
    const newItem = await menuAPI.createItem({
      ...itemData,
      restaurantId
    });

    setMenu(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        categories: prev.categories.map(category => 
          category.id === itemData.categoryId
            ? { ...category, items: [...category.items, newItem] }
            : category
        )
      };
    });

    return newItem;
  };

  const updateItemAvailability = async (itemId: string, isAvailable: boolean) => {
    await menuAPI.updateItem(itemId, { isAvailable });
    
    setMenu(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        categories: prev.categories.map(category => ({
          ...category,
          items: category.items.map(item =>
            item.id === itemId ? { ...item, isAvailable } : item
          )
        }))
      };
    });
  };

  return {
    menu,
    loading,
    error,
    addCategory,
    addItem,
    updateItemAvailability,
    refetch: loadMenu
  };
}
```

### Python Example

```python
import requests
from typing import List, Dict, Any, Optional
import json

class MenuAPI:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }

    def get_menu(self, restaurant_id: str, include_inactive: bool = False) -> Dict[str, Any]:
        params = {
            'restaurantId': restaurant_id,
            'includeInactive': include_inactive
        }
        
        response = requests.get(
            f'{self.base_url}/api/menu',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()['data']['menu']

    def create_category(self, category_data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/menu/categories',
            headers=self.headers,
            json=category_data
        )
        response.raise_for_status()
        return response.json()['data']['category']

    def create_item(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/menu/items',
            headers=self.headers,
            json=item_data
        )
        response.raise_for_status()
        return response.json()['data']['item']

    def upload_image(self, file_path: str, image_type: str) -> Dict[str, Any]:
        files = {'file': open(file_path, 'rb')}
        data = {'type': image_type}
        
        # Remove Content-Type for multipart uploads
        headers = {k: v for k, v in self.headers.items() if k != 'Content-Type'}
        
        response = requests.post(
            f'{self.base_url}/api/menu/upload',
            headers=headers,
            files=files,
            data=data
        )
        response.raise_for_status()
        return response.json()['data']

    def bulk_update_availability(self, item_ids: List[str], 
                               is_available: bool, reason: Optional[str] = None):
        data = {
            'itemIds': item_ids,
            'isAvailable': is_available
        }
        if reason:
            data['reason'] = reason
            
        response = requests.patch(
            f'{self.base_url}/api/menu/items/bulk-availability',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()['data']
```

## Error Handling

### Common Error Responses

**Menu Item Not Found (404):**
```json
{
  "success": false,
  "error": "Menu item not found",
  "code": "ITEM_NOT_FOUND"
}
```

**Category Has Items (409):**
```json
{
  "success": false,
  "error": "Cannot delete category with items. Move items first or specify moveItemsTo parameter.",
  "code": "CATEGORY_HAS_ITEMS"
}
```

**Invalid Modifier Configuration (400):**
```json
{
  "success": false,
  "error": "Invalid modifier configuration",
  "code": "INVALID_MODIFIER",
  "details": {
    "modifierGroup": "Extra Toppings",
    "issue": "Multiple type modifier group must have maxSelections > 1"
  }
}
```

## Rate Limits

| Endpoint | Authenticated | Description |
|----------|---------------|-------------|
| Get menu | 100/minute | Read operations |
| Create/Update items | 30/minute | Write operations |
| Image upload | 10/minute | File uploads |
| Bulk operations | 5/minute | Bulk updates |
| Search | 60/minute | Search queries |