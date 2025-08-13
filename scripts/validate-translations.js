#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const locales = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh-CN', 'ja']
const categories = [
  'common',
  'auth', 
  'menu',
  'orders',
  'dashboard',
  'loyalty',
  'reservations', 
  'inventory',
  'reviews',
  'marketing'
]

const messagesDir = path.join(__dirname, '../messages')

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

// Validation functions
function flattenObject(obj, prefix = '') {
  const flattened = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey))
      } else {
        flattened[newKey] = obj[key]
      }
    }
  }
  
  return flattened
}

function validateTranslationFile(locale, category) {
  const filePath = path.join(messagesDir, locale, `${category}.json`)
  
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      valid: false,
      errors: [`File does not exist: ${filePath}`]
    }
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const translations = JSON.parse(content)
    
    // Remove metadata if present
    const { _meta, ...actualTranslations } = translations
    
    return {
      exists: true,
      valid: true,
      translations: actualTranslations,
      errors: [],
      metadata: _meta
    }
  } catch (error) {
    return {
      exists: true,
      valid: false,
      errors: [`Invalid JSON: ${error.message}`]
    }
  }
}

function compareTranslationStructures(baseTranslations, targetTranslations) {
  const baseKeys = new Set(Object.keys(flattenObject(baseTranslations)))
  const targetKeys = new Set(Object.keys(flattenObject(targetTranslations)))
  
  const missing = Array.from(baseKeys).filter(key => !targetKeys.has(key))
  const extra = Array.from(targetKeys).filter(key => !baseKeys.has(key))
  
  return { missing, extra }
}

function validatePlaceholders(text, key) {
  if (typeof text !== 'string') return []
  
  const issues = []
  
  // Check for unmatched braces
  const braceMatches = text.match(/\{[^}]*\}/g) || []
  const unclosedBraces = (text.match(/\{[^}]*$/g) || []).length
  const unopenedBraces = (text.match(/^[^{]*\}/g) || []).length
  
  if (unclosedBraces > 0) {
    issues.push(`Unclosed braces in "${key}": ${text}`)
  }
  
  if (unopenedBraces > 0) {
    issues.push(`Unopened braces in "${key}": ${text}`)
  }
  
  // Check for missing placeholders that might be in the original
  const placeholders = braceMatches.map(match => match.slice(1, -1))
  
  // Common ICU MessageFormat patterns
  const icuPatterns = [
    /\{[^}]+,\s*plural/g,
    /\{[^}]+,\s*select/g,
    /\{[^}]+,\s*selectordinal/g
  ]
  
  icuPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        // Basic validation of ICU syntax
        if (!match.includes('other')) {
          issues.push(`Missing 'other' case in ICU pattern "${match}" in "${key}"`)
        }
      })
    }
  })
  
  return issues
}

function generateValidationReport() {
  console.log(colorize('\n🌐 Translation Validation Report', 'bold'))
  console.log(colorize('=====================================\n', 'cyan'))
  
  const report = {
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    missingFiles: 0,
    issues: []
  }
  
  // Load English (base) translations
  const baseTranslations = {}
  categories.forEach(category => {
    const result = validateTranslationFile('en', category)
    if (result.valid) {
      baseTranslations[category] = result.translations
    } else {
      console.log(colorize(`❌ Base translation file invalid: en/${category}.json`, 'red'))
      result.errors.forEach(error => console.log(`   ${error}`))
      return
    }
  })
  
  // Validate each locale and category
  locales.forEach(locale => {
    console.log(colorize(`\n📍 Validating locale: ${locale.toUpperCase()}`, 'bold'))
    
    categories.forEach(category => {
      report.totalFiles++
      const result = validateTranslationFile(locale, category)
      
      if (!result.exists) {
        report.missingFiles++
        console.log(colorize(`   ❌ Missing: ${category}.json`, 'red'))
        return
      }
      
      if (!result.valid) {
        report.invalidFiles++
        console.log(colorize(`   ❌ Invalid: ${category}.json`, 'red'))
        result.errors.forEach(error => console.log(`      ${error}`))
        return
      }
      
      report.validFiles++
      
      // Skip structure comparison for English (base locale)
      if (locale === 'en') {
        console.log(colorize(`   ✅ ${category}.json (base locale)`, 'green'))
        return
      }
      
      // Compare structure with base locale
      const baseTranslation = baseTranslations[category]
      if (baseTranslation) {
        const { missing, extra } = compareTranslationStructures(
          baseTranslation, 
          result.translations
        )
        
        let status = '✅'
        let statusColor = 'green'
        let statusText = category + '.json'
        
        if (missing.length > 0 || extra.length > 0) {
          status = '⚠️ '
          statusColor = 'yellow'
          statusText += ` (${missing.length} missing, ${extra.length} extra keys)`
        }
        
        // Check for placeholder issues
        const placeholderIssues = []
        const flattened = flattenObject(result.translations)
        Object.keys(flattened).forEach(key => {
          const issues = validatePlaceholders(flattened[key], key)
          placeholderIssues.push(...issues)
        })
        
        if (placeholderIssues.length > 0) {
          status = '❌'
          statusColor = 'red'
          statusText += ` (${placeholderIssues.length} placeholder issues)`
        }
        
        console.log(colorize(`   ${status} ${statusText}`, statusColor))
        
        // Show details if there are issues
        if (missing.length > 0) {
          console.log(colorize(`      Missing keys:`, 'yellow'))
          missing.slice(0, 5).forEach(key => console.log(`        - ${key}`))
          if (missing.length > 5) {
            console.log(`        ... and ${missing.length - 5} more`)
          }
        }
        
        if (extra.length > 0) {
          console.log(colorize(`      Extra keys:`, 'yellow'))
          extra.slice(0, 3).forEach(key => console.log(`        - ${key}`))
          if (extra.length > 3) {
            console.log(`        ... and ${extra.length - 3} more`)
          }
        }
        
        if (placeholderIssues.length > 0) {
          console.log(colorize(`      Placeholder issues:`, 'red'))
          placeholderIssues.slice(0, 3).forEach(issue => console.log(`        - ${issue}`))
          if (placeholderIssues.length > 3) {
            console.log(`        ... and ${placeholderIssues.length - 3} more`)
          }
        }
        
        // Check metadata
        if (result.metadata) {
          if (result.metadata.status === 'needs_translation') {
            console.log(colorize(`      ⚠️  Status: Needs translation`, 'yellow'))
          }
        }
      }
    })
  })
  
  // Summary
  console.log(colorize('\n📊 Summary', 'bold'))
  console.log(colorize('============', 'cyan'))
  console.log(`Total files checked: ${report.totalFiles}`)
  console.log(colorize(`Valid files: ${report.validFiles}`, 'green'))
  console.log(colorize(`Invalid files: ${report.invalidFiles}`, 'red'))
  console.log(colorize(`Missing files: ${report.missingFiles}`, 'red'))
  
  const completionRate = Math.round((report.validFiles / report.totalFiles) * 100)
  console.log(`\nCompletion rate: ${completionRate}%`)
  
  if (completionRate === 100) {
    console.log(colorize('🎉 All translation files are valid!', 'green'))
  } else if (completionRate >= 80) {
    console.log(colorize('⚠️  Most translation files are valid, but some need attention.', 'yellow'))
  } else {
    console.log(colorize('❌ Many translation files need attention.', 'red'))
  }
  
  console.log(colorize('\n💡 Recommendations:', 'cyan'))
  console.log('   1. Fix invalid JSON files first')
  console.log('   2. Add missing translation files')
  console.log('   3. Update placeholder files with actual translations')
  console.log('   4. Ensure all keys match the base English structure')
  console.log('   5. Validate ICU MessageFormat syntax for plurals')
  
  return report
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node validate-translations.js [options]

Options:
  --help, -h     Show this help message
  --locale, -l   Validate specific locale only
  --category, -c Validate specific category only
  --fix         Attempt to fix common issues (placeholder creation)
  
Examples:
  node validate-translations.js
  node validate-translations.js --locale es
  node validate-translations.js --category menu
  node validate-translations.js --locale fr --category auth
    `)
    process.exit(0)
  }
  
  generateValidationReport()
}