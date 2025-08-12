# Restaurant SaaS Platform

A complete, production-ready multi-tenant restaurant management platform built with Next.js 15, designed for Cloudflare Workers deployment.

## 🚀 Features

### 🏢 Multi-Tenancy
- **Subdomain-based tenant resolution** (`restaurant.domain.com`)
- **Custom domain support** for enterprise clients
- **Tenant isolation** with secure data separation
- **Dynamic routing** based on restaurant context

### 🍽️ Restaurant Management
- **Complete menu management** with categories, items, and customizations
- **Order processing** with real-time status updates
- **Customer management** and analytics
- **Staff role management** with granular permissions
- **Inventory tracking** and low-stock alerts

### 💳 Payment Integration
- **Stripe integration** for secure payment processing
- **Subscription management** with multiple tiers
- **One-time payments** for orders
- **Automated billing** and invoice generation

### 📊 Analytics & Insights
- **Revenue analytics** with detailed reporting
- **Order trends** and customer behavior analysis
- **Menu performance** optimization insights
- **Staff productivity** metrics

### 🔧 Platform Administration
- **Super admin dashboard** for platform management
- **Restaurant onboarding** and verification
- **System monitoring** and health checks
- **Billing management** across all tenants

## 🛠️ Tech Stack

### Core Framework
- **Next.js 15** with App Router
- **TypeScript** with strict mode enabled
- **React 18** with Server Components

### Styling & UI
- **Tailwind CSS v4** with custom design system
- **shadcn/ui** component library
- **Lucide React** for icons
- **Responsive design** with mobile-first approach

### Database & Backend
- **Supabase** for PostgreSQL database and authentication
- **Prisma ORM** for type-safe database operations
- **Row Level Security** for tenant data isolation
- **Real-time subscriptions** for live updates

### Payments & Subscriptions
- **Stripe** for payment processing
- **Stripe Checkout** for seamless payment flows
- **Subscription management** with webhooks
- **Multi-currency support**

### Deployment & Infrastructure
- **Cloudflare Workers** for edge deployment
- **Cloudflare Pages** for static assets
- **Edge-optimized** with global CDN
- **Auto-scaling** based on demand

### Developer Experience
- **TypeScript** throughout the entire codebase
- **ESLint & Prettier** for code quality
- **Husky** for git hooks
- **Comprehensive type definitions** for all entities

## 📁 Project Structure

```
restaurant-saas/
├── app/
│   ├── (platform)/          # Main platform routes (landing, auth)
│   │   ├── page.tsx         # Landing page
│   │   ├── login/           # Authentication pages
│   │   └── signup/
│   ├── (admin)/             # Platform admin routes
│   │   └── admin/
│   │       ├── dashboard/   # Admin dashboard
│   │       └── restaurants/ # Restaurant management
│   ├── (restaurant)/        # Restaurant customer-facing routes
│   │   └── [subdomain]/     # Dynamic subdomain routing
│   │       ├── page.tsx     # Restaurant homepage
│   │       ├── menu/        # Menu browsing
│   │       ├── cart/        # Shopping cart
│   │       └── order/       # Order placement
│   └── (staff)/             # Restaurant staff routes
│       └── dashboard/       # Staff management interface
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── platform/            # Platform-specific components
│   ├── admin/               # Admin components
│   ├── restaurant/          # Customer-facing components
│   ├── staff/               # Staff dashboard components
│   └── providers/           # Context providers
├── lib/
│   ├── supabase/            # Supabase client configuration
│   ├── stripe/              # Stripe integration
│   └── utils.ts             # Utility functions
├── types/                   # TypeScript type definitions
├── middleware.ts            # Multi-tenant routing middleware
└── wrangler.toml           # Cloudflare Workers configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account
- Cloudflare account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd restaurant-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required environment variables:
   - Supabase URL and keys
   - Stripe keys
   - Database URL
   - Authentication secrets

4. **Set up database**
   - Create a new Supabase project
   - Run the database migrations
   - Set up Row Level Security policies

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Multi-Tenant Setup

1. **Configure DNS** for your domain to point to Cloudflare
2. **Set up wildcard subdomains** (*.yourdomain.com)
3. **Configure middleware** for tenant resolution
4. **Set up custom domains** for enterprise clients

## 🚢 Deployment

### Cloudflare Workers Deployment

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Authenticate with Cloudflare**
   ```bash
   wrangler login
   ```

3. **Configure wrangler.toml**
   - Update the `name` field
   - Set up custom domains
   - Configure environment variables

4. **Deploy to Cloudflare**
   ```bash
   npm run deploy
   ```

### Environment Variables for Production

Set production secrets using Wrangler:

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
wrangler secret put NEXTAUTH_SECRET --env production
```

## 🏗️ Architecture

### Multi-Tenancy Model
- **Subdomain-based routing** with middleware
- **Shared database** with tenant isolation
- **Row Level Security** for data protection
- **Tenant context** propagation throughout the app

### Security Features
- **JWT-based authentication** with Supabase
- **Role-based access control** (RBAC)
- **Input validation** with Zod schemas
- **CSRF protection** and security headers
- **Rate limiting** for API endpoints

### Performance Optimizations
- **Edge deployment** with Cloudflare Workers
- **Static generation** for marketing pages
- **Image optimization** with Cloudflare Images
- **Database query optimization** with proper indexing
- **Caching strategies** for frequently accessed data

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.restaurantsaas.com](https://docs.restaurantsaas.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/restaurant-saas/issues)
- **Discord**: [Join our Discord](https://discord.gg/restaurantsaas)
- **Email**: support@restaurantsaas.com

## 🗺️ Roadmap

- [ ] Mobile apps (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration marketplace
- [ ] AI-powered recommendations
- [ ] Voice ordering integration
- [ ] Loyalty program features
- [ ] Advanced inventory management

---

**Built with ❤️ for the restaurant industry**