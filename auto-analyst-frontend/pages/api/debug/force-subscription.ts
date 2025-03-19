import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { KEYS } from '@/lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Forbidden in production' })
  }

  try {
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub
    const userEmail = token.email
    
    // Get params from request
    const { plan = 'Standard Plan', amount = '15', interval = 'month' } = req.query
    
    // Create dummy subscription data
    const now = new Date()
    let renewalDate = new Date()
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1)
    } else {
      renewalDate.setFullYear(now.getFullYear() + 1)
    }
    
    // Determine credits
    let credits = 100
    if (plan.toString().toUpperCase().includes('STANDARD')) credits = 500
    if (plan.toString().toUpperCase().includes('PRO')) credits = 999999
    
    // Create a planType for easy mapping
    let planType = 'FREE'
    if (plan.toString().toUpperCase().includes('STANDARD')) planType = 'STANDARD'
    if (plan.toString().toUpperCase().includes('PRO')) planType = 'PRO'
    
    // Update subscription data
    const subscriptionData = {
      plan: plan.toString(),
      planType: planType,
      status: 'active',
      amount: amount.toString(),
      interval: interval.toString(),
      purchaseDate: now.toISOString(),
      renewalDate: renewalDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      stripeCustomerId: 'debug-customer',
      stripeSubscriptionId: 'debug-subscription'
    }
    
    // Update credit data
    const creditData = {
      total: credits.toString(),
      used: '0',
      resetDate: renewalDate.toISOString().split('T')[0],
      lastUpdate: now.toISOString()
    }
    
    // Store in Redis
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
    await redis.hset(KEYS.USER_CREDITS(userId), creditData)
    
    // Also update legacy keys
    if (userEmail) {
      await redis.set(`user_credits:${userEmail}`, credits)
      await redis.set(`user:${userEmail}:creditsUsed`, 0)
      await redis.set(`user:${userEmail}:planName`, plan)
    }
    
    return res.status(200).json({
      success: true,
      message: 'Subscription and credits updated',
      data: {
        subscription: subscriptionData,
        credits: creditData
      }
    })
  } catch (error: any) {
    console.error('Debug force-subscription error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to update subscription data' 
    })
  }
} 