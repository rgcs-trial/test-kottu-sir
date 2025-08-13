import {
  Heading,
  Text,
  Section,
  Row,
  Column,
  Img,
} from "@react-email/components";
import { BaseEmailLayout, EmailButton, EmailCard, EmailDivider } from "../../../components/email/base-layout";
import { formatCurrency, formatDateTime, OrderEmailData } from "../react-email-config";

export interface OrderConfirmationProps extends OrderEmailData {
  restaurantLogo?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  pickupTime?: string;
  deliveryFee?: number;
  tax?: number;
  tip?: number;
  paymentMethod?: string;
  specialInstructions?: string;
}

export default function OrderConfirmationEmail({
  orderId,
  customerName,
  restaurantName,
  orderTotal,
  orderItems,
  restaurantLogo,
  restaurantAddress,
  restaurantPhone,
  trackingUrl,
  estimatedDeliveryTime,
  pickupTime,
  deliveryFee = 0,
  tax = 0,
  tip = 0,
  paymentMethod = "Card",
  specialInstructions,
}: OrderConfirmationProps) {
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseEmailLayout
      preview={`Order confirmation #${orderId} from ${restaurantName}`}
      title="Order Confirmed!"
    >
      {/* Success Message */}
      <Section className="text-center mb-8">
        <Img
          src={`${baseUrl}/icons/success.png`}
          width="64"
          height="64"
          alt="Success"
          className="mx-auto mb-4"
        />
        <Heading className="text-3xl font-bold text-green-600 mb-2">
          Order Confirmed!
        </Heading>
        <Text className="text-lg text-gray-600">
          Hi {customerName}, your order has been confirmed and sent to the restaurant.
        </Text>
      </Section>

      {/* Order Summary Card */}
      <EmailCard>
        <Row>
          <Column>
            <Heading className="text-xl font-semibold text-gray-900 mb-4">
              Order Summary
            </Heading>
          </Column>
          <Column align="right">
            <Text className="text-sm text-gray-500">
              Order #{orderId}
            </Text>
          </Column>
        </Row>

        {/* Restaurant Info */}
        <Section className="mb-6">
          <Row>
            {restaurantLogo && (
              <Column width="60">
                <Img
                  src={restaurantLogo}
                  width="50"
                  height="50"
                  alt={restaurantName}
                  className="rounded-lg"
                />
              </Column>
            )}
            <Column>
              <Heading className="text-lg font-semibold text-gray-900 m-0">
                {restaurantName}
              </Heading>
              {restaurantAddress && (
                <Text className="text-sm text-gray-600 mt-1">
                  {restaurantAddress}
                </Text>
              )}
              {restaurantPhone && (
                <Text className="text-sm text-gray-600">
                  {restaurantPhone}
                </Text>
              )}
            </Column>
          </Row>
        </Section>

        <EmailDivider />

        {/* Order Items */}
        <Section className="mb-6">
          <Heading className="text-lg font-semibold text-gray-900 mb-4">
            Order Details
          </Heading>
          
          {orderItems.map((item, index) => (
            <Row key={index} className="mb-4">
              <Column width="60%" valign="top">
                <Text className="font-medium text-gray-900 mb-1">
                  {item.quantity}x {item.name}
                </Text>
                {item.modifiers && item.modifiers.length > 0 && (
                  <Text className="text-sm text-gray-600">
                    {item.modifiers.join(", ")}
                  </Text>
                )}
              </Column>
              <Column width="40%" align="right" valign="top">
                <Text className="font-medium text-gray-900">
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </Column>
            </Row>
          ))}
        </Section>

        <EmailDivider />

        {/* Order Total Breakdown */}
        <Section className="mb-6">
          <Row className="mb-2">
            <Column>
              <Text className="text-gray-600">Subtotal</Text>
            </Column>
            <Column align="right">
              <Text className="text-gray-900">{formatCurrency(subtotal)}</Text>
            </Column>
          </Row>
          
          {deliveryFee > 0 && (
            <Row className="mb-2">
              <Column>
                <Text className="text-gray-600">Delivery Fee</Text>
              </Column>
              <Column align="right">
                <Text className="text-gray-900">{formatCurrency(deliveryFee)}</Text>
              </Column>
            </Row>
          )}
          
          {tax > 0 && (
            <Row className="mb-2">
              <Column>
                <Text className="text-gray-600">Tax</Text>
              </Column>
              <Column align="right">
                <Text className="text-gray-900">{formatCurrency(tax)}</Text>
              </Column>
            </Row>
          )}
          
          {tip > 0 && (
            <Row className="mb-2">
              <Column>
                <Text className="text-gray-600">Tip</Text>
              </Column>
              <Column align="right">
                <Text className="text-gray-900">{formatCurrency(tip)}</Text>
              </Column>
            </Row>
          )}
          
          <EmailDivider />
          
          <Row className="mb-4">
            <Column>
              <Text className="text-lg font-semibold text-gray-900">Total</Text>
            </Column>
            <Column align="right">
              <Text className="text-lg font-semibold text-gray-900">
                {formatCurrency(orderTotal)}
              </Text>
            </Column>
          </Row>
          
          <Row>
            <Column>
              <Text className="text-sm text-gray-600">
                Payment Method: {paymentMethod}
              </Text>
            </Column>
          </Row>
        </Section>
      </EmailCard>

      {/* Delivery/Pickup Info */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-4">
          {estimatedDeliveryTime ? "Delivery Information" : "Pickup Information"}
        </Heading>
        
        {estimatedDeliveryTime ? (
          <Section>
            <Text className="text-gray-900 mb-2">
              <strong>Estimated Delivery Time:</strong> {estimatedDeliveryTime}
            </Text>
            <Text className="text-sm text-gray-600">
              We'll send you updates as your order progresses.
            </Text>
          </Section>
        ) : pickupTime ? (
          <Section>
            <Text className="text-gray-900 mb-2">
              <strong>Pickup Time:</strong> {pickupTime}
            </Text>
            <Text className="text-sm text-gray-600">
              Please arrive at the specified time for pickup.
            </Text>
          </Section>
        ) : (
          <Text className="text-gray-600">
            The restaurant will contact you with pickup/delivery details.
          </Text>
        )}
      </EmailCard>

      {/* Special Instructions */}
      {specialInstructions && (
        <EmailCard>
          <Heading className="text-xl font-semibold text-gray-900 mb-4">
            Special Instructions
          </Heading>
          <Text className="text-gray-700">
            {specialInstructions}
          </Text>
        </EmailCard>
      )}

      {/* Action Buttons */}
      <Section className="text-center mt-8 mb-8">
        {trackingUrl && (
          <EmailButton href={trackingUrl} variant="primary">
            Track Your Order
          </EmailButton>
        )}
        <div className="mt-4">
          <EmailButton 
            href={`${baseUrl}/${restaurantName.toLowerCase().replace(/\s+/g, '-')}`}
            variant="secondary"
          >
            Order Again
          </EmailButton>
        </div>
      </Section>

      {/* Help Section */}
      <Section className="text-center mt-8">
        <Text className="text-gray-600 mb-4">
          Need help with your order?
        </Text>
        <Text className="text-sm text-gray-500">
          Contact the restaurant directly at {restaurantPhone || "their listed phone number"} or{" "}
          <EmailButton 
            href={`${baseUrl}/support`}
            variant="secondary"
          >
            Contact Support
          </EmailButton>
        </Text>
      </Section>

      {/* Order Date */}
      <Section className="text-center mt-8">
        <Text className="text-xs text-gray-400">
          Order placed on {formatDateTime(new Date())}
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}