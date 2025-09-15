import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { KEYS } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
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

    if (!setupIntentId || !priceId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Retrieve the setup intent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    
    if (setupIntent.status !== 'succeeded' || !setupIntent.payment_method) {
      return NextResponse.json({ error: 'Invalid setup intent' }, { status: 400 })
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: setupIntent.customer as string,
      items: [{ price: priceId }],
      default_payment_method: setupIntent.payment_method as string,
      expand: ['latest_invoice.payment_intent'],
    })

    // Update Redis with subscription info
    const userId = token.sub
    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      priceId: priceId,
      created: subscription.created
    }

    await redis.hset(KEYS.userSubscription(userId), subscriptionData)
    
    // Add credits based on plan
    const price = await stripe.prices.retrieve(priceId)
    const product = await stripe.products.retrieve(price.product as string)
    
    // Determine credits based on product name
    let credits = 0
    if (product.name.includes('Standard')) {
      credits = 1000 // Monthly credits for Standard plan
    } else if (product.name.includes('Enterprise')) {
      credits = 5000 // Monthly credits for Enterprise plan
    }

    if (credits > 0) {
      await redis.hset(KEYS.userCredits(userId), {
        available: credits,
        used: 0,
        lastReset: Date.now()
      })
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status
    })

  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
