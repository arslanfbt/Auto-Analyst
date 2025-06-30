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
        pendingDowngrade: 'true',
        nextPlanType: 'STANDARD' // Changed from FREE to STANDARD since no more free plan
      })
      
      // Handle credits based on user type
      if (isLegacyUser) {
        // Legacy users: Set credits to 0 immediately
        await redis.hset(KEYS.USER_CREDITS(userId), {
          total: '0',
          used: '0',
          resetDate: '',
          lastUpdate: now.toISOString(),
          downgradedAt: now.toISOString(),
          canceledAt: now.toISOString()
        })
      } else {
        // New users: Mark for downgrade at period end
        const creditData = await redis.hgetall(KEYS.USER_CREDITS(userId))
        if (creditData && creditData.resetDate) {
          await redis.hset(KEYS.USER_CREDITS(userId), {
            nextTotalCredits: '0', // No credits after cancellation
          pendingDowngrade: 'true',
            lastUpdate: now.toISOString()
        })
      }
      }
      
      return NextResponse.json({
        success: true,
        message: isLegacyUser 
          ? 'Subscription canceled successfully. Your access has been removed.'
          : 'Subscription will be canceled at the end of the current billing period',
        subscription: {
          ...subscriptionData,
          status: isLegacyUser ? 'canceled' : 'canceling',
          canceledAt: now.toISOString(),
        }
      })
    } catch (stripeError: any) {
      console.error('Stripe error canceling subscription:', stripeError)
      
      // Handle common Stripe errors
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
      
      throw stripeError
    }
  } catch (error: any) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to cancel subscription' 
    }, { status: 500 })
  }
} 