import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { Redis } from '@upstash/redis'

// Create Redis client
const redis = Redis.fromEnv()

// Define subscription plan options to match pricing.tsx tiers
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    totalCredits: 100,
    amount: 0,
    interval: 'month'
  },
  STANDARD: {
    name: 'Standard',
    totalCredits: 500,
    amount: 15,
    yearlyAmount: 126,
    interval: 'month',
    yearlyInterval: 'year'
  },
  PRO: {
    name: 'Pro',
    totalCredits: Number.MAX_SAFE_INTEGER, // Unlimited
    amount: 29,
    yearlyAmount: 243.60,
    interval: 'month',
    yearlyInterval: 'year'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Use getToken instead of getServerSession to avoid the dependency
  const token = await getToken({ req })
  
  if (!token || !token.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const userEmail = token.email
    const userId = token.sub || "anonymous"
    
    console.log(`Fetching user data for ${userEmail} (${userId})`)
    
    // Get timestamp query param (for cache busting)
    const timestamp = req.query._t || Date.now()
    console.log(`Request timestamp: ${timestamp}`)
    
    // Check subscription data in Redis (hash-based storage)
    console.log(`Checking subscription data in Redis...`)
    const subscriptionKey = `user:${userId}:subscription`
    const subscriptionData = await redis.hgetall(subscriptionKey) || {}
    console.log('Subscription data from Redis:', subscriptionData)
    
    // Determine plan key mapping
    let planKey = 'FREE'
    if (subscriptionData.planType) {
      // Use directly stored planType if available
      planKey = subscriptionData.planType as string
    } else if (subscriptionData.plan) {
      // Fall back to parsing from plan name
      const planName = (subscriptionData.plan as string).toUpperCase()
      if (planName.includes('STANDARD')) planKey = 'STANDARD'
      if (planName.includes('PRO')) planKey = 'PRO'
    }
    
    console.log(`Mapped to plan key: ${planKey}`)
    
    // Get plan details from our constants
    const planDetails = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS]
    console.log('Plan details:', planDetails)
    
    // Determine if the plan is monthly or yearly
    const isYearly = subscriptionData.interval === 'year'
    
    // Get appropriate amount based on billing interval
    const amount = isYearly && 'yearlyAmount' in planDetails 
      ? planDetails.yearlyAmount 
      : planDetails.amount
    
    // Get the interval display name
    const interval = isYearly && 'yearlyInterval' in planDetails
      ? planDetails.yearlyInterval
      : planDetails.interval
    
    // Get subscription status
    const status = subscriptionData.status || 'active'
    
    // Handle purchase and renewal dates
    const purchaseDate = subscriptionData.purchaseDate || new Date().toISOString()
    const renewalDate = subscriptionData.renewalDate || 
      calculateRenewalDate(purchaseDate as string, interval as string)
    
    // Handle Stripe IDs
    const stripeCustomerId = subscriptionData.stripeCustomerId || ''
    const stripeSubscriptionId = subscriptionData.stripeSubscriptionId || ''
    
    // Check credit data in Redis
    console.log(`Checking credit data in Redis...`)
    const creditsKey = KEYS.USER_CREDITS(userId)
    const creditsData = await redis.hgetall(creditsKey) || {}
    console.log('Credits data from Redis:', creditsData)
    
    // Parse credit usage numbers
    let creditsTotal = creditsData.total ? parseInt(creditsData.total as string) : planDetails.totalCredits
    let creditsUsed = creditsData.used ? parseInt(creditsData.used as string) : 0
    
    // For Pro plans, use "Unlimited" for display
    const formattedTotal = planKey === 'PRO' ? 'Unlimited' : creditsTotal
    
    // Get credit update info
    const lastUpdate = creditsData.lastUpdate || new Date().toISOString()
    const resetDate = creditsData.resetDate || renewalDate
    
    // Return the user data
    const userData = {
      profile: {
        name: token.name || 'User',
        email: userEmail,
        image: token.picture,
        joinedDate: subscriptionData.purchaseDate ? 
          (subscriptionData.purchaseDate as string).split('T')[0] : 
          new Date().toISOString().split('T')[0],
        role: planDetails.name
      },
      subscription: {
        plan: planDetails.name,
        status: status,
        renewalDate: renewalDate,
        amount: parseFloat(subscriptionData.amount as string) || amount,
        interval: subscriptionData.interval || interval,
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId
      },
      credits: {
        used: creditsUsed,
        total: formattedTotal,
        resetDate: resetDate,
        lastUpdate: lastUpdate
      },
      debug: {
        userId,
        timestamp,
        rawSubscriptionData: subscriptionData,
        rawCreditsData: creditsData,
        planKey
      }
    }
    
    console.log('Returning user data:', userData)
    return res.status(200).json(userData)
  } catch (error) {
    console.error('Error fetching user data:', error)
    return res.status(500).json({ error: 'Failed to fetch user data' })
  }
}

function calculateRenewalDate(purchaseDate: string, interval: string): string {
  const date = new Date(purchaseDate)
  
  if (interval === 'month') {
    // Add one month to the purchase date
    date.setMonth(date.getMonth() + 1)
  } else if (interval === 'year') {
    // Add one year to the purchase date
    date.setFullYear(date.getFullYear() + 1)
  }
  
  return date.toISOString().split('T')[0]
}

// Add key definitions if needed
export const KEYS = {
  USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
  USER_CREDITS: (userId: string) => `user:${userId}:credits`,
} 