import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Readable } from 'stream'
import redis, { creditUtils, KEYS } from '@/lib/redis'

// Use the correct App Router configuration instead of the default body parser
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Helper function to read the raw request body as text
async function getRawBody(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

// Helper function to update a user's subscription information
async function updateUserSubscription(userId: string, session: Stripe.Checkout.Session) {
  try {
    // Retrieve the complete line items to get product details
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    if (!lineItems.data.length) return false

    // Get the price ID from the line item
    const priceId = lineItems.data[0].price?.id
    if (!priceId) return false

    // Retrieve price to get recurring interval and product ID
    const price = await stripe.prices.retrieve(priceId)
    
    // Retrieve product details
    const product = await stripe.products.retrieve(price.product as string)

    // Extract subscription details
    const planName = product.name
    let interval = 'month'
    if (planName.toLowerCase().includes('yearly') || price?.recurring?.interval === 'year') {
      interval = 'year'
    }
    const amount = price.unit_amount! / 100 // Convert from cents to dollars
    
    // Calculate next renewal date
    const now = new Date()
    let renewalDate = new Date()
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1)
    } else if (interval === 'year') {
      renewalDate.setFullYear(now.getFullYear() + 1)
    }
    
    // Determine credit amounts based on plan
    let creditAmount = 100 // Free tier default
    let planType = 'FREE'
    
    if (planName.toLowerCase().includes('pro')) {
      creditAmount = 999999 // Essentially unlimited
      planType = 'PRO'
    } else if (planName.toLowerCase().includes('standard')) {
      creditAmount = 500
      planType = 'STANDARD'
    }
    
    // Update subscription data
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      plan: planName,
      planType,
      status: 'active',
      amount: amount.toString(),
      interval,
      purchaseDate: now.toISOString(),
      renewalDate: renewalDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      stripeCustomerId: session.customer || '',
      stripeSubscriptionId: session.subscription || ''
    })
    
    // Update credit information
    await redis.hset(KEYS.USER_CREDITS(userId), {
      total: creditAmount.toString(),
      used: '0',
      resetDate: creditUtils.getNextMonthFirstDay(),
      lastUpdate: now.toISOString()
    })
    
    return true
  } catch (error) {
    console.error('Error updating user subscription:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      return NextResponse.json({ error: 'No Stripe signature found' }, { status: 400 })
    }
    
    // Get the raw request body
    const rawBody = await getRawBody(request.body as unknown as Readable)
    
    // Verify the webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed.`, err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }
    
    console.log(`Event received: ${event.type}`)
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Extract the user ID from metadata
        const userId = session.metadata?.userId

        if (!userId) {
          console.error('No user ID found in session metadata')
          return NextResponse.json({ error: 'No user ID found' }, { status: 400 })
        }

        // Update the user's subscription
        const success = await updateUserSubscription(userId, session)
        
        if (success) {
          console.log(`Successfully processed checkout for user ${userId}`)
        } else {
          console.error(`Failed to process checkout for user ${userId}`)
        }
        break
      }
        
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        // Handle subscription update logic
        console.log('Subscription updated event received, but not fully implemented')
        break
      }
        
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        // Handle subscription cancellation/deletion
        console.log('Subscription deleted event received, but not fully implemented')
        break
      }
        
      // Add more event types as needed
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message || 'Webhook handler failed' }, { status: 500 })
  }
} 