# Authentication API

The Restaurant SaaS platform supports multiple authentication methods to accommodate different use cases from restaurant staff management to guest checkout experiences.

## Authentication Methods

1. **Session-based Authentication** - Standard login/register flow
2. **Magic Link Authentication** - Passwordless authentication
3. **Guest Sessions** - Anonymous checkout for customers
4. **OAuth Callback** - Third-party authentication integration

## Base Endpoint

All authentication endpoints are under:
```
POST /api/auth
GET /api/auth
```

## Session-based Authentication

### Login

Authenticate a user with email and password.

**Endpoint:** `POST /api/auth`

**Request Body:**
```json
{
  "action": "login",
  "email": "user@example.com",
  "password": "userpassword",
  "rememberMe": true,
  "restaurantId": "optional-restaurant-uuid"
}
```

**Request Schema:**
- `action` (string, required): Must be "login"
- `email` (string, required): Valid email address
- `password` (string, required): User's password
- `rememberMe` (boolean, optional): Extend session duration
- `restaurantId` (string, optional): Associate session with specific restaurant

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "restaurant_owner",
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z",
    "lastLoginAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Error Responses:**

*Invalid Credentials (401):*
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

*Rate Limited (429):*
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again later."
}
```

*User Inactive (403):*
```json
{
  "success": false,
  "error": "Account is inactive. Please contact support."
}
```

### Register

Create a new user account.

**Endpoint:** `POST /api/auth`

**Request Body:**
```json
{
  "action": "register",
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "role": "restaurant_owner",
  "restaurantName": "John's Restaurant",
  "subdomain": "johns-restaurant"
}
```

**Request Schema:**
- `action` (string, required): Must be "register"
- `firstName` (string, required): User's first name
- `lastName` (string, required): User's last name
- `email` (string, required): Valid email address
- `password` (string, required): Password (min 8 chars, must include uppercase, lowercase, number, special char)
- `confirmPassword` (string, required): Must match password
- `role` (enum, optional): "restaurant_owner" | "customer" (default: "customer")
- `restaurantName` (string, conditional): Required if role is "restaurant_owner"
- `subdomain` (string, conditional): Required if role is "restaurant_owner" (min 3 chars)

**Response (200):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "restaurant_owner",
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Error Responses:**

*Email Already Exists (409):*
```json
{
  "success": false,
  "error": "An account with this email already exists"
}
```

*Subdomain Taken (409):*
```json
{
  "success": false,
  "error": "This subdomain is already taken"
}
```

*Validation Error (400):*
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": [
    {
      "code": "too_small",
      "minimum": 8,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Password must be at least 8 characters",
      "path": ["password"]
    }
  ]
}
```

### Logout

End the current user session.

**Endpoint:** `POST /api/auth`

**Request Body:**
```json
{
  "action": "logout"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Check Session Status

Get the current authenticated user's information.

**Endpoint:** `GET /api/auth`

**Headers:**
```
Authorization: Bearer <session-token>
```

**Response (200) - Authenticated:**
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "restaurant_owner",
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z",
    "lastLoginAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Response (200) - Not Authenticated:**
```json
{
  "success": true,
  "authenticated": false,
  "user": null
}
```

## Magic Link Authentication

Send a passwordless authentication link via email.

**Endpoint:** `POST /api/auth`

**Request Body:**
```json
{
  "action": "magic-link",
  "email": "user@example.com",
  "purpose": "login",
  "restaurantId": "optional-restaurant-uuid"
}
```

**Request Schema:**
- `action` (string, required): Must be "magic-link"
- `email` (string, required): Valid email address
- `purpose` (enum, optional): "login" | "signup" (default: "login")
- `restaurantId` (string, optional): Associate with specific restaurant

**Response (200):**
```json
{
  "success": true,
  "message": "Magic link sent to your email address."
}
```

**Magic Link Format:**
```
https://your-domain.com/auth/magic?token=<magic-link-token>
```

**Rate Limiting:** 3 requests per 10 minutes per email address.

## Password Reset

### Request Password Reset

**Endpoint:** `POST /api/auth`

**Request Body:**
```json
{
  "action": "reset-password",
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### Update Password with Reset Token

**Endpoint:** `POST /api/auth`

**Request Body:**
```json
{
  "action": "update-password",
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

## Guest Sessions

Create an anonymous session for guest checkout.

**Endpoint:** `POST /api/auth`

**Request Body:**
```json
{
  "action": "guest-session",
  "restaurantId": "restaurant-uuid"
}
```

**Request Schema:**
- `action` (string, required): Must be "guest-session"
- `restaurantId` (string, required): Restaurant UUID for the guest session

**Response (200):**
```json
{
  "success": true,
  "guestSession": {
    "cartId": "cart-uuid",
    "restaurantId": "restaurant-uuid"
  }
}
```

## OAuth Callback

Handle third-party authentication callbacks (Google, Apple, etc.).

**Endpoint:** `GET /api/auth/callback`

**Query Parameters:**
- `provider` (string): OAuth provider name
- `code` (string): Authorization code from provider
- `state` (string): State parameter for security

This endpoint handles the OAuth flow and redirects to the appropriate page with session cookies set.

## Guest Status Check

Check if the current session is a guest session.

**Endpoint:** `GET /api/auth/guest-status`

**Response (200):**
```json
{
  "success": true,
  "isGuest": true,
  "guestSession": {
    "cartId": "cart-uuid",
    "restaurantId": "restaurant-uuid",
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

## User Roles and Permissions

### Role Hierarchy
1. **super_admin** - Platform administrator
2. **platform_admin** - Platform management
3. **restaurant_owner** - Restaurant owner
4. **restaurant_admin** - Restaurant administrator
5. **staff** - Restaurant staff member
6. **customer** - Regular customer

### Permission Scopes
- **restaurant:manage** - Full restaurant management
- **menu:edit** - Edit menu items and categories
- **orders:manage** - Manage order status and details
- **staff:manage** - Manage staff members
- **analytics:view** - View restaurant analytics
- **payments:manage** - Manage payment settings

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Registration | 3 attempts | 15 minutes |
| Magic Link | 3 requests | 10 minutes |
| Password Reset | 3 requests | 15 minutes |
| General Auth | 10 requests | 1 minute |

Rate limits are applied per IP address for unauthenticated requests and per user for authenticated requests.

## Security Features

### Session Management
- Secure HTTP-only cookies
- CSRF protection
- Session rotation on login
- Automatic session cleanup

### Password Security
- Minimum 8 characters
- Must include uppercase, lowercase, number, and special character
- Password hashing with bcrypt
- Password history prevention

### Additional Security
- Rate limiting on all endpoints
- IP-based blocking for suspicious activity
- Email verification required for new accounts
- Two-factor authentication support (coming soon)

## Code Examples

### JavaScript/TypeScript

**Login Function:**
```typescript
async function login(email: string, password: string, rememberMe: boolean = false) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'login',
      email,
      password,
      rememberMe,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.user;
}
```

**Session Check:**
```typescript
async function checkSession() {
  const response = await fetch('/api/auth', {
    method: 'GET',
    credentials: 'include', // Include cookies
  });

  const data = await response.json();
  return data.authenticated ? data.user : null;
}
```

**Guest Session:**
```typescript
async function createGuestSession(restaurantId: string) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'guest-session',
      restaurantId,
    }),
  });

  const data = await response.json();
  return data.guestSession;
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth', {
        credentials: 'include',
      });
      const data = await response.json();
      setUser(data.authenticated ? data.user : null);
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'login',
        email,
        password,
      }),
    });

    const data = await response.json();
    if (data.success) {
      setUser(data.user);
    } else {
      throw new Error(data.error);
    }
  };

  const logout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'logout' }),
    });
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    logout,
    checkSession,
  };
}
```

## Error Handling Best Practices

Always handle authentication errors gracefully:

```typescript
try {
  const user = await login(email, password);
  // Handle successful login
} catch (error) {
  switch (error.message) {
    case 'Invalid email or password':
      // Show invalid credentials message
      break;
    case 'Too many login attempts. Please try again later.':
      // Show rate limit message
      break;
    case 'Account is inactive. Please contact support.':
      // Show account inactive message
      break;
    default:
      // Show generic error message
  }
}
```