import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import redis, { creditUtils, KEYS } from '@/lib/redis'
import Stripe from 'stripe'
import { CreditConfig } from '@/lib/credits-config'

export const dynamic = 'force-dynamic'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key')
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }
    
    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get the user token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub

    // Test Redis connection
    try {
      await redis.ping();
      // logger.log('✅ Redis connection successful in update-credits');
    } catch (error) {
      console.error('⚠️ Redis connection failed in update-credits:', error);
      return NextResponse.json({ error: 'Redis connection failed' }, { status: 500 });
    }

    // Retrieve checkout session to get plan details
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'line_items.data.price.product'],
    })

    // Get the product details
    const lineItem = session.line_items?.data[0]
    if (!lineItem) {
      return NextResponse.json({ error: 'Product information not found' }, { status: 404 })
    }

    const product = lineItem.price?.product as Stripe.Product
    const planName = product.name
    
    // Get price details for interval information
    const price = lineItem.price
    const interval = price?.recurring?.interval || 'month'
    const amount = price?.unit_amount ? price.unit_amount / 100 : 0

    // Calculate next renewal date
    const now = new Date()
    let renewalDate = new Date()
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1)
    } else if (interval === 'year') {
      renewalDate.setFullYear(now.getFullYear() + 1)
    }

    // logger.log(`Updating user subscription: ${userId} to plan ${planName}`);

    // Calculate the reset date based on the billing interval
    const resetDate = interval === 'month' 
      ? creditUtils.getNextMonthFirstDay()
      : creditUtils.getNextYearFirstDay();

    // Get plan configuration using centralized config
    const planCredits = CreditConfig.getCreditsForPlan(planName)
    const creditsToAdd = planCredits.total
    const planType = planCredits.type

    // logger.log(`Setting ${creditsToAdd} credits for user ${userId} based on plan ${planName}`);
    
    try {
      // Update user subscription using the new hash-based approach
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        plan: planCredits.displayName,
        planType: planType,
        status: 'active',
        amount: amount.toString(),
        interval: interval,
        renewalDate: renewalDate.toISOString().split('T')[0],
        lastUpdated: new Date().toISOString()
      });
      
      // Update user credits using the new hash-based approach
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: creditsToAdd.toString(),
        used: '0',
        resetDate: resetDate,
        lastUpdate: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error updating Redis values:', error);
      return NextResponse.json({ error: 'Failed to update subscription in database' }, { status: 500 });
    }
    
    // Return updated credits
    return NextResponse.json({ 
      success: true,
      credits: creditsToAdd,
      used: 0,
      plan: planCredits.displayName,
      renewalDate: renewalDate.toISOString().split('T')[0],
      resetDate: resetDate
    })
  } catch (error: any) {
    console.error('Error updating credits:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update credits' }, 
      { status: 500 }
    )
  }
} 