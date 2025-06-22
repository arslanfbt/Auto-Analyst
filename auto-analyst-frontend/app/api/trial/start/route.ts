import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { creditUtils, KEYS } from '@/lib/redis'
import { CreditConfig, TrialUtils } from '@/lib/credits-config'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get the user token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const body = await request.json()
    const { subscriptionId, planName, interval, amount } = body
    
    if (!subscriptionId || !planName) {
      return NextResponse.json({ error: 'Subscription ID and plan name are required' }, { status: 400 })
    }

    const now = new Date()
    const trialEndDate = TrialUtils.getTrialEndDate(now)
    
    // Calculate credit reset date - 1 month from checkout (not trial end)
    const creditResetDate = new Date(now)
    creditResetDate.setMonth(creditResetDate.getMonth() + 1)
    
    // Set up trial subscription with STANDARD plan type but trial status
    const subscriptionData = {
      plan: 'Standard Plan',
      planType: 'STANDARD', // Immediate Standard access as requested
      status: 'trialing', // Use Stripe's standard trialing status
      amount: amount?.toString() || '15',
      interval: interval || 'month',
      purchaseDate: now.toISOString(),
      trialStartDate: now.toISOString(),
      trialEndDate: trialEndDate,
      creditResetDate: creditResetDate.toISOString().split('T')[0], // Store reset date
      lastUpdated: now.toISOString(),
      stripeSubscriptionId: subscriptionId, // Store subscription ID instead of payment intent
      willChargeOn: trialEndDate
    }
    
    // Initialize trial credits (500 credits immediately) with custom reset date
    await creditUtils.initializeTrialCredits(userId, subscriptionId, trialEndDate)
    
    // Set custom credit reset date (1 month from checkout)
    await redis.hset(KEYS.USER_CREDITS(userId), {
      resetDate: creditResetDate.toISOString().split('T')[0]
    })
    
    // Store subscription data in Redis
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    
    console.log(`Started trial for user ${userId} with subscription ${subscriptionId}`)
    
    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
      credits: {
        total: TrialUtils.getTrialCredits(),
        used: 0,
        remaining: TrialUtils.getTrialCredits()
      },
      trialEndDate: trialEndDate,
      message: 'Trial started successfully! You have immediate access to 500 credits.'
    })
    
  } catch (error: any) {
    console.error('Error starting trial:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to start trial' 
    }, { status: 500 })
  }
} 