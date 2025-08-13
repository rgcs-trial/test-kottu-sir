#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const locales = ['es', 'fr', 'de', 'it', 'pt', 'zh-CN', 'ja']
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
const enDir = path.join(messagesDir, 'en')

// Check if English files exist
if (!fs.existsSync(enDir)) {
  console.error('English translation directory not found!')
  process.exit(1)
}

// Copy English files to other locales as placeholders
locales.forEach(locale => {
  const localeDir = path.join(messagesDir, locale)
  
  // Create locale directory if it doesn't exist
  if (!fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir, { recursive: true })
    console.log(`Created directory: ${localeDir}`)
  }
  
  categories.forEach(category => {
    const sourceFile = path.join(enDir, `${category}.json`)
    const targetFile = path.join(localeDir, `${category}.json`)
    
    // Only copy if source exists and target doesn't exist
    if (fs.existsSync(sourceFile) && !fs.existsSync(targetFile)) {
      try {
        // Read English content
        const content = fs.readFileSync(sourceFile, 'utf8')
        const translations = JSON.parse(content)
        
        // Add a comment indicating this is a placeholder
        const placeholder = {
          "_meta": {
            "locale": locale,
            "source": "en",
            "status": "needs_translation",
            "generated": new Date().toISOString()
          },
          ...translations
        }
        
        // Write placeholder file
        fs.writeFileSync(targetFile, JSON.stringify(placeholder, null, 2))
        console.log(`Created placeholder: ${targetFile}`)
      } catch (error) {
        console.error(`Error creating placeholder for ${locale}/${category}.json:`, error.message)
      }
    }
  })
})

console.log('Translation placeholders created successfully!')
console.log('Remember to translate the placeholder files for production use.')