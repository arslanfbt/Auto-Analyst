import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'
import Stripe from 'stripe'
import { CreditConfig } from '@/lib/credits-config'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const userEmail = token.email

    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key')
      return NextResponse.json({ error: 'Subscription service unavailable' }, { status: 500 })
    }
    
    // Get current subscription data from Redis
    const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    
    if (!subscriptionData) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Use 'id' field instead of 'stripeSubscriptionId' for consistency
    const stripeSubscriptionId = subscriptionData.id as string
    const isLegacyUser = !stripeSubscriptionId || !stripeSubscriptionId.startsWith('sub_')
    
    try {
      let canceledSubscription = null
      
      // Only make Stripe API calls for new users with proper subscription IDs
      if (!isLegacyUser) {
        // Cancel the subscription in Stripe
        // Using cancel_at_period_end: true to let the user keep access until the end of their current billing period
        canceledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        })
      } else {
        console.log(`Legacy user ${userId} - skipping Stripe API calls, updating Redis only`)
      }
      
      // Update the subscription data in Redis with cancellation info (for both legacy and new users)
      const now = new Date()
      const updateData: {
        status: string;
        canceledAt: string;
        lastUpdated: string;
        subscriptionCanceled: string;
        cancel_at_period_end: string;
        periodEndDate?: string;
      } = {
        status: 'canceling', // Both legacy and new users get 'canceling' status
        canceledAt: now.toISOString(),
        lastUpdated: now.toISOString(),
        subscriptionCanceled: 'true', // Mark as canceled
        cancel_at_period_end: 'true', // Both user types cancel at period end
      }

      // Add period end date if we have it from Stripe
      if (!isLegacyUser && canceledSubscription) {
        updateData.periodEndDate = new Date(canceledSubscription.current_period_end * 1000).toISOString()
      }

      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), updateData)
      
      // Handle credits - ALL users keep their credits until period ends
      // Don't modify credits here - they should remain until the subscription actually ends
      // The webhook will handle credit reset to free plan (20 credits) when period ends
      console.log(`User ${userId} - keeping current credits until subscription period ends`)
      
      // Return appropriate message - same for all users
      const message = 'Subscription will be canceled at the end of the current billing period'

      // Get period end date from Stripe subscription for better user feedback
      let periodEndDate = null
      if (!isLegacyUser && canceledSubscription) {
        periodEndDate = new Date(canceledSubscription.current_period_end * 1000).toISOString()
      }

      return NextResponse.json({
        success: true,
        message: message,
        canceledAt: now.toISOString(),
        periodEndDate: periodEndDate, // Add this
        immediateCancellation: isLegacyUser
      })

    } catch (stripeError: any) {
      console.error('Stripe error canceling subscription:', stripeError)
      return NextResponse.json(
        { error: 'Failed to cancel subscription with payment provider' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
} 