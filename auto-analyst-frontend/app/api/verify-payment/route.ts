import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { KEYS } from '@/lib/redis'

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
      console.log(`Payment ${payment_intent} already processed, skipping`)
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    // Log the payment intent for debugging
    console.log(`Verifying payment intent: ${payment_intent}`)
    
    // First get the payment intent directly to verify its status
    const intent = await stripe.paymentIntents.retrieve(payment_intent)
    console.log(`Payment intent status: ${intent.status}`)
    
    if (intent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not successful. Status: ${intent.status}` }, 
        { status: 400 }
      )
    }

    // DIRECT METHOD: Since sessions list might be unreliable,
    // manually create the subscription data from the payment intent
    const userEmail = token.email
    
    // Get metadata from the payment intent if available
    const metadata = intent.metadata || {}
    console.log('Payment intent metadata:', metadata)
    
    // Get the customer ID from the payment intent
    const customerId = intent.customer as string
    console.log(`Customer ID from payment intent: ${customerId}`)
    
    // Try to get the product ID from the metadata or use a fallback approach
    let productId = metadata.product_id
    let priceId = metadata.price_id
    
    // If no product ID in metadata, try to get it from the line items
    if (!productId || !priceId) {
      try {
        // Try retrieving the session from the payment intent (first approach)
        console.log(`Attempting to find session by payment intent ${payment_intent}`)
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: payment_intent,
          limit: 1,
        })
        
        if (sessions.data.length > 0) {
          console.log(`Found session: ${sessions.data[0].id}`)
          const session = sessions.data[0]
          
          // If we have a session, update subscription from it
          const updateResult = await updateUserSubscriptionFromSession(userId, session)
          console.log(`Session-based update result: ${updateResult ? 'success' : 'failed'}`)
          
          // Mark payment as processed
          await redis.set(processedKey, 'true')
          return NextResponse.json({ success: true })
        } else {
          console.log('No session found by payment intent, using fallback method')
        }
      } catch (err) {
        console.error('Error finding session:', err)
        console.log('Using fallback method')
      }
      
      // FALLBACK: If no session found, use hardcoded values based on amount
      const amount = intent.amount / 100 // Convert from cents to dollars
      console.log(`Payment amount: ${amount}`)
      
      // Determine the plan based on the amount
      let planName = 'Free Plan'
      let planType = 'FREE'
      let creditAmount = 100
      
      // Updated price ranges to match actual pricing in pricing.tsx
      if (amount >= 10 && amount < 25) {
        // Standard monthly plan ($15/month)
        planName = 'Standard Plan' 
        planType = 'STANDARD'
        creditAmount = 500
      } else if (amount >= 25 && amount < 100) {
        // Pro monthly plan ($29/month)
        planName = 'Pro Plan'
        planType = 'PRO'
        creditAmount = 999999 // Unlimited
      } else if (amount >= 100 && amount < 200) {
        // Standard yearly plan ($126/year)
        planName = 'Standard Plan (Yearly)'
        planType = 'STANDARD'
        creditAmount = 500
      } else if (amount >= 200 && amount < 500) {
        // Pro yearly plan ($243.60/year)
        planName = 'Pro Plan (Yearly)'
        planType = 'PRO'
        creditAmount = 999999 // Unlimited
      }
      
      // Determine the interval based on amount
      const interval = (amount >= 100) ? 'year' : 'month'
      
      console.log(`Determined plan: ${planName} (${interval}) with ${creditAmount} credits`)
      
      // Create subscription data
      const now = new Date()
      let renewalDate = new Date()
      if (interval === 'month') {
        renewalDate.setMonth(now.getMonth() + 1)
      } else {
        renewalDate.setFullYear(now.getFullYear() + 1)
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
      
      console.log('Storing fallback subscription data:', subscriptionData)
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
      
      // Calculate next credits reset date (one month from purchase date)
      const creditResetDate = new Date(now);
      creditResetDate.setMonth(creditResetDate.getMonth() + 1);
      
      // Update credits
      const creditData = {
        total: creditAmount.toString(),
        used: '0',
        resetDate: creditResetDate.toISOString().split('T')[0],
        lastUpdate: now.toISOString()
      }
      
      console.log('Storing credit data:', creditData)
      await redis.hset(KEYS.USER_CREDITS(userId), creditData)
    }
    
    // Mark this payment as processed
    await redis.set(processedKey, 'true')
    
    console.log(`Successfully processed payment ${payment_intent}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' }, 
      { status: 500 }
    )
  }
}

// Helper function to update subscription data from a checkout session
async function updateUserSubscriptionFromSession(userId: string, session: Stripe.Checkout.Session) {
  try {
    console.log(`Processing subscription update for user ${userId} from session ${session.id}`)
    
    // Get line items to extract product details
    const lineItems = await stripe!.checkout.sessions.listLineItems(session.id)
    if (!lineItems.data.length) {
      console.error('No line items found in checkout session')
      return false
    }
    
    // Get the price ID
    const priceId = lineItems.data[0].price?.id
    if (!priceId) {
      console.error('No price ID found in line item')
      return false
    }
    
    // Get the price object which contains the product ID and interval
    const price = await stripe!.prices.retrieve(priceId)
    const product = await stripe!.products.retrieve(price.product as string)
    
    // Extract details
    const planName = product.name
    console.log(`Plan name from Stripe: ${planName}`)
    const interval = price.recurring?.interval || 'month'
    const amount = price.unit_amount! / 100 // Convert from cents
    
    // Extract metadata if available (can be useful for additional plan data)
    const metadata = product.metadata || {}
    console.log('Product metadata:', metadata)
    
    // Calculate next renewal date
    const now = new Date()
    let renewalDate = new Date()
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1)
    } else if (interval === 'year') {
      renewalDate.setFullYear(now.getFullYear() + 1)
    }
    
    // Determine plan type and credits allocation with more robust matching
    let planType = 'FREE'
    let creditAmount = 100
    
    // More robust plan name matching
    const planNameUpper = planName.toUpperCase()
    
    // First check for PRO plans (check first to avoid "STANDARD" matching in "PRO STANDARD")
    if (planNameUpper.includes('PRO')) {
      planType = 'PRO'
      creditAmount = 999999 // Unlimited
    } else if (planNameUpper.includes('STANDARD')) {
      planType = 'STANDARD'
      creditAmount = 500
    }
    
    console.log(`Mapped plan type: ${planType} with ${creditAmount} credits`)
    
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
    
    console.log('Storing subscription data in Redis:', subscriptionData)
    
    // Update user's subscription in Redis
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    
    // Calculate next credits reset date (one month from current date)
    const creditResetDate = new Date(now);
    creditResetDate.setMonth(creditResetDate.getMonth() + 1);
    
    // Update credits
    const creditData = {
      total: creditAmount.toString(),
      used: '0',
      resetDate: creditResetDate.toISOString().split('T')[0],
      lastUpdate: now.toISOString()
    }
    
    console.log('Storing credit data in Redis:', creditData)
    await redis.hset(KEYS.USER_CREDITS(userId), creditData)

    console.log('Successfully updated user subscription and credits')
    return true
  } catch (error) {
    console.error('Error updating subscription from session:', error)
    return false
  }
} 