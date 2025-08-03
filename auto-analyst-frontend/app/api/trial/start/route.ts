import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { creditUtils, KEYS } from '@/lib/redis'
import { TrialUtils, CreditConfig } from '@/lib/credits-config'

export const dynamic = 'force-dynamic'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
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
    const body = await request.json()
    
    // Handle both setupIntentId (new flow) and legacy parameters
    const { setupIntentId, subscriptionId, paymentIntentId, planName, interval, amount } = body
    
    // Check if user already has an active trial/subscription first
    const existingSubscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    if (existingSubscription && ['trialing', 'active'].includes(existingSubscription.status as string)) {
      // Return success if already processed to avoid duplicate processing
      return NextResponse.json({ 
        success: true,
        alreadyProcessed: true,
        subscriptionId: existingSubscription.stripeSubscriptionId || subscriptionId,
        message: 'Trial already active',
        subscription: existingSubscription,
        credits: {
          total: TrialUtils.getTrialCredits(),
          used: parseInt(existingSubscription.creditsUsed as string || '0'),
          remaining: TrialUtils.getTrialCredits() - parseInt(existingSubscription.creditsUsed as string || '0')
        }
      })
    }

    // If we have a subscriptionId but no setupIntentId, this might be a re-call from success page
    if (subscriptionId && !setupIntentId) {
      return NextResponse.json({ 
        error: 'Trial was already processed successfully. Please check your account page.',
        alreadyProcessed: true 
      }, { status: 400 })
    }

    // NEW FLOW: Require setupIntentId for proper payment method verification
    if (!setupIntentId) {
      return NextResponse.json({ error: 'Setup Intent ID is required for trial signup' }, { status: 400 })
    }

    // Verify the setup intent is successful
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    
    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json({ 
        error: 'Payment method setup not completed. Please complete payment method verification.',
        setupStatus: setupIntent.status 
      }, { status: 400 })
    }

    // Extract metadata from setup intent
    const metadata = setupIntent.metadata
    if (!metadata) {
      return NextResponse.json({ error: 'Missing setup intent metadata' }, { status: 400 })
    }
    
    const priceId = metadata.priceId
    const customerId = setupIntent.customer as string
    const couponId = metadata.couponId

    if (!priceId || !customerId) {
      return NextResponse.json({ error: 'Missing required payment information' }, { status: 400 })
    }

    // Store customer mapping for webhooks
    await redis.set(`stripe:customer:${customerId}`, String(userId))

    // NOW create the subscription (after payment method is confirmed)
    const trialEndTimestamp = TrialUtils.getTrialEndTimestamp()
    
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      trial_end: trialEndTimestamp,
      expand: ['latest_invoice.payment_intent'],
      payment_behavior: 'default_incomplete',
      default_payment_method: setupIntent.payment_method as string,
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel'
        }
      },
      metadata: {
        userId: userId || 'anonymous',
        planName: metadata.planName || planName || 'Standard',
        interval: metadata.interval || interval || 'month',
        priceId,
        isTrial: 'true',
        trialEndDate: TrialUtils.getTrialEndDate(),
        createdFromSetupIntent: setupIntentId,
      },
    }

    // Apply discount if coupon is valid
    if (couponId) {
      subscriptionParams.discounts = [{ coupon: couponId }]
    }

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create(subscriptionParams)

    if (subscription.status !== 'trialing') {
      return NextResponse.json({ 
        error: 'Failed to create trial subscription',
        subscriptionStatus: subscription.status 
      }, { status: 500 })
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
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id, // Store actual subscription ID
      willChargeOn: trialEndDate
    }
    
    // Initialize trial credits (500 credits immediately) with custom reset date
    await creditUtils.initializeTrialCredits(userId, subscription.id, trialEndDate)
    
    // Set custom credit reset date (1 month from checkout)
    await redis.hset(KEYS.USER_CREDITS(userId), {
      resetDate: creditResetDate.toISOString().split('T')[0]
    })
    
    // Store subscription data in Redis
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    
    
    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
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
