import { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis from '@/lib/redis'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the user token
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub
    const userEmail = token.email || 'user@example.com'
    const userName = token.name || 'User'
    
    // Get user profile data
    // For real implementation, retrieve from database
    const profile = {
      name: userName,
      email: userEmail,
      joinedDate: await redis.get(`user:${userId}:joinDate`) || new Date().toISOString().split('T')[0],
      role: await redis.get(`user:${userId}:role`) || 'Member',
    }

    // Get user subscription data from Stripe
    // This is a simplified example - actual implementation depends on your Stripe setup
    let subscription = null
    try {
      const stripeCustomerId = await redis.get(`user:${userId}:stripeCustomerId`)
      
      if (stripeCustomerId) {
        // Fetch customer subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1,
        })
        
        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0]
          const product = await stripe.products.retrieve(sub.items.data[0].price.product as string)
          const price = sub.items.data[0].price
          
          subscription = {
            plan: product.name,
            status: sub.status,
            renewalDate: new Date(sub.current_period_end * 1000).toISOString().split('T')[0],
            amount: price.unit_amount ? price.unit_amount / 100 : 0,
            interval: price.recurring?.interval || 'month',
          }
        }
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error)
      // If Stripe fetch fails, use a fallback from Redis
      const planName = await redis.get(`user:${userId}:planName`) || 'Free Plan'
      if (planName !== 'Free Plan') {
        subscription = {
          plan: planName,
          status: 'active',
          renewalDate: await redis.get(`user:${userId}:renewalDate`) || 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: parseFloat(await redis.get(`user:${userId}:planAmount`) || '0'),
          interval: await redis.get(`user:${userId}:planInterval`) || 'month',
        }
      }
    }

    // Get credit usage data
    const creditsUsed = parseInt(await redis.get(`user:${userId}:creditsUsed`) || '0')
    const creditsTotal = parseInt(await redis.get(`user:${userId}:creditsTotal`) || 
      subscription?.plan === 'Pro Plan' ? '999999' : '1000')
    const resetDate = await redis.get(`user:${userId}:creditsResetDate`) || 
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]
    const lastUpdate = await redis.get(`user:${userId}:creditsLastUpdate`) || new Date().toISOString()
    
    const credits = {
      used: creditsUsed,
      total: creditsTotal === 999999 ? Infinity : creditsTotal, // Use Infinity for unlimited plans
      resetDate,
      lastUpdate,
    }

    res.status(200).json({
      profile,
      subscription,
      credits,
    })
  } catch (error: any) {
    console.error('API error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 