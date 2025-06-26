import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { creditUtils, KEYS } from '@/lib/redis'
import Stripe from 'stripe'

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
    
    // Get user's current subscription data
    const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    
    if (!subscriptionData || !['trialing', 'active'].includes(subscriptionData.status as string)) {
      return NextResponse.json({ error: 'No active trial or subscription found' }, { status: 400 })
    }

    const stripeSubscriptionId = subscriptionData.stripeSubscriptionId as string
    const isLegacyUser = !stripeSubscriptionId || !stripeSubscriptionId.startsWith('sub_')
    
    // For legacy users, we'll skip Stripe API calls and just update Redis
    if (isLegacyUser) {
      console.log(`Legacy user ${userId} canceling - using Redis-only flow`)
    } else {
      // Validate that we have a proper Subscription ID for new users
      if (!stripeSubscriptionId.startsWith('sub_')) {
        console.error(`Invalid subscription ID format for user ${userId}: ${stripeSubscriptionId}`)
        return NextResponse.json({ 
          error: 'Invalid subscription data. Please contact support for assistance.',
          code: 'INVALID_SUBSCRIPTION_FORMAT'
        }, { status: 400 })
      }
    }

    let stripeSubscription = null
    
    // Only make Stripe API calls for new users with proper subscription IDs
    if (!isLegacyUser) {
      try {
        // First get the current subscription from Stripe
        stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        
        if (stripeSubscription.status === 'trialing') {
          // Cancel the subscription immediately for trials
          await stripe.subscriptions.cancel(stripeSubscriptionId, {
            prorate: false // Don't prorate since it's a trial cancellation
          })
          console.log(`Canceled trial subscription ${stripeSubscriptionId} for user ${userId}`)
        } else if (stripeSubscription.status === 'active') {
          // For active subscriptions, cancel at period end
          await stripe.subscriptions.update(stripeSubscriptionId, {
            cancel_at_period_end: true
          })
          console.log(`Scheduled cancellation for subscription ${stripeSubscriptionId} for user ${userId}`)
        } else {
          console.log(`Subscription ${stripeSubscriptionId} already in status: ${stripeSubscription.status}`)
        }
      } catch (stripeError: any) {
        console.error('Error canceling subscription in Stripe:', stripeError)
        // For trials, we still want to proceed with local cleanup even if Stripe fails
        if (subscriptionData.status !== 'trialing') {
          return NextResponse.json({ error: 'Failed to cancel subscription in Stripe' }, { status: 500 })
        }
      }
    } else {
      console.log(`Legacy user ${userId} - skipping Stripe API calls, updating Redis only`)
    }

    const now = new Date()
    const isTrial = subscriptionData.status === 'trialing'
    const isLegacyActive = isLegacyUser && subscriptionData.status === 'active'

    if (isTrial || isLegacyActive) {
      // For trial cancellations OR legacy user cancellations: Immediate access removal
      await creditUtils.setZeroCredits(userId)
      
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: '0',
        used: '0',
        resetDate: '',
        lastUpdate: now.toISOString(),
        downgradedAt: now.toISOString(),
        canceledAt: now.toISOString(),
        trialCanceled: isTrial ? 'true' : 'false',
        legacyCanceled: isLegacyActive ? 'true' : 'false'
      })
      
      // Update subscription to canceled status immediately
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        ...subscriptionData,
        status: 'canceled',
        canceledAt: now.toISOString(),
        lastUpdated: now.toISOString(),
        subscriptionCanceled: 'true',
        trialEndDate: isTrial ? '' : subscriptionData.trialEndDate || '',
        trialStartDate: isTrial ? '' : subscriptionData.trialStartDate || ''
      })
      
      console.log(`${isTrial ? 'Trial' : 'Legacy subscription'} canceled for user ${userId}, access removed immediately`)
    } else {
      // For post-trial cancellations: Maintain access until period end
      // Don't change credits - let them keep access until billing cycle ends
      // The customer.subscription.deleted webhook will handle final cleanup
      
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        ...subscriptionData,
        status: 'cancel_at_period_end',
        canceledAt: now.toISOString(),
        lastUpdated: now.toISOString(),
        subscriptionCanceled: 'true',
        willCancelAt: stripeSubscription?.current_period_end 
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
          : now.toISOString()
      })
      
      console.log(`Subscription scheduled for cancellation at period end for user ${userId}`)
    }
    
    
    return NextResponse.json({
      success: true,
      message: (isTrial || isLegacyActive)
        ? `${isTrial ? 'Trial' : 'Subscription'} canceled successfully. Your subscription was canceled and access has been removed.`
        : 'Subscription scheduled for cancellation at the end of the current billing period.',
      subscription: subscriptionData,
      credits: (isTrial || isLegacyActive) ? {
        total: 0,
        used: 0,
        remaining: 0
      } : {
        total: parseInt(subscriptionData.total as string || '0'),
        used: parseInt(subscriptionData.used as string || '0'),
        remaining: Math.max(0, parseInt(subscriptionData.total as string || '0') - parseInt(subscriptionData.used as string || '0'))
      },
      stripeStatus: stripeSubscription?.status || (isLegacyUser ? 'legacy' : 'unknown'),
      willCancelAt: !(isTrial || isLegacyActive) && stripeSubscription?.current_period_end 
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : undefined
    })
    
  } catch (error: any) {
    console.error('Error canceling trial:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to cancel trial' 
    }, { status: 500 })
  }
} 