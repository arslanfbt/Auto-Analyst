import { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis from '@/lib/redis'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

// Credit amounts based on plan level
const PLAN_CREDITS = {
  'Starter Plan': 1000,
  'Pro Plan': 5000,
  'Business Plan': 15000,
  // Add other plans as needed
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { session_id } = req.body

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID required' })
    }

    // Get the user token
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub

    // Retrieve checkout session to get plan details
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'line_items.data.price.product'],
    })

    // Get the product details
    const lineItem = session.line_items?.data[0]
    if (!lineItem) {
      return res.status(404).json({ error: 'Product information not found' })
    }

    const product = lineItem.price?.product as Stripe.Product
    const planName = product.name

    // Get current credits or default to 0
    const currentCredits = parseInt(await redis.get(`user:${userId}:credits`) || '0')
    
    // Determine credits to add based on plan
    const creditsToAdd = PLAN_CREDITS[planName as keyof typeof PLAN_CREDITS] || 1000
    
    // Update credits in Redis
    await redis.set(`user:${userId}:credits`, currentCredits + creditsToAdd)
    
    // Set last reset date
    await redis.set(`user:${userId}:last_reset`, new Date().toISOString())
    
    // Return updated credits
    return res.status(200).json({ 
      success: true,
      credits: currentCredits + creditsToAdd,
      added: creditsToAdd,
      plan: planName
    })
  } catch (error: any) {
    console.error('Error updating credits:', error)
    return res.status(500).json({ error: error.message || 'Failed to update credits' })
  }
} 