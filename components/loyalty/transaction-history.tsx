'use client'

import { useState } from 'react'
import { Calendar, TrendingUp, TrendingDown, Gift, Star, Users, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoyaltyTransactionWithContext } from '@/types/loyalty'

interface TransactionHistoryProps {
  transactions: LoyaltyTransactionWithContext[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  className?: string
}

export function TransactionHistory({
  transactions,
  loading = false,
  onLoadMore,
  hasMore = false,
  className
}: TransactionHistoryProps) {
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')

  const filteredTransactions = transactions
    .filter(transaction => {
      if (filter === 'all') return true
      return transaction.transaction_type === filter
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'redeemed':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'bonus':
      case 'birthday':
        return <Gift className="h-4 w-4 text-blue-600" />
      case 'referral':
        return <Users className="h-4 w-4 text-purple-600" />
      case 'expired':
        return <Calendar className="h-4 w-4 text-orange-600" />
      default:
        return <Star className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
      case 'bonus':
      case 'birthday':
      case 'referral':
        return 'text-green-600'
      case 'redeemed':
        return 'text-red-600'
      case 'expired':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'earned':
        return 'Points Earned'
      case 'redeemed':
        return 'Points Redeemed'
      case 'bonus':
        return 'Bonus Points'
      case 'birthday':
        return 'Birthday Bonus'
      case 'referral':
        return 'Referral Bonus'
      case 'expired':
        return 'Points Expired'
      case 'adjustment':
        return 'Point Adjustment'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  if (transactions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
          <p className="text-muted-foreground text-center">
            Start earning points by placing orders to see your transaction history here!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Points History
            </CardTitle>
            <CardDescription>
              Track all your points activity
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All transactions</SelectItem>
              <SelectItem value="earned">Points earned</SelectItem>
              <SelectItem value="redeemed">Points redeemed</SelectItem>
              <SelectItem value="bonus">Bonus points</SelectItem>
              <SelectItem value="referral">Referral bonus</SelectItem>
              <SelectItem value="birthday">Birthday bonus</SelectItem>
              <SelectItem value="expired">Expired points</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transaction Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              +{transactions
                .filter(t => ['earned', 'bonus', 'birthday', 'referral'].includes(t.transaction_type))
                .reduce((sum, t) => sum + Math.abs(t.points), 0)
                .toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Points Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              -{transactions
                .filter(t => ['redeemed', 'expired'].includes(t.transaction_type))
                .reduce((sum, t) => sum + Math.abs(t.points), 0)
                .toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Points Used</div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-shrink-0">
                {getTransactionIcon(transaction.transaction_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {formatTransactionType(transaction.transaction_type)}
                  </h4>
                  <div className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString()}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {transaction.description}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(transaction.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  
                  {transaction.order_number && (
                    <Badge variant="outline" className="text-xs">
                      Order #{transaction.order_number}
                    </Badge>
                  )}
                  
                  {transaction.expires_at && new Date(transaction.expires_at) > new Date() && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Calendar className="h-3 w-3" />
                      Expires {new Date(transaction.expires_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Balance after transaction */}
                <div className="text-xs text-muted-foreground mt-1">
                  Balance: {transaction.balance_after_transaction.toLocaleString()} points
                </div>
              </div>

              {/* Reward details if applicable */}
              {transaction.reward && (
                <div className="flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.reward.name}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && onLoadMore && (
          <div className="text-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Loading...' : 'Load More Transactions'}
            </Button>
          </div>
        )}

        {filteredTransactions.length === 0 && transactions.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions match your current filter.</p>
            <Button
              variant="link"
              onClick={() => setFilter('all')}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}