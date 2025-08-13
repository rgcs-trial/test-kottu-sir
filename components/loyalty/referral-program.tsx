'use client'

import { useState } from 'react'
import { Users, Copy, Share2, Gift, CheckCircle, Mail, MessageCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CustomerLoyaltyAccount } from '@/types/loyalty'

interface ReferralProgramProps {
  account: CustomerLoyaltyAccount
  referral_bonus_points: number
  restaurant_name: string
  successful_referrals?: number
  pending_referrals?: number
  className?: string
}

export function ReferralProgram({
  account,
  referral_bonus_points,
  restaurant_name,
  successful_referrals = 0,
  pending_referrals = 0,
  className
}: ReferralProgramProps) {
  const [copied, setCopied] = useState(false)
  const [shareMethod, setShareMethod] = useState<string | null>(null)
  const { toast } = useToast()

  const referral_url = `https://${window.location.host}/join?ref=${account.referral_code}`
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referral_url)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy referral link.",
        variant: "destructive"
      })
    }
  }

  const shareViaEmail = () => {
    const subject = `Join me at ${restaurant_name} and earn rewards!`
    const body = `Hi there!\n\nI wanted to share ${restaurant_name} with you - they have amazing food and a great rewards program!\n\nUse my referral link to join and we both get ${referral_bonus_points} bonus points: ${referral_url}\n\nEnjoy!\n`
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setShareMethod('email')
  }

  const shareViaSMS = () => {
    const message = `Check out ${restaurant_name}! Join with my referral link and we both get ${referral_bonus_points} points: ${referral_url}`
    window.location.href = `sms:?body=${encodeURIComponent(message)}`
    setShareMethod('sms')
  }

  const shareViaWeb = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${restaurant_name}`,
          text: `Use my referral link to join ${restaurant_name} and earn ${referral_bonus_points} bonus points!`,
          url: referral_url,
        })
        setShareMethod('web')
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyToClipboard()
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Refer Friends
        </CardTitle>
        <CardDescription>
          Earn {referral_bonus_points} points for each friend who joins using your link
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {successful_referrals}
            </div>
            <div className="text-sm text-green-600">Successful Referrals</div>
            <div className="text-xs text-green-600 mt-1">
              +{(successful_referrals * referral_bonus_points).toLocaleString()} points earned
            </div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {pending_referrals}
            </div>
            <div className="text-sm text-blue-600">Pending</div>
            <div className="text-xs text-blue-600 mt-1">
              Waiting to complete first order
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">How it works:</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                1
              </div>
              <span>Share your referral link with friends</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                2
              </div>
              <span>They sign up and place their first order</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                3
              </div>
              <span>You both get {referral_bonus_points} bonus points!</span>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Your referral link:</h4>
          <div className="flex gap-2">
            <Input
              value={referral_url}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex-shrink-0"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Share with friends:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={shareViaEmail}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
            
            <Button
              variant="outline"
              onClick={shareViaSMS}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Text
            </Button>
            
            <Button
              variant="outline"
              onClick={shareViaWeb}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Referral Code Display */}
        <div className="p-4 bg-muted rounded-lg text-center">
          <div className="text-sm text-muted-foreground mb-1">Your referral code:</div>
          <div className="font-mono text-lg font-bold tracking-wider">
            {account.referral_code}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Friends can also enter this code during signup
          </div>
        </div>

        {/* Terms */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <div className="font-medium">Terms & Conditions:</div>
          <ul className="space-y-1 ml-2">
            <li>• Both you and your friend must be new customers</li>
            <li>• Points are awarded after friend's first successful order</li>
            <li>• Bonus points expire according to program terms</li>
            <li>• Fraudulent referrals may result in account suspension</li>
          </ul>
        </div>

        {/* Success Message */}
        {shareMethod && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle className="h-4 w-4" />
            <span>
              {shareMethod === 'email' && 'Email app opened!'}
              {shareMethod === 'sms' && 'Messages app opened!'}
              {shareMethod === 'web' && 'Thanks for sharing!'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}