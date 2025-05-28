import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Readable } from 'stream'
import redis, { creditUtils, KEYS, profileUtils } from '@/lib/redis'
import { sendSubscriptionConfirmation, sendPaymentConfirmationEmail } from '@/lib/email'
import logger from '@/lib/utils/logger'
import { CreditConfig } from '@/lib/credits-config'

// Use the correct App Router configuration instead of the default body parser
export const dynamic = 'force-dynamic'

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

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
    const lineItems = await stripe!.checkout.sessions.listLineItems(session.id)
    if (!lineItems.data.length) return false

    // Get the price ID from the line item
    const priceId = lineItems.data[0].price?.id
    if (!priceId) return false

    // Retrieve price to get recurring interval and product ID
    const price = await stripe!.prices.retrieve(priceId)
    
    // Retrieve product details
    const product = await stripe!.products.retrieve(price.product as string)

    // Extract subscription details
    const planName = product.name
    let interval = 'month'
    if (planName.toLowerCase().includes('yearly') || price?.recurring?.interval === 'year') {
      interval = 'year'
    } else if (planName.toLowerCase().includes('daily') || price?.recurring?.interval === 'day') {
      interval = 'day'
    }
    const amount = price.unit_amount! / 100 // Convert from cents to dollars
    
    // Calculate next renewal date
    const now = new Date()
    let renewalDate = new Date()
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1)
    } else if (interval === 'year') {
      renewalDate.setFullYear(now.getFullYear() + 1)
    } else if (interval === 'day') {
      renewalDate.setDate(now.getDate() + 1)
    }
    
    // Determine credit amounts based on plan using centralized config
    const planCredits = CreditConfig.getCreditsForPlan(planName)
    const creditAmount = planCredits.total
    const planType = planCredits.type
    
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
    let resetDate = creditUtils.getNextMonthFirstDay();
    
    // For daily plans, set reset date to tomorrow
    if (interval === 'day') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      resetDate = tomorrow.toISOString().split('T')[0];
    }
    
    await redis.hset(KEYS.USER_CREDITS(userId), {
      total: creditAmount.toString(),
      used: '0',
      resetDate: resetDate,
      lastUpdate: now.toISOString()
    })
    
    // Get user email from session or lookup in Redis
    let userEmail = session.customer_email || ''
    if (!userEmail && userId) {
      // Try to fetch email from Redis user profile
      const userProfile = await profileUtils.getUserProfile(userId)
      if (userProfile && userProfile.email) {
        userEmail = userProfile.email as string
      }
    }
    
    // Send confirmation email if we have the user's email
    if (userEmail) {
      await sendSubscriptionConfirmation(
        userEmail,
        planName,
        planType,
        amount,
        interval,
        renewalDate.toISOString().split('T')[0],
        creditAmount,
        resetDate
      )
    } else {
      logger.log(`No email found for user ${userId}, cannot send confirmation email`)
    }
    
    return true
  } catch (error) {
    console.error('Error updating user subscription:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key')
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 })
    }
    
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
    
    // logger.log(`Event received: ${event.type}`)
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Extract the user ID from metadata
        const userId = session.metadata?.userId

        if (!userId) {
          console.error('No user ID found in session metadata')
          return NextResponse.json({ error: 'User ID missing from session metadata' }, { status: 400 })
        }

        // Update the user's subscription
        const updated = await updateUserSubscription(userId, session)
        
        if (!updated) {
          console.error('Failed to update user subscription')
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }
        
        // Get customer details and subscription info
        const customerEmail = session.customer_email || session.customer_details?.email;
        const customerName = session.customer_details?.name || '';
        
        // Get metadata from the session
        const plan = session.metadata?.plan || 'Standard';
        const cycle = session.metadata?.cycle || 'monthly';
        
        // Format amount
        const amount = ((session.amount_total || 0) / 100).toFixed(2);
        
        // Format date
        const date = new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Send confirmation email
        if (customerEmail) {
          try {
            await sendPaymentConfirmationEmail({
              email: customerEmail,
              name: customerName,
              plan: plan,
              amount: amount,
              billingCycle: cycle === 'yearly' ? 'Annual' : 'Monthly',
              date: date
            });
            // logger.log(`Payment confirmation email sent to ${customerEmail}`);
          } catch (error) {
            console.error('Failed to send payment confirmation email:', error);
            // Continue processing - don't fail the webhook due to email issues
          }
        }
        
        return NextResponse.json({ received: true })
      }
        
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        // Handle subscription update logic
        // logger.log('Subscription updated event received:', subscription.id)
        
        // Check if the subscription status has changed to canceled or unpaid
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          // Get the customer ID from the subscription
          const customerId = subscription.customer as string
          if (!customerId) {
            console.error('No customer ID found in subscription')
            return NextResponse.json({ error: 'No customer ID found' }, { status: 400 })
          }
          
          // Look up the user by customer ID in our database
          const userKey = await redis.get(`stripe:customer:${customerId}`)
          if (!userKey) {
            console.error(`No user found for Stripe customer ${customerId}`)
            return NextResponse.json({ received: true })
          }
          
          const userId = userKey.toString()
          // logger.log(`Found user ${userId} for Stripe customer ${customerId}`)
          
          // Get current subscription data
          const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
          
          // If the subscription is canceled, mark it as such in our database
          if (subscription.status === 'canceled') {
            // Update subscription status to indicate it's being canceled
            await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
              status: 'canceling',
              lastUpdated: new Date().toISOString(),
              // Add flags to ensure next month they only get free tier credits
              pendingDowngrade: 'true',
              nextPlanType: 'FREE'
            })
            
            // Mark the credits to be downgraded on next reset
            await redis.hset(KEYS.USER_CREDITS(userId), {
              nextTotalCredits: CreditConfig.getCreditsForPlan('Free').total.toString(),
              pendingDowngrade: 'true',
              lastUpdate: new Date().toISOString()
            })
            
            // logger.log(`Updated subscription status to canceling for user ${userId}`)
          } else if (subscription.status === 'unpaid') {
            // Handle unpaid subscriptions by marking them as inactive
            await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
              status: 'inactive',
              lastUpdated: new Date().toISOString(),
              // Add flags to ensure next reset they only get free tier credits
              pendingDowngrade: 'true',
              nextPlanType: 'FREE'
            })
            
            // Mark the credits to be downgraded on next reset
            await redis.hset(KEYS.USER_CREDITS(userId), {
              nextTotalCredits: CreditConfig.getCreditsForPlan('Free').total.toString(),
              pendingDowngrade: 'true',
              lastUpdate: new Date().toISOString()
            })
            
            // logger.log(`Updated subscription status to inactive for user ${userId} due to unpaid status`)
          }
        } 
        // Check if the subscription has changed plans
        else if (subscription.items && subscription.items.data.length > 0) {
          // Get the customer ID from the subscription
          const customerId = subscription.customer as string
          
          // Look up the user by customer ID in our database
          const userKey = await redis.get(`stripe:customer:${customerId}`)
          if (!userKey) {
            // logger.log(`No user found for Stripe customer ${customerId}`)
            return NextResponse.json({ received: true })
          }
          
          const userId = userKey.toString()
          
          // Get the price ID from the subscription item
          const priceId = subscription.items.data[0].price.id
          
          // Fetch price and product details to determine the plan
          const price = await stripe.prices.retrieve(priceId)
          const product = await stripe.products.retrieve(price.product as string)
          
          // Update subscription with new plan details - this will be used at next credit reset
          await updateUserSubscription(userId, {
            id: subscription.id,
            customer: customerId,
            customer_email: '',
            // Add metadata to help with plan identification
            metadata: {
              userId: userId,
              planName: product.name
            }
          } as any)
        }
        
        return NextResponse.json({ received: true })
      }
        
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        // Handle subscription cancellation/deletion
        // logger.log('Subscription deleted event received:', subscription.id)
        
        // Get the customer ID from the subscription
        const customerId = subscription.customer as string
        if (!customerId) {
          console.error('No customer ID found in subscription')
          return NextResponse.json({ error: 'No customer ID found' }, { status: 400 })
        }
        
        // Look up the user by customer ID in our database
        const userKey = await redis.get(`stripe:customer:${customerId}`)
        if (!userKey) {
          console.error(`No user found for Stripe customer ${customerId}`)
          return NextResponse.json({ received: true })
        }
        
        const userId = userKey.toString()
        // logger.log(`Found user ${userId} for Stripe customer ${customerId}`)
        
        // Get the current subscription data
        const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
        if (!subscriptionData) {
          console.error(`No subscription data found for user ${userId}`)
          return NextResponse.json({ received: true })
        }
        
        // Downgrade to Free plan
        const now = new Date()
        
        // Calculate next reset date (1 month from now)
        const resetDate = new Date(now)
        resetDate.setMonth(resetDate.getMonth() + 1)
        
        // Get Free plan configuration
        const freeCredits = CreditConfig.getCreditsForPlan('Free')
        
        // Update subscription data
        await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
          plan: freeCredits.displayName,
          planType: freeCredits.type,
          status: 'active', // Free plan is always active
          amount: '0',
          interval: 'month',
          lastUpdated: now.toISOString(),
          // Clear Stripe IDs as they're no longer valid
          stripeCustomerId: '',
          stripeSubscriptionId: ''
        })
        
        // Get current used credits to preserve them
        const currentCredits = await redis.hgetall(KEYS.USER_CREDITS(userId))
        const usedCredits = currentCredits && currentCredits.used 
          ? parseInt(currentCredits.used as string) 
          : 0
        
        // Set credits to Free plan level using centralized config, but preserve used credits
        await redis.hset(KEYS.USER_CREDITS(userId), {
          total: freeCredits.total.toString(),
          used: Math.min(usedCredits, freeCredits.total).toString(), // Used credits shouldn't exceed new total
          resetDate: resetDate.toISOString().split('T')[0],
          lastUpdate: now.toISOString()
        })
        
        // logger.log(`User ${userId} downgraded to Free plan after subscription cancellation`)
        
        return NextResponse.json({ received: true })
      }
        
      // Add more event types as needed
      
      default:
        // logger.log(`Unhandled event type: ${event.type}`)
        return NextResponse.json({ received: true })
    }
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message || 'Webhook handler failed' }, { status: 500 })
  }
} 