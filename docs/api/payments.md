# Payments API

The Payments API handles payment processing, Stripe Connect integration, payment intents, confirmations, and webhook events for the restaurant SaaS platform.

## Base Endpoints

```
POST   /api/stripe/create-payment-intent    # Create payment intent
POST   /api/stripe/confirm-payment          # Confirm payment
POST   /api/stripe/webhook                  # Stripe webhook handler
GET    /api/stripe/connect/status           # Stripe Connect status
POST   /api/stripe/connect/onboard          # Start Stripe onboarding
POST   /api/payments/refund                 # Process refund
GET    /api/payments/methods                # Get saved payment methods
POST   /api/payments/methods                # Save payment method
```

## Authentication

Payment endpoints support different authentication levels:
- **Create Payment Intent**: Guest session or authenticated user
- **Stripe Connect**: Restaurant owner authentication required
- **Webhooks**: Stripe signature verification
- **Saved Payment Methods**: User authentication required

## Create Payment Intent

Create a Stripe payment intent for order processing.

**Endpoint:** `POST /api/stripe/create-payment-intent`

**Authentication:** Optional (supports guest checkout)

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "restaurantId": "restaurant-uuid",
  "amount": 44.69,
  "currency": "usd",
  "customerEmail": "john@example.com",
  "customerName": "John Doe",
  "customerPhone": "+1-555-0123",
  "items": [
    {
      "id": "item-uuid",
      "name": "Margherita Pizza",
      "price": 14.99,
      "quantity": 2
    }
  ],
  "savePaymentMethod": true,
  "metadata": {
    "orderType": "delivery",
    "specialInstructions": "Ring doorbell twice"
  }
}
```

**Request Schema:**
- `orderId` (string, optional): Existing order UUID
- `restaurantId` (string, required): Restaurant UUID
- `amount` (number, required): Payment amount in dollars (min: $0.50)
- `currency` (string, optional): Currency code (default: "usd")
- `customerEmail` (string, required): Customer email address
- `customerName` (string, required): Customer full name
- `customerPhone` (string, optional): Customer phone number
- `items` (array, optional): Order items for metadata
  - `id` (string): Item identifier
  - `name` (string): Item name
  - `price` (number): Item price
  - `quantity` (number): Item quantity
- `savePaymentMethod` (boolean, optional): Save payment method for future use
- `metadata` (object, optional): Additional metadata

**Response (201):**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_1234567890abcdef",
    "clientSecret": "pi_1234567890abcdef_secret_xyz",
    "customerId": "cus_abcdef123456",
    "platformFee": 1.34,
    "amount": 44.69,
    "currency": "usd"
  }
}
```

**Response Fields:**
- `paymentIntentId` (string): Stripe payment intent ID
- `clientSecret` (string): Client secret for Stripe.js
- `customerId` (string): Stripe customer ID
- `platformFee` (number): Platform fee amount
- `amount` (number): Total payment amount
- `currency` (string): Payment currency

**Error Responses:**

*Restaurant Not Found (404):*
```json
{
  "success": false,
  "error": "Restaurant not found",
  "code": "RESTAURANT_NOT_FOUND"
}
```

*Restaurant Inactive (400):*
```json
{
  "success": false,
  "error": "Restaurant is not currently active",
  "code": "RESTAURANT_INACTIVE"
}
```

*Payment Not Setup (400):*
```json
{
  "success": false,
  "error": "Restaurant payment processing not set up",
  "code": "PAYMENT_NOT_SETUP"
}
```

*Order Amount Mismatch (400):*
```json
{
  "success": false,
  "error": "Payment amount does not match order total",
  "code": "AMOUNT_MISMATCH"
}
```

## Confirm Payment

Confirm a payment after client-side processing.

**Endpoint:** `POST /api/stripe/confirm-payment`

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890abcdef",
  "orderId": "order-uuid",
  "customerInfo": {
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+1-555-0123"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentIntent": {
      "id": "pi_1234567890abcdef",
      "status": "succeeded",
      "amount": 4469,
      "currency": "usd",
      "created": 1705334400
    },
    "order": {
      "id": "order-uuid",
      "status": "confirmed",
      "paymentStatus": "paid",
      "total": 44.69
    }
  },
  "message": "Payment confirmed successfully"
}
```

## Stripe Webhook Handler

Handle Stripe webhook events for payment processing.

**Endpoint:** `POST /api/stripe/webhook`

**Headers:**
```
Stripe-Signature: t=timestamp,v1=signature
```

**Supported Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.requires_action`
- `account.updated` (Connect accounts)
- `capability.updated` (Connect capabilities)
- `charge.dispute.created`

**Webhook Processing:**
```json
{
  "id": "evt_1234567890abcdef",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890abcdef",
      "status": "succeeded",
      "amount": 4469,
      "metadata": {
        "orderId": "order-uuid",
        "restaurantId": "restaurant-uuid"
      }
    }
  }
}
```

**Response (200):**
```json
{
  "received": true
}
```

## Stripe Connect Status

Get the current Stripe Connect status for a restaurant.

**Endpoint:** `GET /api/stripe/connect/status`

**Authentication:** Required (restaurant owner/staff)

**Query Parameters:**
- `restaurantId` (string, required): Restaurant UUID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "complete",
    "accountId": "acct_1234567890abcdef",
    "capabilities": {
      "card_payments": "active",
      "transfers": "active"
    },
    "requirements": {
      "currently_due": [],
      "eventually_due": [],
      "past_due": []
    },
    "payouts_enabled": true,
    "charges_enabled": true,
    "details_submitted": true,
    "country": "US",
    "default_currency": "usd",
    "business_profile": {
      "name": "Mario's Pizza",
      "support_email": "support@mariospizza.com",
      "support_phone": "+1-555-0123"
    }
  }
}
```

**Status Values:**
- `not_started`: No Connect account created
- `pending`: Account created, onboarding in progress
- `complete`: Fully onboarded and active
- `restricted`: Account restricted or suspended

## Start Stripe Connect Onboarding

Initiate Stripe Connect onboarding for a restaurant.

**Endpoint:** `POST /api/stripe/connect/onboard`

**Authentication:** Required (restaurant owner)

**Request Body:**
```json
{
  "restaurantId": "restaurant-uuid",
  "businessType": "individual",
  "country": "US",
  "returnUrl": "https://yourapp.com/dashboard/payments/complete",
  "refreshUrl": "https://yourapp.com/dashboard/payments/setup"
}
```

**Request Schema:**
- `restaurantId` (string, required): Restaurant UUID
- `businessType` (enum, optional): "individual" | "company" (default: "individual")
- `country` (string, required): Country code (ISO 3166-1 alpha-2)
- `returnUrl` (string, required): URL to redirect after completion
- `refreshUrl` (string, required): URL to redirect if user needs to restart

**Response (201):**
```json
{
  "success": true,
  "data": {
    "accountId": "acct_1234567890abcdef",
    "onboardingUrl": "https://connect.stripe.com/setup/s/acct_123/xyz",
    "returnUrl": "https://yourapp.com/dashboard/payments/complete",
    "expiresAt": "2024-01-16T18:30:00.000Z"
  }
}
```

## Process Refund

Process a refund for a completed payment.

**Endpoint:** `POST /api/payments/refund`

**Authentication:** Required (restaurant owner/staff)

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890abcdef",
  "amount": 44.69,
  "reason": "requested_by_customer",
  "orderId": "order-uuid",
  "metadata": {
    "refundReason": "Food quality issue",
    "processedBy": "staff-uuid"
  }
}
```

**Request Schema:**
- `paymentIntentId` (string, required): Stripe payment intent ID
- `amount` (number, optional): Refund amount (defaults to full amount)
- `reason` (enum, required): Refund reason
  - "duplicate", "fraudulent", "requested_by_customer"
- `orderId` (string, required): Associated order UUID
- `metadata` (object, optional): Additional refund metadata

**Response (200):**
```json
{
  "success": true,
  "data": {
    "refund": {
      "id": "re_1234567890abcdef",
      "amount": 4469,
      "currency": "usd",
      "reason": "requested_by_customer",
      "status": "succeeded",
      "created": 1705334400
    },
    "order": {
      "id": "order-uuid",
      "status": "refunded",
      "refundAmount": 44.69
    }
  },
  "message": "Refund processed successfully"
}
```

## Saved Payment Methods

### Get Saved Payment Methods

Get customer's saved payment methods.

**Endpoint:** `GET /api/payments/methods`

**Authentication:** Required (customer)

**Query Parameters:**
- `customerId` (string, optional): Stripe customer ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentMethods": [
      {
        "id": "pm_1234567890abcdef",
        "type": "card",
        "card": {
          "brand": "visa",
          "last4": "4242",
          "exp_month": 12,
          "exp_year": 2025,
          "funding": "credit"
        },
        "billing_details": {
          "address": {
            "city": "New York",
            "country": "US",
            "line1": "123 Main Street",
            "postal_code": "10001",
            "state": "NY"
          },
          "email": "john@example.com",
          "name": "John Doe",
          "phone": "+1-555-0123"
        },
        "created": 1705334400
      }
    ],
    "hasMore": false,
    "totalCount": 1
  }
}
```

### Save Payment Method

Save a payment method for future use.

**Endpoint:** `POST /api/payments/methods`

**Authentication:** Required (customer)

**Request Body:**
```json
{
  "paymentMethodId": "pm_1234567890abcdef",
  "customerId": "cus_abcdef123456",
  "setAsDefault": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "paymentMethod": {
      "id": "pm_1234567890abcdef",
      "isDefault": true,
      "saved": true
    }
  },
  "message": "Payment method saved successfully"
}
```

## Payment Analytics

### Restaurant Payment Analytics

**Endpoint:** `GET /api/payments/analytics`

**Authentication:** Required (restaurant owner/staff)

**Query Parameters:**
- `restaurantId` (string, required): Restaurant UUID
- `period` (string, optional): "day", "week", "month", "quarter", "year"
- `startDate` (string, optional): Custom date range start
- `endDate` (string, optional): Custom date range end

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "period": "month",
      "summary": {
        "totalRevenue": 28965.50,
        "totalTransactions": 1248,
        "averageTransactionAmount": 23.21,
        "totalRefunds": 892.45,
        "refundRate": 3.08,
        "platformFees": 1157.82,
        "netRevenue": 27807.68
      },
      "paymentMethods": {
        "card": 1089,
        "apple_pay": 89,
        "google_pay": 45,
        "cash": 25
      },
      "trends": [
        {
          "date": "2024-01-01",
          "revenue": 876.50,
          "transactions": 38,
          "averageAmount": 23.07
        }
        // ... more daily data
      ],
      "topCustomers": [
        {
          "customerId": "cus_abcdef123456",
          "email": "john@example.com",
          "totalSpent": 456.78,
          "orderCount": 18
        }
      ]
    }
  }
}
```

## Error Handling

### Payment Processing Errors

**Payment Failed (402):**
```json
{
  "success": false,
  "error": "Your card was declined",
  "code": "CARD_DECLINED",
  "details": {
    "decline_code": "insufficient_funds",
    "type": "card_error"
  }
}
```

**3D Secure Required (402):**
```json
{
  "success": false,
  "error": "Additional authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "details": {
    "type": "authentication_required",
    "next_action": {
      "type": "use_stripe_sdk",
      "use_stripe_sdk": {
        "type": "three_d_secure_redirect",
        "stripe_js": "https://js.stripe.com/v3/..."
      }
    }
  }
}
```

**Stripe Connect Errors:**

*Account Not Ready (400):*
```json
{
  "success": false,
  "error": "Stripe Connect account is not ready to accept payments",
  "code": "CONNECT_ACCOUNT_NOT_READY",
  "details": {
    "requirements": {
      "currently_due": ["business_type", "tos_acceptance.date"]
    }
  }
}
```

*Payout Failed (400):*
```json
{
  "success": false,
  "error": "Unable to transfer funds to restaurant account",
  "code": "PAYOUT_FAILED",
  "details": {
    "reason": "account_closed"
  }
}
```

## Security Features

### Payment Security
- PCI DSS compliant through Stripe
- Client-side tokenization
- Server-side payment confirmation
- Webhook signature verification

### Fraud Prevention
- Stripe Radar fraud detection
- Address verification (AVS)
- CVC verification
- 3D Secure authentication

### Connect Account Security
- Restaurant bank account verification
- Identity verification requirements
- Regular capability monitoring
- Automatic account updates

## Code Examples

### JavaScript/TypeScript

**Payment Processing Class:**
```typescript
interface PaymentAPIClient {
  createPaymentIntent(paymentData: CreatePaymentIntentData): Promise<PaymentIntentResult>;
  confirmPayment(paymentIntentId: string, orderId: string): Promise<PaymentConfirmationResult>;
  processRefund(refundData: RefundData): Promise<RefundResult>;
  getConnectStatus(restaurantId: string): Promise<ConnectStatus>;
  startConnectOnboarding(onboardingData: ConnectOnboardingData): Promise<OnboardingResult>;
}

class PaymentAPI implements PaymentAPIClient {
  constructor(private apiClient: APIClient) {}

  async createPaymentIntent(paymentData: CreatePaymentIntentData): Promise<PaymentIntentResult> {
    const response = await this.apiClient.post('/api/stripe/create-payment-intent', paymentData);
    return response.data;
  }

  async confirmPayment(paymentIntentId: string, orderId: string): Promise<PaymentConfirmationResult> {
    const response = await this.apiClient.post('/api/stripe/confirm-payment', {
      paymentIntentId,
      orderId
    });
    return response.data;
  }

  async processRefund(refundData: RefundData): Promise<RefundResult> {
    const response = await this.apiClient.post('/api/payments/refund', refundData);
    return response.data;
  }

  async getConnectStatus(restaurantId: string): Promise<ConnectStatus> {
    const response = await this.apiClient.get('/api/stripe/connect/status', {
      params: { restaurantId }
    });
    return response.data;
  }

  async startConnectOnboarding(onboardingData: ConnectOnboardingData): Promise<OnboardingResult> {
    const response = await this.apiClient.post('/api/stripe/connect/onboard', onboardingData);
    return response.data;
  }
}
```

**React Hook for Stripe Payments:**
```typescript
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function useStripePayment() {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentAPI = new PaymentAPI(apiClient);

  const processPayment = async (orderData: OrderData): Promise<PaymentResult> => {
    if (!stripe || !elements) {
      throw new Error('Stripe not loaded');
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const { paymentIntentId, clientSecret } = await paymentAPI.createPaymentIntent({
        restaurantId: orderData.restaurantId,
        amount: orderData.total,
        customerEmail: orderData.customerInfo.email,
        customerName: orderData.customerInfo.name,
        items: orderData.items
      });

      // Get card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: orderData.customerInfo.name,
              email: orderData.customerInfo.email,
              phone: orderData.customerInfo.phone
            }
          }
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on backend
        await paymentAPI.confirmPayment(paymentIntentId, orderData.orderId);
        
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        };
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const processApplePay = async (orderData: OrderData): Promise<PaymentResult> => {
    if (!stripe) {
      throw new Error('Stripe not loaded');
    }

    // Create payment intent
    const { paymentIntentId, clientSecret } = await paymentAPI.createPaymentIntent({
      restaurantId: orderData.restaurantId,
      amount: orderData.total,
      customerEmail: orderData.customerInfo.email,
      customerName: orderData.customerInfo.name,
      items: orderData.items
    });

    // Process Apple Pay
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        payment_method_data: {
          type: 'apple_pay'
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (paymentIntent?.status === 'succeeded') {
      await paymentAPI.confirmPayment(paymentIntentId, orderData.orderId);
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    }

    throw new Error('Payment failed');
  };

  return {
    processPayment,
    processApplePay,
    processing,
    error,
    clearError: () => setError(null)
  };
}

// Stripe Connect Hook
export function useStripeConnect(restaurantId: string) {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  const paymentAPI = new PaymentAPI(apiClient);

  useEffect(() => {
    loadConnectStatus();
  }, [restaurantId]);

  const loadConnectStatus = async () => {
    try {
      setLoading(true);
      const status = await paymentAPI.getConnectStatus(restaurantId);
      setConnectStatus(status);
    } catch (error) {
      console.error('Failed to load Connect status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async (businessType: 'individual' | 'company' = 'individual') => {
    const result = await paymentAPI.startConnectOnboarding({
      restaurantId,
      businessType,
      country: 'US',
      returnUrl: `${window.location.origin}/dashboard/payments/complete`,
      refreshUrl: `${window.location.origin}/dashboard/payments/setup`
    });

    // Redirect to Stripe onboarding
    window.location.href = result.data.onboardingUrl;
  };

  return {
    connectStatus,
    loading,
    startOnboarding,
    refetch: loadConnectStatus
  };
}
```

**Payment Form Component:**
```typescript
import React from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface PaymentFormProps {
  orderData: OrderData;
  onPaymentComplete: (result: PaymentResult) => void;
  onPaymentError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  orderData,
  onPaymentComplete,
  onPaymentError
}) => {
  const { processPayment, processing, error } = useStripePayment();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const result = await processPayment(orderData);
      onPaymentComplete(result);
    } catch (err) {
      onPaymentError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="card-element-container">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <button
        type="submit"
        disabled={processing}
        className="pay-button"
      >
        {processing ? 'Processing...' : `Pay $${orderData.total.toFixed(2)}`}
      </button>
    </form>
  );
};

export default PaymentForm;
```

### Python Example

```python
import requests
import stripe
from typing import Dict, Any, Optional

class PaymentAPI:
    def __init__(self, base_url: str, auth_token: str, stripe_secret_key: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        stripe.api_key = stripe_secret_key

    def create_payment_intent(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/stripe/create-payment-intent',
            headers=self.headers,
            json=payment_data
        )
        response.raise_for_status()
        return response.json()['data']

    def process_refund(self, payment_intent_id: str, amount: Optional[float] = None,
                      reason: str = 'requested_by_customer',
                      order_id: Optional[str] = None) -> Dict[str, Any]:
        refund_data = {
            'paymentIntentId': payment_intent_id,
            'reason': reason
        }
        if amount is not None:
            refund_data['amount'] = amount
        if order_id:
            refund_data['orderId'] = order_id

        response = requests.post(
            f'{self.base_url}/api/payments/refund',
            headers=self.headers,
            json=refund_data
        )
        response.raise_for_status()
        return response.json()['data']

    def get_connect_status(self, restaurant_id: str) -> Dict[str, Any]:
        response = requests.get(
            f'{self.base_url}/api/stripe/connect/status',
            headers=self.headers,
            params={'restaurantId': restaurant_id}
        )
        response.raise_for_status()
        return response.json()['data']

    def webhook_handler(self, payload: str, sig_header: str, webhook_secret: str):
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            
            if event['type'] == 'payment_intent.succeeded':
                self.handle_payment_success(event['data']['object'])
            elif event['type'] == 'payment_intent.payment_failed':
                self.handle_payment_failure(event['data']['object'])
            
            return {'received': True}
        except ValueError:
            # Invalid payload
            raise ValueError("Invalid payload")
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            raise ValueError("Invalid signature")

    def handle_payment_success(self, payment_intent):
        order_id = payment_intent['metadata'].get('orderId')
        if order_id:
            # Update order status to confirmed
            print(f"Payment succeeded for order {order_id}")

    def handle_payment_failure(self, payment_intent):
        order_id = payment_intent['metadata'].get('orderId')
        if order_id:
            # Handle failed payment
            print(f"Payment failed for order {order_id}")
```

## Webhook Configuration

### Setting Up Webhooks

1. **Create Webhook Endpoint** in Stripe Dashboard:
   - URL: `https://yourapp.com/api/stripe/webhook`
   - Events: Select relevant payment events

2. **Configure Webhook Secret**:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

3. **Test Webhooks**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### Webhook Security

- **Signature Verification**: Always verify webhook signatures
- **Idempotency**: Handle duplicate webhook deliveries
- **Timeout Handling**: Respond within 20 seconds
- **Retry Logic**: Implement exponential backoff for failed webhooks

## Rate Limits

| Endpoint | Authenticated | Guest/Public |
|----------|---------------|--------------|
| Create payment intent | 30/minute | 10/minute |
| Confirm payment | 60/minute | 20/minute |
| Process refund | 10/minute | Not allowed |
| Connect status | 60/minute | Not allowed |
| Connect onboarding | 5/minute | Not allowed |
| Webhooks | No limit | N/A |

## Testing

### Test Cards

**Successful Payments:**
- `4242424242424242` - Visa
- `4000000000003220` - 3D Secure required
- `5555555555554444` - Mastercard

**Failed Payments:**
- `4000000000000002` - Card declined
- `4000000000009995` - Insufficient funds
- `4000000000009987` - Lost card

### Test Connect Accounts

Use Stripe's test Connect accounts for testing restaurant onboarding:
- Individual accounts: Complete with test SSN `000-00-0000`
- Company accounts: Complete with test EIN `00-0000000`