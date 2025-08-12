// Environment variables type definitions for Cloudflare Workers
interface CloudflareEnv {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  
  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  
  // Application
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_API_URL: string
  NEXT_PUBLIC_ROOT_DOMAIN: string
  
  // Authentication
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
  JWT_SECRET: string
  
  // Database
  DATABASE_URL: string
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS?: string
  NEXT_PUBLIC_ENABLE_CHAT?: string
  NEXT_PUBLIC_ENABLE_NOTIFICATIONS?: string
  
  // Analytics
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?: string
  NEXT_PUBLIC_POSTHOG_KEY?: string
  NEXT_PUBLIC_POSTHOG_HOST?: string
  
  // Email
  EMAIL_FROM?: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USER?: string
  SMTP_PASSWORD?: string
  
  // File storage
  NEXT_PUBLIC_UPLOADTHING_APP_ID?: string
  UPLOADTHING_SECRET?: string
  
  // Security
  BCRYPT_SALT_ROUNDS?: string
  WEBHOOK_SECRET?: string
  
  // Rate limiting
  RATE_LIMIT_MAX?: string
  RATE_LIMIT_WINDOW?: string
  
  // Cloudflare
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_ZONE_ID?: string
  
  // Monitoring
  SENTRY_DSN?: string
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string
  
  // Development
  NODE_ENV: 'development' | 'production' | 'test'
  DEBUG?: string
  VERBOSE_LOGGING?: string
}

// Extend the global namespace for Node.js environment
declare global {
  namespace NodeJS {
    interface ProcessEnv extends CloudflareEnv {}
  }
}

// Cloudflare Workers types
declare module '@cloudflare/workers-types' {
  interface Env extends CloudflareEnv {}
}

export {};