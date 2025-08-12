import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'

// Font configurations
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// Metadata configuration
export const metadata: Metadata = {
  title: {
    template: '%s | Restaurant SaaS',
    default: 'Restaurant SaaS - Complete Restaurant Management Platform',
  },
  description: 'The complete solution for restaurant management, online ordering, and customer engagement.',
  keywords: [
    'restaurant management',
    'online ordering',
    'restaurant software',
    'food delivery',
    'restaurant POS',
    'menu management',
  ],
  authors: [{ name: 'Restaurant SaaS Team' }],
  creator: 'Restaurant SaaS',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'Restaurant SaaS',
    description: 'The complete solution for restaurant management, online ordering, and customer engagement.',
    siteName: 'Restaurant SaaS',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Restaurant SaaS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Restaurant SaaS',
    description: 'The complete solution for restaurant management, online ordering, and customer engagement.',
    images: ['/og-image.jpg'],
    creator: '@restaurantsaas',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

// Viewport configuration
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Additional meta tags for performance and security */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#e66833" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Critical resources loaded automatically by Next.js font optimization */}
        
        {/* Security headers (additional to next.config.mjs) */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="origin-when-cross-origin" />
      </head>
      <body 
        className={`
          ${inter.variable} 
          ${poppins.variable} 
          font-sans 
          antialiased 
          bg-background 
          text-foreground
        `}
        suppressHydrationWarning
      >
        {/* Background patterns for visual appeal */}
        <div className="fixed inset-0 -z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-brand-50/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,var(--background))]" />
        </div>
        
        {/* Main content */}
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </AuthProvider>
        
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Skip to main content
        </a>
        
        {/* Analytics scripts will be added here */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics */}
            {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
              <>
                <script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
                />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
                    `,
                  }}
                />
              </>
            )}
            
            {/* PostHog Analytics */}
            {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                    posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}', {api_host: '${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}'})
                  `,
                }}
              />
            )}
          </>
        )}
      </body>
    </html>
  )
}