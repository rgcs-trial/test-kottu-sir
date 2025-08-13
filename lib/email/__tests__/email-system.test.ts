import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@react-email/render';

// Import email service and templates
import { EmailService, createEmailService } from '../email-service';
import { createResendProvider } from '../providers/resend';
import {
  emailConfig,
  validateEmailAddress,
  validateEmailData,
  formatCurrency,
  formatDateTime,
} from '../react-email-config';

// Import templates
import OrderConfirmationEmail from '../templates/order-confirmation';
import OrderStatusUpdateEmail from '../templates/order-status-update';
import WelcomeEmail from '../templates/welcome';
import RestaurantWelcomeEmail from '../templates/restaurant-welcome';
import PasswordResetEmail from '../templates/password-reset';

// Mock Resend for testing
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null,
      }),
    },
    domains: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
  })),
}));

describe('Email System', () => {
  let emailService: EmailService;
  
  beforeEach(() => {
    const provider = createResendProvider('test-api-key');
    emailService = createEmailService(provider);
  });

  describe('Email Configuration', () => {
    it('should have valid email configuration', () => {
      expect(emailConfig.from.name).toBeDefined();
      expect(emailConfig.from.email).toBeDefined();
      expect(emailConfig.baseUrl).toBeDefined();
    });

    it('should validate email addresses correctly', () => {
      expect(validateEmailAddress('test@example.com')).toBe(true);
      expect(validateEmailAddress('invalid-email')).toBe(false);
      expect(validateEmailAddress('')).toBe(false);
    });

    it('should validate email data correctly', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const { isValid, errors } = validateEmailData(data, ['name', 'email']);
      
      expect(isValid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const data = { name: 'John' };
      const { isValid, errors } = validateEmailData(data, ['name', 'email']);
      
      expect(isValid).toBe(false);
      expect(errors).toContain('Missing required field: email');
    });

    it('should format currency correctly', () => {
      expect(formatCurrency(25.99)).toBe('$25.99');
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should format date and time correctly', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('Order Confirmation Template', () => {
    const mockOrderData = {
      orderId: 'ORD-123',
      customerName: 'John Doe',
      restaurantName: 'Test Restaurant',
      orderTotal: 29.99,
      orderItems: [
        {
          name: 'Burger',
          quantity: 2,
          price: 12.99,
          modifiers: ['Extra cheese', 'No onions'],
        },
        {
          name: 'Fries',
          quantity: 1,
          price: 3.99,
        },
      ],
      restaurantAddress: '123 Main St, City, State',
      restaurantPhone: '+1-555-0123',
      trackingUrl: 'https://example.com/track/ORD-123',
      estimatedDeliveryTime: '30-45 minutes',
    };

    it('should render order confirmation email', async () => {
      const template = OrderConfirmationEmail(mockOrderData);
      const html = await render(template);
      
      expect(html).toContain('Order Confirmed!');
      expect(html).toContain(mockOrderData.orderId);
      expect(html).toContain(mockOrderData.customerName);
      expect(html).toContain(mockOrderData.restaurantName);
      expect(html).toContain('$29.99');
    });

    it('should include all order items', async () => {
      const template = OrderConfirmationEmail(mockOrderData);
      const html = await render(template);
      
      expect(html).toContain('Burger');
      expect(html).toContain('Fries');
      expect(html).toContain('Extra cheese');
    });

    it('should include tracking information', async () => {
      const template = OrderConfirmationEmail(mockOrderData);
      const html = await render(template);
      
      expect(html).toContain('Track Your Order');
      expect(html).toContain(mockOrderData.trackingUrl);
    });
  });

  describe('Order Status Update Template', () => {
    const mockStatusData = {
      orderId: 'ORD-123',
      customerName: 'John Doe',
      restaurantName: 'Test Restaurant',
      orderTotal: 29.99,
      orderStatus: 'preparing',
      orderItems: [
        {
          name: 'Burger',
          quantity: 2,
          price: 12.99,
        },
      ],
      trackingUrl: 'https://example.com/track/ORD-123',
      estimatedDeliveryTime: '20-25 minutes',
    };

    it('should render order status update email', async () => {
      const template = OrderStatusUpdateEmail(mockStatusData);
      const html = await render(template);
      
      expect(html).toContain('Order Being Prepared');
      expect(html).toContain(mockStatusData.orderId);
      expect(html).toContain(mockStatusData.customerName);
    });

    it('should show correct status message', async () => {
      const deliveredData = { ...mockStatusData, orderStatus: 'delivered' };
      const template = OrderStatusUpdateEmail(deliveredData);
      const html = await render(template);
      
      expect(html).toContain('Order Delivered');
      expect(html).toContain('Rate Your Experience');
    });
  });

  describe('Welcome Email Template', () => {
    const mockWelcomeData = {
      userName: 'John Doe',
      loginUrl: 'https://example.com/login',
      supportUrl: 'https://example.com/support',
      verificationUrl: 'https://example.com/verify/token123',
      promoCode: 'WELCOME20',
      promoDiscount: 20,
      featuredRestaurants: [
        {
          id: 'rest-1',
          name: 'Italian Bistro',
          cuisine: 'Italian',
          image: 'https://example.com/restaurant.jpg',
          rating: 4.5,
          deliveryTime: '25-40 min',
        },
      ],
    };

    it('should render welcome email', async () => {
      const template = WelcomeEmail(mockWelcomeData);
      const html = await render(template);
      
      expect(html).toContain('Welcome to Restaurant Platform!');
      expect(html).toContain(mockWelcomeData.userName);
      expect(html).toContain('Verify Email Address');
    });

    it('should include promo code when provided', async () => {
      const template = WelcomeEmail(mockWelcomeData);
      const html = await render(template);
      
      expect(html).toContain('WELCOME20');
      expect(html).toContain('20% Off');
    });

    it('should list featured restaurants', async () => {
      const template = WelcomeEmail(mockWelcomeData);
      const html = await render(template);
      
      expect(html).toContain('Italian Bistro');
      expect(html).toContain('Italian');
      expect(html).toContain('4.5');
    });
  });

  describe('Restaurant Welcome Template', () => {
    const mockRestaurantData = {
      restaurantName: 'Test Restaurant',
      ownerName: 'Jane Smith',
      dashboardUrl: 'https://example.com/dashboard',
      supportUrl: 'https://example.com/support',
      verificationUrl: 'https://example.com/verify/token123',
      approvalStatus: 'pending' as const,
    };

    it('should render restaurant welcome email', async () => {
      const template = RestaurantWelcomeEmail(mockRestaurantData);
      const html = await render(template);
      
      expect(html).toContain('Welcome to Restaurant Platform!');
      expect(html).toContain(mockRestaurantData.ownerName);
      expect(html).toContain(mockRestaurantData.restaurantName);
    });

    it('should show approval status', async () => {
      const template = RestaurantWelcomeEmail(mockRestaurantData);
      const html = await render(template);
      
      expect(html).toContain('Account Under Review');
    });

    it('should show setup progress', async () => {
      const template = RestaurantWelcomeEmail(mockRestaurantData);
      const html = await render(template);
      
      expect(html).toContain('Setup Progress');
      expect(html).toContain('Verify Your Email');
      expect(html).toContain('Upload Your Menu');
    });
  });

  describe('Password Reset Template', () => {
    const mockResetData = {
      userName: 'John Doe',
      resetUrl: 'https://example.com/reset/token123',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      ipAddress: '192.168.1.1',
      location: 'New York, NY',
    };

    it('should render password reset email', async () => {
      const template = PasswordResetEmail(mockResetData);
      const html = await render(template);
      
      expect(html).toContain('Reset Your Password');
      expect(html).toContain(mockResetData.userName);
      expect(html).toContain('Reset My Password');
    });

    it('should include security information', async () => {
      const template = PasswordResetEmail(mockResetData);
      const html = await render(template);
      
      expect(html).toContain(mockResetData.ipAddress);
      expect(html).toContain(mockResetData.location);
    });

    it('should include security tips', async () => {
      const template = PasswordResetEmail(mockResetData);
      const html = await render(template);
      
      expect(html).toContain('Password Security Tips');
      expect(html).toContain('at least 8 characters');
    });

    it('should show expiration warning', async () => {
      const template = PasswordResetEmail(mockResetData);
      const html = await render(template);
      
      expect(html).toContain('expire');
      expect(html).toContain('minutes');
    });
  });

  describe('Email Service', () => {
    it('should send email successfully', async () => {
      const mockParams = {
        to: 'test@example.com',
        from: { name: 'Test', email: 'test@example.com' },
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      const result = await emailService.sendEmail(mockParams);
      
      expect(result.status).toBe('sent');
      expect(result.id).toBeDefined();
      expect(result.provider).toBe('resend');
    });

    it('should validate email addresses before sending', async () => {
      const mockParams = {
        to: 'invalid-email',
        from: { name: 'Test', email: 'test@example.com' },
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      await expect(emailService.sendEmail(mockParams)).rejects.toThrow('Invalid email address');
    });

    it('should queue emails for later sending', async () => {
      const queueId = await emailService.queueEmail(
        'welcome',
        { userName: 'Test User' },
        'test@example.com',
        { priority: 'high' }
      );

      expect(queueId).toBeDefined();
      
      const queueStatus = emailService.getQueueStatus();
      expect(queueStatus.pending).toBe(1);
    });

    it('should handle provider validation', async () => {
      const isValid = await emailService.validateProvider();
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid template data gracefully', async () => {
      const invalidData = {
        orderId: '', // Invalid: empty string
        customerName: 'John Doe',
        restaurantName: 'Test Restaurant',
        orderTotal: -10, // Invalid: negative number
        orderItems: [], // Invalid: empty array
      };

      expect(() => OrderConfirmationEmail(invalidData as any)).not.toThrow();
    });

    it('should handle missing optional fields', async () => {
      const minimalData = {
        orderId: 'ORD-123',
        customerName: 'John Doe',
        restaurantName: 'Test Restaurant',
        orderTotal: 29.99,
        orderItems: [
          {
            name: 'Burger',
            quantity: 1,
            price: 12.99,
          },
        ],
      };

      const template = OrderConfirmationEmail(minimalData);
      const html = await render(template);
      
      expect(html).toContain('Order Confirmed!');
      expect(html).toContain(minimalData.orderId);
    });
  });

  describe('Accessibility and Responsive Design', () => {
    it('should include proper alt text for images', async () => {
      const mockOrderData = {
        orderId: 'ORD-123',
        customerName: 'John Doe',
        restaurantName: 'Test Restaurant',
        orderTotal: 29.99,
        orderItems: [{ name: 'Burger', quantity: 1, price: 12.99 }],
      };

      const template = OrderConfirmationEmail(mockOrderData);
      const html = await render(template);
      
      expect(html).toContain('alt="Success"');
      expect(html).toContain('alt="Restaurant Platform"');
    });

    it('should use semantic HTML structure', async () => {
      const mockWelcomeData = {
        userName: 'John Doe',
        loginUrl: 'https://example.com/login',
        supportUrl: 'https://example.com/support',
      };

      const template = WelcomeEmail(mockWelcomeData);
      const html = await render(template);
      
      // Should use proper heading hierarchy
      expect(html).toContain('<h1');
      expect(html).toContain('<h2');
      expect(html).toContain('<p');
    });

    it('should include mobile-responsive styles', async () => {
      const mockOrderData = {
        orderId: 'ORD-123',
        customerName: 'John Doe',
        restaurantName: 'Test Restaurant',
        orderTotal: 29.99,
        orderItems: [{ name: 'Burger', quantity: 1, price: 12.99 }],
      };

      const template = OrderConfirmationEmail(mockOrderData);
      const html = await render(template);
      
      // Should include responsive table styles
      expect(html).toContain('width="100%"');
      expect(html).toContain('max-width');
    });
  });
});

// Integration tests
describe('Email System Integration', () => {
  it('should handle complete order confirmation flow', async () => {
    const orderData = {
      orderId: 'ORD-12345',
      customerName: 'Alice Johnson',
      restaurantName: 'Pizza Palace',
      orderTotal: 24.99,
      orderItems: [
        {
          name: 'Margherita Pizza',
          quantity: 1,
          price: 18.99,
          modifiers: ['Large', 'Extra cheese'],
        },
        {
          name: 'Garlic Bread',
          quantity: 1,
          price: 5.99,
        },
      ],
      estimatedDeliveryTime: '25-35 minutes',
      trackingUrl: 'https://example.com/track/ORD-12345',
    };

    // Test template rendering
    const template = OrderConfirmationEmail(orderData);
    const html = await render(template);
    
    expect(html).toBeDefined();
    expect(html).toContain('Pizza Palace');
    expect(html).toContain('$24.99');
    
    // Test email service integration
    const provider = createResendProvider('test-key');
    const emailService = createEmailService(provider);
    
    const emailParams = {
      to: 'alice@example.com',
      from: emailConfig.from,
      subject: `Order Confirmation #${orderData.orderId}`,
      html,
      text: await render(template, { plainText: true }),
    };

    const result = await emailService.sendEmail(emailParams);
    expect(result.status).toBe('sent');
  });

  it('should handle error states gracefully', async () => {
    // Test with invalid provider
    const emailService = createEmailService({
      send: () => Promise.reject(new Error('Provider error')),
    });

    const emailParams = {
      to: 'test@example.com',
      from: emailConfig.from,
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    };

    await expect(emailService.sendEmail(emailParams)).rejects.toThrow('Provider error');
  });
});