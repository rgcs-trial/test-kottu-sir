'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { locales, localeNames, type Locale } from '@/i18n'
import { Globe, Check, AlertCircle, Edit, Save } from 'lucide-react'

interface MenuTranslation {
  locale: Locale
  name: string
  description?: string
  category?: string
  ingredients?: string[]
  allergens?: string[]
  isCompleted: boolean
  lastUpdated?: Date
}

interface MenuItemTranslations {
  id: string
  defaultName: string
  defaultDescription?: string
  translations: MenuTranslation[]
}

interface MenuTranslationManagerProps {
  menuItem: {
    id: string
    name: string
    description?: string
    category?: string
    ingredients?: string[]
    allergens?: string[]
  }
  translations?: MenuItemTranslations
  onSave: (translations: MenuTranslation[]) => Promise<void>
  className?: string
}

export function MenuTranslationManager({
  menuItem,
  translations,
  onSave,
  className = ''
}: MenuTranslationManagerProps) {
  const t = useTranslations('menu')
  const currentLocale = useLocale()
  const [activeTab, setActiveTab] = useState<Locale>('es') // Start with first non-English locale
  const [editingTranslations, setEditingTranslations] = useState<MenuTranslation[]>(
    translations?.translations || 
    locales.filter(l => l !== 'en').map(locale => ({
      locale,
      name: '',
      description: '',
      category: '',
      ingredients: [],
      allergens: [],
      isCompleted: false
    }))
  )
  const [isSaving, setIsSaving] = useState(false)

  const getTranslationStatus = (locale: Locale): 'complete' | 'partial' | 'missing' => {
    const translation = editingTranslations.find(t => t.locale === locale)
    if (!translation || !translation.name) return 'missing'
    if (translation.name && translation.description) return 'complete'
    return 'partial'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'missing': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const updateTranslation = (locale: Locale, field: keyof MenuTranslation, value: any) => {
    setEditingTranslations(prev => 
      prev.map(translation => 
        translation.locale === locale 
          ? { 
              ...translation, 
              [field]: value,
              lastUpdated: new Date(),
              isCompleted: field === 'name' ? !!value : translation.isCompleted
            }
          : translation
      )
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(editingTranslations)
    } finally {
      setIsSaving(false)
    }
  }

  const getCompletionPercentage = () => {
    const nonEnglishLocales = locales.filter(l => l !== 'en')
    const completed = nonEnglishLocales.filter(locale => 
      getTranslationStatus(locale) === 'complete'
    ).length
    return Math.round((completed / nonEnglishLocales.length) * 100)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with original item info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Menu Item Translations
          </CardTitle>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Original (English):</span> {menuItem.name}
            </div>
            {menuItem.description && (
              <div className="text-sm text-muted-foreground">
                {menuItem.description}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm">Translation Progress:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getCompletionPercentage()}%` }}
                />
              </div>
              <span className="text-sm font-medium">{getCompletionPercentage()}%</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Translation tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Locale)}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-7">
          {locales.filter(l => l !== 'en').map((locale) => {
            const status = getTranslationStatus(locale)
            return (
              <TabsTrigger
                key={locale}
                value={locale}
                className="flex items-center gap-2 text-xs"
              >
                <span className="hidden sm:inline">{localeNames[locale]}</span>
                <span className="sm:hidden">{locale}</span>
                <Badge 
                  className={`h-2 w-2 p-0 ${getStatusColor(status)}`}
                  variant="secondary"
                />
              </TabsTrigger>
            )
          })}
        </TabsList>

        {locales.filter(l => l !== 'en').map((locale) => {
          const translation = editingTranslations.find(t => t.locale === locale) || {
            locale,
            name: '',
            description: '',
            category: '',
            ingredients: [],
            allergens: [],
            isCompleted: false
          }

          return (
            <TabsContent key={locale} value={locale} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {localeNames[locale]} Translation
                    </span>
                    <Badge className={getStatusColor(getTranslationStatus(locale))}>
                      {getTranslationStatus(locale)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Item name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Item Name *
                    </label>
                    <Input
                      value={translation.name}
                      onChange={(e) => updateTranslation(locale, 'name', e.target.value)}
                      placeholder={`Translate "${menuItem.name}" to ${localeNames[locale]}`}
                      required
                    />
                  </div>

                  {/* Description */}
                  {menuItem.description && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Description
                      </label>
                      <Textarea
                        value={translation.description}
                        onChange={(e) => updateTranslation(locale, 'description', e.target.value)}
                        placeholder={`Translate "${menuItem.description}" to ${localeNames[locale]}`}
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Category */}
                  {menuItem.category && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Category
                      </label>
                      <Input
                        value={translation.category}
                        onChange={(e) => updateTranslation(locale, 'category', e.target.value)}
                        placeholder={`Translate "${menuItem.category}" to ${localeNames[locale]}`}
                      />
                    </div>
                  )}

                  {/* Ingredients */}
                  {menuItem.ingredients && menuItem.ingredients.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Ingredients
                      </label>
                      <Textarea
                        value={translation.ingredients?.join(', ') || ''}
                        onChange={(e) => updateTranslation(
                          locale, 
                          'ingredients', 
                          e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        )}
                        placeholder={`Translate ingredients: ${menuItem.ingredients.join(', ')}`}
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Allergens */}
                  {menuItem.allergens && menuItem.allergens.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Allergens
                      </label>
                      <Textarea
                        value={translation.allergens?.join(', ') || ''}
                        onChange={(e) => updateTranslation(
                          locale, 
                          'allergens', 
                          e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        )}
                        placeholder={`Translate allergens: ${menuItem.allergens.join(', ')}`}
                        rows={2}
                      />
                    </div>
                  )}

                  {translation.lastUpdated && (
                    <div className="text-xs text-muted-foreground">
                      Last updated: {translation.lastUpdated.toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Save button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Translations
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Hook for managing menu translations
export function useMenuTranslations() {
  const [translations, setTranslations] = useState<Record<string, MenuItemTranslations>>({})

  const saveTranslations = async (itemId: string, newTranslations: MenuTranslation[]) => {
    try {
      // API call to save translations
      const response = await fetch(`/api/menu/${itemId}/translations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ translations: newTranslations }),
      })

      if (!response.ok) {
        throw new Error('Failed to save translations')
      }

      const result = await response.json()
      
      // Update local state
      setTranslations(prev => ({
        ...prev,
        [itemId]: {
          id: itemId,
          defaultName: result.defaultName,
          defaultDescription: result.defaultDescription,
          translations: newTranslations
        }
      }))

      return result
    } catch (error) {
      console.error('Error saving menu translations:', error)
      throw error
    }
  }

  const getTranslations = (itemId: string) => {
    return translations[itemId]
  }

  return {
    translations,
    saveTranslations,
    getTranslations
  }
}