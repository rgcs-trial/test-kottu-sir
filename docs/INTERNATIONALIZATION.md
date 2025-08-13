# Internationalization (i18n) Implementation Guide

## Overview

This document provides a comprehensive guide to the internationalization implementation for the Restaurant SaaS platform. The system supports 8 languages with full localization of UI elements, formatting, and restaurant-specific content.

## Supported Languages

| Language | Code | Locale | Flag | Currency |
|----------|------|--------|------|----------|
| English (Default) | `en` | `en-US` | 🇺🇸 | USD |
| Spanish | `es` | `es-ES` | 🇪🇸 | EUR |
| French | `fr` | `fr-FR` | 🇫🇷 | EUR |
| German | `de` | `de-DE` | 🇩🇪 | EUR |
| Italian | `it` | `it-IT` | 🇮🇹 | EUR |
| Portuguese | `pt` | `pt-PT` | 🇵🇹 | EUR |
| Chinese Simplified | `zh-CN` | `zh-CN` | 🇨🇳 | CNY |
| Japanese | `ja` | `ja-JP` | 🇯🇵 | JPY |

## Architecture

### Core Components

1. **next-intl**: Primary internationalization library for Next.js 15
2. **Middleware**: Locale detection and URL routing
3. **Translation Files**: Organized JSON files by category and language
4. **Formatting Components**: Locale-aware date, currency, and number formatting
5. **Restaurant Features**: Multi-language menu and review management

### Directory Structure

```
messages/
├── en/                 # English (base language)
│   ├── common.json     # Navigation, buttons, forms
│   ├── auth.json       # Authentication
│   ├── menu.json       # Menu categories, modifiers
│   ├── orders.json     # Order management
│   ├── dashboard.json  # Staff dashboard
│   ├── loyalty.json    # Loyalty program
│   ├── reservations.json # Table reservations
│   ├── inventory.json  # Inventory management
│   ├── reviews.json    # Customer reviews
│   └── marketing.json  # Marketing campaigns
├── es/                 # Spanish translations
├── fr/                 # French translations
├── de/                 # German translations
├── it/                 # Italian translations
├── pt/                 # Portuguese translations
├── zh-CN/              # Chinese Simplified translations
└── ja/                 # Japanese translations

components/i18n/
├── language-switcher.tsx      # Language selection UI
├── locale-provider.tsx        # Client-side locale context
├── date-formatter.tsx         # Localized date formatting
├── currency-formatter.tsx     # Currency and number formatting
├── number-formatter.tsx       # Number and unit formatting
├── menu-translation-manager.tsx    # Restaurant menu translations
└── translated-content.tsx     # Dynamic content translation

scripts/
├── validate-translations.js   # Translation file validation
├── extract-translation-keys.js # Key extraction and usage analysis
└── create-translation-placeholders.js # Generate placeholder files
```

## Quick Start

### 1. Basic Usage in Components

```typescript
'use client'
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('common')
  
  return (
    <div>
      <h1>{t('navigation.home')}</h1>
      <button>{t('buttons.save')}</button>
    </div>
  )
}
```

### 2. Server Components

```typescript
import { getTranslations } from 'next-intl/server'

export default async function ServerComponent() {
  const t = await getTranslations('common')
  
  return <h1>{t('navigation.dashboard')}</h1>
}
```

### 3. Language Switcher

```typescript
import { LanguageSwitcher } from '@/components/i18n/language-switcher'

export function Header() {
  return (
    <nav>
      {/* Other nav items */}
      <LanguageSwitcher variant="header" />
    </nav>
  )
}
```

## Translation File Structure

### Example: `messages/en/common.json`

```json
{
  "navigation": {
    "home": "Home",
    "menu": "Menu",
    "orders": "Orders",
    "dashboard": "Dashboard"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "time": {
    "minutes": "{count, plural, =1 {# minute} other {# minutes}}",
    "hours": "{count, plural, =1 {# hour} other {# hours}}"
  }
}
```

### ICU MessageFormat Support

The system supports rich formatting using ICU MessageFormat:

```json
{
  "welcome": "Welcome {name}!",
  "items": "{count, plural, =0 {no items} =1 {# item} other {# items}}",
  "price": "Price: {amount, number, currency}"
}
```

## Formatting Components

### Currency Formatting

```typescript
import { Price, CurrencyFormatter } from '@/components/i18n/currency-formatter'

// Simple price display
<Price amount={29.99} />

// Custom currency
<CurrencyFormatter 
  amount={100} 
  currency="EUR" 
  showCents={false} 
/>
```

### Date Formatting

```typescript
import { DateFormatter, RelativeTime } from '@/components/i18n/date-formatter'

// Formatted date
<DateFormatter date={new Date()} format="medium" />

// Relative time
<RelativeTime date={orderDate} />
```

### Number Formatting

```typescript
import { NumberFormatter, CompactNumber } from '@/components/i18n/number-formatter'

// Large numbers
<CompactNumber value={1500} /> // "1.5K"

// Precise decimals  
<NumberFormatter value={3.14159} maximumFractionDigits={2} />
```

## Restaurant-Specific Features

### Menu Translation Management

```typescript
import { MenuTranslationManager } from '@/components/i18n/menu-translation-manager'

export function MenuAdmin() {
  const handleSave = async (translations) => {
    // Save translations to database
    await saveMenuTranslations(itemId, translations)
  }

  return (
    <MenuTranslationManager
      menuItem={{
        id: "item-1",
        name: "Margherita Pizza",
        description: "Classic tomato sauce and mozzarella"
      }}
      onSave={handleSave}
    />
  )
}
```

### Translated Content Display

```typescript
import { MenuItemContent } from '@/components/i18n/translated-content'

export function MenuItem({ item }) {
  return (
    <MenuItemContent
      name={item.name}
      description={item.description}
      translations={item.translations}
      showTranslationStatus={true}
    />
  )
}
```

## URL Structure and Routing

### Locale-based URLs

- Default (English): `/dashboard`, `/menu`
- Localized: `/es/dashboard`, `/fr/menu`, `/de/orders`

### Middleware Configuration

The middleware handles:
- Automatic locale detection from browser preferences
- URL routing with locale prefixes
- Tenant-specific routing with i18n support
- Fallback to default language

## Database Schema for Restaurant Translations

### Menu Item Translations

```sql
CREATE TABLE menu_item_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[],
  allergens TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(menu_item_id, locale)
);
```

### Review Translations

```sql
CREATE TABLE review_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  title TEXT,
  comment TEXT NOT NULL,
  translated_by VARCHAR(50) DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(review_id, locale)
);
```

## API Integration

### Menu Translation API

```typescript
// Save menu item translations
POST /api/menu/:itemId/translations
{
  "translations": [
    {
      "locale": "es",
      "name": "Pizza Margherita",
      "description": "Salsa de tomate clásica y mozzarella"
    }
  ]
}

// Get menu item with translations
GET /api/menu/:itemId?locale=es
```

### Translation Status API

```typescript
// Get translation completeness for restaurant
GET /api/restaurant/:id/translation-status
{
  "completeness": {
    "es": { "menu": 85, "categories": 100 },
    "fr": { "menu": 60, "categories": 80 }
  }
}
```

## Development Workflow

### Adding New Translation Keys

1. **Add to English base file** (`messages/en/*.json`)
2. **Update placeholder files**:
   ```bash
   npm run i18n:update-placeholders
   ```
3. **Validate translations**:
   ```bash
   npm run i18n:validate
   ```
4. **Extract usage**:
   ```bash
   npm run i18n:extract-keys
   ```

### Validation and Quality Assurance

```bash
# Validate all translation files
npm run i18n:validate

# Check for missing or unused keys
npm run i18n:extract-keys

# Generate translation report
npm run i18n:report
```

### Scripts Available

```json
{
  "scripts": {
    "i18n:validate": "node scripts/validate-translations.js",
    "i18n:extract-keys": "node scripts/extract-translation-keys.js",
    "i18n:update-placeholders": "node scripts/create-translation-placeholders.js",
    "i18n:report": "node scripts/extract-translation-keys.js --output i18n-report.json"
  }
}
```

## Best Practices

### 1. Translation Key Organization

- **Hierarchical structure**: Use nested objects for organization
- **Consistent naming**: Use camelCase for keys
- **Contextual grouping**: Group related keys together

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "emailLabel": "Email Address",
      "errors": {
        "invalidCredentials": "Invalid email or password"
      }
    }
  }
}
```

### 2. ICU MessageFormat Usage

- **Always include 'other' case** for plurals
- **Use descriptive parameter names**
- **Consider cultural differences** in plural rules

```json
{
  "orderCount": "{count, plural, =0 {No orders} =1 {One order} other {{count} orders}}"
}
```

### 3. Performance Optimization

- **Namespace splitting**: Load only required translations
- **Tree shaking**: Remove unused translations in production
- **Caching**: Leverage browser and CDN caching

### 4. Content Guidelines

- **Keep text concise**: UI space may vary between languages
- **Avoid concatenation**: Use ICU formatting instead
- **Cultural sensitivity**: Consider cultural context in translations
- **Consistent terminology**: Maintain glossaries for technical terms

## Testing

### Unit Testing Translations

```typescript
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

const messages = {
  common: { 'buttons.save': 'Save' }
}

test('displays translated text', () => {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MyComponent />
    </NextIntlClientProvider>
  )
  
  expect(screen.getByText('Save')).toBeInTheDocument()
})
```

### Integration Testing

```typescript
describe('Language Switching', () => {
  test('switches language correctly', async () => {
    // Test language switcher functionality
    // Verify URL changes and content updates
  })
})
```

## Performance Considerations

### Bundle Optimization

- **Code splitting**: Translations loaded per route
- **Compression**: Gzip compression for JSON files
- **CDN caching**: Static translation files cached globally

### Runtime Performance

- **Memoization**: Translation functions are memoized
- **Lazy loading**: Non-critical translations loaded on demand
- **Client-side caching**: Browser storage for user preferences

## Security

### Input Validation

- **Translation key validation**: Keys validated against allowlist
- **Content sanitization**: User-generated translations sanitized
- **XSS protection**: Automatic HTML escaping

### Access Control

- **Tenant isolation**: Restaurant translations scoped by ownership
- **Role-based access**: Translation management requires proper permissions

## Troubleshooting

### Common Issues

**Translation not showing:**
1. Check if key exists in translation file
2. Verify correct namespace usage
3. Check browser console for missing key warnings

**Formatting errors:**
1. Validate ICU MessageFormat syntax
2. Check parameter names match
3. Ensure all required plural cases included

**Performance issues:**
1. Check for excessive re-renders
2. Verify translation memoization
3. Monitor bundle size

### Debug Tools

```typescript
// Enable debug mode
const t = useTranslations('common')
console.log('Available keys:', Object.keys(t.raw()))

// Check current locale
const locale = useLocale()
console.log('Current locale:', locale)
```

## Deployment

### Build Process

1. **Translation validation**: All files validated during build
2. **Bundle optimization**: Unused translations removed
3. **Static generation**: Translations pre-built for performance

### Environment Variables

```env
# Default locale (optional, defaults to 'en')
NEXT_PUBLIC_DEFAULT_LOCALE=en

# Supported locales (optional, uses config)
NEXT_PUBLIC_SUPPORTED_LOCALES=en,es,fr,de,it,pt,zh-CN,ja
```

## Monitoring and Analytics

### Translation Metrics

- **Completion rates**: Track translation progress
- **Usage analytics**: Monitor language preferences
- **Error tracking**: Log missing translations

### Business Intelligence

- **Market analysis**: Language usage by region
- **Content effectiveness**: Translation impact on engagement
- **User preferences**: Language switching patterns

## Future Enhancements

### Planned Features

1. **AI Translation Integration**: Automatic translation suggestions
2. **Translation Memory**: Reuse existing translations
3. **Collaborative Translation**: Multi-user translation workflow
4. **Advanced Analytics**: Translation ROI tracking

### Extensibility

The system is designed for easy extension:

- **New languages**: Add locale config and translation files
- **Custom formatting**: Create new formatter components  
- **Integration APIs**: Connect external translation services
- **Advanced features**: Build on existing architecture

---

## Support

For questions or issues with the i18n implementation:

1. Check this documentation
2. Review validation script output
3. Check security guidelines
4. Submit issues through proper channels

**Last Updated**: August 2025
**Version**: 1.0.0
**Next Review**: February 2025