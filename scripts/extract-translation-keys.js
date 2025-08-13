#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const COMPONENT_DIRS = [
  'app',
  'components',
  'pages',
  'lib'
]

const TRANSLATION_KEY_PATTERNS = [
  // useTranslations hook usage
  /useTranslations\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  
  // t() function calls
  /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
  
  // Translation with parameters
  /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g,
  
  // getTranslations in server components
  /getTranslations\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  
  // Direct namespace usage in components
  /['"`]([a-zA-Z]+\.[a-zA-Z][a-zA-Z0-9_.]*)['"]/g
]

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '*.log',
  '*.map'
]

// ANSI colors
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

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return regex.test(filePath)
    }
    return filePath.includes(pattern)
  })
}

function extractTranslationKeys(content, filePath) {
  const keys = new Set()
  const namespaces = new Set()
  
  // Extract useTranslations/getTranslations namespaces
  const namespaceMatches = content.match(/(?:useTranslations|getTranslations)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g)
  if (namespaceMatches) {
    namespaceMatches.forEach(match => {
      const namespaceMatch = match.match(/['"`]([^'"`]+)['"`]/)
      if (namespaceMatch) {
        namespaces.add(namespaceMatch[1])
      }
    })
  }
  
  // Extract t() function calls
  const tCallMatches = content.match(/\bt\s*\(\s*['"`]([^'"`]+)['"`]/g)
  if (tCallMatches) {
    tCallMatches.forEach(match => {
      const keyMatch = match.match(/['"`]([^'"`]+)['"`]/)
      if (keyMatch) {
        keys.add(keyMatch[1])
      }
    })
  }
  
  // Extract potential translation keys (namespace.key format)
  const potentialKeys = content.match(/['"`]([a-zA-Z]+\.[a-zA-Z][a-zA-Z0-9_.]*)['"]/g)
  if (potentialKeys) {
    potentialKeys.forEach(match => {
      const keyMatch = match.match(/['"`]([^'"`]+)['"`]/)
      if (keyMatch && keyMatch[1].includes('.') && !keyMatch[1].includes('/')) {
        // Filter out obvious non-translation keys
        const key = keyMatch[1]
        if (!key.includes('://') && !key.includes('@') && !key.includes('=')) {
          keys.add(key)
        }
      }
    })
  }
  
  return { keys: Array.from(keys), namespaces: Array.from(namespaces) }
}

function scanDirectory(dirPath) {
  const results = {
    files: [],
    totalKeys: new Set(),
    namespaces: new Set(),
    fileDetails: []
  }
  
  function scanRecursive(currentPath) {
    if (shouldIgnoreFile(currentPath)) {
      return
    }
    
    const items = fs.readdirSync(currentPath, { withFileTypes: true })
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item.name)
      
      if (item.isDirectory()) {
        scanRecursive(fullPath)
      } else if (item.isFile() && (
        item.name.endsWith('.tsx') || 
        item.name.endsWith('.ts') || 
        item.name.endsWith('.jsx') || 
        item.name.endsWith('.js')
      )) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8')
          const { keys, namespaces } = extractTranslationKeys(content, fullPath)
          
          if (keys.length > 0 || namespaces.length > 0) {
            results.files.push(fullPath)
            keys.forEach(key => results.totalKeys.add(key))
            namespaces.forEach(ns => results.namespaces.add(ns))
            results.fileDetails.push({
              file: fullPath,
              keys,
              namespaces
            })
          }
        } catch (error) {
          console.warn(colorize(`Warning: Could not read ${fullPath}: ${error.message}`, 'yellow'))
        }
      }
    })
  }
  
  if (fs.existsSync(dirPath)) {
    scanRecursive(dirPath)
  }
  
  return results
}

function loadExistingTranslations() {
  const translations = {}
  const messagesDir = path.join(__dirname, '../messages')
  
  if (!fs.existsSync(messagesDir)) {
    return translations
  }
  
  const locales = fs.readdirSync(messagesDir).filter(item => 
    fs.statSync(path.join(messagesDir, item)).isDirectory()
  )
  
  locales.forEach(locale => {
    translations[locale] = {}
    const localeDir = path.join(messagesDir, locale)
    
    const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.json'))
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(localeDir, file), 'utf8')
        const data = JSON.parse(content)
        const namespace = file.replace('.json', '')
        
        // Remove metadata if present
        const { _meta, ...actualTranslations } = data
        translations[locale][namespace] = actualTranslations
      } catch (error) {
        console.warn(colorize(`Warning: Could not parse ${locale}/${file}: ${error.message}`, 'yellow'))
      }
    })
  })
  
  return translations
}

function flattenTranslations(obj, prefix = '') {
  const flattened = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenTranslations(obj[key], newKey))
      } else {
        flattened[newKey] = obj[key]
      }
    }
  }
  
  return flattened
}

function analyzeTranslationUsage(extractedKeys, existingTranslations) {
  const analysis = {
    usedKeys: [],
    unusedKeys: [],
    missingKeys: [],
    allExistingKeys: new Set()
  }
  
  // Flatten all existing translations
  Object.values(existingTranslations).forEach(localeTranslations => {
    Object.values(localeTranslations).forEach(namespaceTranslations => {
      const flattened = flattenTranslations(namespaceTranslations)
      Object.keys(flattened).forEach(key => analysis.allExistingKeys.add(key))
    })
  })
  
  // Check each extracted key
  extractedKeys.forEach(key => {
    let found = false
    
    // Check if key exists in any translation file
    Object.values(existingTranslations).forEach(localeTranslations => {
      Object.values(localeTranslations).forEach(namespaceTranslations => {
        const flattened = flattenTranslations(namespaceTranslations)
        if (flattened.hasOwnProperty(key)) {
          found = true
        }
      })
    })
    
    if (found) {
      analysis.usedKeys.push(key)
    } else {
      analysis.missingKeys.push(key)
    }
  })
  
  // Find unused keys (exist in translations but not used in code)
  analysis.allExistingKeys.forEach(key => {
    if (!extractedKeys.includes(key)) {
      analysis.unusedKeys.push(key)
    }
  })
  
  return analysis
}

function generateUsageReport() {
  console.log(colorize('\n🔍 Translation Key Extraction Report', 'bold'))
  console.log(colorize('======================================\n', 'cyan'))
  
  // Scan for translation usage
  console.log(colorize('📂 Scanning directories for translation usage...', 'blue'))
  
  const allResults = {
    files: [],
    totalKeys: new Set(),
    namespaces: new Set(),
    fileDetails: []
  }
  
  COMPONENT_DIRS.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir)
    console.log(`   Scanning: ${dir}/`)
    
    const results = scanDirectory(dirPath)
    allResults.files.push(...results.files)
    results.totalKeys.forEach(key => allResults.totalKeys.add(key))
    results.namespaces.forEach(ns => allResults.namespaces.add(ns))
    allResults.fileDetails.push(...results.fileDetails)
  })
  
  console.log(colorize(`\n✅ Found translation usage in ${allResults.files.length} files`, 'green'))
  console.log(colorize(`📝 Total unique keys: ${allResults.totalKeys.size}`, 'cyan'))
  console.log(colorize(`🏷️  Namespaces used: ${Array.from(allResults.namespaces).join(', ')}`, 'cyan'))
  
  // Load existing translations
  console.log(colorize('\n📚 Loading existing translation files...', 'blue'))
  const existingTranslations = loadExistingTranslations()
  
  const locales = Object.keys(existingTranslations)
  const totalTranslationKeys = new Set()
  
  locales.forEach(locale => {
    Object.values(existingTranslations[locale]).forEach(namespaceTranslations => {
      const flattened = flattenTranslations(namespaceTranslations)
      Object.keys(flattened).forEach(key => totalTranslationKeys.add(key))
    })
  })
  
  console.log(colorize(`✅ Loaded translations for ${locales.length} locales`, 'green'))
  console.log(colorize(`📝 Total translation keys: ${totalTranslationKeys.size}`, 'cyan'))
  
  // Analyze usage
  console.log(colorize('\n🔎 Analyzing key usage...', 'blue'))
  const analysis = analyzeTranslationUsage(Array.from(allResults.totalKeys), existingTranslations)
  
  // Report results
  console.log(colorize('\n📊 Analysis Results', 'bold'))
  console.log(colorize('==================', 'cyan'))
  
  console.log(colorize(`✅ Keys used in code: ${analysis.usedKeys.length}`, 'green'))
  console.log(colorize(`❌ Keys missing from translations: ${analysis.missingKeys.length}`, 'red'))
  console.log(colorize(`⚠️  Keys in translations but not used: ${analysis.unusedKeys.length}`, 'yellow'))
  
  // Show missing keys
  if (analysis.missingKeys.length > 0) {
    console.log(colorize('\n❌ Missing Translation Keys:', 'red'))
    analysis.missingKeys.slice(0, 10).forEach(key => {
      console.log(`   - ${key}`)
    })
    if (analysis.missingKeys.length > 10) {
      console.log(`   ... and ${analysis.missingKeys.length - 10} more`)
    }
  }
  
  // Show unused keys
  if (analysis.unusedKeys.length > 0) {
    console.log(colorize('\n⚠️  Unused Translation Keys:', 'yellow'))
    analysis.unusedKeys.slice(0, 10).forEach(key => {
      console.log(`   - ${key}`)
    })
    if (analysis.unusedKeys.length > 10) {
      console.log(`   ... and ${analysis.unusedKeys.length - 10} more`)
    }
  }
  
  // Show file details
  console.log(colorize('\n📄 Files with translations:', 'blue'))
  allResults.fileDetails.slice(0, 10).forEach(detail => {
    const relativePath = path.relative(process.cwd(), detail.file)
    console.log(`   ${relativePath}`)
    if (detail.namespaces.length > 0) {
      console.log(colorize(`     Namespaces: ${detail.namespaces.join(', ')}`, 'cyan'))
    }
    if (detail.keys.length > 0) {
      console.log(colorize(`     Keys: ${detail.keys.slice(0, 3).join(', ')}${detail.keys.length > 3 ? '...' : ''}`, 'cyan'))
    }
  })
  
  if (allResults.fileDetails.length > 10) {
    console.log(`   ... and ${allResults.fileDetails.length - 10} more files`)
  }
  
  // Recommendations
  console.log(colorize('\n💡 Recommendations:', 'cyan'))
  if (analysis.missingKeys.length > 0) {
    console.log('   1. Add missing keys to translation files')
  }
  if (analysis.unusedKeys.length > 0) {
    console.log('   2. Remove unused keys to reduce bundle size')
  }
  console.log('   3. Ensure all translation keys follow consistent naming conventions')
  console.log('   4. Consider organizing keys by feature/component for better maintainability')
  
  return {
    extractedKeys: Array.from(allResults.totalKeys),
    analysis,
    fileDetails: allResults.fileDetails
  }
}

// Export for programmatic use
function extractAllKeys() {
  const allResults = {
    totalKeys: new Set(),
    namespaces: new Set()
  }
  
  COMPONENT_DIRS.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir)
    if (fs.existsSync(dirPath)) {
      const results = scanDirectory(dirPath)
      results.totalKeys.forEach(key => allResults.totalKeys.add(key))
      results.namespaces.forEach(ns => allResults.namespaces.add(ns))
    }
  })
  
  return {
    keys: Array.from(allResults.totalKeys),
    namespaces: Array.from(allResults.namespaces)
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node extract-translation-keys.js [options]

Options:
  --help, -h          Show this help message
  --keys-only         Only extract and list keys (no analysis)
  --output, -o FILE   Output results to JSON file
  --missing           Only show missing keys
  --unused            Only show unused keys
  
Examples:
  node extract-translation-keys.js
  node extract-translation-keys.js --keys-only
  node extract-translation-keys.js --output translation-analysis.json
  node extract-translation-keys.js --missing
    `)
    process.exit(0)
  }
  
  if (args.includes('--keys-only')) {
    const { keys, namespaces } = extractAllKeys()
    console.log('Extracted Keys:')
    keys.forEach(key => console.log(`  ${key}`))
    console.log(`\nNamespaces:`)
    namespaces.forEach(ns => console.log(`  ${ns}`))
  } else {
    const report = generateUsageReport()
    
    const outputFile = args[args.indexOf('--output') + 1] || args[args.indexOf('-o') + 1]
    if (outputFile && (args.includes('--output') || args.includes('-o'))) {
      fs.writeFileSync(outputFile, JSON.stringify(report, null, 2))
      console.log(colorize(`\n📁 Report saved to: ${outputFile}`, 'green'))
    }
  }
}

module.exports = {
  extractAllKeys,
  generateUsageReport,
  analyzeTranslationUsage
}