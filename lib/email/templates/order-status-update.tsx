import {
  Heading,
  Text,
  Section,
  Row,
  Column,
  Img,
} from "@react-email/components";
import { BaseEmailLayout, EmailButton, EmailCard } from "../../../components/email/base-layout";
import { formatCurrency, formatDateTime, OrderEmailData } from "../react-email-config";

export interface OrderStatusUpdateProps extends OrderEmailData {
  previousStatus?: string;
  statusMessage?: string;
  restaurantLogo?: string;
  deliveryAddress?: string;
  driverName?: string;
  driverPhone?: string;
  additionalInfo?: string;
}

type OrderStatus = "confirmed" | "preparing" | "ready" | "picked_up" | "out_for_delivery" | "delivered" | "cancelled";

const statusConfig: Record<OrderStatus, {
  title: string;
  message: string;
  color: string;
  icon: string;
  showTracking: boolean;
}> = {
  confirmed: {
    title: "Order Confirmed",
    message: "Your order has been confirmed and sent to the restaurant.",
    color: "blue",
    icon: "confirmed",
    showTracking: true,
  },
  preparing: {
    title: "Order Being Prepared",
    message: "Great news! The restaurant is now preparing your order.",
    color: "orange",
    icon: "cooking",
    showTracking: true,
  },
  ready: {
    title: "Order Ready",
    message: "Your order is ready for pickup or delivery!",
    color: "green",
    icon: "ready",
    showTracking: true,
  },
  picked_up: {
    title: "Order Picked Up",
    message: "Your order has been picked up and is on its way to you.",
    color: "blue",
    icon: "pickup",
    showTracking: true,
  },
  out_for_delivery: {
    title: "Out for Delivery",
    message: "Your order is on its way! It should arrive soon.",
    color: "blue",
    icon: "delivery",
    showTracking: true,
  },
  delivered: {
    title: "Order Delivered",
    message: "Your order has been delivered. Enjoy your meal!",
    color: "green",
    icon: "delivered",
    showTracking: false,
  },
  cancelled: {
    title: "Order Cancelled",
    message: "Unfortunately, your order has been cancelled.",
    color: "red",
    icon: "cancelled",
    showTracking: false,
  },
};

export default function OrderStatusUpdateEmail({
  orderId,
  customerName,
  restaurantName,
  orderTotal,
  orderStatus = "preparing",
  statusMessage,
  restaurantLogo,
  trackingUrl,
  estimatedDeliveryTime,
  deliveryAddress,
  driverName,
  driverPhone,
  additionalInfo,
  orderItems,
}: OrderStatusUpdateProps & { orderStatus?: string }) {
  const status = (orderStatus as OrderStatus) || "preparing";
  const config = statusConfig[status];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const getStatusColor = () => {
    switch (config.color) {
      case "green": return "#059669";
      case "blue": return "#2563eb";
      case "orange": return "#ea580c";
      case "red": return "#dc2626";
      default: return "#6b7280";
    }
  };

  return (
    <BaseEmailLayout
      preview={`${config.title} - Order #${orderId}`}
      title={config.title}
    >
      {/* Status Header */}
      <Section className="text-center mb-8">
        <Img
          src={`${baseUrl}/icons/${config.icon}.png`}
          width="64"
          height="64"
          alt={config.title}
          className="mx-auto mb-4"
        />
        <Heading 
          className="text-3xl font-bold mb-2"
          style={{ color: getStatusColor() }}
        >
          {config.title}
        </Heading>
        <Text className="text-lg text-gray-600">
          Hi {customerName}, {statusMessage || config.message}
        </Text>
      </Section>

      {/* Order Info Card */}
      <EmailCard>
        <Row>
          <Column>
            <Heading className="text-xl font-semibold text-gray-900 mb-4">
              Order Details
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
              <Text className="text-sm text-gray-600 mt-1">
                Order Total: {formatCurrency(orderTotal)}
              </Text>
            </Column>
          </Row>
        </Section>

        {/* Order Items Summary */}
        {orderItems && orderItems.length > 0 && (
          <Section className="mb-6">
            <Text className="text-sm font-medium text-gray-900 mb-2">
              Items in your order:
            </Text>
            {orderItems.slice(0, 3).map((item, index) => (
              <Text key={index} className="text-sm text-gray-600 mb-1">
                {item.quantity}x {item.name}
              </Text>
            ))}
            {orderItems.length > 3 && (
              <Text className="text-sm text-gray-500">
                +{orderItems.length - 3} more items
              </Text>
            )}
          </Section>
        )}
      </EmailCard>

      {/* Status-Specific Information */}
      {status === "out_for_delivery" && (driverName || driverPhone || deliveryAddress) && (
        <EmailCard>
          <Heading className="text-xl font-semibold text-gray-900 mb-4">
            Delivery Information
          </Heading>
          
          {driverName && (
            <Text className="text-gray-900 mb-2">
              <strong>Driver:</strong> {driverName}
            </Text>
          )}
          
          {driverPhone && (
            <Text className="text-gray-900 mb-2">
              <strong>Driver Phone:</strong> {driverPhone}
            </Text>
          )}
          
          {deliveryAddress && (
            <Text className="text-gray-900 mb-2">
              <strong>Delivery Address:</strong> {deliveryAddress}
            </Text>
          )}
          
          {estimatedDeliveryTime && (
            <Text className="text-gray-900 mb-2">
              <strong>Estimated Arrival:</strong> {estimatedDeliveryTime}
            </Text>
          )}
        </EmailCard>
      )}

      {/* Delivery Timing */}
      {estimatedDeliveryTime && status !== "delivered" && status !== "cancelled" && (
        <EmailCard>
          <Heading className="text-xl font-semibold text-gray-900 mb-4">
            Timing Update
          </Heading>
          <Text className="text-gray-900 mb-2">
            <strong>Estimated {status === "ready" ? "Pickup" : "Delivery"} Time:</strong>
          </Text>
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {estimatedDeliveryTime}
          </Text>
          <Text className="text-sm text-gray-600">
            We'll keep you updated if there are any changes to this timing.
          </Text>
        </EmailCard>
      )}

      {/* Additional Information */}
      {additionalInfo && (
        <EmailCard>
          <Heading className="text-xl font-semibold text-gray-900 mb-4">
            Additional Information
          </Heading>
          <Text className="text-gray-700">
            {additionalInfo}
          </Text>
        </EmailCard>
      )}

      {/* Action Buttons */}
      <Section className="text-center mt-8 mb-8">
        {config.showTracking && trackingUrl && (
          <div className="mb-4">
            <EmailButton href={trackingUrl} variant="primary">
              Track Your Order
            </EmailButton>
          </div>
        )}
        
        {status === "delivered" && (
          <div className="mb-4">
            <EmailButton 
              href={`${baseUrl}/review/${orderId}`}
              variant="primary"
            >
              Rate Your Experience
            </EmailButton>
          </div>
        )}

        {status !== "cancelled" && (
          <EmailButton 
            href={`${baseUrl}/${restaurantName.toLowerCase().replace(/\s+/g, '-')}`}
            variant="secondary"
          >
            Order Again
          </EmailButton>
        )}

        {status === "cancelled" && (
          <EmailButton 
            href={`${baseUrl}/restaurants`}
            variant="primary"
          >
            Browse Restaurants
          </EmailButton>
        )}
      </Section>

      {/* Order Timeline Progress */}
      {status !== "cancelled" && (
        <EmailCard>
          <Heading className="text-lg font-semibold text-gray-900 mb-4">
            Order Progress
          </Heading>
          
          <Section>
            {/* Timeline Steps */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: '#059669',
                  marginRight: '12px'
                }}
              />
              <Text className="text-sm text-gray-900">Order Confirmed</Text>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: ['preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered'].includes(status) ? '#059669' : '#e5e7eb',
                  marginRight: '12px'
                }}
              />
              <Text className="text-sm text-gray-900">Being Prepared</Text>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: ['ready', 'picked_up', 'out_for_delivery', 'delivered'].includes(status) ? '#059669' : '#e5e7eb',
                  marginRight: '12px'
                }}
              />
              <Text className="text-sm text-gray-900">Ready for Pickup/Delivery</Text>
            </div>
            
            {estimatedDeliveryTime && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: ['out_for_delivery', 'delivered'].includes(status) ? '#059669' : '#e5e7eb',
                      marginRight: '12px'
                    }}
                  />
                  <Text className="text-sm text-gray-900">Out for Delivery</Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: status === 'delivered' ? '#059669' : '#e5e7eb',
                      marginRight: '12px'
                    }}
                  />
                  <Text className="text-sm text-gray-900">Delivered</Text>
                </div>
              </>
            )}
          </Section>
        </EmailCard>
      )}

      {/* Help Section */}
      <Section className="text-center mt-8">
        <Text className="text-gray-600 mb-4">
          Questions about your order?
        </Text>
        <Text className="text-sm text-gray-500">
          <EmailButton 
            href={`${baseUrl}/support`}
            variant="secondary"
          >
            Contact Support
          </EmailButton>
        </Text>
      </Section>

      {/* Timestamp */}
      <Section className="text-center mt-8">
        <Text className="text-xs text-gray-400">
          Status updated on {formatDateTime(new Date())}
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}