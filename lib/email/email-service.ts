import { ReactElement } from "react";
import {
  BaseEmailData,
  EmailPriority,
  EmailTemplate,
  EmailTrackingData,
  renderEmail,
  validateEmailAddress,
  validateEmailData,
} from "./react-email-config";

// Email provider interface
export interface EmailProvider {
  send(params: EmailSendParams): Promise<EmailSendResult>;
  getBounces?(): Promise<EmailBounce[]>;
  getDeliveryStats?(): Promise<EmailStats>;
  validateApiKey?(): Promise<boolean>;
}

// Email send parameters
export interface EmailSendParams {
  to: string | string[];
  from: {
    name: string;
    email: string;
  };
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  tags?: string[];
  priority?: EmailPriority;
  scheduledAt?: Date;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

// Email send result
export interface EmailSendResult {
  id: string;
  messageId?: string;
  status: "sent" | "queued" | "failed";
  error?: string;
  provider: string;
}

// Email attachment
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  size?: number;
}

// Email bounce information
export interface EmailBounce {
  email: string;
  bounceType: "hard" | "soft";
  reason: string;
  timestamp: Date;
}

// Email statistics
export interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complaints: number;
}

// Email queue item
export interface EmailQueueItem {
  id: string;
  template: EmailTemplate;
  data: any;
  recipient: string;
  priority: EmailPriority;
  scheduledAt?: Date;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "processing" | "sent" | "failed";
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
}

// Main email service class
export class EmailService {
  private provider: EmailProvider;
  private queue: EmailQueueItem[] = [];
  private isProcessing = false;

  constructor(provider: EmailProvider) {
    this.provider = provider;
  }

  // Send email immediately
  async sendEmail(params: EmailSendParams): Promise<EmailSendResult> {
    // Validate email addresses
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    for (const email of recipients) {
      if (!validateEmailAddress(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    if (!validateEmailAddress(params.from.email)) {
      throw new Error(`Invalid from email address: ${params.from.email}`);
    }

    // Validate required fields
    const { isValid, errors } = validateEmailData(params, ["to", "from", "subject", "html"]);
    if (!isValid) {
      throw new Error(`Email validation failed: ${errors.join(", ")}`);
    }

    try {
      const result = await this.provider.send(params);
      
      // Log email send for tracking
      await this.logEmailSend({
        emailId: result.id,
        template: "order-confirmation", // This should be passed in
        recipient: Array.isArray(params.to) ? params.to[0] : params.to,
        sentAt: new Date(),
        status: result.status === "sent" ? "sent" : "failed",
      });

      return result;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  // Send templated email
  async sendTemplatedEmail<T extends BaseEmailData>(
    template: EmailTemplate,
    data: T,
    templateComponent: ReactElement
  ): Promise<EmailSendResult> {
    try {
      // Render the email template
      const { html, text } = await renderEmail(templateComponent);

      // Prepare send parameters
      const sendParams: EmailSendParams = {
        to: data.to,
        from: data.from || {
          name: "Restaurant Platform",
          email: process.env.EMAIL_FROM || "noreply@restaurantplatform.com",
        },
        subject: data.subject,
        html,
        text,
        replyTo: data.replyTo,
        trackOpens: true,
        trackClicks: true,
        tags: [template],
      };

      return await this.sendEmail(sendParams);
    } catch (error) {
      console.error(`Failed to send templated email (${template}):`, error);
      throw error;
    }
  }

  // Queue email for later sending
  async queueEmail(
    template: EmailTemplate,
    data: any,
    recipient: string,
    options: {
      priority?: EmailPriority;
      scheduledAt?: Date;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const queueItem: EmailQueueItem = {
      id: this.generateId(),
      template,
      data,
      recipient,
      priority: options.priority || EmailPriority.NORMAL,
      scheduledAt: options.scheduledAt,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      status: "pending",
      createdAt: new Date(),
    };

    this.queue.push(queueItem);
    
    // Start processing queue if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  // Process email queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        // Sort by priority and scheduled time
        this.queue.sort((a, b) => {
          const priorityOrder = {
            [EmailPriority.URGENT]: 4,
            [EmailPriority.HIGH]: 3,
            [EmailPriority.NORMAL]: 2,
            [EmailPriority.LOW]: 1,
          };

          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;

          const aTime = a.scheduledAt || a.createdAt;
          const bTime = b.scheduledAt || b.createdAt;
          return aTime.getTime() - bTime.getTime();
        });

        const item = this.queue.find(
          (item) =>
            item.status === "pending" &&
            (!item.scheduledAt || item.scheduledAt <= new Date()) &&
            item.attempts < item.maxAttempts
        );

        if (!item) break;

        item.status = "processing";
        item.attempts++;
        item.lastAttemptAt = new Date();

        try {
          // Here you would load the appropriate template and send the email
          // This is a simplified version - in practice, you'd have a template registry
          console.log(`Processing email: ${item.template} to ${item.recipient}`);
          
          item.status = "sent";
          this.queue = this.queue.filter((q) => q.id !== item.id);
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          item.error = error instanceof Error ? error.message : "Unknown error";
          
          if (item.attempts >= item.maxAttempts) {
            item.status = "failed";
          } else {
            item.status = "pending";
          }
        }

        // Add delay between emails to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Get queue status
  getQueueStatus() {
    return {
      pending: this.queue.filter((item) => item.status === "pending").length,
      processing: this.queue.filter((item) => item.status === "processing").length,
      failed: this.queue.filter((item) => item.status === "failed").length,
      total: this.queue.length,
    };
  }

  // Retry failed emails
  async retryFailed(): Promise<void> {
    const failedItems = this.queue.filter((item) => item.status === "failed");
    for (const item of failedItems) {
      item.status = "pending";
      item.attempts = 0;
      item.error = undefined;
    }

    if (failedItems.length > 0 && !this.isProcessing) {
      this.processQueue();
    }
  }

  // Clear queue
  clearQueue(): void {
    this.queue = [];
  }

  // Validate provider connection
  async validateProvider(): Promise<boolean> {
    try {
      if (this.provider.validateApiKey) {
        return await this.provider.validateApiKey();
      }
      return true;
    } catch (error) {
      console.error("Provider validation failed:", error);
      return false;
    }
  }

  // Get delivery statistics
  async getStats(): Promise<EmailStats | null> {
    try {
      if (this.provider.getDeliveryStats) {
        return await this.provider.getDeliveryStats();
      }
      return null;
    } catch (error) {
      console.error("Failed to get email stats:", error);
      return null;
    }
  }

  // Log email send for tracking
  private async logEmailSend(tracking: EmailTrackingData): Promise<void> {
    // In a real application, this would save to a database
    console.log("Email tracking:", tracking);
  }

  // Generate unique ID
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Email service factory
export function createEmailService(provider: EmailProvider): EmailService {
  return new EmailService(provider);
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  maxBackoffTime: 300000, // 5 minutes
};

// Rate limiting
export class EmailRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    return this.requests[0] + this.windowMs;
  }
}