import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { KEYS } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const { setupIntentId, priceId } = await request.json()
    console.log('🔍 Creating subscription with:', { setupIntentId, priceId })

    if (!setupIntentId || !priceId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Retrieve the setup intent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    console.log('🔍 Setup intent retrieved:', { 
      status: setupIntent.status, 
      payment_method: setupIntent.payment_method,
      customer: setupIntent.customer 
    })
    
    if (setupIntent.status !== 'succeeded' || !setupIntent.payment_method) {
      return NextResponse.json({ 
        error: `Invalid setup intent: status=${setupIntent.status}, payment_method=${setupIntent.payment_method}` 
      }, { status: 400 })
    }

    // Create subscription
    console.log('🔍 Creating subscription with customer:', setupIntent.customer)
    const subscription = await stripe.subscriptions.create({
      customer: setupIntent.customer as string,
      items: [{ price: priceId }],
      default_payment_method: setupIntent.payment_method as string,
      expand: ['latest_invoice.payment_intent'],
    })
    console.log('✅ Subscription created:', subscription.id)

    // Update Redis with subscription info
    const userId = token.sub
    const subscriptionData = {
      id: subscription.id,
      stripeSubscriptionId: subscription.id, // Add this for consistency
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end,
      priceId: priceId,
      created: subscription.created
    }

    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    console.log('✅ Redis subscription data updated')
    
    // Add credits based on plan
    const price = await stripe.prices.retrieve(priceId)
    const product = await stripe.products.retrieve(price.product as string)
    console.log('🔍 Retrieved product:', { name: product.name, priceId })
    
    // Determine credits based on product name
    let credits = 0
    if (product.name && product.name.includes('Standard')) {
      credits = 500 // Standard plan gets 500 credits
    } else if (product.name && product.name.includes('Enterprise')) {
      credits = 2000 // Enterprise plan (when defined)
    } else {
      // This shouldn't happen for subscription creation, but fallback
      credits = 20 // Free plan default
    }

    if (credits > 0) {
      await redis.hset(KEYS.USER_CREDITS(userId), {
        available: String(credits),
        used: '0',
        lastReset: String(Date.now())
      })
      console.log('✅ Redis credits updated:', credits)
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status
    })

  } catch (error) {
    console.error('❌ Error creating subscription:', error)
    
    // Return more specific error information
    let errorMessage = 'Failed to create subscription'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
