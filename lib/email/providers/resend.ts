import { Resend } from "resend";
import {
  EmailProvider,
  EmailSendParams,
  EmailSendResult,
  EmailBounce,
  EmailStats,
} from "../email-service";

export class ResendProvider implements EmailProvider {
  private client: Resend;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("Resend API key is required");
    }
    this.client = new Resend(this.apiKey);
  }

  async send(params: EmailSendParams): Promise<EmailSendResult> {
    try {
      // Convert our parameters to Resend format
      const resendParams = this.convertToResendFormat(params);

      // Send the email
      const response = await this.client.emails.send(resendParams);

      if (response.error) {
        throw new Error(response.error.message);
      }

      return {
        id: response.data?.id || this.generateId(),
        messageId: response.data?.id,
        status: "sent",
        provider: "resend",
      };
    } catch (error) {
      console.error("Resend send error:", error);
      
      return {
        id: this.generateId(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        provider: "resend",
      };
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test the API key by attempting to retrieve domains
      await this.client.domains.list();
      return true;
    } catch (error) {
      console.error("Resend API key validation failed:", error);
      return false;
    }
  }

  async getBounces(): Promise<EmailBounce[]> {
    try {
      // Resend doesn't have a direct bounces endpoint in their current API
      // This would need to be implemented using webhooks or batch API
      console.warn("Resend bounce retrieval not implemented - use webhooks instead");
      return [];
    } catch (error) {
      console.error("Failed to get bounces from Resend:", error);
      return [];
    }
  }

  async getDeliveryStats(): Promise<EmailStats> {
    try {
      // Resend doesn't provide comprehensive stats in their current API
      // This would need to be implemented using webhooks and database tracking
      console.warn("Resend delivery stats not implemented - use webhooks for tracking");
      
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complaints: 0,
      };
    } catch (error) {
      console.error("Failed to get delivery stats from Resend:", error);
      throw error;
    }
  }

  // Resend-specific methods
  async getDomains() {
    try {
      const response = await this.client.domains.list();
      return response.data;
    } catch (error) {
      console.error("Failed to get Resend domains:", error);
      throw error;
    }
  }

  async createDomain(domain: string) {
    try {
      const response = await this.client.domains.create({ name: domain });
      return response.data;
    } catch (error) {
      console.error("Failed to create Resend domain:", error);
      throw error;
    }
  }

  async verifyDomain(domainId: string) {
    try {
      const response = await this.client.domains.verify(domainId);
      return response.data;
    } catch (error) {
      console.error("Failed to verify Resend domain:", error);
      throw error;
    }
  }

  async getApiKeys() {
    try {
      const response = await this.client.apiKeys.list();
      return response.data;
    } catch (error) {
      console.error("Failed to get Resend API keys:", error);
      throw error;
    }
  }

  // Convert our standard email parameters to Resend format
  private convertToResendFormat(params: EmailSendParams) {
    const resendParams: any = {
      from: `${params.from.name} <${params.from.email}>`,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    };

    // Optional parameters
    if (params.replyTo) {
      resendParams.reply_to = params.replyTo;
    }

    if (params.cc && params.cc.length > 0) {
      resendParams.cc = params.cc;
    }

    if (params.bcc && params.bcc.length > 0) {
      resendParams.bcc = params.bcc;
    }

    if (params.attachments && params.attachments.length > 0) {
      resendParams.attachments = params.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      }));
    }

    if (params.tags && params.tags.length > 0) {
      resendParams.tags = params.tags.map((tag) => ({ name: tag, value: "true" }));
    }

    // Resend-specific parameters
    if (params.scheduledAt) {
      resendParams.scheduled_at = params.scheduledAt.toISOString();
    }

    return resendParams;
  }

  private generateId(): string {
    return `resend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Resend webhook handler for tracking email events
export interface ResendWebhookEvent {
  type: "email.sent" | "email.delivered" | "email.delivery_delayed" | "email.bounced" | "email.complained";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

export class ResendWebhookHandler {
  // Verify webhook signature (if Resend implements this)
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    // Implementation depends on Resend's webhook signature method
    // This is a placeholder for when Resend adds webhook signature verification
    return true;
  }

  // Process webhook events
  static async processEvent(event: ResendWebhookEvent): Promise<void> {
    try {
      const { type, data } = event;
      
      switch (type) {
        case "email.sent":
          await this.handleEmailSent(data);
          break;
        case "email.delivered":
          await this.handleEmailDelivered(data);
          break;
        case "email.bounced":
          await this.handleEmailBounced(data);
          break;
        case "email.complained":
          await this.handleEmailComplained(data);
          break;
        default:
          console.log(`Unhandled Resend webhook event: ${type}`);
      }
    } catch (error) {
      console.error("Failed to process Resend webhook event:", error);
      throw error;
    }
  }

  private static async handleEmailSent(data: ResendWebhookEvent["data"]): Promise<void> {
    console.log(`Email sent: ${data.email_id} to ${data.to.join(", ")}`);
    // Update email tracking in database
  }

  private static async handleEmailDelivered(data: ResendWebhookEvent["data"]): Promise<void> {
    console.log(`Email delivered: ${data.email_id}`);
    // Update email tracking in database
  }

  private static async handleEmailBounced(data: ResendWebhookEvent["data"]): Promise<void> {
    console.log(`Email bounced: ${data.email_id}`);
    // Update email tracking in database and potentially suppress future sends
  }

  private static async handleEmailComplained(data: ResendWebhookEvent["data"]): Promise<void> {
    console.log(`Email complained: ${data.email_id}`);
    // Update email tracking in database and add to suppression list
  }
}

// Resend batch operations
export class ResendBatchSender {
  private provider: ResendProvider;
  private batchSize: number;
  private delayBetweenBatches: number;

  constructor(provider: ResendProvider, batchSize = 50, delayMs = 1000) {
    this.provider = provider;
    this.batchSize = batchSize;
    this.delayBetweenBatches = delayMs;
  }

  async sendBatch(emails: EmailSendParams[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];
    
    // Process emails in batches
    for (let i = 0; i < emails.length; i += this.batchSize) {
      const batch = emails.slice(i, i + this.batchSize);
      
      // Send batch concurrently
      const batchPromises = batch.map((email) => this.provider.send(email));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            id: this.generateId(),
            status: "failed",
            error: result.reason?.message || "Batch send failed",
            provider: "resend",
          });
        }
      }
      
      // Delay between batches to respect rate limits
      if (i + this.batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, this.delayBetweenBatches));
      }
    }
    
    return results;
  }

  private generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function to create Resend provider
export function createResendProvider(apiKey?: string): ResendProvider {
  return new ResendProvider(apiKey);
}