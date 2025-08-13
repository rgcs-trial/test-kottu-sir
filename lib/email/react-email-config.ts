import { render } from "@react-email/render";
import { ReactElement } from "react";

// Email configuration
export const emailConfig = {
  from: {
    name: "Restaurant Platform",
    email: process.env.EMAIL_FROM || "noreply@restaurantplatform.com",
  },
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  support: {
    name: "Restaurant Platform Support",
    email: process.env.EMAIL_SUPPORT || "support@restaurantplatform.com",
  },
  noreply: {
    name: "Restaurant Platform",
    email: process.env.EMAIL_NOREPLY || "noreply@restaurantplatform.com",
  },
};

// Email rendering utilities
export async function renderEmail(template: ReactElement): Promise<{
  html: string;
  text: string;
}> {
  try {
    const html = await render(template);
    const text = await render(template, { plainText: true });
    
    return { html, text };
  } catch (error) {
    console.error("Error rendering email template:", error);
    throw new Error("Failed to render email template");
  }
}

// Email validation utilities
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmailData<T>(
  data: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Common email types
export interface BaseEmailData {
  to: string;
  from?: {
    name: string;
    email: string;
  };
  subject: string;
  replyTo?: string;
}

export interface OrderEmailData extends BaseEmailData {
  orderId: string;
  customerName: string;
  restaurantName: string;
  orderTotal: number;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    modifiers?: string[];
  }>;
  orderStatus?: string;
  estimatedDeliveryTime?: string;
  trackingUrl?: string;
}

export interface WelcomeEmailData extends BaseEmailData {
  userName: string;
  loginUrl: string;
  supportUrl: string;
}

export interface PasswordResetEmailData extends BaseEmailData {
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface RestaurantEmailData extends BaseEmailData {
  restaurantName: string;
  ownerName: string;
  dashboardUrl: string;
  onboardingUrl?: string;
  supportUrl: string;
}

// Email template registry
export type EmailTemplate = 
  | "order-confirmation"
  | "order-status-update"
  | "welcome"
  | "restaurant-welcome"
  | "password-reset";

export const emailTemplates: Record<EmailTemplate, string> = {
  "order-confirmation": "Order Confirmation",
  "order-status-update": "Order Status Update",
  "welcome": "Welcome to Restaurant Platform",
  "restaurant-welcome": "Welcome to Restaurant Platform - Restaurant Dashboard",
  "password-reset": "Reset Your Password",
};

// Email priority levels
export enum EmailPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

// Email tracking
export interface EmailTrackingData {
  emailId: string;
  template: EmailTemplate;
  recipient: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
}

// Helper functions for common email operations
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

export function generateTrackingUrl(orderId: string): string {
  return `${emailConfig.baseUrl}/track/${orderId}`;
}

export function generateUnsubscribeUrl(email: string, type?: string): string {
  const params = new URLSearchParams({ email });
  if (type) params.set("type", type);
  return `${emailConfig.baseUrl}/unsubscribe?${params.toString()}`;
}