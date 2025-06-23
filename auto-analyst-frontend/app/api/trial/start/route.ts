import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { creditUtils, KEYS } from '@/lib/redis'
import { CreditConfig, TrialUtils } from '@/lib/credits-config'

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
    const body = await request.json()
    const { subscriptionId, planName, interval, amount } = body
    
    if (!subscriptionId || !planName) {
      return NextResponse.json({ error: 'Subscription ID and plan name are required' }, { status: 400 })
    }

    // CRITICAL: Verify subscription status in Stripe before granting trial access
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      // Check if subscription is valid and active/trialing
      if (!subscription || !['trialing', 'active'].includes(subscription.status)) {
        console.log(`Trial access denied for user ${userId}: subscription status is ${subscription?.status || 'not found'}`)
        return NextResponse.json({ 
          error: 'Subscription is not active or trialing. Trial access denied.',
          subscriptionStatus: subscription?.status || 'not found'
        }, { status: 400 })
      }

      // For trialing subscriptions, verify payment method is attached (more lenient for test mode)
      if (subscription.status === 'trialing') {
        // Check if subscription has a default payment method
        const hasSubscriptionPaymentMethod = subscription.default_payment_method != null
        
        // Check customer's default payment method as fallback
        let hasCustomerPaymentMethod = false
        if (!hasSubscriptionPaymentMethod) {
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          if (typeof customer !== 'string' && !customer.deleted) {
            hasCustomerPaymentMethod = !!(
              customer.default_source || 
              customer.invoice_settings?.default_payment_method
            )
          }
        }
        
        // Check for successful setup intents as final fallback
        let hasSuccessfulSetup = false
        if (!hasSubscriptionPaymentMethod && !hasCustomerPaymentMethod) {
          const setupIntents = await stripe.setupIntents.list({
            customer: subscription.customer as string,
            limit: 5,
          })
          
          hasSuccessfulSetup = setupIntents.data.some(si => 
            si.status === 'succeeded' && 
            (si.metadata?.subscription_id === subscriptionId || si.metadata?.is_trial_setup === 'true')
          )
        }
        
        // Check if we're in test mode for more lenient validation
        const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('sk_test_') || false
        const allowTestModeTrials = isTestMode && subscription.status === 'trialing'
        
        // Allow trial if any payment method is found OR if in test mode with valid trialing subscription
        if (!hasSubscriptionPaymentMethod && !hasCustomerPaymentMethod && !hasSuccessfulSetup && !allowTestModeTrials) {
          console.log(`Trial access denied for user ${userId}: no payment method found`)
          console.log(`Subscription payment method: ${hasSubscriptionPaymentMethod}`)
          console.log(`Customer payment method: ${hasCustomerPaymentMethod}`) 
          console.log(`Setup intent: ${hasSuccessfulSetup}`)
          console.log(`Test mode allowed: ${allowTestModeTrials}`)
          
          return NextResponse.json({ 
            error: 'Payment method setup required. Please complete payment method verification.',
            requiresSetup: true,
            debug: {
              subscriptionPaymentMethod: hasSubscriptionPaymentMethod,
              customerPaymentMethod: hasCustomerPaymentMethod,
              setupIntentSuccess: hasSuccessfulSetup,
              testModeAllowed: allowTestModeTrials,
              isTestMode: isTestMode
            }
          }, { status: 400 })
        }
        
        if (allowTestModeTrials && !hasSubscriptionPaymentMethod && !hasCustomerPaymentMethod && !hasSuccessfulSetup) {
          console.log(`Allowing trial for user ${userId} in test mode despite no payment method found`)
        } else {
          console.log(`Payment method verified for user ${userId}`)
        }
      }
      
      console.log(`Subscription verified for user ${userId}: status=${subscription.status}`)
    } catch (stripeError: any) {
      console.error('Error verifying subscription:', stripeError)
      return NextResponse.json({ 
        error: 'Unable to verify subscription status. Please try again.',
        stripeError: stripeError.message 
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