import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import type { CloudflareEnv } from './env';

export default defineCloudflareConfig({
  // Incremental Static Regeneration configuration using R2
  incrementalCache: {
    type: 'r2',
    bucket: 'CACHE_BUCKET',
    // Optional: Custom cache key prefix
    keyPrefix: 'isr-cache/',
    // Optional: TTL for cached items (default: 1 year)
    maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
  },

  // Image optimization configuration
  imageOptimization: {
    // Use Cloudflare Images for image optimization
    loader: 'custom',
    // Custom image loader configuration
    loaderFile: './lib/cloudflare-image-loader.ts',
    // Supported formats
    formats: ['image/webp', 'image/avif', 'image/jpeg', 'image/png'],
    // Quality settings
    quality: 75,
    // Sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Edge runtime configuration
  experimental: {
    // Enable edge runtime for API routes
    runtime: 'nodejs',
    // Bundle analyzer for optimization
    bundleAnalyzer: {
      enabled: process.env.ANALYZE === 'true',
    },
  },

  // Environment-specific overrides
  override: {
    wrapper: async (handler, env: CloudflareEnv) => {
      // Add global middleware for all requests
      return async (request: Request) => {
        // Add security headers
        const response = await handler(request);
        
        // Set security headers
        const securityHeaders = {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-XSS-Protection': '1; mode=block',
        };

        // Add CSP header if configured
        if (env.CSP_HEADER) {
          securityHeaders['Content-Security-Policy'] = env.CSP_HEADER;
        }

        // Apply headers to response
        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      };
    },

    // Custom converter for API routes
    converter: {
      // Convert Next.js API routes to Cloudflare Workers format
      convertBodyToType: (body: unknown) => {
        if (typeof body === 'string') {
          try {
            return JSON.parse(body);
          } catch {
            return body;
          }
        }
        return body;
      },
    },

    // Queue configuration for background tasks
    queue: {
      // Email queue configuration
      email: {
        binding: 'EMAIL_QUEUE',
        batchSize: 10,
        timeout: 30000,
        retries: 3,
      },
      // Order processing queue
      orders: {
        binding: 'ORDER_QUEUE',
        batchSize: 5,
        timeout: 15000,
        retries: 5,
      },
      // Analytics queue
      analytics: {
        binding: 'ANALYTICS_QUEUE',
        batchSize: 100,
        timeout: 60000,
        retries: 2,
      },
    },

    // KV storage configuration
    kvStorage: {
      // Session storage
      sessions: {
        binding: 'SESSION_KV',
        ttl: 86400, // 24 hours
      },
      // General cache
      cache: {
        binding: 'CACHE_KV',
        ttl: 3600, // 1 hour
      },
      // Rate limiting
      rateLimit: {
        binding: 'RATE_LIMIT_KV',
        ttl: 300, // 5 minutes
      },
    },

    // R2 storage configuration
    r2Storage: {
      // User uploaded assets
      uploads: {
        binding: 'UPLOADS_BUCKET',
        publicBaseUrl: 'https://cdn.restaurantsaas.com/uploads',
      },
      // Static assets
      assets: {
        binding: 'ASSETS_BUCKET',
        publicBaseUrl: 'https://cdn.restaurantsaas.com/assets',
      },
    },

    // Durable Objects configuration
    durableObjects: {
      // Order tracking for real-time updates
      orderTracker: {
        binding: 'ORDER_TRACKER',
        className: 'OrderTracker',
      },
      // Notification management
      notificationManager: {
        binding: 'NOTIFICATION_MANAGER',
        className: 'NotificationManager',
      },
    },
  },

  // Build optimization
  buildOptions: {
    // Minify output
    minify: true,
    // Source maps for debugging
    sourceMaps: process.env.NODE_ENV === 'development',
    // Bundle splitting for better caching
    splitting: true,
    // Tree shaking for smaller bundles
    treeShaking: true,
    // External dependencies to exclude from bundle
    external: [
      '@supabase/supabase-js',
      'stripe',
      '@cloudflare/workers-types',
    ],
  },

  // Cache configuration
  cache: {
    // Static assets cache
    static: {
      maxAge: 31536000, // 1 year
      staleWhileRevalidate: 86400, // 1 day
    },
    // API responses cache
    api: {
      maxAge: 300, // 5 minutes
      staleWhileRevalidate: 60, // 1 minute
    },
    // Page cache
    pages: {
      maxAge: 3600, // 1 hour
      staleWhileRevalidate: 300, // 5 minutes
    },
  },

  // Error handling
  errorHandling: {
    // Custom error pages
    pages: {
      404: '/404',
      500: '/500',
    },
    // Error reporting
    reporting: {
      enabled: true,
      // Send errors to analytics
      analytics: 'ANALYTICS',
    },
  },

  // Performance monitoring
  monitoring: {
    // Analytics configuration
    analytics: {
      enabled: true,
      binding: 'ANALYTICS',
      // Track key metrics
      metrics: [
        'page_views',
        'api_requests',
        'errors',
        'performance',
        'conversion',
      ],
    },
    // Real User Monitoring
    rum: {
      enabled: true,
      sampleRate: 0.1, // 10% sampling
    },
  },

  // Multi-tenant configuration
  multiTenant: {
    // Subdomain routing for restaurants
    subdomains: {
      enabled: true,
      pattern: '*.restaurantsaas.com',
      // Extract tenant from subdomain
      extractTenant: (hostname: string) => {
        const parts = hostname.split('.');
        if (parts.length >= 3 && parts[1] === 'restaurantsaas') {
          return parts[0];
        }
        return null;
      },
    },
    // Tenant-specific caching
    cache: {
      // Separate cache keys per tenant
      keyPrefix: (tenant: string) => `tenant:${tenant}:`,
      // Tenant-specific TTL
      ttl: 3600,
    },
  },

  // Feature flags
  features: {
    // Enable/disable features per environment
    realTimeOrders: process.env.ENVIRONMENT !== 'development',
    advancedAnalytics: process.env.ENVIRONMENT === 'production',
    betaFeatures: process.env.ENVIRONMENT === 'staging',
  },
});