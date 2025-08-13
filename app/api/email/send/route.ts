import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEmailService } from "../../../../lib/email/email-service";
import { createResendProvider } from "../../../../lib/email/providers/resend";
import {
  EmailTemplate,
  EmailPriority,
  OrderEmailData,
  WelcomeEmailData,
  PasswordResetEmailData,
  RestaurantEmailData,
  renderEmail,
} from "../../../../lib/email/react-email-config";

// Import email templates
import OrderConfirmationEmail from "../../../../lib/email/templates/order-confirmation";
import OrderStatusUpdateEmail from "../../../../lib/email/templates/order-status-update";
import WelcomeEmail from "../../../../lib/email/templates/welcome";
import RestaurantWelcomeEmail from "../../../../lib/email/templates/restaurant-welcome";
import PasswordResetEmail from "../../../../lib/email/templates/password-reset";

// Validation schemas
const baseEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  from: z.object({
    name: z.string().min(1, "From name is required"),
    email: z.string().email("Invalid from email address"),
  }).optional(),
  subject: z.string().min(1, "Subject is required"),
  replyTo: z.string().email().optional(),
});

const orderEmailSchema = baseEmailSchema.extend({
  template: z.literal("order-confirmation").or(z.literal("order-status-update")),
  data: z.object({
    orderId: z.string().min(1, "Order ID is required"),
    customerName: z.string().min(1, "Customer name is required"),
    restaurantName: z.string().min(1, "Restaurant name is required"),
    orderTotal: z.number().positive("Order total must be positive"),
    orderItems: z.array(z.object({
      name: z.string().min(1, "Item name is required"),
      quantity: z.number().positive("Quantity must be positive"),
      price: z.number().positive("Price must be positive"),
      modifiers: z.array(z.string()).optional(),
    })).min(1, "At least one order item is required"),
    orderStatus: z.string().optional(),
    estimatedDeliveryTime: z.string().optional(),
    trackingUrl: z.string().url().optional(),
    restaurantLogo: z.string().url().optional(),
    restaurantAddress: z.string().optional(),
    restaurantPhone: z.string().optional(),
    specialInstructions: z.string().optional(),
    deliveryFee: z.number().optional(),
    tax: z.number().optional(),
    tip: z.number().optional(),
  }),
});

const welcomeEmailSchema = baseEmailSchema.extend({
  template: z.literal("welcome"),
  data: z.object({
    userName: z.string().min(1, "User name is required"),
    loginUrl: z.string().url("Invalid login URL"),
    supportUrl: z.string().url("Invalid support URL"),
    verificationUrl: z.string().url().optional(),
    promoCode: z.string().optional(),
    promoDiscount: z.number().optional(),
    featuredRestaurants: z.array(z.object({
      id: z.string(),
      name: z.string(),
      cuisine: z.string(),
      image: z.string().url(),
      rating: z.number(),
      deliveryTime: z.string(),
    })).optional(),
  }),
});

const restaurantWelcomeSchema = baseEmailSchema.extend({
  template: z.literal("restaurant-welcome"),
  data: z.object({
    restaurantName: z.string().min(1, "Restaurant name is required"),
    ownerName: z.string().min(1, "Owner name is required"),
    dashboardUrl: z.string().url("Invalid dashboard URL"),
    onboardingUrl: z.string().url().optional(),
    supportUrl: z.string().url("Invalid support URL"),
    verificationUrl: z.string().url().optional(),
    approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
    stripeOnboardingUrl: z.string().url().optional(),
  }),
});

const passwordResetSchema = baseEmailSchema.extend({
  template: z.literal("password-reset"),
  data: z.object({
    userName: z.string().min(1, "User name is required"),
    resetUrl: z.string().url("Invalid reset URL"),
    expiresAt: z.string().datetime("Invalid expiration date"),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    location: z.string().optional(),
  }),
});

const emailRequestSchema = z.discriminatedUnion("template", [
  orderEmailSchema,
  welcomeEmailSchema,
  restaurantWelcomeSchema,
  passwordResetSchema,
]);

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

// API key validation
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const validApiKey = process.env.EMAIL_API_KEY;

  if (!validApiKey) {
    console.warn("EMAIL_API_KEY not configured");
    return false;
  }

  return apiKey === validApiKey;
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API key" },
        { status: 401 }
      );
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = emailRequestSchema.parse(body);

    // Initialize email service
    const emailProvider = createResendProvider();
    const emailService = createEmailService(emailProvider);

    // Validate provider connection
    const isProviderValid = await emailService.validateProvider();
    if (!isProviderValid) {
      return NextResponse.json(
        { error: "Email service unavailable" },
        { status: 503 }
      );
    }

    let emailTemplate: React.ReactElement;
    let emailData: any;

    // Generate email template based on type
    switch (validatedData.template) {
      case "order-confirmation":
        emailData = {
          ...validatedData.data,
          to: validatedData.to,
          from: validatedData.from,
          subject: validatedData.subject,
          replyTo: validatedData.replyTo,
        } as OrderEmailData & any;
        emailTemplate = OrderConfirmationEmail(emailData);
        break;

      case "order-status-update":
        emailData = {
          ...validatedData.data,
          to: validatedData.to,
          from: validatedData.from,
          subject: validatedData.subject,
          replyTo: validatedData.replyTo,
        } as OrderEmailData & any;
        emailTemplate = OrderStatusUpdateEmail(emailData);
        break;

      case "welcome":
        emailData = {
          ...validatedData.data,
          to: validatedData.to,
          from: validatedData.from,
          subject: validatedData.subject,
          replyTo: validatedData.replyTo,
        } as WelcomeEmailData & any;
        emailTemplate = WelcomeEmail(emailData);
        break;

      case "restaurant-welcome":
        emailData = {
          ...validatedData.data,
          to: validatedData.to,
          from: validatedData.from,
          subject: validatedData.subject,
          replyTo: validatedData.replyTo,
        } as RestaurantEmailData & any;
        emailTemplate = RestaurantWelcomeEmail(emailData);
        break;

      case "password-reset":
        emailData = {
          ...validatedData.data,
          to: validatedData.to,
          from: validatedData.from,
          subject: validatedData.subject,
          replyTo: validatedData.replyTo,
          expiresAt: new Date(validatedData.data.expiresAt),
        } as PasswordResetEmailData & any;
        emailTemplate = PasswordResetEmail(emailData);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email template" },
          { status: 400 }
        );
    }

    // Send email
    const result = await emailService.sendTemplatedEmail(
      validatedData.template,
      emailData,
      emailTemplate
    );

    // Log successful send
    console.log(`Email sent successfully:`, {
      template: validatedData.template,
      recipient: validatedData.to,
      emailId: result.id,
      status: result.status,
    });

    return NextResponse.json({
      success: true,
      emailId: result.id,
      status: result.status,
      template: validatedData.template,
    });

  } catch (error) {
    console.error("Email send error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  try {
    // Validate API key for health checks
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check email service status
    const emailProvider = createResendProvider();
    const emailService = createEmailService(emailProvider);
    const isHealthy = await emailService.validateProvider();

    if (!isHealthy) {
      return NextResponse.json(
        { 
          status: "unhealthy",
          service: "email",
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      service: "email",
      provider: "resend",
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Email service health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "email",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}