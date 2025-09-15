import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'
import Stripe from 'stripe'

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

    // Use stripeSubscriptionId field (like the working code)
    const stripeSubscriptionId = subscriptionData.stripeSubscriptionId as string
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
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: isLegacyUser ? 'canceled' : 'canceling', // Legacy users get immediate cancellation
        canceledAt: now.toISOString(),
        lastUpdated: now.toISOString(),
        cancel_at_period_end: 'true',
        subscriptionCanceled: 'true'
      })
      
      // Handle credits - ALL users keep their credits until period ends
      console.log(`User ${userId} - keeping current credits until subscription period ends`)
      
      // Get period end date from Stripe subscription for better user feedback
      let periodEndDate = null
      if (!isLegacyUser && canceledSubscription) {
        periodEndDate = new Date((canceledSubscription as any).current_period_end * 1000).toISOString()
      }

      return NextResponse.json({
        success: true,
        message: isLegacyUser 
          ? 'Subscription canceled successfully. Your access has been removed.'
          : 'Subscription will be canceled at the end of the current billing period',
        canceledAt: now.toISOString(),
        periodEndDate: periodEndDate,
        immediateCancellation: isLegacyUser
      })
      
    } catch (stripeError: any) {
      console.error('Stripe error canceling subscription:', stripeError)
      
      // Handle common Stripe errors (like the working code)
      if (stripeError.code === 'resource_missing') {
        // Subscription doesn't exist in Stripe but exists in our DB
        // Update our records to show there's no subscription
        await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
          status: 'inactive',
          stripeSubscriptionId: '',
          lastUpdated: new Date().toISOString(),
        })
        
        return NextResponse.json({
          success: true,
          message: 'Subscription record updated',
        })
      }
      
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