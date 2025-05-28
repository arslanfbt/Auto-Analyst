import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'
import Stripe from 'stripe'
import { CreditConfig } from '@/lib/credits-config'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
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
    
    if (!subscriptionData || !subscriptionData.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    const stripeSubscriptionId = subscriptionData.stripeSubscriptionId as string
    
    try {
      // Cancel the subscription in Stripe
      // Using cancel_at_period_end: true to let the user keep access until the end of their current billing period
      const canceledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      })
      
      // Update the subscription data in Redis with cancellation info
      const now = new Date()
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: 'canceling', // 'canceling' means it will end at period end
        canceledAt: now.toISOString(),
        lastUpdated: now.toISOString(),
        // Add a flag to indicate this is pending cancellation and should get free credits next reset
        pendingDowngrade: 'true',
        nextPlanType: 'FREE'
      })
      
      // Get current credit data
      const creditData = await redis.hgetall(KEYS.USER_CREDITS(userId))
      if (creditData && creditData.resetDate) {
        // Mark the credits to be downgraded on next reset - using centralized config
        await redis.hset(KEYS.USER_CREDITS(userId), {
          nextTotalCredits: CreditConfig.getCreditsForPlan('Free').total.toString(), // This will be used at the next reset
          pendingDowngrade: 'true',
          lastUpdate: new Date().toISOString()
        })
      }
      
      // Send cancellation confirmation email
      // This would be implemented in a real application
      
      return NextResponse.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period',
        subscription: {
          ...subscriptionData,
          status: 'canceling',
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