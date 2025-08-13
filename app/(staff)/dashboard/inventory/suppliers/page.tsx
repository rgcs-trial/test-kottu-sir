import { Suspense } from 'react'
import { SupplierManagement } from '@/components/inventory/supplier-management'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<SuppliersPageSkeleton />}>
        <SupplierManagementWrapper />
      </Suspense>
    </div>
  )
}

function SupplierManagementWrapper() {
  // In a real implementation, you would get the tenantId from the current user session
  // For now, we'll use a placeholder
  const tenantId = 'tenant-id-placeholder' // TODO: Get from auth context

  return <SupplierManagement tenantId={tenantId} />
}

function SuppliersPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-4 w-80 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-muted rounded animate-pulse" />
          <div className="h-9 w-28 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading Message */}
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading suppliers...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = {
  title: 'Supplier Management',
  description: 'Manage your supplier relationships and contacts',
}