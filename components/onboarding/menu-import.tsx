'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle,
  X,
  Eye,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuImportProps {
  onImportComplete: (data: { itemCount: number, categories: any[], items: any[] }) => void
  className?: string
}

interface ParsedMenuItem {
  name: string
  description?: string
  price: number
  category: string
  image?: string
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  allergens?: string[]
}

interface ParsedCategory {
  name: string
  description?: string
  itemCount: number
}

/**
 * Menu Import Component
 * Handles CSV import, validation, and preview of menu items
 */
export function MenuImport({ onImportComplete, className }: MenuImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{
    categories: ParsedCategory[]
    items: ParsedMenuItem[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB')
        return
      }
      setFile(selectedFile)
      setError(null)
      setParsed(false)
      setPreviewData(null)
    }
  }

  const parseCSV = async () => {
    if (!file) return

    setParsing(true)
    setError(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Validate required headers
      const requiredHeaders = ['name', 'price', 'category']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
      }

      const items: ParsedMenuItem[] = []
      const categoryMap = new Map<string, number>()

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        
        if (values.length < headers.length) continue // Skip incomplete rows

        const item: ParsedMenuItem = {
          name: values[headers.indexOf('name')] || '',
          price: parseFloat(values[headers.indexOf('price')] || '0'),
          category: values[headers.indexOf('category')] || 'Uncategorized',
        }

        // Optional fields
        const descIndex = headers.indexOf('description')
        if (descIndex !== -1) {
          item.description = values[descIndex] || undefined
        }

        const imageIndex = headers.indexOf('image')
        if (imageIndex !== -1 && values[imageIndex]) {
          item.image = values[imageIndex]
        }

        // Boolean fields
        const vegetarianIndex = headers.indexOf('vegetarian')
        if (vegetarianIndex !== -1) {
          item.isVegetarian = values[vegetarianIndex].toLowerCase() === 'true' || values[vegetarianIndex] === '1'
        }

        const veganIndex = headers.indexOf('vegan')
        if (veganIndex !== -1) {
          item.isVegan = values[veganIndex].toLowerCase() === 'true' || values[veganIndex] === '1'
        }

        const glutenFreeIndex = headers.indexOf('glutenfree')
        if (glutenFreeIndex !== -1) {
          item.isGlutenFree = values[glutenFreeIndex].toLowerCase() === 'true' || values[glutenFreeIndex] === '1'
        }

        // Allergens
        const allergensIndex = headers.indexOf('allergens')
        if (allergensIndex !== -1 && values[allergensIndex]) {
          item.allergens = values[allergensIndex].split(';').map(a => a.trim())
        }

        // Validate item
        if (!item.name || isNaN(item.price) || item.price < 0) {
          console.warn(`Skipping invalid item on line ${i + 1}:`, item)
          continue
        }

        items.push(item)
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1)
      }

      if (items.length === 0) {
        throw new Error('No valid menu items found in CSV file')
      }

      // Create categories
      const categories: ParsedCategory[] = Array.from(categoryMap.entries()).map(([name, count]) => ({
        name,
        description: undefined,
        itemCount: count
      }))

      setPreviewData({ categories, items })
      setParsed(true)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
    } finally {
      setParsing(false)
    }
  }

  const handleImport = () => {
    if (previewData) {
      onImportComplete({
        itemCount: previewData.items.length,
        categories: previewData.categories,
        items: previewData.items
      })
    }
  }

  const clearFile = () => {
    setFile(null)
    setParsed(false)
    setPreviewData(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const template = [
      'name,description,price,category,vegetarian,vegan,glutenfree,allergens,image',
      'Margherita Pizza,Classic pizza with tomato and mozzarella,12.99,Pizza,true,false,false,dairy;gluten,',
      'Caesar Salad,Romaine lettuce with caesar dressing,8.99,Salads,true,false,true,dairy,',
      'Grilled Chicken,Seasoned grilled chicken breast,15.99,Mains,false,false,true,,',
      'Chocolate Cake,Rich chocolate cake slice,6.99,Desserts,true,false,false,dairy;gluten;eggs,'
    ].join('\n')

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'menu_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* CSV Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            CSV Template
          </CardTitle>
          <CardDescription>
            Download our CSV template to ensure your menu imports correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Menu Import Template</h4>
              <p className="text-sm text-gray-600">
                Includes all supported columns with sample data
              </p>
            </div>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Menu CSV
          </CardTitle>
          <CardDescription>
            Select your CSV file containing menu items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!file ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900 mb-1">
                  Click to upload your menu CSV
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  or drag and drop your file here
                </p>
                <Button variant="outline">
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!parsed && !parsing && (
                      <Button onClick={parseCSV}>
                        <Eye className="h-4 w-4 mr-2" />
                        Parse & Preview
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {parsing && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Parsing CSV file...</span>
                    </div>
                    <Progress value={undefined} className="h-2" />
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview Results */}
      {parsed && previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Preview
            </CardTitle>
            <CardDescription>
              Review your menu before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {previewData.items.length}
                </div>
                <div className="text-sm text-blue-800">Menu Items</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {previewData.categories.length}
                </div>
                <div className="text-sm text-green-800">Categories</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${(previewData.items.reduce((sum, item) => sum + item.price, 0) / previewData.items.length).toFixed(2)}
                </div>
                <div className="text-sm text-purple-800">Avg Price</div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {previewData.categories.map((category) => (
                  <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <Badge variant="secondary">{category.itemCount} items</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Items */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Sample Items (showing first 5)
              </h4>
              <div className="space-y-3">
                {previewData.items.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{item.name}</h5>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.isVegetarian && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">V</Badge>}
                        {item.isVegan && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">VG</Badge>}
                        {item.isGlutenFree && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">GF</Badge>}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      {item.allergens && item.allergens.length > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Allergens: {item.allergens.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                
                {previewData.items.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {previewData.items.length - 5} more items
                  </p>
                )}
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-center pt-4 border-t">
              <Button onClick={handleImport} size="lg" className="w-full md:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Import {previewData.items.length} Menu Items
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Format Help */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              💡
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">CSV Format Tips</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div>
                  <strong>Required columns:</strong> name, price, category
                </div>
                <div>
                  <strong>Optional columns:</strong> description, vegetarian, vegan, glutenfree, allergens, image
                </div>
                <div>
                  <strong>Boolean fields:</strong> Use "true"/"false" or "1"/"0" for vegetarian, vegan, glutenfree
                </div>
                <div>
                  <strong>Allergens:</strong> Separate multiple allergens with semicolons (e.g., "dairy;nuts;gluten")
                </div>
                <div>
                  <strong>Images:</strong> Use full URLs to images (optional)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}