# Restaurant SaaS API Documentation

Welcome to the Restaurant SaaS platform API documentation. This comprehensive guide covers all available endpoints, authentication methods, request/response formats, and implementation examples.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
6. [Webhooks](#webhooks)
7. [SDKs & Libraries](#sdks--libraries)
8. [Changelog](#changelog)

## Getting Started

### Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

### API Version
Current API version: `v1.0.0`

All API endpoints are prefixed with `/api/` and follow RESTful conventions.

### Content Type
All requests should include:
```
Content-Type: application/json
```

### Response Format
All API responses follow this standard format:

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details (optional)
  }
}
```

## Authentication

The Restaurant SaaS API supports multiple authentication methods:

1. **Session-based Authentication** (Web applications)
2. **Magic Link Authentication** (Passwordless)
3. **Guest Sessions** (Anonymous checkout)

See [Authentication Documentation](./api/authentication.md) for detailed implementation.

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per authenticated user
- **Guest endpoints**: 20 requests per minute per IP
- **File uploads**: 10 requests per minute per user

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | User must be authenticated |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `RATE_LIMITED` | Too many requests |
| `PAYMENT_REQUIRED` | Payment or subscription required |
| `MAINTENANCE_MODE` | System under maintenance |

## API Endpoints

### Core Endpoints

| Category | Documentation |
|----------|---------------|
| **Authentication** | [Authentication API](./api/authentication.md) |
| **Restaurants** | [Restaurant Management](./api/restaurants.md) |
| **Menu Management** | [Menu API](./api/menu.md) |
| **Order Processing** | [Orders API](./api/orders.md) |
| **Payments** | [Payment Processing](./api/payments.md) |
| **Webhooks** | [Webhook Events](./api/webhooks.md) |

### Quick Reference

#### Authentication
- `POST /api/auth` - Login/Register/Logout
- `GET /api/auth` - Check session status
- `POST /api/auth/guest-session` - Create guest session

#### Restaurants
- `GET /api/restaurants` - List restaurants
- `POST /api/restaurants` - Create restaurant
- `PATCH /api/restaurants/{id}` - Update restaurant
- `GET /api/restaurants/{id}/stats` - Restaurant analytics

#### Menu Management
- `GET /api/menu` - Get menu items
- `POST /api/menu/items` - Create menu item
- `PATCH /api/menu/items/{id}` - Update menu item
- `POST /api/menu/upload` - Upload menu image

#### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `POST /api/orders/update-status` - Update order status
- `GET /api/orders/track/{id}` - Track order progress

#### Payments
- `POST /api/stripe/create-payment-intent` - Create payment
- `POST /api/stripe/confirm-payment` - Confirm payment
- `GET /api/stripe/connect/status` - Get Stripe Connect status

## Request Examples

### cURL Examples

**Create Order:**
```bash
curl -X POST https://your-domain.com/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "restaurantId": "uuid-here",
    "items": [
      {
        "menuItemId": "item-uuid",
        "quantity": 2,
        "customizations": {
          "spiceLevel": "medium"
        }
      }
    ],
    "customerInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  }'
```

**Update Order Status:**
```bash
curl -X POST https://your-domain.com/api/orders/update-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "order-uuid",
    "status": "preparing",
    "estimatedReadyTime": "2024-01-15T14:30:00Z"
  }'
```

### JavaScript Examples

**Initialize API Client:**
```javascript
class RestaurantAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  // Authentication
  async login(email, password) {
    return this.request('/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        email,
        password,
      }),
    });
  }

  // Orders
  async createOrder(orderData) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  // Payments
  async createPaymentIntent(paymentData) {
    return this.request('/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }
}

// Usage
const api = new RestaurantAPI('https://your-domain.com', 'your-token');

try {
  const order = await api.createOrder({
    restaurantId: 'uuid-here',
    items: [/* order items */],
    customerInfo: {/* customer details */}
  });
  console.log('Order created:', order);
} catch (error) {
  console.error('Error creating order:', error.message);
}
```

## Webhooks

The platform supports webhook events for real-time updates. See [Webhook Documentation](./api/webhooks.md) for:

- Event types and payloads
- Webhook signature verification
- Retry policies
- Testing webhooks

## SDKs & Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@restaurant-saas/js-sdk`
- **Node.js**: `@restaurant-saas/node-sdk`
- **React Hooks**: `@restaurant-saas/react-hooks`

### Community SDKs

- **Python**: `restaurant-saas-python` (Community maintained)
- **PHP**: `restaurant-saas-php` (Community maintained)

## Testing

### Postman Collection

Import our [Postman Collection](./postman/restaurant-saas-api.json) for easy API testing.

### Test Environment

```
Base URL: https://api-test.your-domain.com
Test API Key: test_sk_...
```

## Support

- **Documentation Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **API Support**: support@your-domain.com
- **Status Page**: https://status.your-domain.com

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Authentication endpoints
- Restaurant management
- Menu management
- Order processing
- Payment integration
- Webhook support

---

For detailed endpoint documentation, please refer to the specific API documentation files linked above.