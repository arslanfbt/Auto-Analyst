import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { KEYS } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { newPriceId } = await request.json()
    if (!newPriceId) return NextResponse.json({ error: 'Missing price ID' }, { status: 400 })

    const userId = token.sub
    
    // Get current subscription from Redis
    const subscriptionData = await redis.hgetall(KEYS.userSubscription(userId))
    if (!subscriptionData?.id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Update subscription in Stripe
    const subscription = await stripe.subscriptions.update(subscriptionData.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Prorate the billing
    })

    // Update Redis with new subscription data
    await redis.hset(KEYS.userSubscription(userId), {
      ...subscriptionData,
      priceId: newPriceId,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
    })

    // Update credits based on new plan
    const price = await stripe.prices.retrieve(newPriceId)
    const product = await stripe.products.retrieve(price.product as string)
    
    let newCredits = 0
    if (product.name.includes('Standard')) {
      newCredits = 1000
    } else if (product.name.includes('Enterprise')) {
      newCredits = 5000
    }

    if (newCredits > 0) {
      await redis.hset(KEYS.userCredits(userId), {
        available: newCredits,
        used: 0,
        lastReset: Date.now()
      })
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      message: 'Subscription updated successfully'
    })

  } catch (error) {
    console.error('Error changing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to change subscription' },
      { status: 500 }
    )
  }
}
