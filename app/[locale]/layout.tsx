import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, unstable_setRequestLocale } from 'next-intl/server'
import { locales, type Locale } from '@/i18n'
import { AuthProvider } from '@/contexts/auth-context'
import '../globals.css'

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

interface LocalizedLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string }
}): Promise<Metadata> {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  // Get localized metadata
  const getLocalizedMetadata = (locale: Locale): Metadata => {
    const titles: Record<Locale, string> = {
      en: 'Restaurant SaaS - Complete Restaurant Management Platform',
      es: 'Restaurant SaaS - Plataforma Completa de Gestión de Restaurantes',
      fr: 'Restaurant SaaS - Plateforme Complète de Gestion de Restaurant',
      de: 'Restaurant SaaS - Komplette Restaurant-Management-Plattform',
      it: 'Restaurant SaaS - Piattaforma Completa di Gestione Ristorante',
      pt: 'Restaurant SaaS - Plataforma Completa de Gestão de Restaurante',
      'zh-CN': 'Restaurant SaaS - 完整的餐厅管理平台',
      ja: 'Restaurant SaaS - 完全なレストラン管理プラットフォーム'
    }

    const descriptions: Record<Locale, string> = {
      en: 'The complete solution for restaurant management, online ordering, and customer engagement.',
      es: 'La solución completa para gestión de restaurantes, pedidos online y compromiso con clientes.',
      fr: 'La solution complète pour la gestion de restaurant, les commandes en ligne et l\'engagement client.',
      de: 'Die komplette Lösung für Restaurantmanagement, Online-Bestellungen und Kundenbindung.',
      it: 'La soluzione completa per la gestione del ristorante, ordini online e coinvolgimento clienti.',
      pt: 'A solução completa para gestão de restaurante, pedidos online e engajamento de clientes.',
      'zh-CN': '餐厅管理、在线订餐和客户互动的完整解决方案。',
      ja: 'レストラン管理、オンライン注文、顧客エンゲージメントの完全なソリューション。'
    }

    return {
      title: {
        template: `%s | ${titles[locale]}`,
        default: titles[locale],
      },
      description: descriptions[locale],
      openGraph: {
        type: 'website',
        locale: locale === 'zh-CN' ? 'zh_CN' : locale,
        url: process.env.NEXT_PUBLIC_APP_URL,
        title: titles[locale],
        description: descriptions[locale],
        siteName: 'Restaurant SaaS',
      },
      twitter: {
        card: 'summary_large_image',
        title: titles[locale],
        description: descriptions[locale],
      },
    }
  }

  return getLocalizedMetadata(locale as Locale)
}

export default async function LocalizedLayout({
  children,
  params: { locale }
}: LocalizedLayoutProps) {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  // Enable static rendering
  unstable_setRequestLocale(locale)

  // Fetch messages for this locale
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
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
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="origin-when-cross-origin" />
        
        {/* Language alternates */}
        {locales.map((loc) => (
          <link
            key={loc}
            rel="alternate"
            hrefLang={loc === 'zh-CN' ? 'zh-CN' : loc}
            href={`${process.env.NEXT_PUBLIC_APP_URL}/${loc === 'en' ? '' : loc}`}
          />
        ))}
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
        
        {/* Main content with NextIntl provider */}
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
          </AuthProvider>
        </NextIntlClientProvider>
        
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
          </>
        )}
      </body>
    </html>
  )
}