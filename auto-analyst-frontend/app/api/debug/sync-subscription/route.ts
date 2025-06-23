import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { KEYS } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Get the user token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }

    const userId = token.sub
    
    // Get current subscription data from Redis
    const currentSubscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    
    if (!currentSubscriptionData || !currentSubscriptionData.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No subscription found in Redis' }, { status: 400 })
    }

    const stripeSubscriptionId = currentSubscriptionData.stripeSubscriptionId as string
    
    console.log(`Syncing subscription ${stripeSubscriptionId} for user ${userId}`)
    
    // Get current status from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    
    console.log(`Stripe subscription status: ${subscription.status}`)
    console.log(`Redis subscription status: ${currentSubscriptionData.status}`)
    
    // Check if subscription is scheduled for cancellation
    const isCancelingAtPeriodEnd = subscription.cancel_at_period_end && subscription.status === 'active'
    
    if (isCancelingAtPeriodEnd) {
      console.log(`Subscription ${stripeSubscriptionId} is set to cancel at period end`)
    }
    
    // Update Redis with current Stripe status
    const updateData: any = {
      status: subscription.status,
      lastUpdated: new Date().toISOString(),
      stripeSubscriptionStatus: subscription.status,
      syncedAt: new Date().toISOString()
    }
    
    // Handle cancel_at_period_end flag
    if (subscription.cancel_at_period_end) {
      updateData.cancel_at_period_end = 'true'
      updateData.willCancelAt = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date().toISOString()
      
      // Override status display for UI purposes  
      updateData.displayStatus = 'canceling'
    } else {
      updateData.cancel_at_period_end = 'false'
      updateData.displayStatus = subscription.status
    }
    
    // Handle specific status transitions
    if (currentSubscriptionData.status === 'trialing' && subscription.status === 'active') {
      console.log(`Trial to active transition detected during sync for user ${userId}`)
      updateData.trialEndedAt = new Date().toISOString()
      updateData.trialToActiveDate = new Date().toISOString()
    }
    
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), updateData)
    
    console.log(`Successfully synced subscription status for user ${userId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Subscription status synced successfully',
      before: {
        redisStatus: currentSubscriptionData.status,
        stripeSubscriptionId: stripeSubscriptionId
      },
      after: {
        stripeStatus: subscription.status,
        redisStatus: subscription.status,
        lastUpdated: updateData.lastUpdated
      },
      subscription: subscription,
      fullRedisData: currentSubscriptionData
    })
    
  } catch (error: any) {
    console.error('Error syncing subscription:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to sync subscription',
      details: error
    }, { status: 500 })
  }
} 