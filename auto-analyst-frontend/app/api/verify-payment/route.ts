import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { KEYS } from '@/lib/redis'
import { sendSubscriptionConfirmation, sendPaymentConfirmationEmail } from '@/lib/email'
import logger from '@/lib/utils/logger'
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
    
    // Get auth token from the request
    const token = await getToken({ req: request as any })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { payment_intent } = await request.json()
    if (!payment_intent) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400 })
    }

    const userId = token.sub
    
    // Check if this payment has already been processed
    const processedKey = `processed_payment:${payment_intent}`
    const isProcessed = await redis.get(processedKey)
    
    if (isProcessed) {
      // logger.log(`Payment ${payment_intent} already processed, skipping`)
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    // Log the payment intent for debugging
    // logger.log(`Verifying payment intent: ${payment_intent}`)
    
    // First get the payment intent directly to verify its status
    const intent = await stripe.paymentIntents.retrieve(payment_intent)
    // logger.log(`Payment intent status: ${intent.status}`)
    
    if (intent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not successful. Status: ${intent.status}` }, 
        { status: 400 }
      )
    }

    // DIRECT METHOD: Since sessions list might be unreliable,
    // manually create the subscription data from the payment intent
    const _userEmail = token.email
    
    // Get metadata from the payment intent if available
    const metadata = intent.metadata || {}
    // logger.log('Payment intent metadata:', metadata)
    
    // Get the customer ID from the payment intent
    const customerId = intent.customer as string
    // logger.log(`Customer ID from payment intent: ${customerId}`)
    
    // Try to get the product ID from the metadata or use a fallback approach
    let productId = metadata.product_id
    let priceId = metadata.price_id
    
    // If no product ID in metadata, try to get it from the line items
    if (!productId || !priceId) {
      try {
        // Try retrieving the session from the payment intent (first approach)
        // logger.log(`Attempting to find session by payment intent ${payment_intent}`)
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: payment_intent,
          limit: 1,
        })
        
        if (sessions.data.length > 0) {
          // logger.log(`Found session: ${sessions.data[0].id}`)
          const session = sessions.data[0]
          
          // If we have a session, update subscription from it
          const updateResult = await updateUserSubscriptionFromSession(userId, session)
          // logger.log(`Session-based update result: ${updateResult ? 'success' : 'failed'}`)
          
          // Mark payment as processed
          await redis.set(processedKey, 'true')

          // Get plan name from session or line items
          let planName = 'Basic';
          if (session.metadata?.plan) {
            planName = session.metadata.plan;
          } else if (session.line_items) {
            try {
              const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
              if (lineItems.data.length > 0 && lineItems.data[0].price?.product) {
                const product = await stripe.products.retrieve(lineItems.data[0].price.product as string);
                planName = product.name;
              }
            } catch (err) {
              // logger.log('Could not retrieve product details:', err);
            }
          }

          // Send email confirmation
          if (session && session.customer_details?.email) {
            try {
              await sendPaymentConfirmationEmail({
                email: session.customer_details.email,
                name: session.customer_details.name || token.name || '',
                plan: planName,
                amount: ((session.amount_total || 0) / 100).toFixed(2),
                billingCycle: session.metadata?.cycle === 'yearly' ? 'Annual' : 'Monthly',
                date: new Date().toLocaleString('en-US', {
                  year: 'numeric', 
                  month: 'long',
                  day: 'numeric'
                })
              });
              
              // logger.log(`Payment confirmation email sent to ${session.customer_details.email}`);
            } catch (emailError) {
              // Log the error but don't fail the request
              // console.error('Failed to send payment confirmation email:', emailError);
            }
          }

          return NextResponse.json({ success: true })
        } else {
          // logger.log('No session found by payment intent, using fallback method')
        }
      } catch (err) {
        // console.error('Error finding session:', err)
        // logger.log('Using fallback method')
      }
      
      // FALLBACK: If no session found, use hardcoded values based on amount
      const amount = intent.amount / 100 // Convert from cents to dollars
      // logger.log(`Payment amount: ${amount}`)
      
      // Determine the plan based on the amount
      let planName = 'Free Plan'
      let planType = 'FREE'
      let creditAmount = CreditConfig.getCreditsForPlan('Free').total
      let interval = 'month'
      
      // Updated price ranges to match actual pricing in pricing.tsx
      if (amount === 0.75) {
        // Daily Standard plan ($5/day)
        planName = 'Standard Plan (Daily)'
        planType = 'STANDARD'
        creditAmount = CreditConfig.getCreditsForPlan('Standard').total
        interval = 'day'
      } else if (amount >= 10 && amount < 25) {
        // Standard monthly plan ($15/month)
        planName = 'Standard Plan' 
        planType = 'STANDARD'
        creditAmount = CreditConfig.getCreditsForPlan('Standard').total
      } else if (amount >= 25 && amount < 100) {
        // Pro monthly plan ($29/month)
        planName = 'Pro Plan'
        planType = 'PRO'
        creditAmount = CreditConfig.getCreditsForPlan('Pro').total // Unlimited
      } else if (amount >= 100 && amount < 200) {
        // Standard yearly plan ($126/year)
        planName = 'Standard Plan (Yearly)'
        planType = 'STANDARD'
        creditAmount = CreditConfig.getCreditsForPlan('Standard').total
        interval = 'year'
      } else if (amount >= 200 && amount < 500) {
        // Pro yearly plan ($243.60/year)
        planName = 'Pro Plan (Yearly)'
        planType = 'PRO'
        creditAmount = CreditConfig.getCreditsForPlan('Pro').total // Unlimited
        interval = 'year'
      }
      
      // Don't determine interval based on amount anymore - it's set above
      // logger.log(`Determined plan: ${planName} (${interval}) with ${creditAmount} credits`)
      
      // Create subscription data
      const now = new Date()
      let renewalDate = new Date()
      if (interval === 'month') {
        renewalDate.setMonth(now.getMonth() + 1)
      } else if (interval === 'year') {
        renewalDate.setFullYear(now.getFullYear() + 1)
      } else if (interval === 'day') {
        renewalDate.setDate(now.getDate() + 1)
      }
      
      // Save subscription data to Redis
      const subscriptionData = {
        plan: planName,
        planType: planType,
        status: 'active',
        amount: amount.toString(),
        interval: interval,
        purchaseDate: now.toISOString(),
        renewalDate: renewalDate.toISOString().split('T')[0],
        lastUpdated: now.toISOString(),
        stripeCustomerId: customerId || 'unknown',
        stripeSubscriptionId: intent.id || 'unknown'
      }
      
      // logger.log('Storing fallback subscription data:', subscriptionData)
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
      
      // Calculate next credits reset date (using centralized function)
      let creditResetDate: string;
      
      // Adjust reset date based on interval
      if (interval === 'day') {
        // For daily plans, reset daily (tomorrow)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        creditResetDate = tomorrow.toISOString().split('T')[0];
      } else if (interval === 'year') {
        // For yearly plans, use yearly reset
        creditResetDate = CreditConfig.getNextYearlyResetDate();
      } else {
        // For monthly plans, use monthly reset
        creditResetDate = CreditConfig.getNextResetDate();
      }
      
      // Update credits
      const creditData = {
        total: creditAmount.toString(),
        used: '0',
        resetDate: creditResetDate,
        lastUpdate: now.toISOString()
      }
      
      // logger.log('Storing credit data:', creditData)
      await redis.hset(KEYS.USER_CREDITS(userId), creditData)

      // Get user email (first try from session, then from token)
      
      const userEmail= _userEmail || ''
      if (userEmail && userEmail.includes('@')) {
        await sendSubscriptionConfirmation(
          userEmail,
          planName,
          planType,
          amount,
          interval,
          renewalDate.toISOString().split('T')[0],
          creditAmount,
          creditResetDate
        )
      } else {
        // logger.log('No email found for user, cannot send confirmation email')
      }
    }
    
    // Mark this payment as processed
    await redis.set(processedKey, 'true')
    
    // logger.log(`Successfully processed payment ${payment_intent}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' }, 
      { status: 500 }
    )
  }
}

// Helper function to update subscription data from a checkout session
async function updateUserSubscriptionFromSession(userId: string, session: Stripe.Checkout.Session) {
  try {
    // logger.log(`Processing subscription update for user ${userId} from session ${session.id}`)
    
    // Get line items to extract product details
    const lineItems = await stripe!.checkout.sessions.listLineItems(session.id)
    if (!lineItems.data.length) {
      // console.error('No line items found in checkout session')
      return false
    }
    
    // Get the price ID
    const priceId = lineItems.data[0].price?.id
    if (!priceId) {
      // console.error('No price ID found in line item')
      return false
    }
    
    // Get the price object which contains the product ID and interval
    const price = await stripe!.prices.retrieve(priceId)
    const product = await stripe!.products.retrieve(price.product as string)
    
    // Extract details
    const planName = product.name
    // logger.log(`Plan name from Stripe: ${planName}`)
    const interval = price.recurring?.interval || 'month'
    const amount = price.unit_amount! / 100 // Convert from cents
    
    // Extract metadata if available (can be useful for additional plan data)
    const metadata = product.metadata || {}
    // logger.log('Product metadata:', metadata)
    
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
    
    // Determine plan type and credits allocation with more robust matching
    let planType = 'FREE'
    let creditAmount = CreditConfig.getCreditsForPlan('Free').total
    
    // More robust plan name matching
    const planNameUpper = planName.toUpperCase()
    
    // First check for PRO plans (check first to avoid "STANDARD" matching in "PRO STANDARD")
    if (planNameUpper.includes('PRO')) {
      planType = 'PRO'
      creditAmount = CreditConfig.getCreditsForPlan('Pro').total // Unlimited
    } else if (planNameUpper.includes('STANDARD')) {
      planType = 'STANDARD'
      // Check if it's daily billing
      if (interval === 'day') {
        creditAmount = CreditConfig.getCreditsForPlan('Standard').total // Daily credits
      } else {
        creditAmount = CreditConfig.getCreditsForPlan('Standard').total // Regular Standard plan credits
      }
    }
    
    // logger.log(`Mapped plan type: ${planType} with ${creditAmount} credits`)
    
    // Create complete subscription data
    const subscriptionData = {
      plan: planName,
      planType: planType,
      status: 'active',
      amount: amount.toString(),
      interval: interval,
      purchaseDate: now.toISOString(),
      renewalDate: renewalDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      stripeCustomerId: session.customer || '',
      stripeSubscriptionId: session.subscription || ''
    }
    
    // logger.log('Storing subscription data in Redis:', subscriptionData)
    
    // Update user's subscription in Redis
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    
    // Calculate next credits reset date (using centralized function)
    let creditResetDate: string;
    
    // Adjust reset date based on interval
    if (interval === 'day') {
      // For daily plans, reset daily (tomorrow)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      creditResetDate = tomorrow.toISOString().split('T')[0];
    } else if (interval === 'year') {
      // For yearly plans, use yearly reset
      creditResetDate = CreditConfig.getNextYearlyResetDate();
    } else {
      // For monthly plans, use monthly reset
      creditResetDate = CreditConfig.getNextResetDate();
    }
    
    // Update credits
    const creditData = {
      total: creditAmount.toString(),
      used: '0',
      resetDate: creditResetDate,
      lastUpdate: now.toISOString()
    }
    
    // logger.log('Storing credit data in Redis:', creditData)
    await redis.hset(KEYS.USER_CREDITS(userId), creditData)

    // Get user email (first try from session, then from token)
    const userEmail = session.customer_email || ''
    if (userEmail) {
      await sendSubscriptionConfirmation(
        userEmail,
        planName,
        planType,
        amount,
        interval,
        renewalDate.toISOString().split('T')[0],
        creditAmount,
        creditResetDate
      )
    } else {
      logger.log('No email found for user, cannot send confirmation email')
    }

    // logger.log('Successfully updated user subscription and credits')
    return true
  } catch (error) {
    console.error('Error updating subscription from session:', error)
    return false
  }
} 