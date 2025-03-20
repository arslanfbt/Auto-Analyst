import { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { KEYS } from '@/lib/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { payment_intent } = req.body
    if (!payment_intent) {
      return res.status(400).json({ error: 'Payment intent ID is required' })
    }

    const userId = token.sub
    
    // Check if this payment has already been processed
    const processedKey = `processed_payment:${payment_intent}`
    const isProcessed = await redis.get(processedKey)
    
    if (isProcessed) {
      console.log(`Payment ${payment_intent} already processed, skipping`)
      return res.status(200).json({ success: true, alreadyProcessed: true })
    }

    // Log the payment intent for debugging
    console.log(`Verifying payment intent: ${payment_intent}`)
    
    // First get the payment intent directly to verify its status
    const intent = await stripe.paymentIntents.retrieve(payment_intent)
    console.log(`Payment intent status: ${intent.status}`)
    
    if (intent.status !== 'succeeded') {
      return res.status(400).json({ error: `Payment not successful. Status: ${intent.status}` })
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
          return res.status(200).json({ success: true })
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
      
      if (amount >= 10 && amount <= 20) {
        // Standard monthly plan ($15/month)
        planName = 'Standard Plan' 
        planType = 'STANDARD'
        creditAmount = 500
      } else if (amount >= 30 && amount <= 50) {
        // Pro monthly plan ($39/month)
        planName = 'Pro Plan'
        planType = 'PRO'
        creditAmount = 999999 // Unlimited
      } else if (amount >= 150 && amount <= 250) {
        // Standard yearly plan ($165/year)
        planName = 'Standard Plan (Yearly)'
        planType = 'STANDARD'
        creditAmount = 500
      } else if (amount >= 350 && amount <= 500) {
        // Pro yearly plan ($399/year)
        planName = 'Pro Plan (Yearly)'
        planType = 'PRO'
        creditAmount = 999999 // Unlimited
      }
      
      // Determine the interval based on amount
      const interval = (amount >= 150) ? 'year' : 'month'
      
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
      
      // Update credits
      const creditData = {
        total: creditAmount.toString(),
        used: '0',
        resetDate: renewalDate.toISOString().split('T')[0],
        lastUpdate: now.toISOString()
      }
      
      console.log('Storing credit data:', creditData)
      await redis.hset(KEYS.USER_CREDITS(userId), creditData)

    }
    
    // Mark this payment as processed
    await redis.set(processedKey, 'true')
    
    console.log(`Successfully processed payment ${payment_intent}`)
    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return res.status(500).json({ error: error.message || 'Failed to verify payment' })
  }
}

// Helper function to update subscription data from a checkout session
async function updateUserSubscriptionFromSession(userId: string, session: Stripe.Checkout.Session) {
  try {
    console.log(`Processing subscription update for user ${userId} from session ${session.id}`)
    
    // Get line items to extract product details
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
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
    const price = await stripe.prices.retrieve(priceId)
    const product = await stripe.products.retrieve(price.product as string)
    
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
    
    // Determine plan type and credits allocation
    let planType = 'FREE'
    let creditAmount = 100
    
    // Case-insensitive matching for plan names
    const planNameUpper = planName.toUpperCase()
    
    // Map plan name to our internal constants
    if (planNameUpper.includes('STANDARD')) {
      planType = 'STANDARD'
      creditAmount = 500
    } else if (planNameUpper.includes('PRO')) {
      planType = 'PRO'
      creditAmount = 999999 // Unlimited
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
    
    // Update user's credits
    const creditData = {
      total: creditAmount.toString(),
      used: '0',
      resetDate: renewalDate.toISOString().split('T')[0],
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